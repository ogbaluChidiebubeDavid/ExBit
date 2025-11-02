import { TokenAmountInput } from '../TokenAmountInput';
import { useState } from 'react';

export default function TokenAmountInputExample() {
  const [token, setToken] = useState('USDT');
  const [amount, setAmount] = useState('');
  
  return (
    <TokenAmountInput
      blockchain="ethereum"
      selectedToken={token}
      amount={amount}
      onTokenChange={(t) => {
        setToken(t);
        console.log('Token changed:', t);
      }}
      onAmountChange={(a) => {
        setAmount(a);
        console.log('Amount changed:', a);
      }}
    />
  );
}
