import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TOKEN_INFO } from "@/lib/constants";
import { web3Service } from "@/lib/web3";
import { Loader2 } from "lucide-react";

interface TokenAmountInputProps {
  blockchain: string;
  selectedToken: string;
  amount: string;
  onTokenChange: (token: string) => void;
  onAmountChange: (amount: string) => void;
  walletAddress?: string;
}

export function TokenAmountInput({
  blockchain,
  selectedToken,
  amount,
  onTokenChange,
  onAmountChange,
  walletAddress,
}: TokenAmountInputProps) {
  const tokens = TOKEN_INFO[blockchain as keyof typeof TOKEN_INFO] || [];
  const [balances, setBalances] = useState<Record<string, string>>({});
  const [loadingBalances, setLoadingBalances] = useState(false);

  useEffect(() => {
    if (walletAddress && blockchain) {
      fetchBalances();
    }
  }, [walletAddress, blockchain]);

  const fetchBalances = async () => {
    if (!walletAddress) return;

    setLoadingBalances(true);
    const newBalances: Record<string, string> = {};

    try {
      await web3Service.switchChain(blockchain);
      
      for (const token of tokens) {
        try {
          const balance = await web3Service.getTokenBalance(
            blockchain,
            token.symbol,
            walletAddress
          );
          newBalances[token.symbol] = balance;
        } catch (error) {
          console.error(`Failed to fetch balance for ${token.symbol}:`, error);
          newBalances[token.symbol] = "0";
        }
      }
      setBalances(newBalances);
    } catch (error) {
      console.error("Failed to switch chain:", error);
    } finally {
      setLoadingBalances(false);
    }
  };

  const handleMaxClick = () => {
    const balance = balances[selectedToken];
    if (balance) {
      onAmountChange(balance);
    }
  };

  const currentBalance = balances[selectedToken];
  const hasBalance = currentBalance && parseFloat(currentBalance) > 0;

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">
          You Send
        </label>
        <div className="space-y-2">
          <Select value={selectedToken} onValueChange={onTokenChange}>
            <SelectTrigger data-testid="select-token" className="w-full">
              <SelectValue placeholder="Select token" />
            </SelectTrigger>
            <SelectContent>
              {tokens.map((token) => {
                const balance = balances[token.symbol];
                const hasTokenBalance = balance && parseFloat(balance) > 0;
                
                return (
                  <SelectItem key={token.symbol} value={token.symbol}>
                    <div className="flex items-center justify-between gap-4 w-full">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{token.symbol}</span>
                        <span className="text-sm text-muted-foreground">
                          {token.name}
                        </span>
                      </div>
                      {walletAddress && (
                        <div className="text-xs text-muted-foreground font-mono ml-auto">
                          {loadingBalances ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : balance ? (
                            <span className={hasTokenBalance ? "" : "text-destructive"}>
                              {parseFloat(balance).toFixed(4)}
                            </span>
                          ) : (
                            "-"
                          )}
                        </div>
                      )}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          
          <div className="relative">
            <Input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => onAmountChange(e.target.value)}
              className="text-3xl font-mono h-auto py-4 pr-20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              data-testid="input-amount"
              step="any"
              min="0.01"
            />
            {walletAddress && hasBalance && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2"
                onClick={handleMaxClick}
                data-testid="button-max"
              >
                MAX
              </Button>
            )}
          </div>

          {walletAddress && currentBalance && (
            <div className="text-xs text-muted-foreground">
              Balance: <span className="font-mono">{parseFloat(currentBalance).toFixed(4)}</span> {selectedToken}
            </div>
          )}

          {walletAddress && currentBalance && parseFloat(currentBalance) === 0 && (
            <div className="text-xs text-destructive">
              You don't have any {selectedToken} in your wallet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
