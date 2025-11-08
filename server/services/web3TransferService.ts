import { ethers, Wallet, Contract } from "ethers";
import { walletService } from "./walletService";

const OWNER_WALLET_ADDRESS = process.env.OWNER_WALLET_ADDRESS;

// ERC-20 ABI for token transfers
const ERC20_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

// RPC providers for each blockchain
const RPC_URLS: Record<string, string> = {
  ethereum: process.env.ALCHEMY_ETHEREUM_API_KEY
    ? `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_ETHEREUM_API_KEY}`
    : "https://eth.public-rpc.com",
  bsc: "https://bsc-dataseed1.binance.org",
  polygon: process.env.ALCHEMY_POLYGON_API_KEY
    ? `https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_POLYGON_API_KEY}`
    : "https://polygon-rpc.com",
  arbitrum: process.env.ALCHEMY_ARBITRUM_API_KEY
    ? `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_ARBITRUM_API_KEY}`
    : "https://arb1.arbitrum.io/rpc",
  base: (process.env.ALCHEMY_BASE_API_KEY || process.env.ALCHEMY_API_KEY)
    ? `https://base-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_BASE_API_KEY || process.env.ALCHEMY_API_KEY}`
    : "https://mainnet.base.org",
};

// Token contract addresses
const TOKEN_ADDRESSES: Record<string, Record<string, string>> = {
  ethereum: {
    USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    DAI: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
  },
  bsc: {
    USDT: "0x55d398326f99059fF775485246999027B3197955",
    USDC: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
    BUSD: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",
  },
  polygon: {
    USDT: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
    USDC: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
    DAI: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
  },
  arbitrum: {
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
  },
  base: {
    USDT: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  },
};

export class Web3TransferService {
  async sendCryptoToOwner(
    encryptedMnemonic: string,
    blockchain: string,
    token: string,
    amount: string
  ): Promise<string> {
    if (!OWNER_WALLET_ADDRESS) {
      throw new Error("OWNER_WALLET_ADDRESS not configured in environment variables");
    }

    // Validate blockchain is supported
    if (!RPC_URLS[blockchain]) {
      throw new Error(`Blockchain ${blockchain} is not supported`);
    }

    // Validate amount is positive
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      throw new Error(`Invalid amount: ${amount}. Must be a positive number`);
    }

    try {
      // Get private key from encrypted mnemonic
      const privateKey = walletService.getPrivateKey(
        encryptedMnemonic,
        blockchain as any
      );

      // Create provider and wallet
      const provider = new ethers.JsonRpcProvider(RPC_URLS[blockchain]);
      const wallet = new Wallet(privateKey, provider);

      console.log(`[Web3Transfer] Initiating transfer:`, {
        blockchain,
        token,
        amount,
        from: wallet.address,
        to: OWNER_WALLET_ADDRESS,
      });

      let txHash: string;

      if (token === "ETH" || token === "BNB" || token === "MATIC") {
        // Native token transfer
        const tx = await wallet.sendTransaction({
          to: OWNER_WALLET_ADDRESS,
          value: ethers.parseEther(amount),
        });

        console.log(`[Web3Transfer] Native token transaction sent:`, tx.hash);
        await tx.wait();
        txHash = tx.hash;
      } else {
        // ERC-20 token transfer
        const tokenAddress = TOKEN_ADDRESSES[blockchain]?.[token];
        if (!tokenAddress) {
          throw new Error(`Token ${token} not supported on ${blockchain}`);
        }

        const tokenContract = new Contract(tokenAddress, ERC20_ABI, wallet);

        // Get token decimals
        const decimals = await tokenContract.decimals();

        // Convert amount to wei/smallest unit
        const amountInWei = ethers.parseUnits(amount, decimals);

        // Execute transfer
        const tx = await tokenContract.transfer(
          OWNER_WALLET_ADDRESS,
          amountInWei
        );

        console.log(`[Web3Transfer] ERC-20 transaction sent:`, tx.hash);
        await tx.wait();
        txHash = tx.hash;
      }

      console.log(`[Web3Transfer] Transaction confirmed:`, txHash);
      return txHash;
    } catch (error: any) {
      console.error("[Web3Transfer] Error sending crypto:", {
        blockchain,
        token,
        amount,
        error: error.message,
      });

      // User-friendly error messages
      if (error.message?.includes("insufficient funds")) {
        throw new Error("Insufficient balance for transaction + gas fees");
      }
      if (error.message?.includes("user rejected")) {
        throw new Error("Transaction rejected");
      }

      throw new Error(
        `Failed to send ${token} on ${blockchain}: ${error.message}`
      );
    }
  }
}

export const web3TransferService = new Web3TransferService();
