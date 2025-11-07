import { Wallet, HDNodeWallet } from "ethers";
import crypto from "crypto";

// Encryption configuration
const ENCRYPTION_ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;

// Supported blockchain networks
export const SUPPORTED_CHAINS = {
  ethereum: "Ethereum",
  bsc: "BSC (Binance Smart Chain)",
  polygon: "Polygon",
  arbitrum: "Arbitrum",
  base: "Base",
} as const;

export type ChainKey = keyof typeof SUPPORTED_CHAINS;

interface EncryptedData {
  encrypted: string;
  iv: string;
  authTag: string;
  salt: string;
}

class WalletService {
  private encryptionKey: string;

  constructor() {
    // Use a secure encryption key from environment
    this.encryptionKey = process.env.WALLET_ENCRYPTION_KEY || this.generateFallbackKey();
    
    if (!process.env.WALLET_ENCRYPTION_KEY) {
      console.warn("[WalletService] WALLET_ENCRYPTION_KEY not set - using fallback (INSECURE for production!)");
    }
  }

  // Generate a fallback encryption key (for development only)
  private generateFallbackKey(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  // Derive a 256-bit key from the master encryption key and salt
  private deriveKey(salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(
      this.encryptionKey,
      salt,
      100000,
      32,
      "sha256"
    );
  }

  // Encrypt private key or mnemonic
  private encrypt(text: string): EncryptedData {
    const salt = crypto.randomBytes(SALT_LENGTH);
    const key = this.deriveKey(salt);
    const iv = crypto.randomBytes(IV_LENGTH);
    
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    
    const authTag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString("hex"),
      authTag: authTag.toString("hex"),
      salt: salt.toString("hex"),
    };
  }

  // Decrypt private key or mnemonic
  private decrypt(encryptedData: EncryptedData): string {
    const salt = Buffer.from(encryptedData.salt, "hex");
    const key = this.deriveKey(salt);
    const iv = Buffer.from(encryptedData.iv, "hex");
    const authTag = Buffer.from(encryptedData.authTag, "hex");

    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedData.encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  }

  // Generate a new wallet with mnemonic
  createNewWallet(): {
    mnemonic: string;
    encryptedMnemonic: string;
    wallets: Record<ChainKey, { address: string; privateKey: string }>;
  } {
    // Generate a new random wallet with mnemonic
    const wallet = Wallet.createRandom();
    const mnemonic = wallet.mnemonic?.phrase;

    if (!mnemonic) {
      throw new Error("Failed to generate mnemonic");
    }

    // Encrypt the mnemonic for storage
    const encryptedMnemonic = JSON.stringify(this.encrypt(mnemonic));

    // Derive wallets for all supported chains
    // All EVM chains use the same derivation path and can use the same wallet
    const wallets: Record<ChainKey, { address: string; privateKey: string }> = {
      ethereum: { address: wallet.address, privateKey: wallet.privateKey },
      bsc: { address: wallet.address, privateKey: wallet.privateKey },
      polygon: { address: wallet.address, privateKey: wallet.privateKey },
      arbitrum: { address: wallet.address, privateKey: wallet.privateKey },
      base: { address: wallet.address, privateKey: wallet.privateKey },
    };

    return {
      mnemonic,
      encryptedMnemonic,
      wallets,
    };
  }

  // Get wallet addresses from encrypted mnemonic (without exposing private keys)
  getWalletAddresses(encryptedMnemonicString: string): Record<ChainKey, string> {
    try {
      const encryptedData: EncryptedData = JSON.parse(encryptedMnemonicString);
      const mnemonic = this.decrypt(encryptedData);
      
      const wallet = Wallet.fromPhrase(mnemonic);

      // All EVM chains use the same address
      const address = wallet.address;

      return {
        ethereum: address,
        bsc: address,
        polygon: address,
        arbitrum: address,
        base: address,
      };
    } catch (error) {
      console.error("[WalletService] Error getting wallet addresses:", error);
      throw new Error("Failed to decrypt wallet");
    }
  }

  // Get private key for a specific chain (use with caution!)
  getPrivateKey(encryptedMnemonicString: string, chain: ChainKey): string {
    try {
      const encryptedData: EncryptedData = JSON.parse(encryptedMnemonicString);
      const mnemonic = this.decrypt(encryptedData);
      
      const wallet = Wallet.fromPhrase(mnemonic);
      
      return wallet.privateKey;
    } catch (error) {
      console.error("[WalletService] Error getting private key:", error);
      throw new Error("Failed to decrypt wallet");
    }
  }

  // Verify wallet encryption/decryption works
  verifyEncryption(encryptedMnemonicString: string): boolean {
    try {
      const addresses = this.getWalletAddresses(encryptedMnemonicString);
      return !!addresses.ethereum;
    } catch (error) {
      return false;
    }
  }

  // Generate a wallet address display string (shortened)
  formatAddress(address: string): string {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  // Get chain name from key
  getChainName(chain: ChainKey): string {
    return SUPPORTED_CHAINS[chain];
  }
}

export const walletService = new WalletService();
