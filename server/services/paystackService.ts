import axios from "axios";

interface PaystackBankAccount {
  account_number: string;
  account_name: string;
  bank_code: string;
}

interface PaystackTransferRecipient {
  recipient_code: string;
  type: string;
  name: string;
  details: {
    account_number: string;
    account_name: string;
    bank_code: string;
    bank_name: string;
  };
}

interface PaystackTransfer {
  transfer_code: string;
  reference: string;
  status: string;
  amount: number;
}

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
  "Kuda Bank": "50211",
  "Opay": "999992",
  "PalmPay": "999991",
};

export class PaystackService {
  private apiKey: string;
  private baseUrl = "https://api.paystack.co";

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.PAYSTACK_SECRET_KEY || "";
  }

  private getHeaders() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };
  }

  async validateBankAccount(
    accountNumber: string,
    bankName: string
  ): Promise<{ accountName: string; accountNumber: string }> {
    if (!this.apiKey) {
      console.warn("PAYSTACK_SECRET_KEY not set, using mock validation");
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
        throw new Error(`Bank code not found for ${bankName}`);
      }

      const response = await axios.get(
        `${this.baseUrl}/bank/resolve`,
        {
          params: {
            account_number: accountNumber,
            bank_code: bankCode,
          },
          headers: this.getHeaders(),
        }
      );

      if (response.data.status && response.data.data) {
        return {
          accountName: response.data.data.account_name,
          accountNumber: response.data.data.account_number,
        };
      }

      throw new Error("Invalid account details");
    } catch (error: any) {
      console.error("Paystack account validation error:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || "Failed to validate account");
    }
  }

  async createTransferRecipient(
    accountNumber: string,
    accountName: string,
    bankName: string
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error("PAYSTACK_SECRET_KEY is required for transfers");
    }

    try {
      const bankCode = BANK_CODES[bankName];
      if (!bankCode) {
        throw new Error(`Bank code not found for ${bankName}`);
      }

      const response = await axios.post(
        `${this.baseUrl}/transferrecipient`,
        {
          type: "nuban",
          name: accountName,
          account_number: accountNumber,
          bank_code: bankCode,
          currency: "NGN",
        },
        { headers: this.getHeaders() }
      );

      if (response.data.status && response.data.data) {
        return response.data.data.recipient_code;
      }

      throw new Error("Failed to create transfer recipient");
    } catch (error: any) {
      console.error("Paystack create recipient error:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || "Failed to create transfer recipient");
    }
  }

  async initiateTransfer(
    recipientCode: string,
    amount: number,
    reference: string
  ): Promise<{ transferCode: string; reference: string }> {
    if (!this.apiKey) {
      throw new Error("PAYSTACK_SECRET_KEY is required for transfers");
    }

    try {
      const amountInKobo = Math.round(amount * 100);

      const response = await axios.post(
        `${this.baseUrl}/transfer`,
        {
          source: "balance",
          amount: amountInKobo,
          recipient: recipientCode,
          reference,
          reason: "NairaSwap crypto exchange",
        },
        { headers: this.getHeaders() }
      );

      if (response.data.status && response.data.data) {
        return {
          transferCode: response.data.data.transfer_code,
          reference: response.data.data.reference,
        };
      }

      throw new Error("Failed to initiate transfer");
    } catch (error: any) {
      console.error("Paystack transfer error:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || "Failed to initiate transfer");
    }
  }

  async verifyTransfer(reference: string): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }

    try {
      const response = await axios.get(
        `${this.baseUrl}/transfer/verify/${reference}`,
        { headers: this.getHeaders() }
      );

      return response.data.status && response.data.data.status === "success";
    } catch (error) {
      console.error("Paystack verify transfer error:", error);
      return false;
    }
  }
}

export const paystackService = new PaystackService();
