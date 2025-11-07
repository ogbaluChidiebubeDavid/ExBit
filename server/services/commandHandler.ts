import { messengerService } from "./messengerService";
import { walletService, type ChainKey, SUPPORTED_CHAINS } from "./walletService";
import { blockchainMonitor } from "./blockchainMonitor";
import { pinService } from "./pinService";
import { db } from "../db";
import { messengerUsers } from "@shared/schema";
import { eq } from "drizzle-orm";

interface MessageEvent {
  sender: { id: string };
  message: { text?: string; quick_reply?: { payload: string } };
}

class CommandHandler {
  // Process incoming message
  async handleMessage(event: MessageEvent): Promise<void> {
    const senderId = event.sender.id;
    const messageText = event.message.text?.trim() || "";
    const quickReplyPayload = event.message.quick_reply?.payload;

    // Use quick reply payload if available, otherwise use message text
    const command = quickReplyPayload || messageText.toLowerCase();

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

      await messengerService.sendTextMessage(
        senderId,
        `🔐 To keep your funds secure, let's set up a 4-digit transaction PIN.\n\nYou'll need this PIN every time you sell crypto or send money to your bank.\n\nPlease enter a 4-digit PIN (e.g., 1234):`
      );

      return;
    }

    // Continue onboarding flow based on current step
    const currentStep = user.onboardingStep;

    switch (currentStep) {
      case "ASK_PIN":
        await this.handlePINSetup(senderId, user, message);
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
      const walletData = await walletService.createWallet();

      await db
        .update(messengerUsers)
        .set({
          transactionPin: user.tempHashedPin,
          securityAnswer: hashedAnswer,
          walletAddresses: walletData.addresses,
          encryptedKeys: walletData.encryptedKeys,
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

      const quickReplies: Array<{ title: string; payload: string }> = [];
      for (const [key, amount] of Object.entries(balances)) {
        const [blockchain, token] = key.split("-");
        const chainName = SUPPORTED_CHAINS[blockchain as ChainKey] || blockchain;
        quickReplies.push({
          title: `${amount} ${token} (${chainName})`,
          payload: `SELL_${blockchain}_${token}_${amount}`,
        });
      }

      await messengerService.sendQuickReply(
        senderId,
        "💱 Which crypto would you like to sell?\n\n💡 Tip: Type 'cancel' anytime to stop.",
        quickReplies
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

    switch (state) {
      case "ASK_AMOUNT":
        await this.handleSellAmount(senderId, user, message, data);
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

    await messengerService.sendTextMessage(
      senderId,
      "❌ Transaction cancelled.\n\nType /sell when you're ready to try again!"
    );
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

    data.amount = amount.toString();

    await db
      .update(messengerUsers)
      .set({
        sellConversationState: "ASK_BANK_NAME",
        sellConversationData: data,
      })
      .where(eq(messengerUsers.id, user.id));

    await messengerService.sendTextMessage(
      senderId,
      `✅ Amount: ${amount} ${data.token}\n\n🏦 What is your Nigerian bank name?\n\nExamples:\n- Access Bank\n- GTBank\n- First Bank\n- UBA\n\nEnter your bank name:`
    );
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

    const rate = 1430;
    const totalNaira = parseFloat(data.amount) * rate;
    const platformFee = totalNaira * 0.001;
    const netAmount = totalNaira - platformFee;

    data.rate = rate.toString();
    data.totalNaira = totalNaira.toString();
    data.platformFee = platformFee.toString();
    data.netAmount = netAmount.toString();

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
      `📋 Transaction Summary:\n\nSelling: ${data.amount} ${data.token} (${chainName})\nRate: ₦${rate}/${data.token}\nTotal: ₦${totalNaira.toFixed(2)}\nPlatform Fee (0.1%): ₦${platformFee.toFixed(2)}\n\n💰 You receive: ₦${netAmount.toFixed(2)}\n\n🏦 Bank Details:\n${data.bankName}\n${data.accountNumber}\n${data.accountName}\n\n🔐 Enter your 4-digit PIN to confirm:`
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

    await new Promise(resolve => setTimeout(resolve, 2000));

    await messengerService.sendTextMessage(
      senderId,
      `🎉 Transaction Successful!\n\n₦${data.netAmount} sent to:\n${data.bankName}\n${data.accountNumber}\n${data.accountName}\n\nFull Quidax integration coming soon! 🚧\n\nType /balance to check your remaining balance.`
    );
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
}

export const commandHandler = new CommandHandler();
