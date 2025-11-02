import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import type { Transaction } from "@shared/schema";
import { format } from "date-fns";

interface TransactionHistoryProps {
  transactions: Transaction[];
  onViewTransaction?: (id: string) => void;
}

export function TransactionHistory({ transactions, onViewTransaction }: TransactionHistoryProps) {
  const formatNaira = (amount: string) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2,
    }).format(parseFloat(amount));
  };

  const getStatusConfig = (status: string) => {
    const configs = {
      pending: {
        icon: Clock,
        variant: "secondary" as const,
        label: "Pending",
      },
      processing: {
        icon: Clock,
        variant: "secondary" as const,
        label: "Processing",
      },
      completed: {
        icon: CheckCircle2,
        variant: "default" as const,
        label: "Completed",
      },
      failed: {
        icon: AlertCircle,
        variant: "destructive" as const,
        label: "Failed",
      },
    };
    return configs[status as keyof typeof configs] || configs.pending;
  };

  if (transactions.length === 0) {
    return (
      <Card className="p-12 text-center">
        <div className="text-muted-foreground">
          <p className="text-lg font-medium mb-2">No transactions yet</p>
          <p className="text-sm">Your transaction history will appear here</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {transactions.map((tx) => {
        const statusConfig = getStatusConfig(tx.status);
        const StatusIcon = statusConfig.icon;

        return (
          <Card
            key={tx.id}
            className="p-4 hover-elevate cursor-pointer transition-all"
            onClick={() => onViewTransaction?.(tx.id)}
            data-testid={`card-transaction-${tx.id}`}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium font-mono">
                    {tx.amount} {tx.token}
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{formatNaira(tx.nairaAmount)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="capitalize">{tx.blockchain}</span>
                  <span>•</span>
                  <span>{format(new Date(tx.createdAt), "MMM d, h:mm a")}</span>
                </div>
              </div>
              <Badge variant={statusConfig.variant} className="flex items-center gap-1">
                <StatusIcon className="h-3 w-3" />
                {statusConfig.label}
              </Badge>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
