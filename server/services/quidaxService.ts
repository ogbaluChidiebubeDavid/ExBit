import axios, { AxiosInstance } from "axios";

// Quidax API configuration
const QUIDAX_BASE_URL = "https://www.quidax.com/api/v1";

// Supported tokens on Quidax
export const QUIDAX_SUPPORTED_TOKENS = {
  BTC: "btc",
  ETH: "eth",
  USDT: "usdt",
  USDC: "usdc",
  BNB: "bnb",
  MATIC: "matic",
} as const;

export type QuidaxToken = keyof typeof QUIDAX_SUPPORTED_TOKENS;

interface InstantOrderResponse {
  id: string;
  bid: string;
  ask: string;
  type: "buy" | "sell";
  price: string;
  volume: string;
  total: string;
  fee: string;
  status: "pend" | "confirm" | "done" | "cancel";
  created_at: string;
}

interface WithdrawalResponse {
  id: string;
  currency: string;
  amount: string;
  fee: string;
  status: "pending" | "processing" | "done" | "canceled";
  created_at: string;
  txid?: string;
}

interface AccountBalance {
  currency: string;
  balance: string;
  locked_balance: string;
}

class QuidaxService {
  private client: AxiosInstance;
  private secretKey: string;

  constructor() {
    this.secretKey = process.env.QUIDAX_SECRET_KEY || "";

    if (!this.secretKey) {
      console.error("[Quidax] QUIDAX_SECRET_KEY not configured");
    }

    this.client = axios.create({
      baseURL: QUIDAX_BASE_URL,
      headers: {
        "Authorization": `Bearer ${this.secretKey}`,
        "Content-Type": "application/json",
      },
    });
  }

  // Create an instant sell order (sell crypto for NGN)
  async createInstantSellOrder(
    token: QuidaxToken,
    amount: number
  ): Promise<InstantOrderResponse> {
    // Validate inputs
    if (amount <= 0) {
      throw new Error(`Invalid amount: ${amount}. Amount must be greater than 0`);
    }

    if (!QUIDAX_SUPPORTED_TOKENS[token]) {
      throw new Error(`Unsupported token: ${token}`);
    }

    try {
      const tokenSymbol = QUIDAX_SUPPORTED_TOKENS[token];

      const response = await this.client.post("/users/me/instant_orders", {
        bid: "ngn",
        ask: tokenSymbol,
        type: "sell",
        total: amount.toString(),
        unit: tokenSymbol,
      });

      console.log(`[Quidax] Created instant sell order:`, {
        id: response.data.data.id,
        token,
        amount,
        total: response.data.data.total,
      });

      return response.data.data;
    } catch (error: any) {
      console.error("[Quidax] Error creating instant sell order:", {
        message: error.message,
        response: error.response?.data,
      });

      // Provide user-friendly error messages
      const errorMsg = error.response?.data?.message || error.message;
      if (errorMsg.includes("insufficient")) {
        throw new Error(`Insufficient ${token} balance on Quidax`);
      }
      throw new Error(
        error.response?.data?.message || "Failed to create sell order on Quidax"
      );
    }
  }

  // Confirm an instant order (execute the trade)
  async confirmInstantOrder(orderId: string): Promise<InstantOrderResponse> {
    try {
      const response = await this.client.post(
        `/users/me/instant_orders/${orderId}/confirm`
      );

      console.log(`[Quidax] Confirmed instant order ${orderId}`);

      return response.data.data;
    } catch (error: any) {
      console.error("[Quidax] Error confirming instant order:", {
        orderId,
        message: error.message,
        response: error.response?.data,
      });
      throw new Error(
        error.response?.data?.message || "Failed to confirm order on Quidax"
      );
    }
  }

  // Get instant order details
  async getInstantOrder(orderId: string): Promise<InstantOrderResponse> {
    try {
      const response = await this.client.get(
        `/users/me/instant_orders/${orderId}`
      );

      return response.data.data;
    } catch (error: any) {
      console.error("[Quidax] Error fetching instant order:", {
        orderId,
        message: error.message,
        response: error.response?.data,
      });
      throw new Error(
        error.response?.data?.message || "Failed to fetch order from Quidax"
      );
    }
  }

  // Withdraw NGN to Nigerian bank account
  async withdrawToBank(
    amount: number,
    bankCode: string,
    accountNumber: string,
    accountName: string
  ): Promise<WithdrawalResponse> {
    // Validate inputs
    if (amount <= 0) {
      throw new Error(`Invalid withdrawal amount: ₦${amount}. Must be greater than 0`);
    }

    const minimumWithdrawal = 100; // Quidax minimum withdrawal
    if (amount < minimumWithdrawal) {
      throw new Error(
        `Amount ₦${amount} is below minimum withdrawal of ₦${minimumWithdrawal}`
      );
    }

    if (!bankCode || bankCode.length < 3) {
      throw new Error("Invalid bank code");
    }

    if (!accountNumber || accountNumber.length !== 10) {
      throw new Error("Account number must be exactly 10 digits");
    }

    if (!accountName || accountName.trim().length === 0) {
      throw new Error("Account name is required");
    }

    try {
      const response = await this.client.post("/users/me/withdrawals", {
        currency: "ngn",
        amount: amount.toString(),
        bank_code: bankCode,
        account_number: accountNumber,
        account_name: accountName,
      });

      console.log(`[Quidax] Created NGN withdrawal:`, {
        id: response.data.data.id,
        amount,
        accountNumber: `***${accountNumber.slice(-4)}`,
      });

      return response.data.data;
    } catch (error: any) {
      console.error("[Quidax] Error creating withdrawal:", {
        message: error.message,
        response: error.response?.data,
      });

      // Provide user-friendly error messages
      const errorMsg = error.response?.data?.message || error.message;
      if (errorMsg.includes("insufficient")) {
        throw new Error(`Insufficient NGN balance. Available: ₦${await this.getNGNBalance()}`);
      }
      if (errorMsg.includes("invalid account")) {
        throw new Error("Bank account validation failed. Please check account details");
      }

      throw new Error(
        error.response?.data?.message ||
          "Failed to create withdrawal on Quidax"
      );
    }
  }

  // Get account balances
  async getBalances(): Promise<AccountBalance[]> {
    try {
      const response = await this.client.get("/users/me");

      return response.data.data.balances || [];
    } catch (error: any) {
      console.error("[Quidax] Error fetching balances:", {
        message: error.message,
        response: error.response?.data,
      });
      throw new Error(
        error.response?.data?.message || "Failed to fetch balances from Quidax"
      );
    }
  }

  // Get NGN balance
  async getNGNBalance(): Promise<number> {
    try {
      const balances = await this.getBalances();
      const ngnBalance = balances.find((b) => b.currency === "ngn");

      return parseFloat(ngnBalance?.balance || "0");
    } catch (error) {
      console.error("[Quidax] Error fetching NGN balance:", error);
      return 0;
    }
  }

  // Get market price for a token in NGN (read-only, no order creation)
  async getMarketPrice(token: QuidaxToken): Promise<number> {
    try {
      const tokenSymbol = QUIDAX_SUPPORTED_TOKENS[token];
      const market = `${tokenSymbol}ngn`; // e.g., "btcngn", "ethngn", "usdtngn"

      // Use public ticker endpoint (no authentication needed, no order creation)
      const response = await axios.get(
        `${QUIDAX_BASE_URL}/markets/tickers/${market}`
      );

      const tickerData = response.data.data.ticker;
      
      // Use the sell price (what users get when selling crypto for NGN)
      const sellPrice = parseFloat(tickerData.sell || tickerData.last);

      console.log(`[Quidax] Market price for ${token}: ₦${sellPrice}`);

      return sellPrice;
    } catch (error: any) {
      console.error("[Quidax] Error fetching market price:", {
        token,
        message: error.message,
      });
      throw new Error(`Failed to fetch ${token} price from Quidax`);
    }
  }

  // Map Nigerian bank names to Quidax bank codes
  getBankCode(bankName: string): string {
    const bankCodes: Record<string, string> = {
      "Access Bank": "044",
      "Citibank": "023",
      "Diamond Bank": "063",
      "Ecobank Nigeria": "050",
      "Fidelity Bank Nigeria": "070",
      "First Bank of Nigeria": "011",
      "First City Monument Bank": "214",
      "Guaranty Trust Bank": "058",
      "Heritage Bank": "030",
      "Keystone Bank": "082",
      "Polaris Bank": "076",
      "Providus Bank": "101",
      "Stanbic IBTC Bank": "221",
      "Standard Chartered Bank": "068",
      "Sterling Bank": "232",
      "Union Bank of Nigeria": "032",
      "United Bank for Africa": "033",
      "Unity Bank": "215",
      "Wema Bank": "035",
      "Zenith Bank": "057",
    };

    return bankCodes[bankName] || "";
  }

  // Calculate platform fee (0.1% or $0.10 minimum)
  calculatePlatformFee(amount: number, nairaValue: number): number {
    const feePercent = nairaValue * 0.001; // 0.1%
    const minimumFee = 143; // ₦143 (approximately $0.10)

    return Math.max(feePercent, minimumFee);
  }
}

export const quidaxService = new QuidaxService();
