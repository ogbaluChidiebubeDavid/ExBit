# NairaSwap - Crypto to Naira Exchange Platform

## Overview
NairaSwap is a modern web application that allows users to swap cryptocurrency tokens to Nigerian Naira with direct bank account transfers. The platform features a clean, minimal interface inspired by relay.link, supporting multiple blockchain networks including Ethereum, BSC, Polygon, Arbitrum, and Base.

## Current State
**Status**: MVP Complete
**Last Updated**: November 2, 2025

### Implemented Features
- ✅ Multi-blockchain support (Ethereum, BSC, Polygon, Arbitrum, Base)
- ✅ Token selection with real-time exchange rates
- ✅ Nigerian bank account validation
- ✅ Transaction creation and processing
- ✅ Real-time transaction status tracking (pending → processing → completed/failed)
- ✅ Transaction history page
- ✅ Dark/light mode toggle
- ✅ Responsive design for mobile and desktop

## Project Architecture

### Frontend (React + TypeScript)
- **Framework**: React with Vite
- **Routing**: Wouter
- **State Management**: TanStack Query (React Query)
- **Styling**: Tailwind CSS + Shadcn UI
- **Form Validation**: Zod with React Hook Form

### Backend (Express + TypeScript)
- **Server**: Express.js
- **Storage**: In-memory storage (MemStorage)
- **Validation**: Zod schemas
- **API Endpoints**:
  - `GET /api/rates` - Fetch exchange rates for all blockchains
  - `POST /api/validate-account` - Validate Nigerian bank account
  - `POST /api/transactions` - Create new swap transaction
  - `GET /api/transactions/:id` - Get transaction by ID
  - `GET /api/transactions` - Get all transactions

### Data Model
```typescript
Transaction {
  id: string
  blockchain: string (ethereum, bsc, polygon, arbitrum, base)
  token: string (USDT, USDC, ETH, BNB, etc.)
  amount: decimal
  nairaAmount: decimal
  exchangeRate: decimal
  bankName: string
  accountNumber: string
  accountName: string
  status: string (pending, processing, completed, failed)
  createdAt: timestamp
}
```

## Key Files

### Frontend
- `client/src/pages/swap.tsx` - Main swap page with step-by-step flow
- `client/src/pages/history.tsx` - Transaction history page
- `client/src/lib/api.ts` - API client functions
- `client/src/lib/constants.ts` - Blockchain and token configurations
- `client/src/components/` - Reusable UI components

### Backend
- `server/routes.ts` - API route handlers
- `server/storage.ts` - Storage interface and in-memory implementation
- `shared/schema.ts` - Shared TypeScript types and Zod schemas

### Configuration
- `design_guidelines.md` - UI/UX design system and guidelines
- `tailwind.config.ts` - Tailwind CSS configuration
- `client/src/index.css` - CSS custom properties and theme variables

## User Flow

1. **Select Network**: User chooses blockchain (Ethereum, BSC, etc.)
2. **Enter Amount**: Select token and input amount to swap
3. **Bank Details**: Enter Nigerian bank name and account number
   - Account is validated automatically when 10 digits are entered
4. **Confirm Swap**: Review transaction details and confirm
5. **Transaction Status**: Real-time status updates
   - Pending → Processing → Completed (or Failed)
   - Status polling every 2 seconds until terminal state

## Mock Data & Testing

### Current Mocks
- Exchange rates are hardcoded but fetched from backend API
- Account validation returns random Nigerian names
- Transaction processing simulates async flow:
  - Starts as "pending"
  - Transitions to "processing" after 2 seconds
  - Transitions to "completed" after 5 seconds total

### To Remove Mocks (Production)
1. Replace mock exchange rates in `server/routes.ts` with real crypto price API
2. Integrate Nigerian banking API (Paystack/Flutterwave) for account validation
3. Implement real blockchain transaction handling (Web3.js/Ethers.js)
4. Add wallet connection (MetaMask, WalletConnect)
5. Replace in-memory storage with PostgreSQL database

## Design System

### Colors
- Primary: Blue (#217BF4 / HSL 217 91% 48%)
- Uses semantic tokens for light/dark mode compatibility
- Elevation system for hover/active states

### Typography
- Primary Font: Inter
- Monospace Font: JetBrains Mono (for amounts, addresses)

### Components
All components follow Shadcn UI patterns with custom styling:
- Cards with subtle elevation
- Buttons with hover-elevate and active-elevate-2 utilities
- Form inputs with validation states
- Status badges with color-coded indicators

## Recent Changes
- Nov 2, 2025: Initial implementation
  - Created full swap flow with 4-step process
  - Implemented transaction status tracking with polling
  - Added transaction history page
  - Fixed status display bug (was showing "completed" immediately)
  - Added query invalidation for transaction list updates

## Next Steps (Future Enhancements)
1. **Real Integrations**
   - Connect to cryptocurrency price APIs (CoinGecko, CoinMarketCap)
   - Integrate Paystack or Flutterwave for Nigerian bank transfers
   - Add Web3 wallet connection for actual crypto transactions

2. **Database Migration**
   - Move from in-memory storage to PostgreSQL
   - Add proper database migrations with Drizzle

3. **Advanced Features**
   - Transaction receipts with PDF download
   - Email notifications for transaction status
   - Transaction limits and KYC verification
   - Support for more tokens and blockchains
   - Price charts and historical data

4. **Security Enhancements**
   - Rate limiting on API endpoints
   - Transaction amount limits
   - Fraud detection
   - Two-factor authentication

## Development

### Running Locally
```bash
npm run dev
```
Server runs on port 5000 with both frontend and backend.

### Project Structure
```
├── client/               # Frontend React app
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Page components
│   │   ├── lib/         # Utilities and API client
│   │   └── App.tsx      # Main app with routing
│   └── index.html
├── server/              # Backend Express app
│   ├── routes.ts        # API endpoints
│   └── storage.ts       # Data storage layer
├── shared/              # Shared types and schemas
│   └── schema.ts
└── design_guidelines.md # Design system documentation
```

## Notes
- The app uses in-memory storage, so all data resets on server restart
- Mock data is clearly marked with comments for easy removal
- All components have data-testid attributes for e2e testing
- Responsive design works on mobile, tablet, and desktop
