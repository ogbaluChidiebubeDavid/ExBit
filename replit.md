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
- **Blockchain Integration**: Ethers.js v6 for wallet generation and transaction monitoring
- **Custodial Wallets**: Server-side wallet management for all users (encrypted private keys)
- **Core Services**:
    - Command parser (natural language + slash commands)
    - Deposit monitoring (detects incoming crypto)
    - Quidax integration (sell crypto, bank transfers)
    - Transaction PIN verification
    - Bank account validation

### Data Model
- **Users**: Messenger ID, custodial wallet addresses (per chain), encrypted private keys, transaction PIN (hashed), security question
- **Transactions**: User, blockchain, token, crypto amount, Naira amount, fee, bank details, Quidax trade ID, status, timestamps
- **Deposits**: Incoming crypto transactions, confirmation status
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

- **Quidax API** (Primary Exchange):
    - **Purpose**: Crypto-to-Naira conversion, Nigerian bank transfers
    - **Why Quidax**: ✅ No IP whitelisting (solves Flutterwave problem!), SEC-licensed, no prefunding required
    - **Requirements**: `QUIDAX_SECRET_KEY`, Quidax personal account (can upgrade to business later)
    - **Flow**: User sends crypto → ExBit deposits to Quidax → Sell crypto for Naira → Withdraw to user's bank
    - **Fees**: Receiving crypto (FREE), Selling (~0.1-0.2%), Withdrawals (minimal)
    - **Documentation**: https://docs.quidax.io

- **CoinGecko Public API**:
    - **Purpose**: Real-time cryptocurrency prices for display in bot messages
    - **Integration**: Shows users conversion rates before swaps
    - **Optional**: Could use Quidax market data instead

- **Blockchain RPC Providers**:
    - **Purpose**: Monitor incoming deposits to user wallets
    - **Providers**: Infura, Alchemy, or public RPC endpoints
    - **Chains**: Ethereum, BSC, Polygon, Arbitrum, Base

- **PostgreSQL (Neon)**:
    - **Purpose**: Store users, wallets, transactions, PINs (hashed), bank accounts

## Deployment Options

### Current: Replit (WORKS NOW! ✅)
- **Status**: ✅ Fully functional with Quidax (no IP restrictions!)
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
13. **User**: "/sell 100 USDT"
14. **Bot**: "Rate: ₦1,436/USDT = ₦143,647. Fee: ₦143. You get: ₦143,503" → [Enter Bank Details]
15. **User**: Clicks secure form → enters bank account
16. **Bot**: "Confirm: ₦143,503 to Access Bank •••6789? Enter PIN:"
17. **User**: Enters PIN (1234)
18. **Bot**: "✅ Processing... [30 sec] ✅ Sent! TX: FLW-12345"

## Business Model

- **Fee Structure**: 0.1% per swap ($0.10 or ₦143 per transaction)
- **Revenue Example**: 100 users/day × $100 avg = $10/day = $300/month
- **No Prefunding**: Users send crypto first, zero capital required
- **Scalability**: Fees scale with volume
- **Target Market**: 95% of Nigerian Facebook users (non-crypto-savvy)

## Development Progress

### ✅ Completed Features (as of Nov 8, 2025)
- ✅ **Messenger Webhook**: Facebook verified, live bot receiving messages
- ✅ **Custodial Wallet System**: Multi-chain wallet generation (Ethereum, BSC, Polygon, Arbitrum, Base)
- ✅ **Command Parser**: Natural language + slash commands (/deposit, /sell, /balance, /help)
- ✅ **Transaction PIN System**: bcrypt-hashed 4-digit PINs with security questions
- ✅ **Blockchain Monitoring**: Real-time deposit detection with 3000-block lookback (~100 min)
- ✅ **Base Chain Integration**: Alchemy API, USDT support, confirmed working
- ✅ **Database Schema**: Users, deposits, transactions, monitoring state, pending bank details
- ✅ **Quidax API Setup**: Secret key configured, ready for sell/withdraw integration
- ✅ **Alchemy Multi-Chain**: Single API key powers Ethereum, Polygon, Arbitrum, Base (no more RPC errors!)
- ✅ **Messenger Webviews Infrastructure**: Secure PIN entry and bank details forms with Flutterwave validation
- ✅ **Webview Button Integration**: Bot sends webview buttons for all sensitive data (no chat history exposure)

### 🚧 In Progress
- ⏳ **Quidax Sell/Withdraw**: Integration for crypto-to-Naira conversion and bank transfers

### 📋 Next Steps
- **Immediate**: Complete Quidax sell/withdraw flow
- **Next**: Test complete user flow (deposit → sell → bank transfer)
- **Then**: Add beneficiary storage for saved bank accounts

### Testing Phase (Weeks 5-8)
- Test with friends/family
- Process small real transactions
- Refine UX based on feedback
- Keep private (no public ads)

### Launch Phase (Week 9+)
- Email Quidax for business approval
- Consider registering CAC (business)
- Public launch on Facebook
- Marketing to Nigerian crypto communities