import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface SwapSummaryProps {
  cryptoAmount: string;
  cryptoSymbol: string;
  nairaAmount: number;
  exchangeRate: number;
  fee: number;
  bankName: string;
  accountNumber: string;
  accountName: string;
  onConfirm: () => void;
  onBack: () => void;
  isProcessing?: boolean;
}

export function SwapSummary({
  cryptoAmount,
  cryptoSymbol,
  nairaAmount,
  exchangeRate,
  fee,
  bankName,
  accountNumber,
  accountName,
  onConfirm,
  onBack,
  isProcessing = false,
}: SwapSummaryProps) {
  const formatNaira = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const netAmount = nairaAmount - fee;

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold">Review Transaction</h3>
      
      <Card className="p-6 space-y-4">
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">You Send</span>
            <span className="font-medium font-mono">
              {cryptoAmount} {cryptoSymbol}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Exchange Rate</span>
            <span className="font-medium text-sm font-mono">
              1 {cryptoSymbol} = {formatNaira(exchangeRate)}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Transaction Fee</span>
            <span className="font-medium text-sm">{formatNaira(fee)}</span>
          </div>

          <div className="border-t pt-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">You Receive</span>
              <span className="text-2xl font-semibold font-mono" data-testid="text-net-amount">
                {formatNaira(netAmount)}
              </span>
            </div>
          </div>
        </div>

        <div className="border-t pt-4 space-y-2">
          <div className="text-sm text-muted-foreground">Receiving Account</div>
          <div className="space-y-1">
            <div className="font-medium">{accountName}</div>
            <div className="font-mono text-sm">{accountNumber}</div>
            <div className="text-sm text-muted-foreground">{bankName}</div>
          </div>
        </div>
      </Card>

      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={isProcessing}
          className="flex-1"
          data-testid="button-back"
        >
          Back
        </Button>
        <Button
          onClick={onConfirm}
          disabled={isProcessing}
          className="flex-1"
          data-testid="button-confirm"
        >
          {isProcessing ? "Processing..." : "Confirm Swap"}
        </Button>
      </div>
    </div>
  );
}
