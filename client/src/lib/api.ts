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
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to validate account");
    }
    return response.json();
  },

  async processTransaction(id: string, transactionHash: string): Promise<{ success: boolean; message: string }> {
    console.log('[API] processTransaction called:', { id, transactionHash });
    const response = await fetch(`/api/transactions/${id}/process`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transactionHash }),
    });
    console.log('[API] processTransaction response status:', response.status);
    if (!response.ok) {
      const error = await response.json();
      console.error('[API] processTransaction error:', error);
      throw new Error(error.error || "Failed to process transaction");
    }
    const result = await response.json();
    console.log('[API] processTransaction result:', result);
    return result;
  },

  async createTransaction(data: {
    blockchain: string;
    token: string;
    amount: string;
    nairaAmount: string;
    exchangeRate: string;
    platformFee: string;
    platformFeeNaira: string;
    netAmount: string;
    netNairaAmount: string;
    bankName: string;
    accountNumber: string;
    accountName: string;
    userWalletAddress?: string;
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
