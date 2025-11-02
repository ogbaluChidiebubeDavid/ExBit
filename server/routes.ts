import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTransactionSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get exchange rates
  app.get("/api/rates", async (req, res) => {
    // Mock exchange rates - in production, this would fetch from a real API
    const rates = {
      ethereum: {
        ETH: 1600000,
        USDT: 1650,
        USDC: 1650,
        WBTC: 95000000,
      },
      bsc: {
        BNB: 950000,
        USDT: 1650,
        USDC: 1650,
      },
      polygon: {
        MATIC: 1400,
        USDT: 1650,
        USDC: 1650,
      },
      arbitrum: {
        ETH: 1600000,
        USDT: 1650,
        USDC: 1650,
      },
      base: {
        ETH: 1600000,
        USDT: 1650,
        USDC: 1650,
      },
    };

    res.json(rates);
  });

  // Validate bank account
  app.post("/api/validate-account", async (req, res) => {
    const schema = z.object({
      bankName: z.string(),
      accountNumber: z.string().length(10),
    });

    try {
      const { bankName, accountNumber } = schema.parse(req.body);

      // Mock account validation - in production, this would call a Nigerian banking API
      // like Paystack or Flutterwave
      await new Promise(resolve => setTimeout(resolve, 500));

      const mockNames = [
        "CHUKWUDI OKONKWO",
        "ADEWALE JOHNSON",
        "NGOZI ADEYEMI",
        "Ibrahim MOHAMMED",
        "OLUWASEUN WILLIAMS",
      ];

      const accountName = mockNames[Math.floor(Math.random() * mockNames.length)];

      res.json({ accountName, verified: true });
    } catch (error) {
      res.status(400).json({ error: "Invalid request data" });
    }
  });

  // Create transaction
  app.post("/api/transactions", async (req, res) => {
    try {
      const data = insertTransactionSchema.parse(req.body);
      const transaction = await storage.createTransaction(data);

      // Simulate transaction processing
      setTimeout(async () => {
        await storage.updateTransactionStatus(transaction.id, "processing");
        
        setTimeout(async () => {
          await storage.updateTransactionStatus(transaction.id, "completed");
        }, 3000);
      }, 2000);

      res.json(transaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid transaction data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create transaction" });
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
