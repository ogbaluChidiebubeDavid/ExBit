import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Wallet, Send, Loader2 } from "lucide-react";
import { ethers } from "ethers";
import { motion, AnimatePresence } from "framer-motion";
import exbitLogo from "@assets/exbit logo (1)_1762622679267.png";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { BankDetailsForm } from "@/components/BankDetailsForm";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  metadata?: any;
  createdAt: string;
}

export default function Chat() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  
  // Bank details state
  const [showBankForm, setShowBankForm] = useState(false);
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [isValidatingBank, setIsValidatingBank] = useState(false);
  
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const connectWallet = async () => {
    setIsConnecting(true);
    try {
      if (!window.ethereum) {
        toast({
          title: "Wallet Not Found",
          description: "Please install MetaMask or another Web3 wallet to continue.",
          variant: "destructive",
        });
        return;
      }

      const web3Provider = new ethers.BrowserProvider(window.ethereum as any);
      const accounts: string[] = await web3Provider.send("eth_requestAccounts", []);
      const address = accounts[0];

      setProvider(web3Provider);
      setWalletAddress(address);

      // Create or get session from backend
      const response: any = await apiRequest({
        url: "/api/web-chat/connect",
        method: "POST",
        body: { walletAddress: address },
      });

      setSessionId(response.sessionId);
      setMessages(response.messages || []);

      toast({
        title: "Wallet Connected",
        description: `Connected as ${address.substring(0, 6)}...${address.substring(38)}`,
      });
    } catch (error: any) {
      console.error("Error connecting wallet:", error);
      toast({
        title: "Connection Failed",
        description: error.message || "Could not connect to wallet",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setWalletAddress(null);
    setSessionId(null);
    setMessages([]);
    setProvider(null);
    toast({
      title: "Wallet Disconnected",
      description: "You have been disconnected from ExBit",
    });
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !sessionId || isSending) return;

    const userMessage = inputMessage.trim();
    setInputMessage("");
    setIsSending(true);

    // Add user message to UI immediately
    const tempUserMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userMessage,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      // Send message to backend
      const response: any = await apiRequest({
        url: "/api/web-chat/message",
        method: "POST",
        body: {
          sessionId,
          message: userMessage,
        },
      });

      // Add assistant response
      setMessages((prev) => [...prev, response.assistantMessage]);
      
      // Check if bank details are needed (swap quote received)
      if (response.assistantMessage.metadata?.swapState === "awaiting_bank_details") {
        setShowBankForm(true);
      }
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast({
        title: "Message Failed",
        description: error.message || "Could not send message",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Validate bank account when account number is complete
  useEffect(() => {
    if (bankName && accountNumber.length === 10 && !isValidatingBank) {
      validateBankAccount();
    } else if (accountNumber.length < 10) {
      setAccountName("");
    }
  }, [bankName, accountNumber]);

  const validateBankAccount = async () => {
    if (!sessionId || !bankName || accountNumber.length !== 10) return;

    setIsValidatingBank(true);
    setAccountName("");

    try {
      const response: any = await apiRequest({
        url: "/api/web-chat/validate-bank",
        method: "POST",
        body: {
          sessionId,
          bankName,
          accountNumber,
        },
      });

      setAccountName(response.accountName);
      toast({
        title: "Account Verified",
        description: `Account belongs to ${response.accountName}`,
      });
    } catch (error: any) {
      console.error("Bank validation error:", error);
      toast({
        title: "Validation Failed",
        description: error.message || "Could not verify account",
        variant: "destructive",
      });
    } finally {
      setIsValidatingBank(false);
    }
  };

  const submitBankDetails = async () => {
    if (!accountName || !bankName || !accountNumber || !provider || !sessionId) {
      toast({
        title: "Missing Information",
        description: "Please complete all bank details",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    
    try {
      // Save bank details to backend
      const response: any = await apiRequest({
        url: "/api/web-chat/save-bank-details",
        method: "POST",
        body: {
          sessionId,
          bankName,
          accountNumber,
          accountName,
        },
      });

      setShowBankForm(false);

      // Add assistant message about signing
      const signingMsg: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: "Bank details verified! Please sign the transaction in your wallet to complete the swap.",
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, signingMsg]);

      // Get swap data and request transaction signature
      await signAndExecuteTransaction(response.swapData);
      
    } catch (error: any) {
      console.error("Bank details submission error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save bank details",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const signAndExecuteTransaction = async (swapData: any) => {
    if (!provider || !walletAddress) {
      toast({
        title: "Wallet Error",
        description: "Please reconnect your wallet",
        variant: "destructive",
      });
      return;
    }

    try {
      const signer = await provider.getSigner();
      const ownerAddress = import.meta.env.VITE_OWNER_WALLET_ADDRESS;

      if (!ownerAddress) {
        throw new Error("Owner wallet address not configured. Please contact support.");
      }

      // ERC20 token addresses for different blockchains
      const tokenAddresses: Record<string, Record<string, string>> = {
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
          USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
          DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
        },
        base: {
          USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
          DAI: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb",
        },
      };

      // ERC20 ABI (minimal for transfer)
      const erc20Abi = [
        "function transfer(address to, uint256 amount) returns (bool)"
      ];

      let tx;

      if (swapData.token === "ETH" || swapData.token === "BNB" || swapData.token === "MATIC") {
        // Native token transfer
        toast({
          title: "Sign Transaction",
          description: "Please approve the transaction in your wallet",
        });

        tx = await signer.sendTransaction({
          to: ownerAddress,
          value: ethers.parseEther(swapData.amount),
        });
      } else {
        // ERC20 token transfer
        const blockchain = swapData.blockchain.toLowerCase();
        const tokenAddress = tokenAddresses[blockchain]?.[swapData.token];

        if (!tokenAddress) {
          throw new Error(`Token ${swapData.token} not supported on ${swapData.blockchain}`);
        }

        // Token decimals per chain (important: BSC uses 18 decimals for all!)
        const tokenDecimals: Record<string, Record<string, number>> = {
          ethereum: {
            USDT: 6,
            USDC: 6,
            DAI: 18,
          },
          bsc: {
            USDT: 18,
            USDC: 18,
            BUSD: 18,
          },
          polygon: {
            USDT: 6,
            USDC: 6,
            DAI: 18,
          },
          arbitrum: {
            USDT: 6,
            USDC: 6,
            DAI: 18,
          },
          base: {
            USDC: 6,
            DAI: 18,
          },
        };

        const decimals = tokenDecimals[blockchain]?.[swapData.token];
        if (!decimals) {
          throw new Error(`Unknown decimals for ${swapData.token} on ${swapData.blockchain}`);
        }

        toast({
          title: "Sign Transaction",
          description: "Please approve the ERC20 transfer in your wallet",
        });

        const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, signer);
        const amount = ethers.parseUnits(swapData.amount, decimals);

        tx = await tokenContract.transfer(ownerAddress, amount);
      }

      // Request signature and send transaction

      const processingMsg: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: `Transaction submitted! Hash: ${tx.hash}\n\nWaiting for confirmation...`,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, processingMsg]);

      // Wait for confirmation
      const receipt = await tx.wait();

      // Notify backend to process the swap
      await apiRequest({
        url: "/api/web-chat/process-swap",
        method: "POST",
        body: {
          sessionId,
          txHash: receipt?.hash || tx.hash,
        },
      });

      const successMsg: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: `✅ Transaction confirmed! Your Naira payment is being processed and will arrive shortly.`,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, successMsg]);

      toast({
        title: "Swap Complete!",
        description: "Your Naira is on the way to your bank account",
      });

      // Reset bank details state
      setBankName("");
      setAccountNumber("");
      setAccountName("");
      
    } catch (error: any) {
      console.error("Transaction signing error:", error);
      
      let errorMessage = "Failed to sign transaction";
      if (error.code === "ACTION_REJECTED") {
        errorMessage = "Transaction was rejected";
      } else if (error.message) {
        errorMessage = error.message;
      }

      const errorMsg: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: `❌ Transaction failed: ${errorMessage}`,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);

      toast({
        title: "Transaction Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-lg">
        <div className="mx-auto max-w-4xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={exbitLogo} alt="ExBit Logo" className="h-8" />
            <div>
              <h1 className="font-semibold">ExBit Web Agent</h1>
              <p className="text-xs text-muted-foreground">Convert crypto to Naira</p>
            </div>
          </div>

          {walletAddress ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {walletAddress.substring(0, 6)}...{walletAddress.substring(38)}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={disconnectWallet}
                data-testid="button-disconnect"
              >
                Disconnect
              </Button>
            </div>
          ) : (
            <Button
              onClick={connectWallet}
              disabled={isConnecting}
              className="gap-2"
              data-testid="button-connect-wallet"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Wallet className="h-4 w-4" />
                  Connect Wallet
                </>
              )}
            </Button>
          )}
        </div>
      </header>

      {/* Chat Area */}
      <div className="mx-auto max-w-4xl px-4 py-8">
        {!walletAddress ? (
          <Card className="mt-20">
            <CardContent className="p-12 text-center">
              <Wallet className="h-16 w-16 mx-auto mb-4 text-primary" />
              <h2 className="text-2xl font-semibold mb-2">Connect Your Wallet</h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Connect your MetaMask or Web3 wallet to start swapping crypto to Naira with ExBit AI Agent
              </p>
              <Button onClick={connectWallet} size="lg" className="gap-2" disabled={isConnecting}>
                {isConnecting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Wallet className="h-5 w-5" />
                    Connect Wallet
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col h-[calc(100vh-200px)]">
            {/* Messages */}
            <ScrollArea className="flex-1 pr-4">
              <AnimatePresence>
                {messages.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-12"
                  >
                    <h3 className="text-xl font-semibold mb-2">Start a conversation</h3>
                    <p className="text-muted-foreground mb-4">
                      Try asking: "Swap 0.07 USDT on BSC to Naira"
                    </p>
                  </motion.div>
                ) : (
                  messages.map((message, index) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`mb-4 flex ${
                        message.role === "user" ? "justify-end" : "justify-start"
                      }`}
                      data-testid={`message-${message.role}-${index}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        {message.metadata?.type === "quote" && (
                          <Card className="mt-3 bg-background/50">
                            <CardContent className="p-4 space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">You send:</span>
                                <span className="font-semibold">
                                  {message.metadata.data.amount} {message.metadata.data.token}
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">You receive:</span>
                                <span className="font-semibold text-primary">
                                  ₦{parseFloat(message.metadata.data.netAmount).toLocaleString()}
                                </span>
                              </div>
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Platform fee:</span>
                                <span>₦{parseFloat(message.metadata.data.platformFee).toLocaleString()}</span>
                              </div>
                              {message.metadata.data.showContinue && (
                                <Button
                                  className="w-full mt-2"
                                  onClick={() => sendMessage()}
                                  data-testid="button-continue-swap"
                                >
                                  Continue
                                </Button>
                              )}
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </ScrollArea>

            {/* Bank Details Form */}
            {showBankForm && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="my-4"
              >
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Enter Your Bank Details</h3>
                    <BankDetailsForm
                      bankName={bankName}
                      accountNumber={accountNumber}
                      accountName={accountName}
                      onBankChange={setBankName}
                      onAccountNumberChange={setAccountNumber}
                    />
                    <div className="mt-6 flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowBankForm(false);
                          setBankName("");
                          setAccountNumber("");
                          setAccountName("");
                        }}
                        data-testid="button-cancel-bank"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={submitBankDetails}
                        disabled={!accountName || isValidatingBank}
                        data-testid="button-submit-bank"
                      >
                        {isValidatingBank ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Validating...
                          </>
                        ) : (
                          "Continue to Sign Transaction"
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Input Area */}
            <div className="mt-4">
              <div className="flex gap-2">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  disabled={isSending}
                  className="flex-1"
                  data-testid="input-message"
                />
                <Button
                  onClick={sendMessage}
                  disabled={!inputMessage.trim() || isSending}
                  size="icon"
                  data-testid="button-send"
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
