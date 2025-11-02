export const BLOCKCHAINS = [
  { id: 'ethereum', name: 'Ethereum', icon: '⟠' },
  { id: 'bsc', name: 'BSC', icon: '⬤' },
  { id: 'polygon', name: 'Polygon', icon: '⬡' },
  { id: 'arbitrum', name: 'Arbitrum', icon: '◆' },
  { id: 'base', name: 'Base', icon: '▲' },
] as const;

export const TOKENS = {
  ethereum: [
    { symbol: 'ETH', name: 'Ethereum', rate: 1600000 },
    { symbol: 'USDT', name: 'Tether', rate: 1650 },
    { symbol: 'USDC', name: 'USD Coin', rate: 1650 },
    { symbol: 'WBTC', name: 'Wrapped Bitcoin', rate: 95000000 },
  ],
  bsc: [
    { symbol: 'BNB', name: 'BNB', rate: 950000 },
    { symbol: 'USDT', name: 'Tether', rate: 1650 },
    { symbol: 'USDC', name: 'USD Coin', rate: 1650 },
  ],
  polygon: [
    { symbol: 'MATIC', name: 'Polygon', rate: 1400 },
    { symbol: 'USDT', name: 'Tether', rate: 1650 },
    { symbol: 'USDC', name: 'USD Coin', rate: 1650 },
  ],
  arbitrum: [
    { symbol: 'ETH', name: 'Ethereum', rate: 1600000 },
    { symbol: 'USDT', name: 'Tether', rate: 1650 },
    { symbol: 'USDC', name: 'USD Coin', rate: 1650 },
  ],
  base: [
    { symbol: 'ETH', name: 'Ethereum', rate: 1600000 },
    { symbol: 'USDT', name: 'Tether', rate: 1650 },
    { symbol: 'USDC', name: 'USD Coin', rate: 1650 },
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
