export const BLOCKCHAINS = [
  { id: 'ethereum', name: 'Ethereum', icon: '⟠' },
  { id: 'bsc', name: 'BSC', icon: '⬤' },
  { id: 'polygon', name: 'Polygon', icon: '⬡' },
  { id: 'arbitrum', name: 'Arbitrum', icon: '◆' },
  { id: 'base', name: 'Base', icon: '▲' },
] as const;

export const TOKEN_INFO = {
  ethereum: [
    { symbol: 'ETH', name: 'Ethereum' },
    { symbol: 'USDT', name: 'Tether' },
    { symbol: 'USDC', name: 'USD Coin' },
    { symbol: 'DAI', name: 'Dai' },
  ],
  bsc: [
    { symbol: 'BNB', name: 'BNB' },
    { symbol: 'USDT', name: 'Tether' },
    { symbol: 'USDC', name: 'USD Coin' },
    { symbol: 'BUSD', name: 'Binance USD' },
  ],
  polygon: [
    { symbol: 'MATIC', name: 'Polygon' },
    { symbol: 'USDT', name: 'Tether' },
    { symbol: 'USDC', name: 'USD Coin' },
    { symbol: 'DAI', name: 'Dai' },
  ],
  arbitrum: [
    { symbol: 'ETH', name: 'Ethereum' },
    { symbol: 'USDT', name: 'Tether' },
    { symbol: 'USDC', name: 'USD Coin' },
    { symbol: 'DAI', name: 'Dai' },
  ],
  base: [
    { symbol: 'ETH', name: 'Ethereum' },
    { symbol: 'USDC', name: 'USD Coin' },
    { symbol: 'DAI', name: 'Dai' },
  ],
} as const;

export const NIGERIAN_BANKS = [
  'Test Bank (Paystack)',
  'Access Bank',
  'Guaranty Trust Bank',
  'United Bank for Africa',
  'Zenith Bank',
  'First Bank of Nigeria',
  'Fidelity Bank',
  'Union Bank',
  'Stanbic IBTC Bank',
  'Sterling Bank',
  'Wema Bank',
  'Polaris Bank',
  'Ecobank',
  'Keystone Bank',
  'FCMB',
  'Heritage Bank',
  'Jaiz Bank',
  'Providus Bank',
  'Kuda Bank',
  'Opay',
  'PalmPay',
] as const;
