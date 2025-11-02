import { ethers } from "ethers";

export interface ChainConfig {
  chainId: string;
  chainName: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorerUrls: string[];
}

export const CHAIN_CONFIGS: Record<string, ChainConfig> = {
  ethereum: {
    chainId: "0x1",
    chainName: "Ethereum Mainnet",
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    },
    rpcUrls: ["https://eth.llamarpc.com"],
    blockExplorerUrls: ["https://etherscan.io"],
  },
  bsc: {
    chainId: "0x38",
    chainName: "BNB Smart Chain",
    nativeCurrency: {
      name: "BNB",
      symbol: "BNB",
      decimals: 18,
    },
    rpcUrls: ["https://bsc-dataseed1.binance.org"],
    blockExplorerUrls: ["https://bscscan.com"],
  },
  polygon: {
    chainId: "0x89",
    chainName: "Polygon Mainnet",
    nativeCurrency: {
      name: "MATIC",
      symbol: "MATIC",
      decimals: 18,
    },
    rpcUrls: ["https://polygon-rpc.com"],
    blockExplorerUrls: ["https://polygonscan.com"],
  },
  arbitrum: {
    chainId: "0xa4b1",
    chainName: "Arbitrum One",
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    },
    rpcUrls: ["https://arb1.arbitrum.io/rpc"],
    blockExplorerUrls: ["https://arbiscan.io"],
  },
  base: {
    chainId: "0x2105",
    chainName: "Base",
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    },
    rpcUrls: ["https://mainnet.base.org"],
    blockExplorerUrls: ["https://basescan.org"],
  },
};

export const TOKEN_ADDRESSES: Record<string, Record<string, string>> = {
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
    USDC: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    DAI: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
  },
  arbitrum: {
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    USDC: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
  },
  base: {
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    DAI: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb",
  },
};

const ERC20_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
];

export class Web3Service {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.Signer | null = null;

  async connectWallet(): Promise<string> {
    if (!window.ethereum) {
      throw new Error("Please install MetaMask or another Web3 wallet");
    }

    this.provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await this.provider.send("eth_requestAccounts", []);
    this.signer = await this.provider.getSigner();
    return accounts[0];
  }

  async switchChain(blockchain: string): Promise<void> {
    if (!window.ethereum) {
      throw new Error("Wallet not connected");
    }

    const chainConfig = CHAIN_CONFIGS[blockchain];
    if (!chainConfig) {
      throw new Error(`Unsupported blockchain: ${blockchain}`);
    }

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: chainConfig.chainId }],
      });
    } catch (error: any) {
      if (error.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [chainConfig],
        });
      } else {
        throw error;
      }
    }

    this.provider = new ethers.BrowserProvider(window.ethereum);
    this.signer = await this.provider.getSigner();
  }

  async getWalletAddress(): Promise<string | null> {
    if (!this.provider) {
      if (window.ethereum) {
        this.provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await this.provider.listAccounts();
        if (accounts.length > 0) {
          return accounts[0].address;
        }
      }
      return null;
    }

    this.signer = await this.provider.getSigner();
    return await this.signer.getAddress();
  }

  async sendToken(
    blockchain: string,
    tokenSymbol: string,
    recipientAddress: string,
    amount: string
  ): Promise<string> {
    if (!this.signer || !this.provider) {
      throw new Error("Wallet not connected");
    }

    const tokenAddress = TOKEN_ADDRESSES[blockchain]?.[tokenSymbol];
    if (!tokenAddress) {
      if (tokenSymbol === "ETH" || tokenSymbol === "BNB" || tokenSymbol === "MATIC") {
        const tx = await this.signer.sendTransaction({
          to: recipientAddress,
          value: ethers.parseEther(amount),
        });
        await tx.wait();
        return tx.hash;
      }
      throw new Error(`Token ${tokenSymbol} not supported on ${blockchain}`);
    }

    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, this.signer);
    const decimals = await tokenContract.decimals();
    const amountInWei = ethers.parseUnits(amount, decimals);

    const tx = await tokenContract.transfer(recipientAddress, amountInWei);
    await tx.wait();
    return tx.hash;
  }

  async getTokenBalance(
    blockchain: string,
    tokenSymbol: string,
    walletAddress: string
  ): Promise<string> {
    if (!this.provider) {
      throw new Error("Provider not initialized");
    }

    const tokenAddress = TOKEN_ADDRESSES[blockchain]?.[tokenSymbol];
    if (!tokenAddress) {
      if (tokenSymbol === "ETH" || tokenSymbol === "BNB" || tokenSymbol === "MATIC") {
        const balance = await this.provider.getBalance(walletAddress);
        return ethers.formatEther(balance);
      }
      throw new Error(`Token ${tokenSymbol} not supported on ${blockchain}`);
    }

    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, this.provider);
    const balance = await tokenContract.balanceOf(walletAddress);
    const decimals = await tokenContract.decimals();
    return ethers.formatUnits(balance, decimals);
  }

  isConnected(): boolean {
    return this.provider !== null && this.signer !== null;
  }

  disconnect(): void {
    this.provider = null;
    this.signer = null;
  }
}

export const web3Service = new Web3Service();

declare global {
  interface Window {
    ethereum?: any;
  }
}
