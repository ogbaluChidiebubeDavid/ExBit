# ExBit - Crypto to Naira Exchange Platform

## Overview
ExBit is a full-stack web application enabling users to exchange cryptocurrency tokens for Nigerian Naira, with direct bank transfers. It supports multiple blockchain networks (Ethereum, BSC, Polygon, Arbitrum, Base) and features real-time crypto transfers, exchange rates, and bank account validation. The platform aims to provide a seamless, secure, and efficient crypto-to-fiat off-ramp solution for the Nigerian market, inspired by a minimal design aesthetic.

## User Preferences
I prefer simple language and direct instructions. I want iterative development with clear explanations for each step. Please ask for confirmation before making any major changes to the codebase or architectural decisions. Focus on delivering production-ready features.

## System Architecture

### Frontend
- **Framework**: React with Vite
- **Web3 Integration**: Ethers.js v6 for blockchain interactions (wallet connection, transactions, network switching)
- **Routing**: Wouter
- **State Management**: TanStack Query (React Query)
- **Styling**: Tailwind CSS with Shadcn UI for component library
- **Form Handling**: Zod for schema validation with React Hook Form
- **UI/UX**: Minimalist design inspired by relay.link, dark/light mode toggle, responsive for mobile and desktop, uses Inter and JetBrains Mono fonts, semantic color tokens, and elevation for interactive elements.

### Backend
- **Server**: Express.js with TypeScript
- **Database**: PostgreSQL (Neon) using Drizzle ORM for persistent storage of transaction history.
- **Validation**: Zod schemas for API data integrity.
- **Core Functionality**:
    - Real-time exchange rate fetching.
    - Nigerian bank account validation.
    - Automatic Naira transfers.
    - Transaction management and status tracking.
    - Platform fee collection (0.1% per swap).

### Data Model
- **Transaction**: Stores comprehensive details including blockchain, token, amounts (crypto, Naira, fee), exchange rate, bank details, user wallet, transaction hashes (blockchain & Flutterwave), status, and timestamps.

### Key Features
- Web3 wallet connection (MetaMask & compatible wallets) with automatic network switching.
- Multi-blockchain support (Ethereum, BSC, Polygon, Arbitrum, Base).
- Real cryptocurrency token transfers.
- Real-time transaction status updates.
- 0.1% platform fee collection to owner's wallet.

## External Dependencies

- **CoinGecko Public API**:
    - **Purpose**: Real-time cryptocurrency prices for supported tokens (ETH, BNB, MATIC, USDT, USDC, DAI, BUSD) with direct NGN pricing.
    - **Integration**: `GET /api/rates` endpoint.
- **Flutterwave API**:
    - **Purpose**: Nigerian bank account validation (Account Resolution API) and automatic Naira transfers (Transfers API).
    - **Requirements**: `FLUTTERWAVE_SECRET_KEY`, Flutterwave account with sufficient balance, and whitelisting of Reserved VM IP (`34.187.148.164`).
    - **Minimum Transfer**: ₦100.
- **Web3 Wallets**:
    - **Integration**: MetaMask, WalletConnect, Coinbase Wallet, etc., for user authentication, transaction signing, and blockchain interactions.
- **PostgreSQL (Neon)**:
    - **Purpose**: Cloud-hosted relational database for storing all transaction records and application data.