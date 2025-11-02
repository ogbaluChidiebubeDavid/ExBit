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
    { symbol: 'WBTC', name: 'Wrapped Bitcoin' },
  ],
  bsc: [
    { symbol: 'BNB', name: 'BNB' },
    { symbol: 'USDT', name: 'Tether' },
    { symbol: 'USDC', name: 'USD Coin' },
  ],
  polygon: [
    { symbol: 'MATIC', name: 'Polygon' },
    { symbol: 'USDT', name: 'Tether' },
    { symbol: 'USDC', name: 'USD Coin' },
  ],
  arbitrum: [
    { symbol: 'ETH', name: 'Ethereum' },
    { symbol: 'USDT', name: 'Tether' },
    { symbol: 'USDC', name: 'USD Coin' },
  ],
  base: [
    { symbol: 'ETH', name: 'Ethereum' },
    { symbol: 'USDT', name: 'Tether' },
    { symbol: 'USDC', name: 'USD Coin' },
  ],
} as const;

export const NIGERIAN_BANKS = [
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
