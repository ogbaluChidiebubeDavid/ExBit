import { BLOCKCHAINS } from "@/lib/constants";
import { Card } from "@/components/ui/card";

interface BlockchainSelectorProps {
  selected: string;
  onSelect: (blockchain: string) => void;
}

export function BlockchainSelector({ selected, onSelect }: BlockchainSelectorProps) {
  return (
    <div>
      <label className="block text-sm font-medium mb-2">
        Select Network
      </label>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {BLOCKCHAINS.map((chain) => (
          <Card
            key={chain.id}
            onClick={() => onSelect(chain.id)}
            className={`p-4 cursor-pointer transition-all hover-elevate active-elevate-2 ${
              selected === chain.id
                ? "border-primary border-2"
                : ""
            }`}
            data-testid={`card-blockchain-${chain.id}`}
          >
            <div className="flex flex-col items-center gap-2">
              <div className="text-3xl">{chain.icon}</div>
              <div className="text-sm font-medium">{chain.name}</div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
