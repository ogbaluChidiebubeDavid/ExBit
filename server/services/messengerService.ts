import crypto from "crypto";
import axios from "axios";

class MessengerService {
  private pageAccessToken: string;
  private appSecret: string;
  private verifyToken: string;

  constructor() {
    this.pageAccessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN || "";
    this.appSecret = process.env.FACEBOOK_APP_SECRET || "";
    this.verifyToken = process.env.FACEBOOK_VERIFY_TOKEN || "exbit_verify_token_2024";
  }

  // Verify webhook requests from Facebook using raw body buffer
  verifyWebhookSignature(signature: string, rawBody: Buffer): boolean {
    if (!this.appSecret) {
      console.error("[Messenger] Facebook App Secret not configured - cannot verify webhooks");
      return false;
    }

    if (!signature) {
      console.error("[Messenger] No signature provided");
      return false;
    }

    const elements = signature.split("=");
    if (elements.length !== 2 || elements[0] !== "sha256") {
      console.error("[Messenger] Invalid signature format");
      return false;
    }

    const signatureHash = elements[1];
    
    const expectedHash = crypto
      .createHmac("sha256", this.appSecret)
      .update(rawBody)
      .digest("hex");

    try {
      return crypto.timingSafeEqual(
        Buffer.from(signatureHash, "hex"),
        Buffer.from(expectedHash, "hex")
      );
    } catch (error) {
      console.error("[Messenger] Signature verification error:", error);
      return false;
    }
  }

  // Verify token for webhook setup
  verifyWebhookToken(token: string): boolean {
    return token === this.verifyToken;
  }

  // Send text message to user
  async sendTextMessage(recipientId: string, text: string): Promise<void> {
    if (!this.pageAccessToken) {
      console.error("[Messenger] Page Access Token not configured");
      throw new Error("Facebook Page Access Token not configured");
    }

    try {
      await axios.post(
        `https://graph.facebook.com/v21.0/me/messages`,
        {
          recipient: { id: recipientId },
          message: { text },
        },
        {
          params: { access_token: this.pageAccessToken },
        }
      );
    } catch (error: any) {
      console.error("[Messenger] Error sending message:", error.response?.data || error.message);
      throw error;
    }
  }

  // Send message with quick reply buttons
  async sendQuickReply(
    recipientId: string,
    text: string,
    buttons: Array<{ title: string; payload: string }>
  ): Promise<void> {
    if (!this.pageAccessToken) {
      throw new Error("Facebook Page Access Token not configured");
    }

    try {
      await axios.post(
        `https://graph.facebook.com/v21.0/me/messages`,
        {
          recipient: { id: recipientId },
          message: {
            text,
            quick_replies: buttons.map((btn) => ({
              content_type: "text",
              title: btn.title,
              payload: btn.payload,
            })),
          },
        },
        {
          params: { access_token: this.pageAccessToken },
        }
      );
    } catch (error: any) {
      console.error("[Messenger] Error sending quick reply:", error.response?.data || error.message);
      throw error;
    }
  }

  // Send message with button template
  async sendButtonTemplate(
    recipientId: string,
    text: string,
    buttons: Array<{ type: string; title: string; url?: string; payload?: string }>
  ): Promise<void> {
    if (!this.pageAccessToken) {
      throw new Error("Facebook Page Access Token not configured");
    }

    try {
      await axios.post(
        `https://graph.facebook.com/v21.0/me/messages`,
        {
          recipient: { id: recipientId },
          message: {
            attachment: {
              type: "template",
              payload: {
                template_type: "button",
                text,
                buttons,
              },
            },
          },
        },
        {
          params: { access_token: this.pageAccessToken },
        }
      );
    } catch (error: any) {
      console.error("[Messenger] Error sending button template:", error.response?.data || error.message);
      throw error;
    }
  }

  // Send typing indicator
  async sendTypingIndicator(recipientId: string, on: boolean = true): Promise<void> {
    if (!this.pageAccessToken) {
      return;
    }

    try {
      await axios.post(
        `https://graph.facebook.com/v21.0/me/messages`,
        {
          recipient: { id: recipientId },
          sender_action: on ? "typing_on" : "typing_off",
        },
        {
          params: { access_token: this.pageAccessToken },
        }
      );
    } catch (error: any) {
      console.error("[Messenger] Error sending typing indicator:", error.response?.data || error.message);
    }
  }

  // Get user profile information
  async getUserProfile(userId: string): Promise<{ first_name?: string; last_name?: string }> {
    if (!this.pageAccessToken) {
      throw new Error("Facebook Page Access Token not configured");
    }

    try {
      const response = await axios.get(
        `https://graph.facebook.com/v21.0/${userId}`,
        {
          params: {
            fields: "first_name,last_name",
            access_token: this.pageAccessToken,
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error("[Messenger] Error fetching user profile:", error.response?.data || error.message);
      return {};
    }
  }
}

export const messengerService = new MessengerService();
