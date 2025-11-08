import { users, transactions, messengerUsers, type User, type InsertUser, type Transaction, type InsertTransaction } from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

interface PendingBankDetails {
  bankName: string;
  accountNumber: string;
  accountName: string;
  timestamp: number;
}

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getTransaction(id: string): Promise<Transaction | undefined>;
  getAllTransactions(): Promise<Transaction[]>;
  updateTransactionStatus(id: string, status: string): Promise<Transaction | undefined>;
  updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction | undefined>;
  
  savePendingBankDetails(psid: string, details: Omit<PendingBankDetails, 'timestamp'>): Promise<void>;
  getPendingBankDetails(psid: string): Promise<PendingBankDetails | undefined>;
  clearPendingBankDetails(psid: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const [transaction] = await db
      .insert(transactions)
      .values(insertTransaction)
      .returning();
    return transaction;
  }

  async getTransaction(id: string): Promise<Transaction | undefined> {
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, id));
    return transaction || undefined;
  }

  async getAllTransactions(): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .orderBy(desc(transactions.createdAt));
  }

  async updateTransactionStatus(id: string, status: string): Promise<Transaction | undefined> {
    const [transaction] = await db
      .update(transactions)
      .set({ status })
      .where(eq(transactions.id, id))
      .returning();
    return transaction || undefined;
  }

  async updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction | undefined> {
    const [transaction] = await db
      .update(transactions)
      .set(updates)
      .where(eq(transactions.id, id))
      .returning();
    return transaction || undefined;
  }

  async savePendingBankDetails(psid: string, details: Omit<PendingBankDetails, 'timestamp'>): Promise<void> {
    const bankDetails = {
      ...details,
      timestamp: Date.now(),
    };
    
    await db
      .update(messengerUsers)
      .set({ pendingBankDetails: bankDetails })
      .where(eq(messengerUsers.messengerId, psid));
  }

  async getPendingBankDetails(psid: string): Promise<PendingBankDetails | undefined> {
    const [user] = await db
      .select()
      .from(messengerUsers)
      .where(eq(messengerUsers.messengerId, psid));
    
    if (!user || !user.pendingBankDetails) {
      return undefined;
    }
    
    const details = user.pendingBankDetails as PendingBankDetails;
    const thirtyMinutes = 30 * 60 * 1000;
    
    if (Date.now() - details.timestamp > thirtyMinutes) {
      await this.clearPendingBankDetails(psid);
      return undefined;
    }
    
    return details;
  }

  async clearPendingBankDetails(psid: string): Promise<void> {
    await db
      .update(messengerUsers)
      .set({ pendingBankDetails: null })
      .where(eq(messengerUsers.messengerId, psid));
  }
}

export const storage = new DatabaseStorage();
