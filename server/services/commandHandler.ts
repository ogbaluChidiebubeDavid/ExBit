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

    await db
      .update(messengerUsers)
      .set({
        tempPinSetup: pin,
        onboardingStep: "ASK_SECURITY_QUESTION",
      })
      .where(eq(messengerUsers.id, user.id));

    await messengerService.sendTextMessage(
      senderId,
      `✅ PIN saved!\n\n🔑 Now, let's set up a security question for PIN recovery.\n\nIf you forget your PIN, you'll answer this question to reset it.\n\nExample questions:\n- What city were you born in?\n- What is your mother's maiden name?\n- What was your first pet's name?\n\nPlease enter your security question:`
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

      const hashedPIN = await pinService.hashPIN(user.tempPinSetup);
      const hashedAnswer = await pinService.hashSecurityAnswer(answer);
      
      const walletData = await walletService.createWallet();

      await db
        .update(messengerUsers)
        .set({
          transactionPin: hashedPIN,
          securityAnswer: hashedAnswer,
          walletAddresses: walletData.addresses,
          encryptedKeys: walletData.encryptedKeys,
          hasCompletedOnboarding: true,
          onboardingStep: null,
          tempPinSetup: null,
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
    // Handle quick reply payloads for blockchain selection
    if (command.startsWith("DEPOSIT_")) {
      const chain = command.replace("DEPOSIT_", "").toLowerCase() as ChainKey;
      await this.showDepositAddress(senderId, user, chain);
      return;
    }

    // Check for command keywords
    if (command.includes("/deposit") || command.includes("deposit")) {
      await this.handleDepositCommand(senderId, user);
    } else if (command.includes("/sell") || command.includes("sell")) {
      await this.handleSellCommand(senderId, user);
    } else if (command.includes("/balance") || command.includes("balance")) {
      await this.handleBalanceCommand(senderId, user);
    } else if (command.includes("/help") || command.includes("help")) {
      await this.handleHelpCommand(senderId);
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
    await messengerService.sendTextMessage(
      senderId,
      "💱 Sell Crypto for Naira\n\nTo sell your crypto:\n1. First deposit crypto to your wallet (/deposit)\n2. Wait for confirmation (I'll notify you)\n3. Return here to convert to NGN\n\nFull /sell flow with bank transfers coming soon! 🚧\n\nFor now, use /deposit to receive crypto."
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
      `📱 ExBit Commands:\n\n/deposit - Get your wallet address to receive crypto\n/sell - Convert crypto to Naira\n/balance - Check your crypto balance\n/help - Show this help message\n\n💡 Just send crypto to your wallet and type /sell to convert it to Naira!`
    );
  }
}

export const commandHandler = new CommandHandler();
