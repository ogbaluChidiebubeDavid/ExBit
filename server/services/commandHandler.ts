import { messengerService } from "./messengerService";
import { walletService, type ChainKey, SUPPORTED_CHAINS } from "./walletService";
import { blockchainMonitor } from "./blockchainMonitor";
import { pinService } from "./pinService";
import { db } from "../db";
import { messengerUsers, transactions, deposits } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { storage } from "../storage";

// Get webview domain from environment (use REPLIT_DEV_DOMAIN for development)
const WEBVIEW_DOMAIN = process.env.REPLIT_DEV_DOMAIN || process.env.REPL_SLUG + '.' + process.env.REPL_OWNER + '.repl.co';
const WEBVIEW_BASE_URL = `https://${WEBVIEW_DOMAIN}`;

interface MessageEvent {
  sender: { id: string };
  message: { text?: string; quick_reply?: { payload: string } };
  postback?: { payload: string };
}

class CommandHandler {
  // Process incoming message or postback (from webviews)
  async handleMessage(event: MessageEvent): Promise<void> {
    const senderId = event.sender.id;
    const messageText = event.message?.text?.trim() || "";
    const quickReplyPayload = event.message?.quick_reply?.payload;
    const postbackPayload = event.postback?.payload;

    // Use postback, quick reply, or message text (in that order of priority)
    const command = postbackPayload || quickReplyPayload || messageText.toLowerCase();

    try {
      // Show typing indicator
      await messengerService.sendTypingIndicator(senderId, true);

      // Check if user exists
      const existingUsers = await db
        .select()
        .from(messengerUsers)
        .where(eq(messengerUsers.messengerId, senderId))
        .limit(1);

      const user = existingUsers[0];

      // Handle webview completion postbacks
      if (postbackPayload === "WEBVIEW_PIN_COMPLETE" || postbackPayload === "WEBVIEW_BANK_COMPLETE" || postbackPayload === "WEBVIEW_SELL_AMOUNT_COMPLETE") {
        // Refresh user data to get updated info from webview
        const refreshedUsers = await db
          .select()
          .from(messengerUsers)
          .where(eq(messengerUsers.messengerId, senderId))
          .limit(1);
        
        const refreshedUser = refreshedUsers[0];
        
        if (postbackPayload === "WEBVIEW_PIN_COMPLETE" && refreshedUser) {
          // Check if PIN was set and complete wallet creation
          if (refreshedUser.transactionPin && refreshedUser.securityQuestion) {
            await this.completeWalletCreation(senderId, refreshedUser);
            return;
          }
        } else if (postbackPayload === "WEBVIEW_SELL_AMOUNT_COMPLETE" && refreshedUser) {
          // Check if sell amount was saved and continue flow
          if (refreshedUser.sellConversationState === "AWAIT_BANK_DETAILS" && refreshedUser.sellConversationData) {
            await this.handleSellAmountWebviewCompletion(senderId);
            return;
          }
        } else if (postbackPayload === "WEBVIEW_BANK_COMPLETE" && refreshedUser) {
          // Check for pending bank details and continue sell flow
          const pendingDetails = await storage.getPendingBankDetails(senderId);
          if (pendingDetails && refreshedUser.sellConversationData) {
            await this.checkPendingBankDetails(senderId, refreshedUser, refreshedUser.sellConversationData);
            return;
          }
        }
      }

      // New user onboarding
      if (!user || !user.hasCompletedOnboarding) {
        await this.handleOnboarding(senderId, user, command);
        return;
      }

      // Handle commands for existing users
      await this.handleUserCommand(senderId, user, command);
    } catch (error) {
      console.error("[CommandHandler] Error handling message:", error);
      await messengerService.sendTextMessage(
        senderId,
        "Sorry, I encountered an error. Please try again later."
      );
    } finally {
      // Turn off typing indicator
      await messengerService.sendTypingIndicator(senderId, false);
    }
  }

  // Handle onboarding for new users
  private async handleOnboarding(
    senderId: string,
    user: any,
    message: string
  ): Promise<void> {
    // Create new user if they don't exist
    if (!user) {
      const profile = await messengerService.getUserProfile(senderId);
      
      await db.insert(messengerUsers).values({
        messengerId: senderId,
        firstName: profile.first_name,
        lastName: profile.last_name,
        hasCompletedOnboarding: false,
        onboardingStep: "ASK_PIN",
      });

      await messengerService.sendTextMessage(
        senderId,
        `Welcome to ExBit, ${profile.first_name}! 👋\n\nI'm your crypto exchange assistant. I'll help you convert cryptocurrency to Naira and send it directly to your Nigerian bank account.\n\nNo MetaMask needed - I'll create a secure wallet for you!`
      );

      await new Promise(resolve => setTimeout(resolve, 1500));

      // Send webview button for secure PIN entry instead of asking via text
      await messengerService.sendButtonTemplate(
        senderId,
        `🔐 To keep your funds secure, let's set up a 4-digit transaction PIN.\n\nYou'll need this PIN every time you sell crypto or send money to your bank.\n\nClick the button below to set your PIN securely:`,
        [
          {
            type: "web_url",
            title: "Set My PIN 🔐",
            url: `${WEBVIEW_BASE_URL}/webview/pin-entry`,
            webview_height_ratio: "tall",
            messenger_extensions: true,
          } as any
        ]
      );

      return;
    }

    // Continue onboarding flow based on current step
    const currentStep = user.onboardingStep;

    switch (currentStep) {
      case "ASK_PIN":
        // Check if user has already set PIN via webview
        if (user.transactionPin && user.securityQuestion && user.securityAnswer) {
          // PIN already set via webview - complete wallet creation
          await this.completeWalletCreation(senderId, user);
        } else {
          // User sent a message - they might be using the old text-based flow
          // For security, redirect them to webview
          await messengerService.sendButtonTemplate(
            senderId,
            `🔐 For your security, please set your PIN using the secure form.\n\nClick the button below:`,
            [
              {
                type: "web_url",
                title: "Set My PIN 🔐",
                url: `${WEBVIEW_BASE_URL}/webview/pin-entry`,
                webview_height_ratio: "tall",
                messenger_extensions: true,
              } as any
            ]
          );
        }
        break;

      case "CONFIRM_PIN":
        await this.handlePINConfirmation(senderId, user, message);
        break;

      case "ASK_SECURITY_QUESTION":
        await this.handleSecurityQuestionSetup(senderId, user, message);
        break;

      case "ASK_SECURITY_ANSWER":
        await this.handleSecurityAnswerSetup(senderId, user, message);
        break;

      default:
        await messengerService.sendTextMessage(
          senderId,
          "Welcome back! Type /help to see available commands."
        );
    }
  }

  // Handle PIN setup during onboarding
  private async handlePINSetup(senderId: string, user: any, pin: string): Promise<void> {
    if (!pinService.isValidPIN(pin)) {
      await messengerService.sendTextMessage(
        senderId,
        `❌ Invalid PIN. Please enter exactly 4 digits (e.g., 1234):`
      );
      return;
    }

    const hashedPIN = await pinService.hashPIN(pin);

    await db
      .update(messengerUsers)
      .set({
        tempHashedPin: hashedPIN,
        onboardingStep: "CONFIRM_PIN",
      })
      .where(eq(messengerUsers.id, user.id));

    await messengerService.sendTextMessage(
      senderId,
      `✅ PIN received!\n\n🔐 Please confirm your PIN by entering it again:`
    );
  }

  // Handle PIN confirmation during onboarding
  private async handlePINConfirmation(senderId: string, user: any, pin: string): Promise<void> {
    if (!pinService.isValidPIN(pin)) {
      await messengerService.sendTextMessage(
        senderId,
        `❌ Invalid PIN. Please enter exactly 4 digits (e.g., 1234):`
      );
      return;
    }

    const pinMatches = await pinService.verifyPIN(pin, user.tempHashedPin);

    if (!pinMatches) {
      await messengerService.sendTextMessage(
        senderId,
        `❌ PINs don't match! Please enter your original PIN again to confirm:`
      );
      return;
    }

    await db
      .update(messengerUsers)
      .set({
        onboardingStep: "ASK_SECURITY_QUESTION",
      })
      .where(eq(messengerUsers.id, user.id));

    await messengerService.sendTextMessage(
      senderId,
      `✅ PIN confirmed!\n\n🔑 Now, let's set up a security question for PIN recovery.\n\nIf you forget your PIN, you'll answer this question to reset it.\n\nExample questions:\n- What city were you born in?\n- What is your mother's maiden name?\n- What was your first pet's name?\n\nPlease enter your security question:`
    );
  }

  // Handle security question setup
  private async handleSecurityQuestionSetup(
    senderId: string,
    user: any,
    question: string
  ): Promise<void> {
    if (!pinService.isValidSecurityQuestion(question)) {
      await messengerService.sendTextMessage(
        senderId,
        `❌ Security question must be between 10 and 200 characters.\n\nPlease try again:`
      );
      return;
    }

    await db
      .update(messengerUsers)
      .set({
        securityQuestion: question,
        onboardingStep: "ASK_SECURITY_ANSWER",
      })
      .where(eq(messengerUsers.id, user.id));

    await messengerService.sendTextMessage(
      senderId,
      `✅ Security question saved!\n\n🔐 Now, please provide the answer to your security question:\n\n"${question}"\n\nYour answer:`
    );
  }

  // Complete wallet creation after PIN is set via webview
  private async completeWalletCreation(senderId: string, user: any): Promise<void> {
    try {
      await messengerService.sendTextMessage(
        senderId,
        `⏳ Setting up your secure wallet...`
      );

      const { encryptedMnemonic, wallets } = walletService.createNewWallet();
      
      const walletAddresses = {
        ethereum: wallets.ethereum.address,
        bsc: wallets.bsc.address,
        polygon: wallets.polygon.address,
        arbitrum: wallets.arbitrum.address,
        base: wallets.base.address,
      };

      await db
        .update(messengerUsers)
        .set({
          walletAddresses,
          encryptedKeys: encryptedMnemonic,
          hasCompletedOnboarding: true,
          onboardingStep: null,
        })
        .where(eq(messengerUsers.id, user.id));

      await blockchainMonitor.startMonitoring(user.id);

      await new Promise(resolve => setTimeout(resolve, 1500));

      await messengerService.sendTextMessage(
        senderId,
        `✅ All set! Your wallet is ready!\n\n📱 Available Commands:\n\n/deposit - Get wallet address to receive crypto\n/sell - Convert crypto to Naira\n/balance - Check your crypto balance\n/help - Show this help message\n\nType /deposit to see your wallet address and start receiving crypto!`
      );
    } catch (error) {
      console.error("[CommandHandler] Error completing wallet creation:", error);
      await messengerService.sendTextMessage(
        senderId,
        "❌ Sorry, there was an error setting up your wallet. Please try again later."
      );
    }
  }

  // Handle security answer setup and complete onboarding
  private async handleSecurityAnswerSetup(
    senderId: string,
    user: any,
    answer: string
  ): Promise<void> {
    if (!pinService.isValidSecurityAnswer(answer)) {
      await messengerService.sendTextMessage(
        senderId,
        `❌ Answer must be between 2 and 100 characters.\n\nPlease try again:`
      );
      return;
    }

    try {
      await messengerService.sendTextMessage(
        senderId,
        `⏳ Setting up your secure wallet and PIN...`
      );

      const hashedAnswer = await pinService.hashSecurityAnswer(answer);
      const { encryptedMnemonic, wallets } = walletService.createNewWallet();
      
      const walletAddresses = {
        ethereum: wallets.ethereum.address,
        bsc: wallets.bsc.address,
        polygon: wallets.polygon.address,
        arbitrum: wallets.arbitrum.address,
        base: wallets.base.address,
      };

      await db
        .update(messengerUsers)
        .set({
          transactionPin: user.tempHashedPin,
          securityAnswer: hashedAnswer,
          walletAddresses,
          encryptedKeys: encryptedMnemonic,
          hasCompletedOnboarding: true,
          onboardingStep: null,
          tempHashedPin: null,
        })
        .where(eq(messengerUsers.id, user.id));

      await blockchainMonitor.startMonitoring(user.id);

      await new Promise(resolve => setTimeout(resolve, 1500));

      await messengerService.sendTextMessage(
        senderId,
        `✅ All set! Your wallet is ready!\n\n📱 Available Commands:\n\n/deposit - Get wallet address to receive crypto\n/sell - Convert crypto to Naira\n/balance - Check your crypto balance\n/help - Show this help message\n\nType /deposit to see your wallet address and start receiving crypto!`
      );
    } catch (error) {
      console.error("[CommandHandler] Error completing onboarding:", error);
      await messengerService.sendTextMessage(
        senderId,
        "❌ Sorry, there was an error setting up your wallet. Please try again later."
      );
    }
  }

  // Handle commands for existing users
  private async handleUserCommand(
    senderId: string,
    user: any,
    command: string
  ): Promise<void> {
    // Handle sell conversation state
    if (user.sellConversationState) {
      await this.handleSellConversation(senderId, user, command);
      return;
    }

    // Handle quick reply payloads for blockchain selection
    if (command.startsWith("DEPOSIT_")) {
      const chain = command.replace("DEPOSIT_", "").toLowerCase() as ChainKey;
      await this.showDepositAddress(senderId, user, chain);
      return;
    }

    if (command.startsWith("SELL_")) {
      await this.handleSellSelection(senderId, user, command);
      return;
    }

    // Handle PIN reset conversation state
    if (user.pinResetState) {
      await this.handlePINResetConversation(senderId, user, command);
      return;
    }

    // Check for command keywords
    if (command.includes("/deposit") || command.includes("deposit")) {
      await this.handleDepositCommand(senderId, user);
    } else if (command.includes("/sell") || command.includes("sell")) {
      await this.handleSellCommand(senderId, user);
    } else if (command.includes("/balance") || command.includes("balance")) {
      await this.handleBalanceCommand(senderId, user);
    } else if (command.includes("/reset-pin") || command.includes("reset pin") || command.includes("forgot pin")) {
      await this.handlePINResetCommand(senderId, user);
    } else if (command.includes("/help") || command.includes("help")) {
      await this.handleHelpCommand(senderId);
    } else if (command.toLowerCase() === "cancel") {
      await this.cancelSellConversation(senderId, user);
    } else {
      // Default response for unrecognized commands
      await messengerService.sendTextMessage(
        senderId,
        `I didn't understand that command. Type /help to see available commands.`
      );
    }
  }

  // Show deposit address for selected blockchain
  private async showDepositAddress(
    senderId: string,
    user: any,
    chain: ChainKey
  ): Promise<void> {
    try {
      if (!user.walletAddresses) {
        throw new Error("User wallet not found");
      }

      const address = user.walletAddresses[chain];
      const chainName = walletService.getChainName(chain);

      await messengerService.sendTextMessage(
        senderId,
        `💰 Your ${chainName} Wallet Address:\n\n${address}\n\n📝 Send any supported tokens (USDT, USDC, ETH, BNB, etc.) to this address.\n\n⚠️ Important:\n• Only send tokens on ${chainName}\n• Sending on wrong chain = lost funds!\n• I'll notify you when I receive your deposit\n\nType /balance to check your balance after depositing.`
      );
    } catch (error) {
      console.error("[CommandHandler] Error showing deposit address:", error);
      await messengerService.sendTextMessage(
        senderId,
        "Sorry, I couldn't retrieve your wallet address. Please try /deposit again."
      );
    }
  }

  // Handle /deposit command
  private async handleDepositCommand(senderId: string, user: any): Promise<void> {
    // Check if user has wallet addresses
    if (!user.encryptedKeys || !user.walletAddresses) {
      // Generate new wallet for user
      await this.generateWalletForUser(senderId, user.id);
      
      await messengerService.sendTextMessage(
        senderId,
        "Creating your secure wallet... ✨"
      );
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Refresh user data
      const updatedUsers = await db
        .select()
        .from(messengerUsers)
        .where(eq(messengerUsers.id, user.id))
        .limit(1);
      
      user = updatedUsers[0];
    }

    await messengerService.sendQuickReply(
      senderId,
      "Which blockchain would you like to deposit on?",
      [
        { title: "Ethereum (ETH)", payload: "DEPOSIT_ETHEREUM" },
        { title: "BSC (BNB)", payload: "DEPOSIT_BSC" },
        { title: "Polygon (MATIC)", payload: "DEPOSIT_POLYGON" },
        { title: "Arbitrum", payload: "DEPOSIT_ARBITRUM" },
        { title: "Base", payload: "DEPOSIT_BASE" },
      ]
    );
  }

  // Generate wallet for a new user
  private async generateWalletForUser(senderId: string, userId: string): Promise<void> {
    try {
      const { encryptedMnemonic, wallets } = walletService.createNewWallet();
      
      // Store wallet addresses as JSON
      const walletAddresses = {
        ethereum: wallets.ethereum.address,
        bsc: wallets.bsc.address,
        polygon: wallets.polygon.address,
        arbitrum: wallets.arbitrum.address,
        base: wallets.base.address,
      };

      // Update user with encrypted mnemonic and wallet addresses
      await db
        .update(messengerUsers)
        .set({
          encryptedKeys: encryptedMnemonic,
          walletAddresses,
        })
        .where(eq(messengerUsers.id, userId));

      console.log(`[WalletService] Created wallet for user ${senderId}`);

      // Start monitoring blockchain for deposits
      await blockchainMonitor.startMonitoring(userId);
      console.log(`[BlockchainMonitor] Started monitoring deposits for user ${senderId}`);
    } catch (error) {
      console.error("[WalletService] Error generating wallet:", error);
      throw error;
    }
  }

  // Handle /sell command
  private async handleSellCommand(senderId: string, user: any): Promise<void> {
    try {
      const balances = await blockchainMonitor.getDepositBalance(user.id);

      if (Object.keys(balances).length === 0) {
        await messengerService.sendTextMessage(
          senderId,
          "💱 Sell Crypto for Naira\n\n❌ No confirmed deposits found!\n\nTo sell crypto:\n1. Deposit crypto to your wallet (/deposit)\n2. Wait for confirmation (I'll notify you)\n3. Come back here to convert to Naira\n\nType /deposit to get started!"
        );
        return;
      }

      // Send webview button to open sell amount form
      await messengerService.sendButtonTemplate(
        senderId,
        "💱 Ready to sell your crypto!\n\nClick the button below to select which token and how much you want to sell:",
        [
          {
            type: "web_url",
            title: "Sell Crypto 💱",
            url: `${WEBVIEW_BASE_URL}/webview/sell-amount?psid=${senderId}`,
            webview_height_ratio: "tall",
            messenger_extensions: true,
          } as any
        ]
      );
    } catch (error) {
      console.error("[CommandHandler] Error in sell command:", error);
      await messengerService.sendTextMessage(
        senderId,
        "Sorry, I couldn't load your balances. Please try again later."
      );
    }
  }

  // Handle sell selection (user picked which crypto to sell)
  private async handleSellSelection(senderId: string, user: any, payload: string): Promise<void> {
    try {
      const parts = payload.replace("SELL_", "").split("_");
      if (parts.length < 3) {
        throw new Error("Invalid sell selection payload");
      }

      const blockchain = parts[0];
      const token = parts[1];
      const availableAmount = parts[2];

      await db
        .update(messengerUsers)
        .set({
          sellConversationState: "ASK_AMOUNT",
          sellConversationData: {
            blockchain,
            token,
            availableAmount,
          },
        })
        .where(eq(messengerUsers.id, user.id));

      await messengerService.sendTextMessage(
        senderId,
        `💱 Selling ${token} on ${SUPPORTED_CHAINS[blockchain as ChainKey]}\n\nAvailable: ${availableAmount} ${token}\n\nHow much ${token} would you like to sell?\n\nType the amount (e.g., "${availableAmount}" for all, or "50" for half):`
      );
    } catch (error) {
      console.error("[CommandHandler] Error in sell selection:", error);
      await messengerService.sendTextMessage(
        senderId,
        "Sorry, something went wrong. Please try /sell again."
      );
    }
  }

  // Handle sell conversation state machine
  private async handleSellConversation(senderId: string, user: any, message: string): Promise<void> {
    const state = user.sellConversationState;
    const data = user.sellConversationData || {};

    // Check for cancel command at any point in the flow
    if (message.toLowerCase().trim() === "cancel") {
      await this.cancelSellConversation(senderId, user);
      return;
    }

    switch (state) {
      case "ASK_AMOUNT":
        await this.handleSellAmount(senderId, user, message, data);
        break;

      case "AWAIT_BANK_DETAILS":
        // Check if bank details were saved via webview
        await this.checkPendingBankDetails(senderId, user, data);
        break;

      case "ASK_BANK_NAME":
        await this.handleSellBankName(senderId, user, message, data);
        break;

      case "ASK_ACCOUNT_NUMBER":
        await this.handleSellAccountNumber(senderId, user, message, data);
        break;

      case "ASK_ACCOUNT_NAME":
        await this.handleSellAccountName(senderId, user, message, data);
        break;

      case "ASK_PIN":
        await this.handleSellPIN(senderId, user, message, data);
        break;

      default:
        await this.cancelSellConversation(senderId, user);
    }
  }

  // Cancel sell conversation
  private async cancelSellConversation(senderId: string, user: any): Promise<void> {
    await db
      .update(messengerUsers)
      .set({
        sellConversationState: null,
        sellConversationData: null,
      })
      .where(eq(messengerUsers.id, user.id));

    // Also clear any pending bank details from the webview
    await storage.clearPendingBankDetails(senderId);

    await messengerService.sendTextMessage(
      senderId,
      "❌ Transaction cancelled.\n\nType /sell when you're ready to try again!"
    );
  }

  // Check for pending bank details from webview
  private async checkPendingBankDetails(senderId: string, user: any, data: any): Promise<void> {
    try {
      // Get pending bank details saved by webview
      const pendingDetails = await storage.getPendingBankDetails(senderId);

      if (!pendingDetails) {
        // No bank details yet - remind user to complete webview
        await messengerService.sendButtonTemplate(
          senderId,
          `🏦 Please click the button below to enter your bank details:`,
          [
            {
              type: "web_url",
              title: "Enter Bank Details 🏦",
              url: `${WEBVIEW_BASE_URL}/webview/bank-details?amount=${data.netAmount}`,
              webview_height_ratio: "tall",
              messenger_extensions: true,
            } as any
          ]
        );
        return;
      }

      // Bank details received! Add to conversation data
      data.bankName = pendingDetails.bankName;
      data.accountNumber = pendingDetails.accountNumber;
      data.accountName = pendingDetails.accountName;

      // Clear pending details
      await storage.clearPendingBankDetails(senderId);

      // Move to PIN confirmation
      await db
        .update(messengerUsers)
        .set({
          sellConversationState: "ASK_PIN",
          sellConversationData: data,
        })
        .where(eq(messengerUsers.id, user.id));

      const chainName = SUPPORTED_CHAINS[data.blockchain as ChainKey];

      await messengerService.sendTextMessage(
        senderId,
        `📋 Transaction Summary:\n\nSelling: ${data.amount} ${data.token} (${chainName})\nRate: ₦${data.rate}/${data.token}\nTotal: ₦${data.totalNaira}\nPlatform Fee (0.1%): ₦${parseFloat(data.platformFee).toFixed(2)}\n\n💰 You receive: ₦${parseFloat(data.netAmount).toFixed(2)}\n\n🏦 Bank Details:\n${data.bankName}\n${data.accountNumber}\n${data.accountName}\n\n🔐 Enter your 4-digit PIN to confirm:`
      );
    } catch (error) {
      console.error("[CommandHandler] Error checking pending bank details:", error);
      await messengerService.sendTextMessage(
        senderId,
        "Sorry, something went wrong. Please try again or type 'cancel' to stop."
      );
    }
  }

  // Handle amount input
  private async handleSellAmount(senderId: string, user: any, amountStr: string, data: any): Promise<void> {
    const amount = parseFloat(amountStr);
    const available = parseFloat(data.availableAmount);

    if (isNaN(amount) || amount <= 0) {
      await messengerService.sendTextMessage(
        senderId,
        `❌ Invalid amount. Please enter a valid number (e.g., "${data.availableAmount}" or "50"):`
      );
      return;
    }

    if (amount > available) {
      await messengerService.sendTextMessage(
        senderId,
        `❌ Insufficient balance! You only have ${available} ${data.token}.\n\nPlease enter a valid amount:`
      );
      return;
    }

    try {
      // Price fetching is now handled by the webview using CoinGecko
      // This function is kept for backward compatibility but shouldn't be reached
      // in the current webview-based flow
      
      data.amount = amount.toString();

      await db
        .update(messengerUsers)
        .set({
          sellConversationState: "AWAIT_BANK_DETAILS",
          sellConversationData: data,
        })
        .where(eq(messengerUsers.id, user.id));

      // Send webview button for secure bank details entry
      await messengerService.sendTextMessage(
        senderId,
        `✅ Amount: ${amount} ${data.token}\n\n💰 Estimated Payout:\nRate: ₦${rate.toFixed(2)}/${data.token}\nTotal: ₦${totalNaira.toFixed(2)}\nPlatform Fee (0.1%): ₦${platformFee.toFixed(2)}\n\nYou'll receive: ₦${netAmount.toFixed(2)}\n\n🏦 Next, I need your Nigerian bank details.`
      );

      await new Promise(resolve => setTimeout(resolve, 1000));

      await messengerService.sendButtonTemplate(
        senderId,
        `Click the button below to securely enter your bank account details:`,
        [
          {
            type: "web_url",
            title: "Enter Bank Details 🏦",
            url: `${WEBVIEW_BASE_URL}/webview/bank-details?amount=${netAmount.toFixed(2)}`,
            webview_height_ratio: "tall",
            messenger_extensions: true,
          } as any
        ]
      );
    } catch (error) {
      console.error("[CommandHandler] Error in sell amount handler:", error);
      await messengerService.sendTextMessage(
        senderId,
        "Sorry, something went wrong. Please try again or type 'cancel' to stop."
      );
    }
  }

  // Handle bank name input
  private async handleSellBankName(senderId: string, user: any, bankName: string, data: any): Promise<void> {
    if (bankName.trim().length < 3) {
      await messengerService.sendTextMessage(
        senderId,
        "❌ Invalid bank name. Please enter your Nigerian bank name:"
      );
      return;
    }

    data.bankName = bankName.trim();

    await db
      .update(messengerUsers)
      .set({
        sellConversationState: "ASK_ACCOUNT_NUMBER",
        sellConversationData: data,
      })
      .where(eq(messengerUsers.id, user.id));

    await messengerService.sendTextMessage(
      senderId,
      `✅ Bank: ${bankName}\n\n🔢 What is your account number?\n\nEnter your 10-digit account number:`
    );
  }

  // Handle account number input
  private async handleSellAccountNumber(senderId: string, user: any, accountNumber: string, data: any): Promise<void> {
    const cleanNumber = accountNumber.replace(/\D/g, "");

    if (cleanNumber.length !== 10) {
      await messengerService.sendTextMessage(
        senderId,
        "❌ Invalid account number. Please enter your 10-digit account number:"
      );
      return;
    }

    data.accountNumber = cleanNumber;

    await db
      .update(messengerUsers)
      .set({
        sellConversationState: "ASK_ACCOUNT_NAME",
        sellConversationData: data,
      })
      .where(eq(messengerUsers.id, user.id));

    await messengerService.sendTextMessage(
      senderId,
      `✅ Account: ${cleanNumber}\n\n👤 What is the account name?\n\nEnter the full name on the account:`
    );
  }

  // Handle account name and show confirmation
  private async handleSellAccountName(senderId: string, user: any, accountName: string, data: any): Promise<void> {
    if (accountName.trim().length < 3) {
      await messengerService.sendTextMessage(
        senderId,
        "❌ Invalid account name. Please enter the full name on your account:"
      );
      return;
    }

    data.accountName = accountName.trim();

    // Use the nairaRate already fetched from CoinGecko in the webview
    const rate = parseFloat(data.nairaRate);
    const totalNaira = parseFloat(data.nairaAmount);
    const platformFee = parseFloat(data.platformFee);
    const netAmount = parseFloat(data.netAmount);

    await db
      .update(messengerUsers)
      .set({
        sellConversationState: "ASK_PIN",
        sellConversationData: data,
      })
      .where(eq(messengerUsers.id, user.id));

    const chainName = SUPPORTED_CHAINS[data.blockchain as ChainKey];

    await messengerService.sendTextMessage(
      senderId,
      `📋 Transaction Summary:\n\nSelling: ${data.amount} ${data.token} (${chainName})\nRate: ₦${rate.toFixed(2)}/${data.token}\nTotal: ₦${totalNaira.toFixed(2)}\nPlatform Fee (0.1%): ₦${platformFee.toFixed(2)}\n\n💰 You receive: ₦${netAmount.toFixed(2)}\n\n🏦 Bank Details:\n${data.bankName}\n${data.accountNumber}\n${data.accountName}\n\n🔐 Enter your 4-digit PIN to confirm:`
    );
  }

  // Handle PIN verification and process transaction
  private async handleSellPIN(senderId: string, user: any, pin: string, data: any): Promise<void> {
    if (!user.transactionPin) {
      await messengerService.sendTextMessage(
        senderId,
        "❌ Transaction PIN not set! Please contact support."
      );
      await this.cancelSellConversation(senderId, user);
      return;
    }

    const isValidPIN = await pinService.verifyPIN(pin, user.transactionPin);

    if (!isValidPIN) {
      await messengerService.sendTextMessage(
        senderId,
        "❌ Incorrect PIN! Please try again:\n\n💡 Type 'cancel' to abort."
      );
      return;
    }

    await this.cancelSellConversation(senderId, user);

    await messengerService.sendTextMessage(
      senderId,
      `✅ PIN verified!\n\n⏳ Processing your transaction...\n\nThis will take 30-60 seconds. I'll notify you when the transfer is complete!`
    );

    let negativeDepositId: string | null = null;

    try {
      // Execute Web3 transfer + Flutterwave withdrawal
      const tokenSymbol = data.token.toUpperCase();
      const amount = parseFloat(data.amount);
      const netAmount = parseFloat(data.netAmount);
      
      // CONCURRENCY GUARD: Atomic balance check + negative deposit creation with row locking
      // This transaction uses SELECT FOR UPDATE to lock deposit rows and prevent concurrent sells
      negativeDepositId = await db.transaction(async (tx) => {
        // Query balance with row-level locking using transaction connection
        // FOR UPDATE locks all matching rows until transaction commits
        const userDeposits = await tx
          .select()
          .from(deposits)
          .where(
            and(
              eq(deposits.messengerUserId, user.id),
              eq(deposits.blockchain, data.blockchain),
              eq(deposits.token, data.token),
              eq(deposits.status, "confirmed")
            )
          )
          .for("update"); // Row-level lock - blocks other transactions

        // Calculate current balance from locked rows
        const currentBalance = userDeposits.reduce((sum, deposit) => {
          return sum + parseFloat(deposit.amount);
        }, 0);

        if (currentBalance < amount) {
          throw new Error(`Insufficient balance. Available: ${currentBalance} ${data.token}, Requested: ${amount} ${data.token}`);
        }

        // Balance sufficient - create negative deposit to lock it
        const [negativeDeposit] = await tx.insert(deposits).values({
          messengerUserId: user.id,
          blockchain: data.blockchain,
          token: data.token,
          amount: (-amount).toString(), // Negative to reduce balance
          toAddress: user.walletAddresses[data.blockchain.toLowerCase()], // User's wallet
          fromAddress: "PENDING_SELL", // Will update to EXBIT_SWAP after success
          transactionHash: `PENDING_SELL_${Date.now()}`, // Temporary, will update with blockchain TX hash
          status: "confirmed",
        }).returning({ id: deposits.id });

        return negativeDeposit.id;
      });

      // Step 1: Send crypto from user's custodial wallet to owner wallet
      await messengerService.sendTextMessage(
        senderId,
        `🔄 Step 1/2: Transferring ${data.amount} ${tokenSymbol} to ExBit...`
      );

      const { web3TransferService } = await import("./web3TransferService");
      const cryptoTxHash = await web3TransferService.sendCryptoToOwner(
        user.encryptedKeys,
        data.blockchain,
        tokenSymbol,
        data.amount
      );

      console.log(`[CommandHandler] Crypto transfer successful:`, {
        blockchain: data.blockchain,
        token: tokenSymbol,
        amount: data.amount,
        txHash: cryptoTxHash,
      });

      // Step 2: Send Naira to user's bank via Flutterwave
      await messengerService.sendTextMessage(
        senderId,
        `🔄 Step 2/2: Sending ₦${netAmount.toFixed(2)} to your bank...`
      );

      const { flutterwaveTransferService } = await import("./flutterwaveTransferService");
      const { flutterwaveService } = await import("./flutterwaveService");
      
      const bankCode = flutterwaveService.getBankCode(data.bankName);
      
      if (!bankCode) {
        throw new Error(`Bank not supported: ${data.bankName}`);
      }

      const transfer = await flutterwaveTransferService.transferToBank(
        Math.floor(netAmount), // Flutterwave requires integer amounts
        bankCode,
        data.accountNumber,
        data.accountName,
        `ExBit crypto swap - ${data.amount} ${tokenSymbol}`
      );

      // Step 3: Create transaction record
      await db.insert(transactions).values({
        messengerUserId: user.id,
        blockchain: data.blockchain,
        token: data.token,
        amount: data.amount, // Total crypto sold
        nairaAmount: data.nairaAmount, // Total NGN before fees
        exchangeRate: data.nairaRate, // NGN per token
        platformFee: "0", // No crypto fee, only NGN fee
        platformFeeNaira: data.platformFee, // NGN platform fee
        netAmount: data.amount, // Net crypto (same as amount, no crypto fee)
        netNairaAmount: data.netAmount, // Net NGN after fees (sent to bank)
        bankName: data.bankName,
        accountNumber: data.accountNumber,
        accountName: data.accountName,
        depositTransactionHash: cryptoTxHash,
        flutterwaveReference: transfer.reference,
        status: "completed",
      });

      // Step 4: Update negative deposit entry with blockchain transaction hash
      await db
        .update(deposits)
        .set({
          fromAddress: "EXBIT_SWAP",
          transactionHash: cryptoTxHash,
        })
        .where(eq(deposits.id, negativeDepositId!));

      // Success message
      await messengerService.sendTextMessage(
        senderId,
        `🎉 Transaction Successful!\n\n✅ Sold: ${data.amount} ${data.token}\n💰 Received: ₦${netAmount.toFixed(2)}\n\n🏦 Sent to:\n${data.bankName}\n${data.accountNumber}\n${data.accountName}\n\n🔗 Blockchain TX: ${cryptoTxHash.substring(0, 10)}...${cryptoTxHash.substring(cryptoTxHash.length - 8)}\n📱 Flutterwave Ref: ${transfer.reference}\n\nType /balance to check your remaining balance.`
      );

    } catch (error: any) {
      console.error("[CommandHandler] Error processing transaction:", error);
      
      // ROLLBACK: Delete negative deposit entry if transaction failed
      // This restores the user's balance
      if (negativeDepositId) {
        try {
          await db.delete(deposits).where(eq(deposits.id, negativeDepositId));
          console.log(`[CommandHandler] Rolled back negative deposit ${negativeDepositId} due to transaction error`);
        } catch (rollbackError) {
          console.error("[CommandHandler] CRITICAL: Failed to rollback negative deposit!", rollbackError);
          // This is critical - balance is now incorrect!
          await messengerService.sendTextMessage(
            senderId,
            `⚠️ CRITICAL ERROR: Transaction failed and balance rollback also failed. Please contact support immediately with this error code: ROLLBACK_FAIL_${negativeDepositId}`
          );
          return;
        }
      }
      
      // User-friendly error message
      let errorMsg = "Sorry, the transaction failed. ";
      
      if (error.message?.includes("Insufficient balance")) {
        errorMsg += "There was an issue with the Flutterwave account balance. Please contact support.";
      } else if (error.message?.includes("insufficient funds")) {
        errorMsg += "Not enough balance in your wallet to cover transaction and gas fees.";
      } else if (error.message?.includes("invalid account") || error.message?.includes("Bank account")) {
        errorMsg += "Your bank account details couldn't be validated. Please try again with correct details.";
      } else if (error.message?.includes("minimum")) {
        errorMsg += error.message;
      } else {
        errorMsg += "Please try again or contact support if the issue persists.";
      }

      await messengerService.sendTextMessage(
        senderId,
        `❌ ${errorMsg}\n\nYour balance has been restored. Error: ${error.message}\n\nType /sell to try again.`
      );
    }
  }

  // Handle /balance command
  private async handleBalanceCommand(senderId: string, user: any): Promise<void> {
    try {
      // Get deposit balances from blockchain monitor
      const balances = await blockchainMonitor.getDepositBalance(user.id);

      if (Object.keys(balances).length === 0) {
        await messengerService.sendTextMessage(
          senderId,
          "💰 Your Balance:\n\nNo deposits yet!\n\nType /deposit to get your wallet address and start receiving crypto."
        );
        return;
      }

      // Format balance message
      let balanceMsg = "💰 Your Confirmed Balances:\n\n";
      
      for (const [key, amount] of Object.entries(balances)) {
        const [blockchain, token] = key.split("-");
        const chainName = SUPPORTED_CHAINS[blockchain as ChainKey] || blockchain;
        balanceMsg += `${amount} ${token} (${chainName})\n`;
      }

      balanceMsg += "\n💡 Type /sell to convert your crypto to Naira!";

      await messengerService.sendTextMessage(senderId, balanceMsg);
    } catch (error) {
      console.error("[CommandHandler] Error fetching balance:", error);
      await messengerService.sendTextMessage(
        senderId,
        "Sorry, I couldn't fetch your balance right now. Please try again later."
      );
    }
  }

  // Handle /help command
  private async handleHelpCommand(senderId: string): Promise<void> {
    await messengerService.sendTextMessage(
      senderId,
      `📱 ExBit Commands:\n\n/deposit - Get your wallet address to receive crypto\n/sell - Convert crypto to Naira\n/balance - Check your crypto balance\n/reset-pin - Reset your transaction PIN\n/help - Show this help message\n\n💡 Just send crypto to your wallet and type /sell to convert it to Naira!`
    );
  }

  // Handle /reset-pin command
  private async handlePINResetCommand(senderId: string, user: any): Promise<void> {
    if (!user.securityQuestion || !user.securityAnswer) {
      await messengerService.sendTextMessage(
        senderId,
        "❌ Security question not set up!\n\nPlease contact support to reset your PIN."
      );
      return;
    }

    await db
      .update(messengerUsers)
      .set({
        pinResetState: "ASK_SECURITY_ANSWER",
      })
      .where(eq(messengerUsers.id, user.id));

    await messengerService.sendTextMessage(
      senderId,
      `🔐 PIN Reset\n\nTo reset your PIN, answer your security question:\n\n"${user.securityQuestion}"\n\nYour answer:`
    );
  }

  // Handle PIN reset conversation state machine
  private async handlePINResetConversation(senderId: string, user: any, message: string): Promise<void> {
    const state = user.pinResetState;

    switch (state) {
      case "ASK_SECURITY_ANSWER":
        await this.handlePINResetSecurityAnswer(senderId, user, message);
        break;

      case "ASK_NEW_PIN":
        await this.handlePINResetNewPIN(senderId, user, message);
        break;

      case "ASK_CONFIRM_PIN":
        await this.handlePINResetConfirmPIN(senderId, user, message);
        break;

      default:
        await this.cancelPINReset(senderId, user);
    }
  }

  // Verify security answer
  private async handlePINResetSecurityAnswer(senderId: string, user: any, answer: string): Promise<void> {
    const isValid = await pinService.verifySecurityAnswer(answer, user.securityAnswer);

    if (!isValid) {
      await messengerService.sendTextMessage(
        senderId,
        "❌ Incorrect answer! Please try again:\n\n💡 Type 'cancel' to abort."
      );
      return;
    }

    await db
      .update(messengerUsers)
      .set({
        pinResetState: "ASK_NEW_PIN",
      })
      .where(eq(messengerUsers.id, user.id));

    await messengerService.sendTextMessage(
      senderId,
      "✅ Security answer verified!\n\n🔐 Enter your new 4-digit PIN:"
    );
  }

  // Handle new PIN input
  private async handlePINResetNewPIN(senderId: string, user: any, pin: string): Promise<void> {
    if (!pinService.isValidPIN(pin)) {
      await messengerService.sendTextMessage(
        senderId,
        "❌ Invalid PIN. Please enter exactly 4 digits (e.g., 1234):"
      );
      return;
    }

    const hashedPIN = await pinService.hashPIN(pin);

    await db
      .update(messengerUsers)
      .set({
        tempHashedNewPin: hashedPIN,
        pinResetState: "ASK_CONFIRM_PIN",
      })
      .where(eq(messengerUsers.id, user.id));

    await messengerService.sendTextMessage(
      senderId,
      "✅ New PIN received!\n\n🔐 Please confirm your new PIN by entering it again:"
    );
  }

  // Handle PIN confirmation and save
  private async handlePINResetConfirmPIN(senderId: string, user: any, pin: string): Promise<void> {
    if (!pinService.isValidPIN(pin)) {
      await messengerService.sendTextMessage(
        senderId,
        "❌ Invalid PIN. Please enter exactly 4 digits (e.g., 1234):"
      );
      return;
    }

    const pinMatches = await pinService.verifyPIN(pin, user.tempHashedNewPin);

    if (!pinMatches) {
      await messengerService.sendTextMessage(
        senderId,
        "❌ PINs don't match! Please enter your new PIN again to confirm:"
      );
      return;
    }

    await db
      .update(messengerUsers)
      .set({
        transactionPin: user.tempHashedNewPin,
        pinResetState: null,
        tempHashedNewPin: null,
      })
      .where(eq(messengerUsers.id, user.id));

    await messengerService.sendTextMessage(
      senderId,
      "✅ PIN successfully reset!\n\n🔐 Your new PIN is now active. You can use it for all transactions.\n\nType /sell to start converting crypto to Naira!"
    );
  }

  // Cancel PIN reset
  private async cancelPINReset(senderId: string, user: any): Promise<void> {
    await db
      .update(messengerUsers)
      .set({
        pinResetState: null,
        tempHashedNewPin: null,
      })
      .where(eq(messengerUsers.id, user.id));

    await messengerService.sendTextMessage(
      senderId,
      "❌ PIN reset cancelled.\n\nType /reset-pin when you're ready to try again!"
    );
  }

  // PUBLIC: Called by webview API after PIN is successfully saved
  async handlePINWebviewCompletion(psid: string): Promise<void> {
    try {
      // Reload user data to get the PIN that was just saved
      const users = await db
        .select()
        .from(messengerUsers)
        .where(eq(messengerUsers.messengerId, psid))
        .limit(1);
      
      const user = users[0];
      
      if (!user) {
        console.error("[CommandHandler] User not found for PIN webview completion:", psid);
        return;
      }
      
      // Check if PIN and security info were saved
      if (user.transactionPin && user.securityQuestion && user.securityAnswer) {
        // Complete wallet creation
        await this.completeWalletCreation(psid, user);
      } else {
        console.error("[CommandHandler] PIN data incomplete after webview:", psid);
        await messengerService.sendTextMessage(
          psid,
          "❌ Sorry, there was an issue saving your PIN. Please try again."
        );
      }
    } catch (error) {
      console.error("[CommandHandler] Error in PIN webview completion:", error);
      await messengerService.sendTextMessage(
        psid,
        "❌ Sorry, there was an error. Please try again later."
      );
    }
  }

  // PUBLIC: Called by webview API after bank details are successfully saved
  async handleSellAmountWebviewCompletion(psid: string): Promise<void> {
    try {
      // Reload user data to get the updated sellConversationData
      const users = await db
        .select()
        .from(messengerUsers)
        .where(eq(messengerUsers.messengerId, psid))
        .limit(1);
      
      const user = users[0];
      
      if (!user) {
        console.error("[CommandHandler] User not found for sell amount webview completion:", psid);
        return;
      }
      
      // Check if sell data was saved
      if (user.sellConversationState === "AWAIT_BANK_DETAILS" && user.sellConversationData) {
        const data = user.sellConversationData;
        
        // Validate required fields
        if (!data.amount || !data.nairaRate || !data.netAmount || !data.platformFee) {
          console.error("[CommandHandler] Missing required sell data fields:", data);
          await messengerService.sendTextMessage(
            psid,
            "❌ Sorry, there was an issue processing your request. Please try /sell again."
          );
          return;
        }
        
        // Show confirmation message with exchange rate
        await messengerService.sendTextMessage(
          psid,
          `💱 Selling ${data.amount} ${data.token}\n\n📊 Exchange Rate: ₦${parseFloat(data.nairaRate).toLocaleString()} per ${data.token}\n💰 You'll receive: ₦${parseFloat(data.netAmount).toLocaleString()}\n💵 Platform fee (0.1%): ₦${parseFloat(data.platformFee).toLocaleString()}\n\nNext, I need your bank details to complete the transfer.`
        );
        
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Open bank details webview
        await messengerService.sendButtonTemplate(
          psid,
          "🏦 Click the button below to enter your Nigerian bank account details:",
          [
            {
              type: "web_url",
              title: "Enter Bank Details 🏦",
              url: `${WEBVIEW_BASE_URL}/webview/bank-details?psid=${psid}&amount=${data.netAmount}&token=${data.token}`,
              webview_height_ratio: "tall",
              messenger_extensions: true,
            } as any
          ]
        );
      } else {
        console.error("[CommandHandler] Sell data incomplete after webview:", psid, user.sellConversationState);
        await messengerService.sendTextMessage(
          psid,
          "❌ Sorry, there was an issue processing your request. Please try /sell again."
        );
      }
    } catch (error) {
      console.error("[CommandHandler] Error in sell amount webview completion:", error);
      await messengerService.sendTextMessage(
        psid,
        "❌ Sorry, there was an error. Please try again later."
      );
    }
  }

  async handleBankDetailsWebviewCompletion(psid: string): Promise<void> {
    try {
      // Reload user data
      const users = await db
        .select()
        .from(messengerUsers)
        .where(eq(messengerUsers.messengerId, psid))
        .limit(1);
      
      const user = users[0];
      
      if (!user) {
        console.error("[CommandHandler] User not found for bank details webview completion:", psid);
        return;
      }
      
      // Check if user is in sell flow
      if (user.sellConversationState === "AWAIT_BANK_DETAILS" && user.sellConversationData) {
        // Check for pending bank details and continue sell flow
        await this.checkPendingBankDetails(psid, user, user.sellConversationData);
      } else {
        console.error("[CommandHandler] User not in expected sell state:", psid, user.sellConversationState);
      }
    } catch (error) {
      console.error("[CommandHandler] Error in bank details webview completion:", error);
      await messengerService.sendTextMessage(
        psid,
        "❌ Sorry, there was an error. Please try again later."
      );
    }
  }
}

export const commandHandler = new CommandHandler();
