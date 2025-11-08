import axios from "axios";

const FLUTTERWAVE_BASE_URL = "https://api.flutterwave.com/v3";
const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY;

interface TransferResponse {
  id: number;
  account_number: string;
  bank_code: string;
  full_name: string;
  created_at: string;
  currency: string;
  debit_currency: string;
  amount: number;
  fee: number;
  status: string;
  reference: string;
  meta: any;
  narration: string;
  complete_message: string;
  requires_approval: number;
  is_approved: number;
  bank_name: string;
}

interface FlutterwaveTransferResponse {
  status: string;
  message: string;
  data: TransferResponse;
}

export class FlutterwaveTransferService {
  private client;

  constructor() {
    if (!FLUTTERWAVE_SECRET_KEY) {
      throw new Error("FLUTTERWAVE_SECRET_KEY is not set in environment variables");
    }

    this.client = axios.create({
      baseURL: FLUTTERWAVE_BASE_URL,
      headers: {
        Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: 30000,
    });
  }

  async transferToBank(
    amount: number,
    bankCode: string,
    accountNumber: string,
    accountName: string,
    narration: string = "ExBit Crypto Swap"
  ): Promise<TransferResponse> {
    // Validate inputs
    if (amount <= 0) {
      throw new Error(`Invalid transfer amount: ₦${amount}. Must be greater than 0`);
    }

    const minimumTransfer = 100; // Flutterwave minimum transfer
    if (amount < minimumTransfer) {
      throw new Error(
        `Amount ₦${amount} is below minimum transfer of ₦${minimumTransfer}`
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
      // Generate unique reference
      const reference = `EXBIT_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      const response = await this.client.post<FlutterwaveTransferResponse>("/transfers", {
        account_bank: bankCode,
        account_number: accountNumber,
        amount: amount,
        narration: narration,
        currency: "NGN",
        reference: reference,
        callback_url: process.env.FLUTTERWAVE_CALLBACK_URL || "",
        debit_currency: "NGN",
      });

      if (response.data.status !== "success") {
        throw new Error(response.data.message || "Transfer failed");
      }

      console.log(`[Flutterwave] Created NGN transfer:`, {
        id: response.data.data.id,
        reference: response.data.data.reference,
        amount,
        accountNumber: `***${accountNumber.slice(-4)}`,
        status: response.data.data.status,
      });

      return response.data.data;
    } catch (error: any) {
      console.error("[Flutterwave] Error creating transfer:", {
        message: error.message,
        response: error.response?.data,
      });

      // Provide user-friendly error messages
      const errorMsg = error.response?.data?.message || error.message;
      if (errorMsg.includes("insufficient")) {
        throw new Error(`Insufficient balance in Flutterwave account`);
      }
      if (errorMsg.includes("invalid account") || errorMsg.includes("not found")) {
        throw new Error("Bank account validation failed. Please check account details");
      }

      throw new Error(
        error.response?.data?.message ||
          "Failed to create transfer via Flutterwave"
      );
    }
  }

  async getTransferStatus(transferId: number): Promise<TransferResponse> {
    try {
      const response = await this.client.get<FlutterwaveTransferResponse>(`/transfers/${transferId}`);

      if (response.data.status !== "success") {
        throw new Error(response.data.message || "Failed to get transfer status");
      }

      return response.data.data;
    } catch (error: any) {
      console.error("[Flutterwave] Error fetching transfer status:", {
        transferId,
        message: error.message,
        response: error.response?.data,
      });

      throw new Error(
        error.response?.data?.message || "Failed to fetch transfer status"
      );
    }
  }
}

export const flutterwaveTransferService = new FlutterwaveTransferService();
