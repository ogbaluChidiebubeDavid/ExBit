import { messengerService } from "./messengerService";
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
      });

      await messengerService.sendTextMessage(
        senderId,
        `Welcome to ExBit! 👋\n\nI'm your crypto exchange assistant. I'll help you convert cryptocurrency to Naira and send it directly to your bank account.\n\nNo MetaMask needed - I'll create a secure wallet for you!`
      );

      await new Promise(resolve => setTimeout(resolve, 1000));

      await messengerService.sendTextMessage(
        senderId,
        `📱 Available Commands:\n\n/deposit - Get your wallet address to receive crypto\n/sell - Convert crypto to Naira\n/balance - Check your crypto balance\n/help - Show this help message\n\nLet's get started! Type /deposit to see your wallet address.`
      );

      return;
    }

    // Continue onboarding flow
    await messengerService.sendTextMessage(
      senderId,
      "Welcome back! Type /help to see available commands."
    );
  }

  // Handle commands for existing users
  private async handleUserCommand(
    senderId: string,
    user: any,
    command: string
  ): Promise<void> {
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

  // Handle /deposit command
  private async handleDepositCommand(senderId: string, user: any): Promise<void> {
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

  // Handle /sell command
  private async handleSellCommand(senderId: string, user: any): Promise<void> {
    await messengerService.sendTextMessage(
      senderId,
      "The /sell command is coming soon! 🚧\n\nFor now, use /deposit to get your wallet address."
    );
  }

  // Handle /balance command
  private async handleBalanceCommand(senderId: string, user: any): Promise<void> {
    await messengerService.sendTextMessage(
      senderId,
      "The /balance command is coming soon! 🚧\n\nFor now, use /deposit to get your wallet address."
    );
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
