import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTransactionSchema } from "@shared/schema";
import { z } from "zod";
import { priceService } from "./services/priceService";
import { paystackService } from "./services/paystackService";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get exchange rates from Binance API
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

  // Diagnostic endpoint to check Paystack key status
  app.get("/api/paystack-status", async (req, res) => {
    const apiKey = process.env.PAYSTACK_SECRET_KEY;
    
    if (!apiKey) {
      return res.json({
        status: "missing",
        message: "PAYSTACK_SECRET_KEY is not set",
      });
    }

    const keyType = apiKey.startsWith("sk_live_") ? "live" : apiKey.startsWith("sk_test_") ? "test" : "unknown";
    const maskedKey = apiKey.slice(0, 12) + "..." + apiKey.slice(-4);
    
    res.json({
      status: "configured",
      keyType,
      maskedKey,
      message: `Paystack API key is set (${keyType} mode)`,
    });
  });

  // Validate bank account using Paystack API
  app.post("/api/validate-account", async (req, res) => {
    const schema = z.object({
      bankName: z.string(),
      accountNumber: z.string().length(10),
    });

    try {
      const { bankName, accountNumber } = schema.parse(req.body);
      
      console.log(`[Validation] Attempting to validate account: ${accountNumber} at ${bankName}`);
      console.log(`[Validation] API Key type: ${process.env.PAYSTACK_SECRET_KEY?.startsWith("sk_live_") ? "LIVE" : "TEST"}`);

      const result = await paystackService.validateBankAccount(accountNumber, bankName);
      
      console.log(`[Validation] Success: ${result.accountName}`);

      res.json({ accountName: result.accountName, verified: true });
    } catch (error: any) {
      console.error("[Validation] Error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        bankName: req.body.bankName,
        accountNumber: req.body.accountNumber
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
    const schema = z.object({
      transactionHash: z.string(),
    });

    try {
      const { transactionHash } = schema.parse(req.body);
      const transaction = await storage.getTransaction(req.params.id);

      if (!transaction) {
        return res.status(404).json({ error: "Transaction not found" });
      }

      if (transaction.status !== "pending") {
        return res.status(400).json({ error: "Transaction already processed" });
      }

      await storage.updateTransaction(req.params.id, {
        transactionHash,
        status: "processing",
      });

      const ownerWalletAddress = process.env.OWNER_WALLET_ADDRESS;
      if (!ownerWalletAddress) {
        console.warn("OWNER_WALLET_ADDRESS not set - platform fees will not be collected");
      }

      setTimeout(async () => {
        try {
          if (!transaction.accountName || !transaction.accountNumber || !transaction.bankName) {
            await storage.updateTransactionStatus(req.params.id, "failed");
            return;
          }

          const recipientCode = await paystackService.createTransferRecipient(
            transaction.accountNumber,
            transaction.accountName,
            transaction.bankName
          );

          const netNairaAmount = parseFloat(transaction.netNairaAmount);

          const transferResult = await paystackService.initiateTransfer(
            recipientCode,
            netNairaAmount,
            `nairaswap-${transaction.id}`
          );

          await storage.updateTransaction(req.params.id, {
            paystackReference: transferResult.reference,
            status: "completed",
          });
        } catch (error: any) {
          console.error("Failed to process Naira transfer:", error);
          await storage.updateTransactionStatus(req.params.id, "failed");
        }
      }, 2000);

      res.json({ success: true, message: "Transaction processing started" });
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
