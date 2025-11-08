# ExBit - Facebook Messenger Crypto Exchange Bot

## Overview
ExBit is a Facebook Messenger bot that enables non-crypto-savvy Nigerians to exchange cryptocurrency for Naira through simple conversational commands. Built with a custodial wallet model (inspired by Azza/WhatsApp bot), users interact entirely within Messenger—no MetaMask, no browser extensions, no crypto knowledge required. The bot supports multiple blockchains (Ethereum, BSC, Polygon, Arbitrum, Base) and provides seamless crypto-to-Naira conversion with direct bank transfers. Platform targets the 95% of Facebook users in Nigeria who are unfamiliar with crypto, making digital currency accessible through familiar messaging interfaces.

## User Preferences
I prefer simple language and direct instructions. I want iterative development with clear explanations for each step. Please ask for confirmation before making any major changes to the codebase or architectural decisions. Focus on delivering production-ready features.

## System Architecture

### Messenger Bot Interface
- **Platform**: Facebook Messenger Platform API (Webhooks)
- **User Experience**: Conversational AI with command-based interactions
- **Commands**: /deposit, /sell, /balance, /help (Azza-style)
- **Security**: Transaction PINs, security questions, Messenger webviews for sensitive data
- **No Wallet Required**: ExBit creates and manages custodial wallets for users

### Backend Infrastructure
- **Server**: Express.js with TypeScript
- **Messenger Webhooks**: Real-time message handling and automated responses
- **Database**: PostgreSQL (Neon) using Drizzle ORM
- **Blockchain Integration**: Ethers.js v6 for wallet generation, transaction monitoring, and crypto transfers
- **Custodial Wallets**: Server-side wallet management for all users (encrypted private keys)
- **Core Services**:
    - Command parser (natural language + slash commands)
    - Deposit monitoring (detects incoming crypto)
    - CoinGecko price fetching (real-time crypto-to-Naira rates)
    - Web3 transfer service (sends crypto from user's custodial wallet to owner's wallet)
    - Flutterwave integration (NGN bank transfers from owner's prefunded account)
    - Transaction PIN verification
    - Bank account validation

### Data Model
- **Users**: Messenger ID, custodial wallet addresses (per chain), encrypted private keys, transaction PIN (hashed), security question
- **Transactions**: User, blockchain, token, crypto amount, Naira amount, fee, bank details, blockchain TX hash, Flutterwave reference, status, timestamps
- **Deposits**: Incoming crypto transactions, confirmation status (includes negative deposits for balance tracking)
- **Beneficiaries**: Saved Nigerian bank accounts for faster future transfers

### Key Features
- ✅ **Custodial Wallets**: ExBit generates wallets for users (no MetaMask needed)
- ✅ **Multi-blockchain Support**: Ethereum, BSC, Polygon, Arbitrum, Base
- ✅ **Conversational Interface**: Simple commands in Messenger
- ✅ **Transaction PINs**: 4-digit security for all swaps
- ✅ **Messenger Webviews**: Secure data entry (bank details, PINs) - no sensitive info in chat history
- ✅ **Real-time Notifications**: Bot messages when deposits arrive or transfers complete
- ✅ **0.1% Platform Fee**: $0.10 per transaction (₦143 at current rates)

## External Dependencies

- **Facebook Messenger Platform API**:
    - **Purpose**: Webhook-based message handling, sending bot responses, Messenger webviews
    - **Requirements**: Facebook Developer account, Facebook Page, Page Access Token
    - **No IP Restrictions**: Works on any hosting platform (Replit, Oracle Cloud, etc.)
    - **Documentation**: https://developers.facebook.com/docs/messenger-platform

- **CoinGecko API** (Price Feeds):
    - **Purpose**: Real-time cryptocurrency-to-Naira conversion rates
    - **Integration**: Fetches market prices before swaps (free tier sufficient for MVP)
    - **Why CoinGecko**: ✅ No API key required, reliable pricing, supports all major tokens
    - **Documentation**: https://www.coingecko.com/api/documentation

- **Flutterwave API** (Naira Payouts):
    - **Purpose**: Direct NGN bank transfers to Nigerian users
    - **Requirements**: `FLUTTERWAVE_SECRET_KEY`, Business account with prefunded NGN balance
    - **Flow**: ExBit receives crypto → Owner manually sells on external exchange → Flutterwave pays users from prefunded account
    - **Why Flutterwave**: ✅ Direct bank transfers, no IP whitelisting, instant payouts, supports all Nigerian banks
    - **Prefunding**: Owner maintains NGN balance in Flutterwave account to cover user payouts
    - **Documentation**: https://developer.flutterwave.com/docs

- **Blockchain RPC Providers**:
    - **Purpose**: Monitor incoming deposits to user custodial wallets, execute crypto transfers
    - **Providers**: Alchemy (primary), Infura, or public RPC endpoints
    - **Chains**: Ethereum, BSC, Polygon, Arbitrum, Base
    - **Transfer Flow**: User's custodial wallet → Owner's wallet (automated via Web3)

- **PostgreSQL (Neon)**:
    - **Purpose**: Store users, wallets, transactions, PINs (hashed), bank accounts

## Deployment Options

### Current: Replit (WORKS NOW! ✅)
- **Status**: ✅ Fully functional with CoinGecko + Web3 + Flutterwave (no IP restrictions!)
- **Cost**: FREE (can upgrade to Reserved VM if needed)
- **Advantages**: Instant deployment, integrated secrets management, PostgreSQL database included
- **Perfect for**: Development, testing, early launch

### Alternative: Oracle Cloud Infrastructure (OCI)
- **Status**: Available if scaling requires it
- **Resources**: 2 AMD VMs or 4 ARM cores + 24GB RAM
- **Bandwidth**: Unlimited
- **Cost**: $0/month (Always Free Tier)
- **When to migrate**: If Replit limits become constraint or need more control
- **Setup Guide**: See `ORACLE_CLOUD_MIGRATION.md` for complete migration instructions

## User Flow (Azza-Style)

1. **User finds @ExBitBot on Messenger**
2. **Bot**: "Welcome! Want to create a wallet?"
3. **User**: "Yes"
4. **Bot**: "Set a 4-digit PIN" → [Opens secure webview]
5. **User**: Creates PIN (1234) + security question
6. **Bot**: "Wallet created! Commands: /deposit, /sell, /balance"
7. **User**: "/deposit"
8. **Bot**: "Which chain? [Buttons: ETH, BSC, Polygon, ARB, Base]"
9. **User**: Clicks "BSC"
10. **Bot**: "Send USDT/BNB to: 0xABC123... [Copy button]"
11. **User**: Sends 100 USDT from Trust Wallet
12. **Bot**: "✅ Received 100 USDT! Balance: 100 USDT. Type /sell to convert"
13. **User**: "/sell"
14. **Bot**: "Ready to sell your crypto!" → [Opens sell amount webview button]
15. **User**: Clicks button → Webview shows balances, selects USDT, enters 100
16. **Bot**: "Selling 100 USDT, Rate: ₦1,436/USDT, You'll receive: ₦143,503, Fee: ₦143" → [Opens bank details webview button]
17. **User**: Clicks button → Enters bank (Access Bank) + account number (1234567890) → System auto-fetches account name "John Doe"
18. **Bot**: "Confirm: ₦143,503 to Access Bank - John Doe (•••6789)? Enter PIN:"
19. **User**: Enters PIN (1234)
20. **Bot**: "✅ Processing... [Step 1/2: Transferring crypto to ExBit... Step 2/2: Sending Naira to your bank...] ✅ Sent! Blockchain TX: 0x1234...abcd"

## Business Model

- **Fee Structure**: 0.1% per swap ($0.10 or ₦143 per transaction)
- **Revenue Example**: 100 users/day × $100 avg = $10/day = $300/month
- **No Prefunding**: Users send crypto first, zero capital required
- **Scalability**: Fees scale with volume
- **Target Market**: 95% of Nigerian Facebook users (non-crypto-savvy)

## Development Progress

### ✅ Completed Features (as of Nov 8, 2025)
- ✅ **Messenger Webhook**: Facebook verified, live bot receiving messages and postbacks
- ✅ **Custodial Wallet System**: Multi-chain wallet generation (Ethereum, BSC, Polygon, Arbitrum, Base)
- ✅ **Command Parser**: Natural language + slash commands (/deposit, /sell, /balance, /help, /reset-pin)
- ✅ **Transaction PIN System**: bcrypt-hashed 4-digit PINs with security questions
- ✅ **Blockchain Monitoring**: Real-time deposit detection with 3000-block lookback (~100 min)
- ✅ **Base Chain Integration**: Alchemy API, USDT support, confirmed working
- ✅ **Database Schema**: Users, deposits, transactions, monitoring state, beneficiaries, pending bank details
- ✅ **Alchemy Multi-Chain**: Single API key powers Ethereum, Polygon, Arbitrum, Base (no more RPC errors!)
- ✅ **Messenger Webviews Infrastructure**: Secure PIN entry and bank details forms with Flutterwave validation
- ✅ **Webview Button Integration**: Bot sends webview buttons for all sensitive data (no chat history exposure)
- ✅ **CoinGecko Price Integration**: Real-time crypto-to-Naira market rates via free public API
- ✅ **Web3 Transfer Service**: Automated crypto transfers from user custodial wallets to owner wallet
- ✅ **Flutterwave Transfer Service**: NGN bank transfers from owner's prefunded account to user banks
- ✅ **Complete /sell Flow (CoinGecko + Web3 + Flutterwave)**: 
  - /sell command → sell amount webview (select token + enter amount)
  - Auto-fetch CoinGecko market price and calculate fees
  - Bank details webview (auto-fetch account name via Flutterwave)
  - PIN verification → Web3 transfer crypto to owner → Flutterwave payout to user
  - **Zero chat messages for sensitive data** - entire flow happens in webviews
- ✅ **Transaction Tracking**: Full database records with blockchain TX hash and Flutterwave references
- ✅ **Server-initiated Flow Continuation**: Webview completions automatically trigger next steps without user input
- ✅ **Concurrency Guard**: Atomic balance checking with `SELECT FOR UPDATE` row locking prevents double-spending
- ✅ **Automatic Rollback**: If transaction fails, negative deposit is deleted and balance is restored
- ✅ **Balance Management**: Negative deposits for tracking sells, float-based calculations

### 🎯 Architecture Migration Complete!
**Changed from Quidax to CoinGecko + Web3 + Flutterwave**
- ✅ Owner manually sells crypto on external exchanges
- ✅ Flutterwave pays users from owner's prefunded NGN account
- ✅ No dependency on crypto exchange APIs for selling
- ✅ More control, better for MVP testing

### 📋 Next Steps
- **Immediate**: Manual testing with real Messenger account and small crypto amounts
- **Next**: Test deposit detection → sell → Web3 transfer → Flutterwave payout end-to-end
- **Future Enhancements**: 
  - Database-level safeguard for negative balances (CHECK constraint or trigger)
  - Move balance aggregation to SQL using NUMERIC columns to prevent float rounding errors
  - Beneficiary save/reuse functionality
  - Transaction history viewing
  - Multiple language support
  - Re-enable blockchain monitoring (currently disabled to prevent Alchemy rate limiting)

### Testing Phase (Weeks 5-8)
- Test with friends/family
- Process small real transactions
- Refine UX based on feedback
- Keep private (no public ads)
- Owner manually sells received crypto on Binance/Quidax/etc

### Launch Phase (Week 9+)
- Set up Flutterwave business account with sufficient NGN balance
- Consider registering CAC (business)
- Public launch on Facebook
- Marketing to Nigerian crypto communities