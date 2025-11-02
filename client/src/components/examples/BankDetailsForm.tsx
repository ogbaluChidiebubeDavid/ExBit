import { BankDetailsForm } from '../BankDetailsForm';
import { useState } from 'react';

export default function BankDetailsFormExample() {
  const [bank, setBank] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  
  // Mock account verification
  const handleAccountNumberChange = (num: string) => {
    setAccountNumber(num);
    if (num.length === 10) {
      setTimeout(() => {
        setAccountName('JOHN DOE EXAMPLE');
        console.log('Account verified');
      }, 500);
    } else {
      setAccountName('');
    }
  };
  
  return (
    <BankDetailsForm
      bankName={bank}
      accountNumber={accountNumber}
      accountName={accountName}
      onBankChange={(b) => {
        setBank(b);
        console.log('Bank changed:', b);
      }}
      onAccountNumberChange={handleAccountNumberChange}
    />
  );
}
