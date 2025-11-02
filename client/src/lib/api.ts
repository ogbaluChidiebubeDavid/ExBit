import type { Transaction } from "@shared/schema";

export interface ExchangeRates {
  [blockchain: string]: {
    [token: string]: number;
  };
}

export interface AccountValidationResponse {
  accountName: string;
  verified: boolean;
}

export const api = {
  async getExchangeRates(): Promise<ExchangeRates> {
    const response = await fetch("/api/rates");
    if (!response.ok) throw new Error("Failed to fetch exchange rates");
    return response.json();
  },

  async validateAccount(bankName: string, accountNumber: string): Promise<AccountValidationResponse> {
    const response = await fetch("/api/validate-account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bankName, accountNumber }),
    });
    if (!response.ok) throw new Error("Failed to validate account");
    return response.json();
  },

  async createTransaction(data: {
    blockchain: string;
    token: string;
    amount: string;
    nairaAmount: string;
    exchangeRate: string;
    bankName: string;
    accountNumber: string;
    accountName: string;
    status: string;
  }): Promise<Transaction> {
    const response = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to create transaction");
    return response.json();
  },

  async getTransaction(id: string): Promise<Transaction> {
    const response = await fetch(`/api/transactions/${id}`);
    if (!response.ok) throw new Error("Failed to fetch transaction");
    return response.json();
  },

  async getAllTransactions(): Promise<Transaction[]> {
    const response = await fetch("/api/transactions");
    if (!response.ok) throw new Error("Failed to fetch transactions");
    return response.json();
  },
};
