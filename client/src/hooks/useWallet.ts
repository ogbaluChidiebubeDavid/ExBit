import { useState, useEffect } from "react";
import { web3Service } from "@/lib/web3";

export function useWallet() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkConnection();
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", handleAccountsChanged);
      window.ethereum.on("chainChanged", () => window.location.reload());
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      }
    };
  }, []);

  const checkConnection = async () => {
    try {
      const address = await web3Service.getWalletAddress();
      setWalletAddress(address);
    } catch (err) {
      console.error("Failed to check wallet connection:", err);
    }
  };

  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length === 0) {
      setWalletAddress(null);
      web3Service.disconnect();
    } else {
      setWalletAddress(accounts[0]);
    }
  };

  const connect = async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const address = await web3Service.connectWallet();
      setWalletAddress(address);
      return address;
    } catch (err: any) {
      const errorMessage = err.message || "Failed to connect wallet";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    web3Service.disconnect();
    setWalletAddress(null);
  };

  return {
    walletAddress,
    isConnected: !!walletAddress,
    isConnecting,
    error,
    connect,
    disconnect,
  };
}
