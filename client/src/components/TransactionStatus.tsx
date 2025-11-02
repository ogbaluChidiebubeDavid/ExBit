import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, AlertCircle, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TransactionStatusProps {
  status: "pending" | "processing" | "completed" | "failed";
  transactionId: string;
  cryptoAmount: string;
  cryptoSymbol: string;
  nairaAmount: number;
  onNewSwap: () => void;
}

export function TransactionStatus({
  status,
  transactionId,
  cryptoAmount,
  cryptoSymbol,
  nairaAmount,
  onNewSwap,
}: TransactionStatusProps) {
  const { toast } = useToast();

  const copyTransactionId = () => {
    navigator.clipboard.writeText(transactionId);
    toast({
      title: "Copied!",
      description: "Transaction ID copied to clipboard",
    });
  };

  const formatNaira = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const statusConfig = {
    pending: {
      icon: Clock,
      color: "text-yellow-500",
      bg: "bg-yellow-500/10",
      title: "Transaction Pending",
      message: "Your transaction is being processed",
    },
    processing: {
      icon: Clock,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      title: "Processing",
      message: "Transferring funds to your account",
    },
    completed: {
      icon: CheckCircle2,
      color: "text-green-500",
      bg: "bg-green-500/10",
      title: "Transaction Completed",
      message: "Funds have been sent to your account",
    },
    failed: {
      icon: AlertCircle,
      color: "text-red-500",
      bg: "bg-red-500/10",
      title: "Transaction Failed",
      message: "Please contact support for assistance",
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className="space-y-4">
      <Card className={`p-8 ${config.bg}`}>
        <div className="flex flex-col items-center text-center space-y-4">
          <div className={`rounded-full p-4 ${config.bg}`}>
            <Icon className={`h-12 w-12 ${config.color}`} />
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-1">{config.title}</h3>
            <p className="text-sm text-muted-foreground">{config.message}</p>
          </div>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Amount Sent</span>
            <span className="font-medium font-mono">
              {cryptoAmount} {cryptoSymbol}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Amount Received</span>
            <span className="font-medium font-mono">{formatNaira(nairaAmount)}</span>
          </div>
          <div className="border-t pt-3">
            <div className="text-xs text-muted-foreground mb-1">Transaction ID</div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs font-mono bg-muted px-2 py-1 rounded truncate">
                {transactionId}
              </code>
              <Button
                variant="ghost"
                size="icon"
                onClick={copyTransactionId}
                data-testid="button-copy-id"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <Button
        onClick={onNewSwap}
        className="w-full"
        data-testid="button-new-swap"
      >
        New Swap
      </Button>
    </div>
  );
}
