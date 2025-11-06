import { ThemeToggle } from "./ThemeToggle";
import { WalletButton } from "./WalletButton";
import { Button } from "@/components/ui/button";
import { History } from "lucide-react";
import { Link, useLocation } from "wouter";
import exbitLogo from "@assets/exbit-logo.png";

export function Header() {
  const [location] = useLocation();
  const isHistoryPage = location === "/history";

  return (
    <header className="w-full border-b px-4 md:px-6">
      <div className="max-w-7xl mx-auto h-16 flex items-center justify-between gap-4">
        <Link href="/">
          <div className="cursor-pointer hover-elevate px-2 py-1 rounded-md">
            <img 
              src={exbitLogo} 
              alt="ExBit" 
              className="h-8 w-auto"
              data-testid="img-logo"
            />
          </div>
        </Link>
        <div className="flex items-center gap-2">
          {!isHistoryPage && (
            <Link href="/history">
              <Button variant="ghost" size="sm" data-testid="button-history">
                <History className="h-4 w-4 mr-2" />
                History
              </Button>
            </Link>
          )}
          <WalletButton />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
