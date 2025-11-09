import axios from "axios";

const BANK_CODES: Record<string, string> = {
  "Access Bank": "044",
  "Guaranty Trust Bank": "058",
  "United Bank for Africa": "033",
  "Zenith Bank": "057",
  "First Bank of Nigeria": "011",
  "Fidelity Bank": "070",
  "Union Bank": "032",
  "Stanbic IBTC Bank": "221",
  "Sterling Bank": "232",
  "Wema Bank": "035",
  "Polaris Bank": "076",
  "Ecobank": "050",
  "Keystone Bank": "082",
  "FCMB": "214",
  "Heritage Bank": "030",
  "Jaiz Bank": "301",
  "Providus Bank": "101",
  "Kuda Bank": "090267",
  "Opay": "100004",
  "PalmPay": "100033",
};

export class FlutterwaveService {
  private apiKey: string;
  private baseUrl = "https://api.flutterwave.com/v3";

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.FLUTTERWAVE_SECRET_KEY || "";
  }

  private getHeaders() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };
  }

  getBankCode(bankName: string): string | null {
    return BANK_CODES[bankName] || null;
  }

  async validateBankAccount(
    accountNumber: string,
    bankName: string
  ): Promise<{ accountName: string; accountNumber: string }> {
    if (!this.apiKey) {
      console.warn("FLUTTERWAVE_SECRET_KEY not set, using mock validation");
      const mockNames = [
        "CHIDERA OKONKWO",
        "OLUWASEUN WILLIAMS",
        "AMAKA NWOSU",
        "CHUKWUEMEKA IGWE",
        "FOLASADE ADEYEMI",
      ];
      const randomName = mockNames[Math.floor(Math.random() * mockNames.length)];
      
      await new Promise((resolve) => setTimeout(resolve, 500));
      return {
        accountName: randomName,
        accountNumber,
      };
    }

    try {
      const bankCode = BANK_CODES[bankName];
      if (!bankCode) {
        console.error(`[Flutterwave] Bank not found in codes: ${bankName}`);
        throw new Error(`Bank "${bankName}" is not supported. Please select a valid Nigerian bank.`);
      }

      console.log(`[Flutterwave] Resolving account for bank ${bankName} (code: ${bankCode})`);

      const response = await axios.post(
        `${this.baseUrl}/accounts/resolve`,
        {
          account_number: accountNumber,
          account_bank: bankCode,
        },
        { headers: this.getHeaders() }
      );

      console.log(`[Flutterwave] Response status: ${response.data.status}`);

      if (response.data.status === "success" && response.data.data) {
        return {
          accountName: response.data.data.account_name,
          accountNumber: response.data.data.account_number,
        };
      }

      throw new Error("Could not verify account number. Please check the details and try again.");
    } catch (error: any) {
      console.error("[Flutterwave] Validation error:", {
        message: error.message,
        status: error.response?.status,
        bankName
      });

      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      
      if (error.response?.status === 422) {
        throw new Error("Invalid account number or bank details. Please verify and try again.");
      }
      
      if (error.response?.status === 401) {
        throw new Error("Payment service authentication failed. Please contact support.");
      }

      throw new Error(error.message || "Unable to verify account details at this time. Please try again.");
    }
  }

  async initiateTransfer(
    accountNumber: string,
    accountName: string,
    bankName: string,
    amount: number,
    reference: string
  ): Promise<{ transferId: string; reference: string; status: string }> {
    if (!this.apiKey) {
      throw new Error("FLUTTERWAVE_SECRET_KEY is required for transfers");
    }

    try {
      const bankCode = BANK_CODES[bankName];
      if (!bankCode) {
        throw new Error(`Bank code not found for ${bankName}`);
      }

      console.log(`[Flutterwave] Initiating transfer of ₦${amount} to ${bankName} (${accountNumber})`);

      const response = await axios.post(
        `${this.baseUrl}/transfers`,
        {
          account_bank: bankCode,
          account_number: accountNumber,
          amount,
          currency: "NGN",
          narration: "ExBit crypto exchange",
          reference,
          callback_url: "",
          debit_currency: "NGN",
        },
        { headers: this.getHeaders() }
      );

      console.log(`[Flutterwave] Transfer response:`, JSON.stringify(response.data, null, 2));

      if (response.data.status === "success" && response.data.data) {
        const transferId = response.data.data.id.toString();
        const transferRef = response.data.data.reference || reference;
        const status = response.data.data.status;
        
        // Log detailed status information
        if (status === "NEW" || status === "PENDING") {
          console.warn(`[Flutterwave] ⚠️ Transfer requires approval - ID: ${transferId}, Status: ${status}`);
          console.warn(`[Flutterwave] ⚠️ ACTION REQUIRED: Go to Flutterwave dashboard and approve this transfer, OR enable auto-approval in Settings > Business Settings > Team & Security`);
        } else if (status === "SUCCESSFUL" || status === "success") {
          console.log(`[Flutterwave] ✅ Transfer successful - ID: ${transferId}, Reference: ${transferRef}`);
        } else {
          console.log(`[Flutterwave] Transfer initiated - ID: ${transferId}, Reference: ${transferRef}, Status: ${status}`);
        }
        
        return {
          transferId,
          reference: transferRef,
          status,
        };
      }

      throw new Error("Failed to initiate transfer");
    } catch (error: any) {
      console.error("[Flutterwave] Transfer error - Full details:", {
        message: error.message,
        responseData: error.response?.data,
        responseStatus: error.response?.status,
        requestData: {
          amount,
          bankName,
          bankCode: BANK_CODES[bankName],
          accountNumber: accountNumber.substring(0, 4) + "******",
        }
      });
      
      const errorMsg = error.response?.data?.message || error.message || "Failed to initiate transfer";
      throw new Error(errorMsg);
    }
  }

  async verifyTransfer(transferId: string): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }

    try {
      const response = await axios.get(
        `${this.baseUrl}/transfers/${transferId}`,
        { headers: this.getHeaders() }
      );

      return response.data.status === "success" && 
             (response.data.data.status === "SUCCESSFUL" || response.data.data.status === "success");
    } catch (error) {
      console.error("[Flutterwave] Verify transfer error:", error);
      return false;
    }
  }

  async getWalletBalance(): Promise<{ balance: number; currency: string } | null> {
    if (!this.apiKey) {
      return null;
    }

    try {
      const response = await axios.get(
        `${this.baseUrl}/balances/NGN`,
        { headers: this.getHeaders() }
      );

      console.log("[Flutterwave] Balance response:", response.data);

      if (response.data.status === "success" && response.data.data) {
        return {
          balance: parseFloat(response.data.data.available_balance || response.data.data.balance || "0"),
          currency: response.data.data.currency || "NGN",
        };
      }

      return null;
    } catch (error: any) {
      console.error("[Flutterwave] Balance check error:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      return null;
    }
  }
}

export const flutterwaveService = new FlutterwaveService();
