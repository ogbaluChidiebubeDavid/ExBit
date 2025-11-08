import { db } from "../db";
import { webUsers, webMessages, webTransactions, insertWebMessageSchema } from "../../shared/schema";
import { eq, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { priceService } from "./priceService";
import { flutterwaveService } from "./flutterwaveService";

interface SwapRequest {
  amount: string;
  token: string;
  blockchain: string;
}

class WebChatHandler {
  // Create or get existing user session
  async connectWallet(walletAddress: string): Promise<{ sessionId: string; userId: string; messages: any[] }> {
    // Check if user exists
    const existingUsers = await db
      .select()
      .from(webUsers)
      .where(eq(webUsers.walletAddress, walletAddress.toLowerCase()))
      .limit(1);

    let user = existingUsers[0];
    let isNew = false;

    if (!user) {
      // Create new user
      const sessionId = nanoid();
      const [newUser] = await db.insert(webUsers).values({
        walletAddress: walletAddress.toLowerCase(),
        sessionId,
      }).returning();
      
      user = newUser;
      isNew = true;
    }

    // Get message history
    const messageHistory = await db
      .select()
      .from(webMessages)
      .where(eq(webMessages.webUserId, user.id))
      .orderBy(desc(webMessages.createdAt))
      .limit(50);

    // If new user, send welcome message
    if (isNew) {
      const welcomeMessage = await db.insert(webMessages).values({
        webUserId: user.id,
        role: "assistant",
        content: `👋 Welcome to ExBit!\n\nI can help you swap crypto to Naira instantly. Just tell me what you'd like to swap.\n\nFor example:\n"Swap 0.07 USDT on BSC to Naira"\n"Convert 0.05 ETH on Ethereum to Naira"\n\nWhat would you like to do?`,
      }).returning();

      messageHistory.unshift(welcomeMessage[0]);
    }

    return {
      sessionId: user.sessionId,
      userId: user.id,
      messages: messageHistory.reverse(),
    };
  }

  // Parse swap request from user message
  private parseSwapRequest(message: string): SwapRequest | null {
    const lowerMessage = message.toLowerCase();
    
    // Pattern: "swap 0.07 usdt on bsc to naira"
    const swapPattern = /swap|convert|sell/i;
    if (!swapPattern.test(message)) {
      return null;
    }

    // Extract amount
    const amountMatch = message.match(/(\d+\.?\d*)/);
    if (!amountMatch) {
      return null;
    }
    const amount = amountMatch[1];

    // Extract token
    let token = "";
    if (/usdt/i.test(message)) token = "USDT";
    else if (/usdc/i.test(message)) token = "USDC";
    else if (/eth/i.test(message)) token = "ETH";
    else if (/bnb/i.test(message)) token = "BNB";
    else if (/matic/i.test(message)) token = "MATIC";
    else return null;

    // Extract blockchain
    let blockchain = "";
    if (/bsc|binance/i.test(message)) blockchain = "BSC";
    else if (/ethereum|eth\s/i.test(message)) blockchain = "Ethereum";
    else if (/polygon|matic/i.test(message)) blockchain = "Polygon";
    else if (/arbitrum|arb/i.test(message)) blockchain = "Arbitrum";
    else if (/base/i.test(message)) blockchain = "Base";
    else {
      // Default blockchain based on token
      if (token === "BNB") blockchain = "BSC";
      else if (token === "MATIC") blockchain = "Polygon";
      else blockchain = "Ethereum";
    }

    return { amount, token, blockchain };
  }

  // Handle incoming message
  async handleMessage(sessionId: string, userMessage: string): Promise<{ userMsg: any; assistantMsg: any }> {
    // Get user by session ID
    const users = await db
      .select()
      .from(webUsers)
      .where(eq(webUsers.sessionId, sessionId))
      .limit(1);

    const user = users[0];
    if (!user) {
      throw new Error("Invalid session");
    }

    // Save user message
    const [savedUserMsg] = await db.insert(webMessages).values({
      webUserId: user.id,
      role: "user",
      content: userMessage,
    }).returning();

    // Parse the message
    const swapRequest = this.parseSwapRequest(userMessage);

    let assistantResponse: string;
    let metadata: any = null;

    if (!swapRequest) {
      // Not a swap request - provide guidance
      assistantResponse = `I didn't quite understand that. I can help you swap crypto to Naira.\n\nTry something like:\n"Swap 0.07 USDT on BSC to Naira"\n"Convert 0.1 ETH on Ethereum to Naira"\n\nWhat would you like to swap?`;
    } else {
      // Validate amount
      const amount = parseFloat(swapRequest.amount);
      if (amount <= 0 || isNaN(amount)) {
        assistantResponse = `Invalid amount. Please specify a valid amount to swap.`;
      } else {
        // Get price quote
        try {
          const nairaRate = await priceService.getTokenPriceInNaira(swapRequest.token);
          const totalNaira = amount * nairaRate;
          const platformFeeNaira = totalNaira * 0.001; // 0.1% fee
          const netAmount = totalNaira - platformFeeNaira;

          // Save swap data to user session
          await db.update(webUsers).set({
            swapState: "awaiting_bank_details",
            swapData: {
              blockchain: swapRequest.blockchain,
              token: swapRequest.token,
              amount: swapRequest.amount,
              nairaRate: nairaRate.toString(),
              nairaAmount: totalNaira.toString(),
              platformFee: platformFeeNaira.toString(),
              netAmount: netAmount.toString(),
            },
          }).where(eq(webUsers.id, user.id));

          assistantResponse = `Great! Here's your quote for swapping ${swapRequest.amount} ${swapRequest.token} on ${swapRequest.blockchain}:`;

          metadata = {
            type: "quote",
            swapState: "awaiting_bank_details",
            data: {
              amount: swapRequest.amount,
              token: swapRequest.token,
              blockchain: swapRequest.blockchain,
              nairaRate: nairaRate.toFixed(2),
              nairaAmount: totalNaira.toFixed(2),
              platformFee: platformFeeNaira.toFixed(2),
              netAmount: netAmount.toFixed(2),
              showContinue: false,
            },
          };
        } catch (error: any) {
          console.error("[WebChatHandler] Error getting price:", error);
          assistantResponse = `Sorry, I couldn't fetch the current price for ${swapRequest.token}. Please try again.`;
        }
      }
    }

    // Save assistant message
    const [savedAssistantMsg] = await db.insert(webMessages).values({
      webUserId: user.id,
      role: "assistant",
      content: assistantResponse,
      metadata,
    }).returning();

    return {
      userMsg: savedUserMsg,
      assistantMsg: savedAssistantMsg,
    };
  }

  // Get or validate bank account
  async validateBankAccount(sessionId: string, bankName: string, accountNumber: string): Promise<{ accountName: string }> {
    const result = await flutterwaveService.validateBankAccount(accountNumber, bankName);
    return { accountName: result.accountName };
  }
}

export const webChatHandler = new WebChatHandler();
