import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTransactionSchema } from "@shared/schema";
import { z } from "zod";
import { priceService } from "./services/priceService";
import { flutterwaveService } from "./services/flutterwaveService";
import { messengerService } from "./services/messengerService";
import { commandHandler } from "./services/commandHandler";

export async function registerRoutes(app: Express): Promise<Server> {
  // Facebook Messenger Webhook - Verification (GET)
  app.get("/webhook", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token) {
      if (messengerService.verifyWebhookToken(token as string)) {
        console.log("[Webhook] Webhook verified successfully");
        res.status(200).send(challenge);
      } else {
        console.error("[Webhook] Webhook verification failed - invalid token");
        res.sendStatus(403);
      }
    } else {
      res.sendStatus(400);
    }
  });

  // Facebook Messenger Webhook - Message handling (POST)
  app.post("/webhook", async (req, res) => {
    const signature = req.headers["x-hub-signature-256"] as string;
    
    // Signature verification is MANDATORY for security
    if (!signature) {
      console.error("[Webhook] Missing X-Hub-Signature-256 header");
      return res.sendStatus(401);
    }

    // Verify request signature using raw body buffer
    const rawBody = req.rawBody as Buffer;
    if (!rawBody) {
      console.error("[Webhook] Raw body not available for signature verification");
      return res.sendStatus(500);
    }

    if (!messengerService.verifyWebhookSignature(signature, rawBody)) {
      console.error("[Webhook] Invalid signature - rejecting webhook");
      return res.sendStatus(403);
    }

    const body = req.body;

    // Handle webhook events
    if (body.object === "page") {
      body.entry?.forEach((entry: any) => {
        entry.messaging?.forEach((event: any) => {
          if (event.message && event.message.text) {
            // Process message asynchronously
            commandHandler.handleMessage(event).catch((error) => {
              console.error("[Webhook] Error processing message:", error);
            });
          }
        });
      });

      res.status(200).send("EVENT_RECEIVED");
    } else {
      res.sendStatus(404);
    }
  });

  // Get exchange rates from CoinGecko API
  app.get("/api/rates", async (req, res) => {
    try {
      const allPrices = await priceService.getAllPrices();
      
      const rates = {
        ethereum: {
          ETH: allPrices.ETH || 5775000,
          USDT: allPrices.USDT || 1650,
          USDC: allPrices.USDC || 1650,
          DAI: allPrices.DAI || 1650,
        },
        bsc: {
          BNB: allPrices.BNB || 990000,
          USDT: allPrices.USDT || 1650,
          USDC: allPrices.USDC || 1650,
          BUSD: allPrices.BUSD || 1650,
        },
        polygon: {
          MATIC: allPrices.MATIC || 1485,
          USDT: allPrices.USDT || 1650,
          USDC: allPrices.USDC || 1650,
          DAI: allPrices.DAI || 1650,
        },
        arbitrum: {
          ETH: allPrices.ETH || 5775000,
          USDT: allPrices.USDT || 1650,
          USDC: allPrices.USDC || 1650,
          DAI: allPrices.DAI || 1650,
        },
        base: {
          ETH: allPrices.ETH || 5775000,
          USDC: allPrices.USDC || 1650,
          DAI: allPrices.DAI || 1650,
        },
      };

      res.json(rates);
    } catch (error) {
      console.error("Error fetching rates:", error);
      res.status(500).json({ error: "Failed to fetch exchange rates" });
    }
  });

  // Diagnostic endpoint to check Flutterwave key status
  app.get("/api/payment-status", async (req, res) => {
    const apiKey = process.env.FLUTTERWAVE_SECRET_KEY;
    
    if (!apiKey) {
      return res.json({
        status: "missing",
        message: "FLUTTERWAVE_SECRET_KEY is not set",
      });
    }

    const keyType = apiKey.startsWith("FLWSECK-") ? "configured" : "unknown";
    const maskedKey = apiKey.slice(0, 15) + "..." + apiKey.slice(-4);
    
    res.json({
      status: "configured",
      keyType,
      maskedKey,
      message: `Flutterwave API key is configured`,
    });
  });

  // Check Flutterwave wallet balance
  app.get("/api/wallet-balance", async (req, res) => {
    try {
      const balance = await flutterwaveService.getWalletBalance();
      
      if (!balance) {
        return res.status(500).json({ 
          error: "Unable to fetch wallet balance",
          message: "Please check your Flutterwave API key configuration"
        });
      }

      res.json(balance);
    } catch (error: any) {
      console.error("[Balance] Error fetching wallet balance:", error);
      res.status(500).json({ 
        error: "Failed to fetch wallet balance",
        message: error.message 
      });
    }
  });

  // Validate bank account using Flutterwave API
  app.post("/api/validate-account", async (req, res) => {
    const schema = z.object({
      bankName: z.string(),
      accountNumber: z.string().length(10),
    });

    try {
      const { bankName, accountNumber } = schema.parse(req.body);
      
      console.log(`[Validation] Attempting to validate account at ${bankName}`);

      const result = await flutterwaveService.validateBankAccount(accountNumber, bankName);
      
      console.log(`[Validation] Account validation successful`);

      res.json({ accountName: result.accountName, verified: true });
    } catch (error: any) {
      console.error("[Validation] Error details:", {
        message: error.message,
        status: error.response?.status,
        bankName: req.body.bankName
      });
      
      const errorMessage = error.message || "Unable to fetch account details";
      res.status(400).json({ error: errorMessage });
    }
  });

  // Create transaction
  app.post("/api/transactions", async (req, res) => {
    try {
      const data = insertTransactionSchema.parse(req.body);
      const transaction = await storage.createTransaction(data);

      res.json(transaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid transaction data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create transaction" });
      }
    }
  });

  // Process blockchain transaction and initiate Naira transfer
  app.post("/api/transactions/:id/process", async (req, res) => {
    console.log(`[Process] Received process request for transaction ${req.params.id}`);
    
    const schema = z.object({
      transactionHash: z.string(),
    });

    try {
      const { transactionHash } = schema.parse(req.body);
      console.log(`[Process] Transaction hash: ${transactionHash}`);
      
      const transaction = await storage.getTransaction(req.params.id);
      console.log(`[Process] Transaction found:`, {
        id: transaction?.id,
        status: transaction?.status,
        hasAccountName: !!transaction?.accountName,
        hasAccountNumber: !!transaction?.accountNumber,
        hasBankName: !!transaction?.bankName
      });

      if (!transaction) {
        return res.status(404).json({ error: "Transaction not found" });
      }

      if (transaction.status !== "pending") {
        return res.status(400).json({ error: "Transaction already processed" });
      }

      await storage.updateTransaction(req.params.id, {
        depositTransactionHash: transactionHash,
        status: "processing",
      });

      const ownerWalletAddress = process.env.OWNER_WALLET_ADDRESS;
      if (!ownerWalletAddress) {
        console.warn("OWNER_WALLET_ADDRESS not set - platform fees will not be collected");
      }

      // Process transfer immediately (no setTimeout to avoid losing callbacks on restart)
      try {
        console.log(`[Transfer] Starting transfer process for transaction ${req.params.id}`);
        
        if (!transaction.accountName || !transaction.accountNumber || !transaction.bankName) {
          console.error(`[Transfer] Missing account details - accountName: ${!!transaction.accountName}, accountNumber: ${!!transaction.accountNumber}, bankName: ${!!transaction.bankName}`);
          await storage.updateTransactionStatus(req.params.id, "failed");
          return res.status(400).json({ error: "Missing bank account details" });
        }

        const netNairaAmount = parseFloat(transaction.netNairaAmount);
        console.log(`[Transfer] Attempting to transfer ₦${netNairaAmount} to ${transaction.bankName}`);

        // Flutterwave minimum transfer amount is ₦100
        if (netNairaAmount < 100) {
          console.error(`[Transfer] Amount below Flutterwave minimum: ₦${netNairaAmount} < ₦100`);
          await storage.updateTransactionStatus(req.params.id, "failed");
          return res.status(400).json({ error: `Transfer amount (₦${netNairaAmount}) is below the minimum ₦100 required by Flutterwave` });
        }

        const transferResult = await flutterwaveService.initiateTransfer(
          transaction.accountNumber,
          transaction.accountName,
          transaction.bankName,
          netNairaAmount,
          `exbit-${transaction.id}`
        );

        console.log(`[Transfer] Transfer successful, reference: ${transferResult.reference}`);

        await storage.updateTransaction(req.params.id, {
          quidaxWithdrawalId: transferResult.reference,
          status: "completed",
        });
        
        console.log(`[Transfer] Transaction ${req.params.id} marked as completed`);
        
        res.json({ 
          success: true, 
          message: "Transfer completed successfully",
          reference: transferResult.reference
        });
      } catch (error: any) {
        console.error(`[Transfer] Failed to process Naira transfer for ${req.params.id}:`, {
          message: error.message,
          stack: error.stack,
          response: error.response?.data
        });
        await storage.updateTransactionStatus(req.params.id, "failed");
        return res.status(500).json({ 
          error: error.message || "Failed to process transfer",
          details: "Transfer to bank account failed. Please contact support with your transaction ID."
        });
      }
    } catch (error: any) {
      console.error("Transaction processing error:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid request data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to process transaction" });
      }
    }
  });

  // Get transaction by ID
  app.get("/api/transactions/:id", async (req, res) => {
    const transaction = await storage.getTransaction(req.params.id);
    
    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    res.json(transaction);
  });

  // Get all transactions
  app.get("/api/transactions", async (req, res) => {
    const transactions = await storage.getAllTransactions();
    res.json(transactions);
  });

  const httpServer = createServer(app);

  return httpServer;
}
