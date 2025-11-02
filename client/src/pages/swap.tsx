import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Header } from "@/components/Header";
import { StepIndicator } from "@/components/StepIndicator";
import { BlockchainSelector } from "@/components/BlockchainSelector";
import { TokenAmountInput } from "@/components/TokenAmountInput";
import { ConversionDisplay } from "@/components/ConversionDisplay";
import { BankDetailsForm } from "@/components/BankDetailsForm";
import { SwapSummary } from "@/components/SwapSummary";
import { TransactionStatus } from "@/components/TransactionStatus";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TOKEN_INFO } from "@/lib/constants";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useWallet } from "@/hooks/useWallet";
import { web3Service } from "@/lib/web3";

type SwapStep = 1 | 2 | 3 | 4 | 5;

export default function SwapPage() {
  const { toast } = useToast();
  const { walletAddress, isConnected } = useWallet();
  const [currentStep, setCurrentStep] = useState<SwapStep>(1);
  const [blockchain, setBlockchain] = useState("ethereum");
  const [selectedToken, setSelectedToken] = useState("USDT");
  const [amount, setAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [isProcessingBlockchain, setIsProcessingBlockchain] = useState(false);
  const [tokenBalance, setTokenBalance] = useState<string>("0");
  const [isCorrectChain, setIsCorrectChain] = useState(false);

  const { data: rates } = useQuery({
    queryKey: ["/api/rates"],
    queryFn: () => api.getExchangeRates(),
  });

  const accountValidation = useMutation({
    mutationFn: ({ bankName, accountNumber }: { bankName: string; accountNumber: string }) =>
      api.validateAccount(bankName, accountNumber),
    onSuccess: (data) => {
      setAccountName(data.accountName);
    },
    onError: () => {
      toast({
        title: "Validation Failed",
        description: "Could not verify account details",
        variant: "destructive",
      });
    },
  });

  const createTransaction = useMutation({
    mutationFn: api.createTransaction,
    onSuccess: (data) => {
      setTransactionId(data.id);
      setCurrentStep(5);
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
    },
    onError: () => {
      toast({
        title: "Transaction Failed",
        description: "Could not create transaction. Please try again.",
        variant: "destructive",
      });
    },
  });

  const { data: currentTransaction } = useQuery({
    queryKey: ["/api/transactions", transactionId],
    queryFn: () => api.getTransaction(transactionId),
    enabled: !!transactionId && currentStep === 5,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "completed" || status === "failed") {
        return false;
      }
      return 2000;
    },
  });

  useEffect(() => {
    setAccountName("");
    if (accountNumber.length === 10 && bankName) {
      accountValidation.mutate({ bankName, accountNumber });
    }
  }, [accountNumber, bankName]);

  useEffect(() => {
    const switchChainAndFetchBalance = async () => {
      if (walletAddress && blockchain && selectedToken) {
        try {
          await web3Service.switchChain(blockchain);
          setIsCorrectChain(true);
          
          const balance = await web3Service.getTokenBalance(
            blockchain,
            selectedToken,
            walletAddress
          );
          setTokenBalance(balance);
        } catch (error: any) {
          console.error("Failed to switch chain or fetch balance:", error);
          
          if (error.code === 4001 || error.message?.includes("rejected")) {
            toast({
              title: "Network Switch Cancelled",
              description: `Please switch to ${blockchain} network to continue`,
              variant: "destructive",
            });
            setIsCorrectChain(false);
          } else {
            setIsCorrectChain(true);
          }
          setTokenBalance("0");
        }
      }
    };
    switchChainAndFetchBalance();
  }, [walletAddress, blockchain, selectedToken]);

  const getCurrentRate = () => {
    if (!rates) return 0;
    return rates[blockchain]?.[selectedToken] || 0;
  };

  const calculateNaira = () => {
    const rate = getCurrentRate();
    const numAmount = parseFloat(amount) || 0;
    return numAmount * rate;
  };

  const calculateFee = () => {
    const nairaAmount = calculateNaira();
    return nairaAmount * 0.001;
  };

  const calculateCryptoFee = () => {
    const numAmount = parseFloat(amount) || 0;
    return numAmount * 0.001;
  };

  const canProceedFromStep1 = blockchain && selectedToken;
  const canProceedFromStep2 = () => {
    if (!walletAddress) return amount && parseFloat(amount) >= 0.01;
    
    const numAmount = parseFloat(amount);
    const balance = parseFloat(tokenBalance);
    return (
      amount &&
      numAmount >= 0.01 &&
      isCorrectChain &&
      numAmount <= balance
    );
  };
  const canProceedFromStep3 = bankName && accountNumber.length === 10 && accountName;

  const handleNextStep = () => {
    if (currentStep === 1 && canProceedFromStep1) {
      setCurrentStep(2);
    } else if (currentStep === 2 && canProceedFromStep2()) {
      const numAmount = parseFloat(amount);
      if (numAmount < 0.01) {
        toast({
          title: "Amount Too Small",
          description: "Minimum swap amount is 0.01 tokens",
          variant: "destructive",
        });
        return;
      }
      setCurrentStep(3);
    } else if (currentStep === 3 && canProceedFromStep3) {
      setCurrentStep(4);
    }
  };

  const handleConfirmSwap = async () => {
    if (!isConnected || !walletAddress) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to continue",
        variant: "destructive",
      });
      return;
    }

    const numAmount = parseFloat(amount);
    const balance = parseFloat(tokenBalance);

    if (numAmount > balance) {
      toast({
        title: "Insufficient Balance",
        description: `You only have ${balance} ${selectedToken} in your wallet`,
        variant: "destructive",
      });
      return;
    }

    if (numAmount < 0.01) {
      toast({
        title: "Amount Too Small",
        description: "Minimum swap amount is 0.01 tokens",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Sign Transaction",
      description: "Please approve the transaction in your wallet",
    });

    setIsProcessingBlockchain(true);

    try {
      await web3Service.switchChain(blockchain);

      const ownerWalletAddress = import.meta.env.VITE_OWNER_WALLET_ADDRESS;
      if (!ownerWalletAddress) {
        throw new Error("Owner wallet address not configured. Please set VITE_OWNER_WALLET_ADDRESS in environment variables.");
      }

      const cryptoFee = calculateCryptoFee();
      const netCryptoAmount = parseFloat(amount) - cryptoFee;

      const txHash = await web3Service.sendToken(
        blockchain,
        selectedToken,
        ownerWalletAddress,
        amount
      );

      toast({
        title: "Transaction Sent",
        description: "Processing your swap...",
      });

      const totalNairaValue = calculateNaira();
      const platformFeeNaira = totalNairaValue * 0.001;
      const netNairaAmount = totalNairaValue - platformFeeNaira;

      const transaction = await api.createTransaction({
        blockchain,
        token: selectedToken,
        amount,
        nairaAmount: totalNairaValue.toFixed(2),
        exchangeRate: getCurrentRate().toFixed(2),
        platformFee: cryptoFee.toFixed(8),
        platformFeeNaira: platformFeeNaira.toFixed(2),
        netAmount: netCryptoAmount.toFixed(8),
        netNairaAmount: netNairaAmount.toFixed(2),
        bankName,
        accountNumber,
        accountName,
        userWalletAddress: walletAddress,
        status: "pending",
      });

      setTransactionId(transaction.id);

      await api.processTransaction(transaction.id, txHash);

      setCurrentStep(5);
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
    } catch (error: any) {
      console.error("Swap error:", error);
      toast({
        title: "Swap Failed",
        description: error.message || "Failed to process swap",
        variant: "destructive",
      });
    } finally {
      setIsProcessingBlockchain(false);
    }
  };

  const handleNewSwap = () => {
    setCurrentStep(1);
    setBlockchain("ethereum");
    setSelectedToken("USDT");
    setAmount("");
    setBankName("");
    setAccountNumber("");
    setAccountName("");
    setTransactionId("");
  };

  const steps = ["Network", "Amount", "Bank Details", "Confirm"];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {currentStep < 5 && (
            <StepIndicator currentStep={currentStep} steps={steps} />
          )}

          <Card className="p-6 md:p-8">
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold mb-2">Select Network</h2>
                  <p className="text-sm text-muted-foreground">
                    Choose the blockchain network for your swap
                  </p>
                </div>
                <BlockchainSelector
                  selected={blockchain}
                  onSelect={(chain) => {
                    setBlockchain(chain);
                    const tokens = TOKEN_INFO[chain as keyof typeof TOKEN_INFO] || [];
                    setSelectedToken(tokens[0]?.symbol || "");
                  }}
                />
                <Button
                  onClick={handleNextStep}
                  disabled={!canProceedFromStep1}
                  className="w-full"
                  data-testid="button-next-step"
                >
                  Continue
                </Button>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold mb-2">Enter Amount</h2>
                  <p className="text-sm text-muted-foreground">
                    How much do you want to swap?
                  </p>
                </div>
                <TokenAmountInput
                  blockchain={blockchain}
                  selectedToken={selectedToken}
                  amount={amount}
                  onTokenChange={setSelectedToken}
                  onAmountChange={setAmount}
                  walletAddress={walletAddress || undefined}
                />
                {amount && parseFloat(amount) > 0 && (
                  <ConversionDisplay
                    cryptoAmount={amount}
                    cryptoSymbol={selectedToken}
                    nairaAmount={calculateNaira()}
                    exchangeRate={getCurrentRate()}
                  />
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep(1)}
                    className="flex-1"
                    data-testid="button-back"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleNextStep}
                    disabled={!canProceedFromStep2()}
                    className="flex-1"
                    data-testid="button-next-step"
                  >
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold mb-2">Bank Details</h2>
                  <p className="text-sm text-muted-foreground">
                    Where should we send your Naira?
                  </p>
                </div>
                <BankDetailsForm
                  bankName={bankName}
                  accountNumber={accountNumber}
                  accountName={accountName}
                  onBankChange={setBankName}
                  onAccountNumberChange={setAccountNumber}
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep(2)}
                    className="flex-1"
                    data-testid="button-back"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleNextStep}
                    disabled={!canProceedFromStep3}
                    className="flex-1"
                    data-testid="button-next-step"
                  >
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <SwapSummary
                cryptoAmount={amount}
                cryptoSymbol={selectedToken}
                nairaAmount={calculateNaira()}
                exchangeRate={getCurrentRate()}
                fee={calculateFee()}
                bankName={bankName}
                accountNumber={accountNumber}
                accountName={accountName}
                onConfirm={handleConfirmSwap}
                onBack={() => setCurrentStep(3)}
                isProcessing={isProcessingBlockchain}
              />
            )}

            {currentStep === 5 && (
              <>
                {!currentTransaction ? (
                  <div className="py-12 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading transaction details...</p>
                  </div>
                ) : (
                  <TransactionStatus
                    status={currentTransaction.status as "pending" | "processing" | "completed" | "failed"}
                    transactionId={transactionId}
                    cryptoAmount={amount}
                    cryptoSymbol={selectedToken}
                    nairaAmount={currentTransaction.netNairaAmount}
                    onNewSwap={handleNewSwap}
                  />
                )}
              </>
            )}
          </Card>

          <div className="mt-6 text-center space-y-2">
            <p className="text-xs text-muted-foreground">
              Secure • Fast • Reliable
            </p>
            <p className="text-xs text-muted-foreground">
              Platform fee: 0.1% • All fees go to app maintenance
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
