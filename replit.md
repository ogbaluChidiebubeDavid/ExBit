# ExBit - Crypto to Naira Exchange Platform

## Overview
ExBit is a full-stack web application that allows users to swap cryptocurrency tokens to Nigerian Naira with direct bank account transfers using Web3 wallet connections. The platform features a clean, minimal interface inspired by relay.link, supporting multiple blockchain networks including Ethereum, BSC, Polygon, Arbitrum, and Base.

## Current State
**Status**: PRODUCTION READY - All integrations configured and database migrated
**Last Updated**: November 2, 2025

### Implemented Features
- ✅ Web3 wallet connection (MetaMask & compatible wallets)
- ✅ Multi-blockchain support with automatic network switching
- ✅ Real cryptocurrency token transfers via blockchain
- ✅ Real-time exchange rates from CoinGecko Public API
- ✅ Nigerian bank account validation via Flutterwave API
- ✅ Automatic Naira transfers to user bank accounts via Flutterwave
- ✅ 0.1% platform fee collection to owner wallet
- ✅ Transaction history with blockchain tx hash tracking
- ✅ Real-time transaction status updates
- ✅ Dark/light mode toggle
- ✅ Responsive design for mobile and desktop

## Project Architecture

### Frontend (React + TypeScript)
- **Framework**: React with Vite
- **Web3**: Ethers.js v6 for blockchain interactions
- **Routing**: Wouter
- **State Management**: TanStack Query (React Query)
- **Styling**: Tailwind CSS + Shadcn UI
- **Form Validation**: Zod with React Hook Form

### Backend (Express + TypeScript)
- **Server**: Express.js
- **Database**: PostgreSQL (Neon) with Drizzle ORM
- **Storage**: DatabaseStorage with persistent transaction history
- **Validation**: Zod schemas
- **External APIs**:
  - CoinGecko Public API (real-time crypto prices)
  - Flutterwave API (bank validation & Naira transfers)
- **API Endpoints**:
  - `GET /api/rates` - Fetch real-time exchange rates from CoinGecko
  - `POST /api/validate-account` - Validate Nigerian bank account via Flutterwave
  - `POST /api/transactions` - Create new swap transaction record
  - `POST /api/transactions/:id/process` - Process blockchain tx and initiate Naira transfer
  - `GET /api/transactions/:id` - Get transaction by ID
  - `GET /api/transactions` - Get all transactions
  - `GET /api/payment-status` - Check Flutterwave API key status

### Data Model
```typescript
Transaction {
  id: string
  blockchain: string (ethereum, bsc, polygon, arbitrum, base)
  token: string (USDT, USDC, ETH, BNB, DAI, MATIC, BUSD)
  amount: decimal (crypto amount user is swapping)
  nairaAmount: decimal (total Naira value)
  exchangeRate: decimal (current crypto to Naira rate)
  platformFee: decimal (0.1% fee in crypto)
  netAmount: decimal (crypto amount after fee deduction)
  bankName: string
  accountNumber: string
  accountName: string
  userWalletAddress: string (user's crypto wallet)
  transactionHash: string (blockchain tx hash)
  flutterwaveReference: string (Flutterwave transfer reference)
  status: string (pending, processing, completed, failed)
  createdAt: timestamp
}
```

## Key Files

### Frontend
- `client/src/pages/swap.tsx` - Main swap page with wallet integration
- `client/src/pages/history.tsx` - Transaction history page
- `client/src/hooks/useWallet.ts` - Web3 wallet connection hook
- `client/src/lib/web3.ts` - Web3 service for blockchain interactions
- `client/src/lib/api.ts` - API client functions
- `client/src/lib/constants.ts` - Blockchain and token configurations
- `client/src/components/WalletButton.tsx` - Wallet connection UI
- `client/src/components/` - Reusable UI components

### Backend
- `server/routes.ts` - API route handlers with real integrations
- `server/storage.ts` - Storage interface and in-memory implementation
- `server/services/priceService.ts` - CoinGecko API integration
- `server/services/flutterwaveService.ts` - Flutterwave API integration
- `shared/schema.ts` - Shared TypeScript types and Zod schemas

### Configuration
- `design_guidelines.md` - UI/UX design system and guidelines
- `tailwind.config.ts` - Tailwind CSS configuration
- `client/src/index.css` - CSS custom properties and theme variables

## User Flow

1. **Connect Wallet**: User connects MetaMask or compatible Web3 wallet
2. **Select Network**: Choose blockchain (Ethereum, BSC, Polygon, Arbitrum, Base)
3. **Enter Amount**: Select token and input amount to swap
4. **Bank Details**: Enter Nigerian bank name and account number
   - Account is validated in real-time via Flutterwave API
   - Real account name is fetched and displayed
5. **Confirm Swap**: Review transaction details and confirm
   - MetaMask popup appears for transaction approval
   - User approves sending crypto to owner's wallet address
   - 0.1% platform fee is deducted from crypto amount
   - Blockchain transaction is broadcast and confirmed
6. **Processing**: Backend processes the swap
   - Verifies blockchain transaction
   - Initiates Naira transfer to user's bank account via Flutterwave
7. **Completion**: Real-time status updates
   - Transaction hash displayed with blockchain explorer link
   - Naira transfer reference tracked
   - Final status: Completed or Failed

## Real Integrations

### CoinGecko Public API (Free)
- **Purpose**: Real-time cryptocurrency prices
- **Endpoint**: `https://api.coingecko.com/api/v3/simple/price`
- **Rate Limit**: 30 calls/min, 10,000 calls/month (no auth required)
- **Tokens**: ETH, BNB, MATIC, USDT, USDC, DAI, BUSD
- **Direct NGN Pricing**: No USD intermediary conversion needed
- **Advantages**: No geolocation restrictions, worldwide access, very reliable

### Flutterwave API (Unregistered Business Account)
- **Purpose**: Nigerian bank account validation & Naira transfers
- **Endpoints**:
  - Account Resolution API (validate account details)
  - Transfers API (send Naira to bank accounts directly)
- **Setup**: Requires `FLUTTERWAVE_SECRET_KEY` from dashboard
- **Documentation**: https://developer.flutterwave.com/
- **Advantages**: Works with unregistered businesses, no business registration required
- **Test Mode**: Available for development/testing

### Web3 Wallet Integration
- **Supported Wallets**: MetaMask, WalletConnect, Coinbase Wallet, etc.
- **Networks**: Ethereum, BSC, Polygon, Arbitrum, Base
- **Tokens**: ERC-20 tokens (USDT, USDC, DAI), Native tokens (ETH, BNB, MATIC)
- **Features**:
  - Automatic network switching
  - Transaction approval prompts
  - Real-time balance checking
  - Transaction confirmation tracking

## Environment Variables

### Configured ✅
- `FLUTTERWAVE_SECRET_KEY` - Flutterwave API secret key for bank operations ✅
- `OWNER_WALLET_ADDRESS` - Your crypto wallet address (0xbe3496154fec589f393717f730ae4b9ddda8564f) ✅
- `VITE_OWNER_WALLET_ADDRESS` - Same as above, for frontend access ✅
- `DATABASE_URL` - PostgreSQL connection string ✅
- `SESSION_SECRET` - Session management ✅

## Platform Fee System

**Fee Structure**: 0.1% of swap amount
**Collection Method**: 
1. When user confirms swap, they send their full crypto amount to the owner's wallet
2. Backend calculates 0.1% fee in crypto terms
3. Net Naira amount (after converting 99.9% of crypto) is transferred to user's bank
4. Owner receives 100% of crypto (including 0.1% fee) in their wallet

**Example**:
- User swaps 100 USDT
- Platform fee: 0.1 USDT (0.1%)
- User sends: 100 USDT to owner wallet
- Naira equivalent: ₦165,000 (at ₦1,650/USDT)
- Platform fee in Naira: ₦165 (0.1%)
- User receives: ₦164,835 in their bank account
- Owner keeps: 100 USDT in crypto wallet

## Design System

### Colors
- Primary: Blue (#217BF4 / HSL 217 91% 48%)
- Uses semantic tokens for light/dark mode compatibility
- Elevation system for hover/active states

### Typography
- Primary Font: Inter
- Monospace Font: JetBrains Mono (for amounts, addresses, tx hashes)

### Components
All components follow Shadcn UI patterns with custom styling:
- Cards with subtle elevation
- Buttons with hover-elevate and active-elevate-2 utilities
- Form inputs with validation states
- Status badges with color-coded indicators
- Wallet connection button with address display

## Recent Changes
- Nov 2, 2025: **Switched to Flutterwave + Rebranded to ExBit**
  - ✅ **Replaced Paystack with Flutterwave API** (works with unregistered businesses!)
  - ✅ **Rebranded from NairaSwap to ExBit**
  - ✅ Updated all branding across the application
  - ✅ Created new Flutterwave service for bank validation and transfers
  - ✅ Updated API endpoints to use Flutterwave
  - ✅ Simplified transfer flow (no transfer recipient creation needed)

- Nov 2, 2025: Production deployment ready + UX improvements
  - ✅ Integrated Ethers.js for Web3 wallet connections
  - ✅ Added multi-chain support with automatic network switching
  - ✅ Implemented real cryptocurrency transfers
  - ✅ **Replaced Binance API with CoinGecko API** (no geolocation restrictions, direct NGN pricing)
  - ✅ Implemented 0.1% platform fee collection system
  - ✅ Added blockchain transaction hash tracking
  - ✅ Updated UI with wallet connection button
  - ✅ **Added wallet balance display in token selector dropdown**
  - ✅ **Added balance validation to prevent overdraft**
  - ✅ **Implemented automatic network switching before balance checks**
  - ✅ **Added transaction signing prompt** ("Please approve the transaction in your wallet")
  - ✅ **Removed number input spinner buttons** (cleaner UI)
  - ✅ **Lowered minimum swap to 0.01 tokens** (1 cent minimum)
  - ✅ Added transaction processing flow with MetaMask approval
  - ✅ Migrated from in-memory to PostgreSQL database
  - ✅ Transaction history now persists across restarts

## Production Status ✅

All core features are production-ready:
- ✅ API keys configured (Flutterwave live mode)
- ✅ Wallet address configured for fee collection
- ✅ PostgreSQL database with persistent storage
- ✅ All transactions saved to database
- ✅ Real-time blockchain integration with MetaMask
- ✅ Bank account validation via Flutterwave
- ✅ Automatic Naira transfers to user accounts
- ✅ **No business registration required** (Flutterwave unregistered account)

## Optional Enhancements

3. **Security Enhancements**
   - Add rate limiting on API endpoints
   - Implement transaction amount limits
   - Add fraud detection for suspicious transactions
   - Implement KYC verification for large amounts
   - Add webhook verification for Flutterwave callbacks

4. **Advanced Features**
   - Transaction receipts with PDF download
   - Email notifications for transaction status
   - SMS notifications for bank transfers
   - Price charts and historical data
   - Support for more tokens and blockchains
   - Slippage protection for volatile tokens
   - Gas fee estimation and optimization

5. **Monitoring & Analytics**
   - Add error tracking (Sentry/LogRocket)
   - Implement analytics (Google Analytics/Mixpanel)
   - Add blockchain transaction monitoring
   - Track conversion rates and user behavior

## Development

### Running Locally
```bash
npm run dev
```
Server runs on port 5000 with both frontend and backend.

### Testing
The app is ready for testing with:
1. MetaMask installed
2. Test tokens on testnets (Sepolia, BSC Testnet, etc.)
3. Flutterwave test mode API keys

### Project Structure
```
├── client/               # Frontend React app
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Page components
│   │   ├── hooks/       # Custom React hooks (useWallet)
│   │   ├── lib/         # Utilities, API client, Web3 service
│   │   └── App.tsx      # Main app with routing
│   └── index.html
├── server/              # Backend Express app
│   ├── routes.ts        # API endpoints
│   ├── storage.ts       # Data storage layer
│   └── services/        # External API integrations
│       ├── priceService.ts
│       └── flutterwaveService.ts
├── shared/              # Shared types and schemas
│   └── schema.ts
└── design_guidelines.md # Design system documentation
```

## Notes
- **Database**: PostgreSQL with persistent storage - transactions survive restarts
- **CoinGecko API**: Free tier, no geolocation restrictions, direct NGN pricing
- **Flutterwave**: Live mode configured, works with unregistered businesses
- **Wallet Address**: Platform fees sent to 0xbe3496154fec589f393717f730ae4b9ddda8564f
- **Balance Checking**: Automatic network switching ensures accurate balances
- **Minimum Swap**: 0.01 tokens (1 cent) - perfect for testing and small swaps
- **Testing**: All components have data-testid attributes for e2e testing
- **Responsive**: Works on mobile, tablet, and desktop
- **Requirements**: MetaMask or compatible Web3 wallet required for users
