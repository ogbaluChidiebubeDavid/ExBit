# ExBit Local Testing Guide (Messenger Bot)

## Overview
This guide helps you test the complete Messenger bot flow locally on Replit, including:
1. Wallet creation
2. Depositing crypto to custodial wallet
3. Selling crypto for Naira
4. Verifying crypto reaches your wallet
5. Verifying Naira payout to bank

---

## Prerequisites

Before testing, ensure you have:

### Environment Variables (Already Configured)
- ✅ `OWNER_WALLET_ADDRESS` - Your wallet to receive crypto
- ✅ `FLUTTERWAVE_SECRET_KEY` - For bank payouts
- ✅ `PAGE_ACCESS_TOKEN` - Facebook Messenger
- ✅ `VERIFY_TOKEN` - Facebook webhook
- ✅ `APP_SECRET` - Facebook signature verification
- ✅ `WALLET_ENCRYPTION_KEY` - For custodial wallets
- ✅ `ALCHEMY_API_KEY` - For blockchain monitoring
- ✅ `DATABASE_URL` - PostgreSQL connection

### Test Funds
- **0.01 BNB** (~$6) for gas fees on BSC
- **0.1 USDT** (~$0.10) for test swap
- **Total**: ~$6.10 USD

### Blockchain Monitoring Status
By default, monitoring is **ENABLED** in production/Render deployment.

For local testing on Replit, monitoring may be **DISABLED** to prevent Alchemy rate limiting. To enable it:

**Option 1: Enable temporarily (recommended for testing)**
```bash
# In Secrets panel, remove DISABLE_BLOCKCHAIN_MONITORING
# Or set it to "false"
DISABLE_BLOCKCHAIN_MONITORING=false
```

**Option 2: Keep disabled and manually credit deposits**
If you want to avoid Alchemy rate limits during development, you can keep monitoring disabled and manually insert deposits into the database for testing.

---

## Step 1: Enable Blockchain Monitoring (Local Only)

For local testing on Replit, enable monitoring temporarily:

1. **Check current status** in logs:
   ```
   [BlockchainMonitor] Blockchain monitoring ENABLED
   ```
   OR
   ```
   [BlockchainMonitor] Blockchain monitoring DISABLED (via env variable)
   ```

2. **To enable monitoring** (if disabled):
   - Go to Replit **Secrets** panel (🔒 icon)
   - Find `DISABLE_BLOCKCHAIN_MONITORING`
   - Delete it OR set value to `false`
   - Restart workflow

3. **Verify monitoring started**:
   ```
   [BlockchainMonitor] Blockchain monitoring ENABLED
   [BlockchainMonitor] Initialized provider for Ethereum
   [BlockchainMonitor] Initialized provider for BSC
   [BlockchainMonitor] Initialized provider for Polygon
   [BlockchainMonitor] Initialized provider for Arbitrum
   [BlockchainMonitor] Initialized provider for Base
   ```

---

## Step 2: Create Test User & Wallet

### Via Messenger

1. **Open Messenger** and search for your Facebook Page
2. **Send**: `hi` or `hello`
3. **Bot responds**: Welcome message with wallet creation prompt
4. **Bot sends webview button**: "Set Your PIN"
5. **Click button** → Opens secure webview
6. **Enter 4-digit PIN**: e.g., `1234`
7. **Enter security question answer**: e.g., `Lagos`
8. **Submit** → Wallet created!

**Expected Response:**
```
✅ Wallet created successfully!

Your wallet addresses:
🔹 Ethereum: 0xABC...123
🔹 BSC: 0xABC...123
🔹 Polygon: 0xABC...123
🔹 Arbitrum: 0xABC...123
🔹 Base: 0xABC...123

Commands:
💰 /deposit - Get deposit address
💸 /sell - Sell crypto for Naira
📊 /balance - Check your balance
❓ /help - Show all commands
```

---

## Step 3: Get Deposit Address

1. **Send**: `/deposit`
2. **Bot asks**: "Which blockchain?" (with buttons)
3. **Click**: `BSC` (cheapest gas fees)
4. **Bot responds** with deposit address:

```
📥 Deposit USDT or BNB to BSC

Wallet Address:
0xABC123...XYZ789

[Copy Address] button

💡 Send crypto to this address and I'll notify you when it arrives!
```

5. **Copy the address** (click Copy button or manually copy)

---

## Step 4: Send Test Crypto

### Using MetaMask or Trust Wallet

1. **Open your wallet** (MetaMask/Trust Wallet)
2. **Switch to BSC network**
3. **Send USDT**:
   - **Amount**: `0.1 USDT`
   - **To**: The address from Step 3
   - **Confirm** transaction

### Expected Timeline
- **Transaction sent**: ~3 seconds
- **First confirmation**: ~3 seconds (BSC is fast)
- **Bot notification**: ~10-30 seconds

### Bot Notifications

**Pending deposit:**
```
💵 Deposit Detected!

Chain: BSC
Token: USDT
Amount: 0.1 USDT
Status: Pending (0/15 confirmations)

TX: 0x1234...abcd

I'll notify you when it's confirmed!
```

**Confirmed deposit:**
```
✅ Deposit Confirmed!

Chain: BSC
Token: USDT
Amount: 0.1 USDT
Status: Confirmed (15/15)

Type /balance to check your total balance
Type /sell to sell for Naira
```

---

## Step 5: Check Balance

1. **Send**: `/balance`
2. **Bot responds**:

```
💰 Your Balance

🔹 BSC USDT: 0.1

Total Naira Value: ₦143.60
(at current rate: ₦1,436/USDT)

Type /sell to convert to Naira
```

---

## Step 6: Sell Crypto for Naira

### Start Sell Flow

1. **Send**: `/sell`
2. **Bot responds**:

```
💸 Ready to sell your crypto!

Click below to enter amount:
[Select Amount] button
```

3. **Click "Select Amount"** → Opens webview

### Select Amount in Webview

**Webview shows:**
- Available balances on all chains
- Radio buttons to select token
- Input field for amount

**Fill in:**
- **Select**: `BSC - USDT (Balance: 0.1)`
- **Amount**: `0.1`
- **Click**: "Continue"

**Bot responds:**
```
💸 Selling 0.1 USDT on BSC

Rate: ₦1,436/USDT
Total: ₦143.60
Platform Fee: ₦0.14 (0.1%)
You'll Receive: ₦143.46

Click below to enter bank details:
[Enter Bank Details] button
```

### Enter Bank Details

4. **Click "Enter Bank Details"** → Opens webview

**Webview form:**
- **Bank**: Select from dropdown (e.g., `Access Bank`)
- **Account Number**: Enter 10-digit number
- **Auto-fetch**: Account name appears automatically

**Example:**
- Bank: `Access Bank`
- Account: `1234567890`
- Name: `JOHN DOE` (auto-fetched)

5. **Click "Submit"**

**Bot responds:**
```
🏦 Confirm Transfer

Sending: ₦143.46
To: Access Bank
Account: •••••7890
Name: JOHN DOE

Enter your 4-digit PIN to confirm:
```

### Verify with PIN

6. **Type your PIN**: `1234`

**Bot responds:**
```
✅ PIN verified!

⏳ Processing your transaction...

This will take 30-60 seconds. I'll notify you when the transfer is complete!
```

**Step 1 - Crypto Transfer:**
```
🔄 Step 1/2: Transferring 0.1 USDT to ExBit...
```

**Step 2 - Bank Payout:**
```
🔄 Step 2/2: Sending ₦143.46 to your bank...
```

**Success:**
```
🎉 Transaction Successful!

✅ Sold: 0.1 USDT
💰 Received: ₦143.46

🏦 Sent to:
Access Bank
1234567890
JOHN DOE

🔗 Blockchain TX: 0x5678...abcd
📱 Flutterwave Ref: FLW-MOCK-12345

Type /balance to check your remaining balance.
```

---

## Step 7: Verify Crypto Reached Your Wallet

### Check on BSCScan

1. **Go to**: https://bscscan.com
2. **Search for**: Your `OWNER_WALLET_ADDRESS`
3. **Click**: "Tokens" → "BEP-20 Tokens"
4. **Find**: USDT token
5. **Verify**: You received `0.1 USDT` from the user's custodial wallet

### Check Transaction Details

1. **Copy blockchain TX hash** from bot's success message
2. **Go to**: https://bscscan.com/tx/[PASTE_HASH_HERE]
3. **Verify**:
   - **From**: User's custodial wallet
   - **To**: Your owner wallet
   - **Amount**: 0.1 USDT
   - **Status**: Success ✅

---

## Step 8: Verify Naira Payout (Flutterwave)

### Check Flutterwave Dashboard

1. **Login to**: https://dashboard.flutterwave.com
2. **Go to**: Transfers
3. **Find**: Latest transfer with reference from bot
4. **Verify**:
   - **Amount**: ₦143.46 (or ₦143 if floored)
   - **Bank**: Access Bank
   - **Account**: 1234567890
   - **Status**: Successful

### Check Bank Account

For **test mode**, money won't actually be sent. For **live mode**:
1. **Check bank account** statement
2. **Verify**: ₦143.46 received
3. **Description**: "ExBit crypto swap - 0.1 USDT"

---

## Troubleshooting

### Deposit Not Detected

**Cause 1**: Blockchain monitoring disabled
```bash
# Check logs for:
[BlockchainMonitor] Blockchain monitoring DISABLED (via env variable)

# Fix: Remove DISABLE_BLOCKCHAIN_MONITORING from Secrets
```

**Cause 2**: Wrong network
```
# Verify you sent to the correct chain (BSC, not Ethereum)
# Check transaction on BSCScan
```

**Cause 3**: Alchemy rate limit
```bash
# Check logs for Alchemy errors
# Fix: Upgrade Alchemy plan or use public RPC
```

### Sell Failed - Insufficient Balance

**Error:**
```
❌ Sorry, the transaction failed. Not enough balance in your wallet to cover transaction and gas fees.
```

**Cause**: User's custodial wallet has no gas (BNB for BSC)

**Fix**: 
1. Send **0.001 BNB** to user's custodial wallet address
2. Retry sell

### Sell Failed - Flutterwave Error

**Error:**
```
❌ Sorry, the transaction failed. There was an issue with the Flutterwave account balance. Please contact support.
```

**Cause**: Your Flutterwave account has insufficient NGN balance

**Fix**:
1. Login to Flutterwave dashboard
2. Fund your NGN account
3. Retry sell

### PIN Incorrect

**Error:**
```
❌ Incorrect PIN! Please try again:
```

**Fix**: 
- Type `/reset-pin` to set a new PIN
- Or remember the correct PIN

---

## Database Manual Testing (If Monitoring Disabled)

If you want to test without enabling monitoring:

### 1. Manually Insert Deposit

```sql
-- Get user ID first
SELECT id, messenger_id FROM messenger_users ORDER BY id DESC LIMIT 1;

-- Insert deposit (replace USER_ID and WALLET_ADDRESS)
INSERT INTO deposits (
  messenger_user_id,
  blockchain,
  token,
  amount,
  to_address,
  from_address,
  transaction_hash,
  block_number,
  confirmations,
  status
) VALUES (
  'USER_ID_FROM_ABOVE',
  'bsc',
  'USDT',
  '0.1',
  'WALLET_ADDRESS_FROM_USER',
  '0xTEST123',
  '0xTEST_TX_HASH_123',
  '12345678',
  '15',
  'confirmed'
);
```

### 2. Check Balance

User sends `/balance` and should see:
```
💰 Your Balance
🔹 BSC USDT: 0.1
```

### 3. Continue with Sell Flow

Proceed from Step 6 above.

---

## Best Practices

### Test Incrementally

1. **Start small**: 0.1 USDT (~$0.10)
2. **Verify each step**:
   - ✅ Deposit detected
   - ✅ Balance correct
   - ✅ Sell quote accurate
   - ✅ Crypto transferred to owner
   - ✅ Naira sent to bank
3. **Scale up**: Try larger amounts after success

### Monitor Logs

Watch for errors in Replit console:
```bash
[BlockchainMonitor] - Deposit detection
[CommandHandler] - User commands
[Web3Transfer] - Crypto transfers
[Flutterwave] - Bank payouts
```

### Test Edge Cases

- **Zero balance sell**: Should fail gracefully
- **Invalid PIN**: Should allow retry
- **Network error**: Should rollback and restore balance
- **Flutterwave down**: Should handle timeout

---

## Rate Limit Management

### Alchemy Free Tier Limits
- **30 requests/second**
- **300M compute units/month**

### To Avoid Rate Limits

**Option 1**: Disable monitoring during development
```bash
DISABLE_BLOCKCHAIN_MONITORING=true
```

**Option 2**: Reduce monitoring frequency (edit `blockchainMonitor.ts`)
```typescript
// Change from 2x block time to 10x block time
const interval = setInterval(async () => {
  await this.checkForDeposits(...);
}, config.blockTime * 10); // 10x slower
```

**Option 3**: Upgrade Alchemy plan
- **Growth**: $49/month (750M compute units)
- **Scale**: $199/month (3B compute units)

---

## Production Readiness Checklist

Before deploying to Render:

### Testing
- ✅ Created test wallet successfully
- ✅ Deposited crypto and received notification
- ✅ Sold crypto and received Naira
- ✅ Verified crypto reached owner wallet
- ✅ Verified Flutterwave payout successful
- ✅ Tested all commands: `/deposit`, `/sell`, `/balance`, `/help`, `/reset-pin`

### Environment
- ✅ All secrets configured correctly
- ✅ Flutterwave account has NGN balance
- ✅ Owner wallet address correct
- ✅ Alchemy API key valid
- ✅ Facebook webhook verified

### Monitoring
- ✅ Blockchain monitoring working
- ✅ Logs showing successful operations
- ✅ No rate limit errors
- ✅ Error handling tested

---

## Next Steps

Once local testing passes:
1. **Review RENDER_DEPLOYMENT_GUIDE.md**
2. **Deploy to Render** for production
3. **Test with real users** (friends/family)
4. **Monitor performance** and errors
5. **Iterate based on feedback**

Good luck! 🚀
