import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, json, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Type for sell conversation data
export interface SellConversationData {
  token: string;
  blockchain: string;
  availableAmount?: string;
  amount?: string;
  nairaRate?: string;
  nairaAmount?: string;
  platformFee?: string;
  netAmount?: string;
}

// Messenger Users - ExBit bot users with custodial wallets
export const messengerUsers = pgTable("messenger_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  messengerId: text("messenger_id").notNull().unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  // Wallet addresses for each blockchain (JSON: { ethereum: "0x...", bsc: "0x...", ... })
  walletAddresses: json("wallet_addresses").$type<Record<string, string>>(),
  // Encrypted private keys (JSON: { ethereum: "encrypted...", bsc: "encrypted...", ... })
  encryptedKeys: text("encrypted_keys"),
  // Transaction PIN (hashed with bcrypt)
  transactionPin: text("transaction_pin"),
  // Security question for PIN recovery
  securityQuestion: text("security_question"),
  securityAnswer: text("security_answer"),
  // Onboarding status
  hasCompletedOnboarding: boolean("has_completed_onboarding").default(false).notNull(),
  onboardingStep: text("onboarding_step"),
  tempHashedPin: text("temp_hashed_pin"),
  // Sell conversation state
  sellConversationState: text("sell_conversation_state"),
  sellConversationData: json("sell_conversation_data").$type<SellConversationData>(),
  // PIN reset state
  pinResetState: text("pin_reset_state"),
  tempHashedNewPin: text("temp_hashed_new_pin"),
  // Pending bank details (from webview, expires after 30 min)
  pendingBankDetails: json("pending_bank_details").$type<{
    bankName: string;
    accountNumber: string;
    accountName: string;
    timestamp: number;
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMessengerUserSchema = createInsertSchema(messengerUsers).omit({
  id: true,
  createdAt: true,
});

export type InsertMessengerUser = z.infer<typeof insertMessengerUserSchema>;
export type MessengerUser = typeof messengerUsers.$inferSelect;

// Transactions - Crypto to Naira swaps
export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  messengerUserId: varchar("messenger_user_id").notNull(),
  blockchain: text("blockchain").notNull(),
  token: text("token").notNull(),
  amount: decimal("amount", { precision: 18, scale: 8 }).notNull(),
  nairaAmount: decimal("naira_amount", { precision: 18, scale: 2 }).notNull(),
  exchangeRate: decimal("exchange_rate", { precision: 18, scale: 2 }).notNull(),
  platformFee: decimal("platform_fee", { precision: 18, scale: 8 }).notNull(),
  platformFeeNaira: decimal("platform_fee_naira", { precision: 18, scale: 2 }).notNull(),
  netAmount: decimal("net_amount", { precision: 18, scale: 8 }).notNull(),
  netNairaAmount: decimal("net_naira_amount", { precision: 18, scale: 2 }).notNull(),
  bankName: text("bank_name").notNull(),
  accountNumber: text("account_number").notNull(),
  accountName: text("account_name"),
  // Blockchain transaction hash (incoming deposit or outgoing crypto transfer to owner)
  depositTransactionHash: text("deposit_transaction_hash"),
  // Flutterwave transfer reference when sending Naira to user's bank
  flutterwaveReference: text("flutterwave_reference"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

// Deposits - Incoming crypto deposits to user wallets
export const deposits = pgTable("deposits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  messengerUserId: varchar("messenger_user_id").notNull(),
  blockchain: text("blockchain").notNull(),
  token: text("token").notNull(),
  amount: decimal("amount", { precision: 18, scale: 8 }).notNull(),
  toAddress: text("to_address").notNull(),
  fromAddress: text("from_address"),
  transactionHash: text("transaction_hash").notNull().unique(),
  blockNumber: text("block_number"),
  confirmations: text("confirmations").default("0"),
  status: text("status").notNull().default("pending"),
  detectedAt: timestamp("detected_at").defaultNow().notNull(),
  confirmedAt: timestamp("confirmed_at"),
});

export const insertDepositSchema = createInsertSchema(deposits).omit({
  id: true,
  detectedAt: true,
});

export type InsertDeposit = z.infer<typeof insertDepositSchema>;
export type Deposit = typeof deposits.$inferSelect;

// Beneficiaries - Saved Nigerian bank accounts for faster transfers
export const beneficiaries = pgTable("beneficiaries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  messengerUserId: varchar("messenger_user_id").notNull(),
  bankName: text("bank_name").notNull(),
  accountNumber: text("account_number").notNull(),
  accountName: text("account_name").notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertBeneficiarySchema = createInsertSchema(beneficiaries).omit({
  id: true,
  createdAt: true,
});

export type InsertBeneficiary = z.infer<typeof insertBeneficiarySchema>;
export type Beneficiary = typeof beneficiaries.$inferSelect;

// Blockchain Monitoring State - Persists last checked block per wallet/chain
export const monitoringState = pgTable("monitoring_state", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  messengerUserId: varchar("messenger_user_id").notNull(),
  blockchain: text("blockchain").notNull(),
  walletAddress: text("wallet_address").notNull(),
  lastCheckedBlock: text("last_checked_block").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertMonitoringStateSchema = createInsertSchema(monitoringState).omit({
  id: true,
  updatedAt: true,
});

export type InsertMonitoringState = z.infer<typeof insertMonitoringStateSchema>;
export type MonitoringState = typeof monitoringState.$inferSelect;

// Web Chat Users - Users connecting via web agent (connected wallet, no custodial wallet)
export const webUsers = pgTable("web_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: text("wallet_address").notNull().unique(),
  sessionId: text("session_id").notNull().unique(),
  // Current swap conversation state
  swapState: text("swap_state"), // null, "awaiting_bank_details", "awaiting_signature"
  swapData: json("swap_data").$type<{
    blockchain?: string;
    token?: string;
    amount?: string;
    nairaRate?: string;
    nairaAmount?: string;
    platformFee?: string;
    netAmount?: string;
    bankName?: string;
    accountNumber?: string;
    accountName?: string;
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastActiveAt: timestamp("last_active_at").defaultNow().notNull(),
});

export const insertWebUserSchema = createInsertSchema(webUsers).omit({
  id: true,
  createdAt: true,
  lastActiveAt: true,
});

export type InsertWebUser = z.infer<typeof insertWebUserSchema>;
export type WebUser = typeof webUsers.$inferSelect;

// Web Chat Messages - Conversation history for web agent
export const webMessages = pgTable("web_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  webUserId: varchar("web_user_id").notNull(),
  role: text("role").notNull(), // "user" or "assistant"
  content: text("content").notNull(),
  // Optional metadata for rich messages (buttons, quotes, etc.)
  metadata: json("metadata").$type<{
    type?: string;
    data?: any;
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertWebMessageSchema = createInsertSchema(webMessages).omit({
  id: true,
  createdAt: true,
});

export type InsertWebMessage = z.infer<typeof insertWebMessageSchema>;
export type WebMessage = typeof webMessages.$inferSelect;

// Web Transactions - Crypto swaps via web agent (non-custodial)
export const webTransactions = pgTable("web_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  webUserId: varchar("web_user_id").notNull(),
  walletAddress: text("wallet_address").notNull(),
  blockchain: text("blockchain").notNull(),
  token: text("token").notNull(),
  amount: decimal("amount", { precision: 18, scale: 8 }).notNull(),
  nairaAmount: decimal("naira_amount", { precision: 18, scale: 2 }).notNull(),
  exchangeRate: decimal("exchange_rate", { precision: 18, scale: 2 }).notNull(),
  platformFee: decimal("platform_fee", { precision: 18, scale: 8 }).notNull(),
  platformFeeNaira: decimal("platform_fee_naira", { precision: 18, scale: 2 }).notNull(),
  netAmount: decimal("net_amount", { precision: 18, scale: 8 }).notNull(),
  netNairaAmount: decimal("net_naira_amount", { precision: 18, scale: 2 }).notNull(),
  bankName: text("bank_name").notNull(),
  accountNumber: text("account_number").notNull(),
  accountName: text("account_name"),
  // Blockchain transaction hash (user's signed transaction)
  transactionHash: text("transaction_hash"),
  // Flutterwave transfer reference
  flutterwaveReference: text("flutterwave_reference"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const insertWebTransactionSchema = createInsertSchema(webTransactions).omit({
  id: true,
  createdAt: true,
});

export type InsertWebTransaction = z.infer<typeof insertWebTransactionSchema>;
export type WebTransaction = typeof webTransactions.$inferSelect;

// Legacy users table (keeping for backward compatibility)
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
