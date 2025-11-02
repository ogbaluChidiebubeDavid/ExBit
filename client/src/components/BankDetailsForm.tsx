import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NIGERIAN_BANKS } from "@/lib/constants";
import { CheckCircle2 } from "lucide-react";

interface BankDetailsFormProps {
  bankName: string;
  accountNumber: string;
  accountName: string;
  onBankChange: (bank: string) => void;
  onAccountNumberChange: (number: string) => void;
}

export function BankDetailsForm({
  bankName,
  accountNumber,
  accountName,
  onBankChange,
  onAccountNumberChange,
}: BankDetailsFormProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">
          Bank Name
        </label>
        <Select value={bankName} onValueChange={onBankChange}>
          <SelectTrigger data-testid="select-bank">
            <SelectValue placeholder="Select your bank" />
          </SelectTrigger>
          <SelectContent>
            {NIGERIAN_BANKS.map((bank) => (
              <SelectItem key={bank} value={bank}>
                {bank}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Account Number
        </label>
        <Input
          type="text"
          placeholder="0123456789"
          value={accountNumber}
          onChange={(e) => {
            const value = e.target.value.replace(/\D/g, '').slice(0, 10);
            onAccountNumberChange(value);
          }}
          maxLength={10}
          className="font-mono text-lg"
          data-testid="input-account-number"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Enter your 10-digit account number
        </p>
      </div>

      {accountName && (
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          <div>
            <div className="text-xs text-muted-foreground">Account Name</div>
            <div className="font-medium" data-testid="text-account-name">
              {accountName}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
