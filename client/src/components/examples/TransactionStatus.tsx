import { TransactionStatus } from '../TransactionStatus';

export default function TransactionStatusExample() {
  return (
    <TransactionStatus
      status="completed"
      transactionId="0x1234567890abcdef1234567890abcdef12345678"
      cryptoAmount="100"
      cryptoSymbol="USDT"
      nairaAmount={164175}
      onNewSwap={() => console.log('New swap clicked')}
    />
  );
}
