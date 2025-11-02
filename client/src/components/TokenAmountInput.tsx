import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TOKENS } from "@/lib/constants";

interface TokenAmountInputProps {
  blockchain: string;
  selectedToken: string;
  amount: string;
  onTokenChange: (token: string) => void;
  onAmountChange: (amount: string) => void;
}

export function TokenAmountInput({
  blockchain,
  selectedToken,
  amount,
  onTokenChange,
  onAmountChange,
}: TokenAmountInputProps) {
  const tokens = TOKENS[blockchain as keyof typeof TOKENS] || [];

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
              {tokens.map((token) => (
                <SelectItem key={token.symbol} value={token.symbol}>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{token.symbol}</span>
                    <span className="text-sm text-muted-foreground">
                      {token.name}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <div className="relative">
            <Input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => onAmountChange(e.target.value)}
              className="text-3xl font-mono h-auto py-4 pr-20"
              data-testid="input-amount"
              step="any"
              min="0"
            />
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 -translate-y-1/2"
              onClick={() => onAmountChange("1000")}
              data-testid="button-max"
            >
              MAX
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
