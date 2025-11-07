import { ethers } from "ethers";
import { db } from "../db";
import { deposits, messengerUsers, monitoringState } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { messengerService } from "./messengerService";

// Supported blockchains with their RPC endpoints
export const BLOCKCHAIN_CONFIG = {
  ethereum: {
    name: "Ethereum",
    rpcUrl: process.env.ALCHEMY_ETH_RPC_URL || "https://eth.llamarpc.com",
    chainId: 1,
    blockTime: 12000, // 12 seconds
    confirmations: 12,
    tokens: {
      ETH: "native",
      USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    },
  },
  bsc: {
    name: "BSC",
    rpcUrl: process.env.ALCHEMY_BSC_RPC_URL || "https://bsc-rpc.publicnode.com",
    chainId: 56,
    blockTime: 3000, // 3 seconds
    confirmations: 15,
    tokens: {
      BNB: "native",
      USDT: "0x55d398326f99059fF775485246999027B3197955",
      USDC: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
    },
  },
  polygon: {
    name: "Polygon",
    rpcUrl: process.env.ALCHEMY_POLYGON_RPC_URL || "https://polygon-rpc.publicnode.com",
    chainId: 137,
    blockTime: 2000, // 2 seconds
    confirmations: 128,
    tokens: {
      MATIC: "native",
      USDT: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
      USDC: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    },
  },
  arbitrum: {
    name: "Arbitrum",
    rpcUrl: process.env.ALCHEMY_ARB_RPC_URL || "https://arbitrum-one-rpc.publicnode.com",
    chainId: 42161,
    blockTime: 250, // 0.25 seconds
    confirmations: 20,
    tokens: {
      ETH: "native",
      USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
      USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    },
  },
  base: {
    name: "Base",
    rpcUrl: process.env.ALCHEMY_BASE_API_KEY 
      ? `https://base-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_BASE_API_KEY}`
      : "https://base-rpc.publicnode.com",
    chainId: 8453,
    blockTime: 2000, // 2 seconds
    confirmations: 20,
    tokens: {
      ETH: "native",
      USDT: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
      USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    },
  },
} as const;

export type Blockchain = keyof typeof BLOCKCHAIN_CONFIG;

// ERC-20 Token ABI (minimal - just for balance checking and transfer events)
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
];

interface DepositNotification {
  blockchain: string;
  token: string;
  amount: string;
  transactionHash: string;
  confirmations: number;
}

class BlockchainMonitorService {
  private providers: Map<Blockchain, ethers.JsonRpcProvider> = new Map();
  private monitoringIntervals: Map<string, NodeJS.Timeout> = new Map();
  private lastCheckedBlocks: Map<string, number> = new Map();

  constructor() {
    this.initializeProviders();
    this.resumeMonitoringForExistingUsers();
  }

  // Initialize RPC providers for all blockchains
  private initializeProviders() {
    Object.entries(BLOCKCHAIN_CONFIG).forEach(([chain, config]) => {
      const provider = new ethers.JsonRpcProvider(config.rpcUrl);
      this.providers.set(chain as Blockchain, provider);
      console.log(`[BlockchainMonitor] Initialized provider for ${config.name}`);
    });
  }

  // Resume monitoring for existing users on service restart
  private async resumeMonitoringForExistingUsers() {
    try {
      // Get all users with wallets
      const users = await db
        .select()
        .from(messengerUsers)
        .where(eq(messengerUsers.hasCompletedOnboarding, true));

      console.log(`[BlockchainMonitor] Resuming monitoring for ${users.length} existing users`);

      for (const user of users) {
        if (user.walletAddresses && user.encryptedKeys) {
          await this.startMonitoring(user.id);
        }
      }

      console.log(`[BlockchainMonitor] Resumed monitoring for all existing users`);

      // Resume confirmation tracking for pending deposits
      await this.resumePendingDepositTracking();
    } catch (error: any) {
      console.error(`[BlockchainMonitor] Error resuming monitoring:`, error.message);
    }
  }

  // Resume confirmation tracking for deposits that were pending before restart
  private async resumePendingDepositTracking() {
    try {
      // Get all pending deposits
      const pendingDeposits = await db
        .select()
        .from(deposits)
        .where(eq(deposits.status, "pending"));

      console.log(`[BlockchainMonitor] Resuming confirmation tracking for ${pendingDeposits.length} pending deposits`);

      for (const deposit of pendingDeposits) {
        // Get the user's messenger ID for notifications
        const [user] = await db
          .select()
          .from(messengerUsers)
          .where(eq(messengerUsers.id, deposit.messengerUserId))
          .limit(1);

        if (!user) continue;

        const provider = this.providers.get(deposit.blockchain as Blockchain);
        if (!provider) continue;

        // Resume tracking confirmations for this deposit
        this.trackConfirmations(
          deposit.transactionHash,
          provider,
          deposit.blockchain as Blockchain,
          deposit.messengerUserId,
          user.messengerId
        );
      }

      console.log(`[BlockchainMonitor] Resumed confirmation tracking for all pending deposits`);
    } catch (error: any) {
      console.error(`[BlockchainMonitor] Error resuming pending deposit tracking:`, error.message);
    }
  }

  // Start monitoring a specific user's wallet addresses
  async startMonitoring(messengerUserId: string) {
    try {
      // Get user's wallet addresses
      const [user] = await db
        .select()
        .from(messengerUsers)
        .where(eq(messengerUsers.id, messengerUserId))
        .limit(1);

      if (!user || !user.walletAddresses) {
        console.log(`[BlockchainMonitor] No wallet addresses for user ${messengerUserId}`);
        return;
      }

      const walletAddresses = user.walletAddresses as Record<string, string>;

      // Monitor each blockchain
      for (const [blockchain, address] of Object.entries(walletAddresses)) {
        if (!address) continue;

        const monitorKey = `${messengerUserId}-${blockchain}`;

        // Skip if already monitoring
        if (this.monitoringIntervals.has(monitorKey)) {
          continue;
        }

        const config = BLOCKCHAIN_CONFIG[blockchain as Blockchain];
        if (!config) continue;

        // Start monitoring interval
        const interval = setInterval(async () => {
          await this.checkForDeposits(
            messengerUserId,
            user.messengerId,
            blockchain as Blockchain,
            address
          );
        }, config.blockTime * 2); // Check every 2 block times

        this.monitoringIntervals.set(monitorKey, interval);

        console.log(`[BlockchainMonitor] Started monitoring ${config.name} for ${address}`);
      }
    } catch (error: any) {
      console.error(`[BlockchainMonitor] Error starting monitoring:`, error.message);
    }
  }

  // Stop monitoring for a specific user
  stopMonitoring(messengerUserId: string) {
    const entries = Array.from(this.monitoringIntervals.entries());
    for (const [key, interval] of entries) {
      if (key.startsWith(messengerUserId)) {
        clearInterval(interval);
        this.monitoringIntervals.delete(key);
        console.log(`[BlockchainMonitor] Stopped monitoring ${key}`);
      }
    }
  }

  // Check for deposits on a specific blockchain
  private async checkForDeposits(
    messengerUserId: string,
    messengerId: string,
    blockchain: Blockchain,
    address: string
  ) {
    try {
      const provider = this.providers.get(blockchain);
      if (!provider) return;

      const config = BLOCKCHAIN_CONFIG[blockchain];
      const currentBlock = await provider.getBlockNumber();

      // Get last checked block from database (persistent storage)
      const [stateRecord] = await db
        .select()
        .from(monitoringState)
        .where(
          and(
            eq(monitoringState.messengerUserId, messengerUserId),
            eq(monitoringState.blockchain, blockchain),
            eq(monitoringState.walletAddress, address)
          )
        )
        .limit(1);

      let lastCheckedBlock = stateRecord
        ? parseInt(stateRecord.lastCheckedBlock)
        : Math.max(0, currentBlock - 100); // Only use 100-block lookback for brand new wallets

      // Limit block range to prevent performance issues (max 50 blocks per check)
      // Process in chunks to catch up if there's a backlog
      const maxBlocksPerCheck = 50;
      const fromBlock = lastCheckedBlock;
      const toBlock = Math.min(currentBlock, lastCheckedBlock + maxBlocksPerCheck);

      // Skip if no new blocks to check
      if (fromBlock >= toBlock) {
        return;
      }

      // Check native token transfers (ETH, BNB, MATIC, etc.)
      await this.checkNativeTransfers(
        provider,
        messengerUserId,
        messengerId,
        blockchain,
        address,
        fromBlock,
        toBlock
      );

      // Check ERC-20 token transfers (USDT, USDC, etc.)
      for (const [symbol, contractAddress] of Object.entries(config.tokens)) {
        if (contractAddress === "native") continue;

        await this.checkTokenTransfers(
          provider,
          messengerUserId,
          messengerId,
          blockchain,
          address,
          symbol,
          contractAddress,
          fromBlock,
          toBlock
        );
      }

      // Update last checked block in memory (for quick access)
      const lastBlockKey = `${blockchain}-${address}`;
      this.lastCheckedBlocks.set(lastBlockKey, toBlock);

      // Persist to database (so restarts don't lose state)
      if (stateRecord) {
        await db
          .update(monitoringState)
          .set({
            lastCheckedBlock: toBlock.toString(),
            updatedAt: new Date(),
          })
          .where(eq(monitoringState.id, stateRecord.id));
      } else {
        await db.insert(monitoringState).values({
          messengerUserId,
          blockchain,
          walletAddress: address,
          lastCheckedBlock: toBlock.toString(),
        });
      }
    } catch (error: any) {
      console.error(
        `[BlockchainMonitor] Error checking deposits for ${blockchain}:`,
        error.message
      );
    }
  }

  // Check for native token transfers (ETH, BNB, MATIC)
  private async checkNativeTransfers(
    provider: ethers.JsonRpcProvider,
    messengerUserId: string,
    messengerId: string,
    blockchain: Blockchain,
    address: string,
    fromBlock: number,
    toBlock: number
  ) {
    try {
      // Check each block for transactions to our address
      for (let blockNum = fromBlock + 1; blockNum <= toBlock; blockNum++) {
        try {
          const block = await provider.getBlock(blockNum, true);
          if (!block || !block.prefetchedTransactions) continue;

          // Check each transaction in the block
          for (const tx of block.prefetchedTransactions) {
            // Check if transaction is to our user's address
            if (tx.to?.toLowerCase() !== address.toLowerCase()) continue;

            // Check if transaction has value (native token transfer)
            if (!tx.value || tx.value === 0n) continue;

            const txHash = tx.hash;

            // Check if we've already recorded this deposit
            const [existingDeposit] = await db
              .select()
              .from(deposits)
              .where(eq(deposits.transactionHash, txHash))
              .limit(1);

            if (existingDeposit) {
              // Update confirmation count if pending
              if (existingDeposit.status === "pending") {
                await this.updateDepositConfirmations(
                  existingDeposit.id,
                  txHash,
                  provider,
                  blockchain
                );
              }
              continue;
            }

            // New native token deposit detected!
            const amount = ethers.formatEther(tx.value);
            const fromAddress = tx.from;
            const config = BLOCKCHAIN_CONFIG[blockchain];
            
            // Get the native token symbol
            const nativeToken = Object.keys(config.tokens).find(
              k => config.tokens[k as keyof typeof config.tokens] === "native"
            ) || "ETH";

            // Save deposit to database
            await db.insert(deposits).values({
              messengerUserId,
              blockchain,
              token: nativeToken,
              amount,
              toAddress: address,
              fromAddress,
              transactionHash: txHash,
              blockNumber: blockNum.toString(),
              confirmations: "0",
              status: "pending",
            });

            console.log(`[BlockchainMonitor] New native deposit detected:`, {
              blockchain,
              token: nativeToken,
              amount,
              txHash,
            });

            // Notify user via Messenger
            await this.notifyUserOfDeposit(messengerId, {
              blockchain,
              token: nativeToken,
              amount,
              transactionHash: txHash,
              confirmations: 0,
            });

            // Start tracking confirmations
            this.trackConfirmations(txHash, provider, blockchain, messengerUserId, messengerId);
          }
        } catch (blockError: any) {
          console.error(
            `[BlockchainMonitor] Error processing block ${blockNum}:`,
            blockError.message
          );
          continue;
        }
      }
    } catch (error: any) {
      console.error(`[BlockchainMonitor] Error checking native transfers:`, error.message);
    }
  }

  // Check for ERC-20 token transfers
  private async checkTokenTransfers(
    provider: ethers.JsonRpcProvider,
    messengerUserId: string,
    messengerId: string,
    blockchain: Blockchain,
    toAddress: string,
    symbol: string,
    contractAddress: string,
    fromBlock: number,
    toBlock: number
  ) {
    try {
      const contract = new ethers.Contract(contractAddress, ERC20_ABI, provider);

      // Get Transfer events where `to` is our user's address
      const filter = contract.filters.Transfer(null, toAddress);

      const events = await contract.queryFilter(filter, fromBlock, toBlock);

      for (const event of events) {
        const txHash = event.transactionHash;

        // Check if we've already recorded this deposit
        const [existingDeposit] = await db
          .select()
          .from(deposits)
          .where(eq(deposits.transactionHash, txHash))
          .limit(1);

        if (existingDeposit) {
          // Update confirmation count if pending
          if (existingDeposit.status === "pending") {
            await this.updateDepositConfirmations(
              existingDeposit.id,
              txHash,
              provider,
              blockchain
            );
          }
          continue;
        }

        // New deposit detected!
        const decimals = await contract.decimals();
        
        // Type guard for EventLog
        if (!('args' in event)) continue;
        
        const args = event.args;
        const amount = ethers.formatUnits(args.value, decimals);
        const fromAddress = args.from as string;

        // Get transaction details
        const tx = await provider.getTransaction(txHash);
        const blockNumber = tx?.blockNumber?.toString() || "0";

        // Save deposit to database
        await db.insert(deposits).values({
          messengerUserId,
          blockchain,
          token: symbol,
          amount,
          toAddress,
          fromAddress,
          transactionHash: txHash,
          blockNumber,
          confirmations: "0",
          status: "pending",
        });

        console.log(`[BlockchainMonitor] New deposit detected:`, {
          blockchain,
          token: symbol,
          amount,
          txHash,
        });

        // Notify user via Messenger
        await this.notifyUserOfDeposit(messengerId, {
          blockchain,
          token: symbol,
          amount,
          transactionHash: txHash,
          confirmations: 0,
        });

        // Start tracking confirmations
        this.trackConfirmations(txHash, provider, blockchain, messengerUserId, messengerId);
      }
    } catch (error: any) {
      console.error(`[BlockchainMonitor] Error checking token transfers:`, error.message);
    }
  }

  // Track transaction confirmations
  private async trackConfirmations(
    txHash: string,
    provider: ethers.JsonRpcProvider,
    blockchain: Blockchain,
    messengerUserId: string,
    messengerId: string
  ) {
    const config = BLOCKCHAIN_CONFIG[blockchain];
    const requiredConfirmations = config.confirmations;

    const checkInterval = setInterval(async () => {
      try {
        const tx = await provider.getTransaction(txHash);
        if (!tx || !tx.blockNumber) return;

        const currentBlock = await provider.getBlockNumber();
        const confirmations = currentBlock - tx.blockNumber + 1;

        // Update deposit record
        const [deposit] = await db
          .select()
          .from(deposits)
          .where(eq(deposits.transactionHash, txHash))
          .limit(1);

        if (!deposit) {
          clearInterval(checkInterval);
          return;
        }

        // Update confirmation count
        await db
          .update(deposits)
          .set({ confirmations: confirmations.toString() })
          .where(eq(deposits.id, deposit.id));

        // Check if fully confirmed
        if (confirmations >= requiredConfirmations) {
          await db
            .update(deposits)
            .set({
              status: "confirmed",
              confirmedAt: new Date(),
            })
            .where(eq(deposits.id, deposit.id));

          // Notify user that deposit is confirmed
          await messengerService.sendTextMessage(
            messengerId,
            `✅ Deposit Confirmed!\n\n` +
              `${deposit.amount} ${deposit.token} on ${BLOCKCHAIN_CONFIG[blockchain as Blockchain].name}\n\n` +
              `Your funds are ready to sell! Type /sell to convert to Naira.`
          );

          console.log(`[BlockchainMonitor] Deposit confirmed:`, {
            txHash,
            confirmations,
          });

          clearInterval(checkInterval);
        }
      } catch (error: any) {
        console.error(`[BlockchainMonitor] Error tracking confirmations:`, error.message);
      }
    }, config.blockTime * 5); // Check every 5 blocks
  }

  // Update deposit confirmations
  private async updateDepositConfirmations(
    depositId: string,
    txHash: string,
    provider: ethers.JsonRpcProvider,
    blockchain: Blockchain
  ) {
    try {
      const tx = await provider.getTransaction(txHash);
      if (!tx || !tx.blockNumber) return;

      const currentBlock = await provider.getBlockNumber();
      const confirmations = currentBlock - tx.blockNumber + 1;

      await db
        .update(deposits)
        .set({ confirmations: confirmations.toString() })
        .where(eq(deposits.id, depositId));

      const config = BLOCKCHAIN_CONFIG[blockchain];
      if (confirmations >= config.confirmations) {
        await db
          .update(deposits)
          .set({
            status: "confirmed",
            confirmedAt: new Date(),
          })
          .where(eq(deposits.id, depositId));
      }
    } catch (error: any) {
      console.error(`[BlockchainMonitor] Error updating confirmations:`, error.message);
    }
  }

  // Notify user of new deposit
  private async notifyUserOfDeposit(messengerId: string, deposit: DepositNotification) {
    try {
      const blockchainName = BLOCKCHAIN_CONFIG[deposit.blockchain as Blockchain].name;

      await messengerService.sendTextMessage(
        messengerId,
        `💰 Deposit Detected!\n\n` +
          `Amount: ${deposit.amount} ${deposit.token}\n` +
          `Network: ${blockchainName}\n` +
          `Status: Confirming... (${deposit.confirmations} confirmations)\n\n` +
          `We'll notify you when it's fully confirmed!`
      );

      console.log(`[BlockchainMonitor] Notified user of deposit:`, {
        messengerId,
        ...deposit,
      });
    } catch (error: any) {
      console.error(`[BlockchainMonitor] Error notifying user:`, error.message);
    }
  }

  // Get deposit balance for a user
  async getDepositBalance(messengerUserId: string, blockchain?: string, token?: string) {
    try {
      let query = db
        .select()
        .from(deposits)
        .where(and(
          eq(deposits.messengerUserId, messengerUserId),
          eq(deposits.status, "confirmed")
        ));

      const allDeposits = await query;

      // Filter by blockchain and token if provided
      let filteredDeposits = allDeposits;
      if (blockchain) {
        filteredDeposits = filteredDeposits.filter((d: any) => d.blockchain === blockchain);
      }
      if (token) {
        filteredDeposits = filteredDeposits.filter((d: any) => d.token === token);
      }

      // Sum up amounts
      const totalByToken = filteredDeposits.reduce((acc: Record<string, number>, deposit: any) => {
        const key = `${deposit.blockchain}-${deposit.token}`;
        const amount = parseFloat(deposit.amount);
        acc[key] = (acc[key] || 0) + amount;
        return acc;
      }, {} as Record<string, number>);

      return totalByToken;
    } catch (error: any) {
      console.error(`[BlockchainMonitor] Error getting deposit balance:`, error.message);
      return {};
    }
  }

  // Manual balance check (for testing)
  async checkBalance(blockchain: Blockchain, address: string, tokenSymbol?: string) {
    try {
      const provider = this.providers.get(blockchain);
      if (!provider) {
        throw new Error(`Provider not found for ${blockchain}`);
      }

      const config = BLOCKCHAIN_CONFIG[blockchain];

      // Check native balance (ETH, BNB, MATIC, etc.)
      const tokenConfig = config.tokens[tokenSymbol as keyof typeof config.tokens];
      if (!tokenSymbol || tokenConfig === "native") {
        const balance = await provider.getBalance(address);
        const formattedBalance = ethers.formatEther(balance);
        const nativeToken = Object.keys(config.tokens).find(k => config.tokens[k as keyof typeof config.tokens] === "native") || "ETH";
        return {
          blockchain,
          token: tokenSymbol || nativeToken,
          balance: formattedBalance,
        };
      }

      // Check ERC-20 token balance
      const tokenAddress = config.tokens[tokenSymbol as keyof typeof config.tokens];
      if (!tokenAddress || typeof tokenAddress !== 'string') {
        throw new Error(`Token ${tokenSymbol} not supported on ${blockchain}`);
      }

      const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
      const balance = await contract.balanceOf(address);
      const decimals = await contract.decimals();
      const formattedBalance = ethers.formatUnits(balance, decimals);

      return {
        blockchain,
        token: tokenSymbol,
        balance: formattedBalance,
      };
    } catch (error: any) {
      console.error(`[BlockchainMonitor] Error checking balance:`, error.message);
      throw error;
    }
  }
}

// Export singleton instance
export const blockchainMonitor = new BlockchainMonitorService();
