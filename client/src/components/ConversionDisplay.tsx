import { Card } from "@/components/ui/card";
import { ArrowDown, RefreshCw } from "lucide-react";

interface ConversionDisplayProps {
  cryptoAmount: string;
  cryptoSymbol: string;
  nairaAmount: number;
  exchangeRate: number;
  lastUpdated?: Date;
}

export function ConversionDisplay({
  cryptoAmount,
  cryptoSymbol,
  nairaAmount,
  exchangeRate,
  lastUpdated = new Date(),
}: ConversionDisplayProps) {
  const formatNaira = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <div className="rounded-full bg-muted p-2">
          <ArrowDown className="h-5 w-5" />
        </div>
      </div>

      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <div className="text-sm text-muted-foreground mb-1">You Receive</div>
            <div className="text-3xl font-semibold font-mono" data-testid="text-naira-amount">
              {formatNaira(nairaAmount)}
            </div>
          </div>

          <div className="pt-4 border-t space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Exchange Rate</span>
              <span className="font-medium font-mono">
                1 {cryptoSymbol} = {formatNaira(exchangeRate)}
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <RefreshCw className="h-3 w-3" />
              <span>Updated {lastUpdated.toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
