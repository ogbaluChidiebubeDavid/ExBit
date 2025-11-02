import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { TransactionHistory } from "@/components/TransactionHistory";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { api } from "@/lib/api";

export default function HistoryPage() {
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["/api/transactions"],
    queryFn: () => api.getAllTransactions(),
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6 flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-semibold">Transaction History</h1>
              <p className="text-sm text-muted-foreground mt-1">
                View all your past swaps
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading transactions...
            </div>
          ) : (
            <TransactionHistory transactions={transactions} />
          )}
        </div>
      </main>
    </div>
  );
}
