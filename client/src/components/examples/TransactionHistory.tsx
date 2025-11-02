import { TransactionHistory } from '../TransactionHistory';
import type { Transaction } from '@shared/schema';

export default function TransactionHistoryExample() {
  const mockTransactions: Transaction[] = [
    {
      id: '1',
      blockchain: 'ethereum',
      token: 'USDT',
      amount: '100',
      nairaAmount: '164175.00',
      exchangeRate: '1650.00',
      bankName: 'Access Bank',
      accountNumber: '0123456789',
      accountName: 'JOHN DOE',
      status: 'completed',
      createdAt: new Date(Date.now() - 3600000),
    },
    {
      id: '2',
      blockchain: 'polygon',
      token: 'USDC',
      amount: '50',
      nairaAmount: '82087.50',
      exchangeRate: '1650.00',
      bankName: 'GTBank',
      accountNumber: '9876543210',
      accountName: 'JANE SMITH',
      status: 'processing',
      createdAt: new Date(Date.now() - 7200000),
    },
    {
      id: '3',
      blockchain: 'bsc',
      token: 'USDT',
      amount: '200',
      nairaAmount: '328350.00',
      exchangeRate: '1650.00',
      bankName: 'Zenith Bank',
      accountNumber: '1234567890',
      accountName: 'BOB JOHNSON',
      status: 'pending',
      createdAt: new Date(Date.now() - 86400000),
    },
  ];
  
  return (
    <TransactionHistory
      transactions={mockTransactions}
      onViewTransaction={(id) => console.log('View transaction:', id)}
    />
  );
}
