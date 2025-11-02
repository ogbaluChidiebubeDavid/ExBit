import { SwapSummary } from '../SwapSummary';
import { useState } from 'react';

export default function SwapSummaryExample() {
  const [isProcessing, setIsProcessing] = useState(false);
  
  return (
    <SwapSummary
      cryptoAmount="100"
      cryptoSymbol="USDT"
      nairaAmount={165000}
      exchangeRate={1650}
      fee={825}
      bankName="Access Bank"
      accountNumber="0123456789"
      accountName="JOHN DOE EXAMPLE"
      onConfirm={() => {
        setIsProcessing(true);
        console.log('Swap confirmed');
        setTimeout(() => setIsProcessing(false), 2000);
      }}
      onBack={() => console.log('Back clicked')}
      isProcessing={isProcessing}
    />
  );
}
