import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  blockchain: text("blockchain").notNull(),
  token: text("token").notNull(),
  amount: decimal("amount", { precision: 18, scale: 8 }).notNull(),
  nairaAmount: decimal("naira_amount", { precision: 18, scale: 2 }).notNull(),
  exchangeRate: decimal("exchange_rate", { precision: 18, scale: 2 }).notNull(),
  platformFee: decimal("platform_fee", { precision: 18, scale: 8 }).notNull(),
  netAmount: decimal("net_amount", { precision: 18, scale: 8 }).notNull(),
  bankName: text("bank_name").notNull(),
  accountNumber: text("account_number").notNull(),
  accountName: text("account_name"),
  userWalletAddress: text("user_wallet_address"),
  transactionHash: text("transaction_hash"),
  paystackReference: text("paystack_reference"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
