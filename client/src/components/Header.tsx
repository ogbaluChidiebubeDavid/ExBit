import { ThemeToggle } from "./ThemeToggle";

export function Header() {
  return (
    <header className="w-full border-b px-4 md:px-6">
      <div className="max-w-7xl mx-auto h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-2xl font-semibold text-foreground">
            NairaSwap
          </div>
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}
