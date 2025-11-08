# ExBit MVP - Manual Test Plan

## Overview
This document provides a comprehensive test plan for manually testing the ExBit Messenger bot. Since ExBit is a Messenger bot (not a web app), automated Playwright testing isn't applicable. Instead, this manual test plan ensures all features work correctly end-to-end.

## Prerequisites

### Required Accounts & Access
- ✅ Facebook Developer account with ExBit app configured
- ✅ Facebook Page connected to ExBit bot
- ✅ Messenger account for testing
- ✅ Quidax account with QUIDAX_SECRET_KEY configured
- ✅ Alchemy API keys (ALCHEMY_BASE_API_KEY for all chains)
- ✅ Nigerian bank account details (for withdrawal testing)
- ✅ Replit domain whitelisted in Facebook (for Messenger webviews)

### Test Wallet Setup
- Small amounts of crypto on supported chains:
  - BSC: 10-20 USDT (~$10-20)
  - Ethereum: 0.01 ETH (~$30)
  - Polygon: 20 MATIC (~$15)
  - Base: 10 USDT (~$10)
  - Arbitrum: 10 USDT (~$10)

**IMPORTANT**: Start with small amounts for testing!

---

## Test Cases

### 1. Onboarding Flow

**Objective**: Verify new users can create wallets and set PINs securely.

**Steps**:
1. Message the bot on Messenger (first time)
2. Bot should welcome you and ask if you want to create a wallet
3. Respond "Yes" or "Create wallet"
4. Bot sends webview button "Create Transaction PIN"
5. Click the webview button
6. Webview opens with PIN entry form
7. Enter 4-digit PIN (e.g., 1234)
8. Re-enter PIN to confirm
9. Enter security question and answer
10. Submit form

**Expected Results**:
- ✅ Webview opens successfully (not blocked by Facebook)
- ✅ PIN validation works (must be 4 digits)
- ✅ Confirmation PIN must match
- ✅ Form submits successfully
- ✅ Bot automatically continues flow after webview closes
- ✅ Bot shows "Wallet created!" with available commands
- ✅ No sensitive data (PIN, security question) appears in chat history

**Failure Scenarios to Test**:
- Mismatched PINs → Should show error
- Non-numeric PIN → Should show error
- Empty fields → Should show error

---

### 2. Deposit Flow

**Objective**: Verify users can deposit crypto and bot detects deposits.

**Steps**:
1. Type `/deposit` in chat
2. Bot shows blockchain selection buttons
3. Click "BSC (BNB)"
4. Bot shows your BSC wallet address
5. Send 10 USDT to the address from your external wallet
6. Wait for blockchain confirmations

**Expected Results**:
- ✅ Bot shows correct wallet address
- ✅ Address is unique to your account
- ✅ Bot detects deposit within ~5-10 minutes
- ✅ Bot sends notification: "✅ Received 10 USDT!"
- ✅ Deposit shows in database with "confirmed" status

**Database Verification**:
```sql
SELECT * FROM deposits WHERE messenger_user_id = '<your_user_id>' ORDER BY detected_at DESC;
```

Expected: One row with correct amount, blockchain, token, and status = "confirmed"

---

### 3. Balance Check

**Objective**: Verify balance command shows accurate deposit balances.

**Steps**:
1. Type `/balance` in chat
2. Review balance display

**Expected Results**:
- ✅ Shows all confirmed deposits by chain and token
- ✅ Matches actual deposited amounts
- ✅ Format: "10 USDT (BSC Network)"
- ✅ Suggests `/sell` command if balance > 0

---

### 4. Sell Flow - Part 1: Amount Selection

**Objective**: Verify sell command shows available balances and fetches real-time Quidax prices.

**Steps**:
1. Type `/sell` in chat
2. Bot shows available balances with selection buttons
3. Click the balance you want to sell (e.g., "10 USDT (BSC)")
4. Bot asks "How much USDT would you like to sell?"
5. Type amount (e.g., "10" or "5")

**Expected Results**:
- ✅ Bot shows all available balances
- ✅ Only confirmed deposits appear
- ✅ After entering amount, bot fetches real-time Quidax market price
- ✅ Bot shows:
  - Rate: ₦X,XXX/USDT
  - Total: ₦XXX,XXX
  - Platform Fee (0.1%): ₦XXX
  - You'll receive: ₦XXX,XXX
- ✅ Bot sends webview button "Enter Bank Details"

**Failure Scenarios**:
- Amount > available balance → Error message
- Invalid amount (letters, negative) → Error message
- Quidax API error → Error message with retry option

---

### 5. Sell Flow - Part 2: Bank Details Entry

**Objective**: Verify bank details webview works securely.

**Steps**:
1. Click "Enter Bank Details" webview button
2. Webview opens with bank details form
3. Select Nigerian bank from dropdown
4. Enter 10-digit account number
5. Enter account name (must match bank records)
6. Submit form

**Expected Results**:
- ✅ Webview opens successfully
- ✅ All Nigerian banks listed in dropdown
- ✅ Account number validation (exactly 10 digits)
- ✅ Form submits successfully
- ✅ Bot automatically continues flow after webview closes
- ✅ Bot shows transaction summary with all details:
  - Selling: X USDT (BSC)
  - Rate: ₦X/USDT
  - Total: ₦XXX
  - Fee: ₦XXX
  - You receive: ₦XXX
  - Bank details
- ✅ Bot asks for 4-digit PIN
- ✅ No bank details appear in chat history

**Failure Scenarios**:
- Invalid account number → Error in webview
- Empty fields → Error in webview

---

### 6. Sell Flow - Part 3: PIN Verification & Quidax Execution

**Objective**: Verify PIN verification and Quidax sell/withdrawal integration.

**Steps**:
1. Enter your 4-digit PIN in chat
2. Bot processes transaction

**Expected Results**:
- ✅ Correct PIN: Transaction proceeds
- ✅ Incorrect PIN: Error message, can retry
- ✅ Bot shows progress messages:
  - "Step 1/3: Creating sell order on Quidax..."
  - "Step 2/3: Confirming trade..."
  - "Step 3/3: Transferring ₦XXX to your bank..."
- ✅ Bot shows success message with:
  - Amount sold
  - NGN received
  - Bank details
  - Quidax Order ID
  - Quidax Withdrawal ID
- ✅ NGN arrives in your bank account (check bank app!)

**Database Verification**:
```sql
-- Check transaction record
SELECT * FROM transactions WHERE messenger_user_id = '<your_user_id>' ORDER BY created_at DESC LIMIT 1;

-- Check balance reduction (negative deposit entry)
SELECT * FROM deposits WHERE messenger_user_id = '<your_user_id>' AND amount < 0 ORDER BY detected_at DESC LIMIT 1;
```

Expected:
- Transaction row with correct amounts, bank details, Quidax IDs, status = "completed"
- Negative deposit entry matching sold amount

**Bank Account Verification**:
- ✅ Check your Nigerian bank account
- ✅ NGN should arrive within 5-30 minutes
- ✅ Amount should match "You receive" amount (minus any Quidax withdrawal fees)

**Failure Scenarios to Test**:
- Wrong PIN → Error, can retry, type "cancel" to abort
- Quidax insufficient balance → Error message (contact support)
- Invalid bank account → Error message
- Network error → Error message with retry option

---

### 7. Multiple Sells

**Objective**: Verify balance tracking works correctly across multiple sells.

**Steps**:
1. Deposit 20 USDT to BSC wallet
2. Wait for confirmation
3. Sell 10 USDT
4. Check balance (should show 10 USDT remaining)
5. Sell another 5 USDT
6. Check balance (should show 5 USDT remaining)

**Expected Results**:
- ✅ Balance decreases correctly after each sell
- ✅ `/balance` shows accurate remaining balance
- ✅ Cannot sell more than available balance

---

### 8. PIN Reset Flow

**Objective**: Verify users can reset forgotten PINs using security questions.

**Steps**:
1. Type `/reset-pin` or "forgot pin"
2. Bot asks security question
3. Enter correct security answer
4. Bot sends webview button "Set New PIN"
5. Click webview button
6. Enter new 4-digit PIN
7. Confirm new PIN
8. Submit

**Expected Results**:
- ✅ Correct security answer: Can reset PIN
- ✅ Incorrect answer: Error message, can retry
- ✅ Webview opens for new PIN entry
- ✅ New PIN saved successfully
- ✅ Can use new PIN for future sells
- ✅ Old PIN no longer works

---

### 9. Help Command

**Objective**: Verify help command shows all available commands.

**Steps**:
1. Type `/help`

**Expected Results**:
- ✅ Shows all commands: /deposit, /sell, /balance, /reset-pin, /help
- ✅ Brief description of each command

---

### 10. Error Handling

**Objective**: Verify robust error handling for edge cases.

**Test Cases**:
- Unknown command → "I didn't understand that command. Type /help"
- `/sell` with no deposits → "No deposits yet! Type /deposit"
- `/sell` with amount = 0 → Error message
- Quidax API down → Error message with retry option
- Type "cancel" during sell flow → Transaction cancelled

---

## Security Tests

### 1. Webview Domain Whitelisting
- ✅ Webviews should only open if domain is whitelisted
- ✅ Check Facebook Developer Console → Messenger → Settings → Whitelisted Domains

### 2. PIN Security
- ✅ PIN never appears in chat history
- ✅ PIN stored as bcrypt hash in database (not plaintext)
- ✅ Security questions/answers stored securely

### 3. Webhook Signature Verification
- ✅ Server rejects unsigned webhook requests
- ✅ Check server logs for "Invalid signature" errors if testing with fake webhooks

---

## Performance Tests

### 1. Deposit Detection Speed
- Send crypto to wallet
- Measure time until bot notification
- Expected: 5-10 minutes for 2-3 confirmations

### 2. Quidax Sell Execution
- Measure time from PIN entry to success message
- Expected: 30-60 seconds

### 3. Bank Transfer Speed
- Measure time from "Transaction Successful" to bank account credit
- Expected: 5-30 minutes (depends on Quidax and Nigerian bank)

---

## Multi-Chain Testing

Repeat the deposit → sell flow for each blockchain:

1. ✅ **Ethereum**: ETH, USDT, USDC
2. ✅ **BSC**: BNB, USDT, USDC
3. ✅ **Polygon**: MATIC, USDT, USDC
4. ✅ **Arbitrum**: ETH, USDT
5. ✅ **Base**: ETH, USDT

**For each chain**:
- Deposit small amount
- Verify detection
- Sell crypto
- Verify bank transfer

---

## Failure Mode Testing (Critical)

### 1. Quidax Sell Order Failure & Balance Rollback

**Objective**: Verify balance rollback when Quidax sell order fails.

**Steps**:
1. Start a sell flow normally
2. Enter amount and proceed to PIN verification
3. Enter correct PIN
4. **Simulate Quidax failure**: Temporarily disable QUIDAX_SECRET_KEY
5. Transaction should fail

**Expected Results**:
- ✅ Bot shows error message: "Transaction failed"
- ✅ Bot confirms: "Your balance has been restored"
- ✅ User's balance unchanged (no negative deposit in database)
- ✅ Check database: No orphaned negative deposits
- ✅ User can retry `/sell` with full balance available

**Database Verification**:
```sql
-- Should NOT have any negative deposits with "PENDING_SELL" status
SELECT * FROM deposits WHERE messenger_user_id = '<your_user_id>' AND from_address = 'PENDING_SELL';
```

### 2. Concurrency / Double-Spend Prevention

**Objective**: Verify users cannot sell more than available balance with concurrent requests.

**Steps**:
1. Deposit 20 USDT
2. Start first sell flow: Sell 15 USDT
3. **Before completing first sell**, start second sell flow: Sell 15 USDT again
4. Complete both sells

**Expected Results**:
- ✅ First sell completes successfully (balance: 5 USDT)
- ✅ Second sell fails or shows updated balance
- ✅ Final balance: 5 USDT (not negative!)
- ✅ Negative deposit created immediately prevents concurrent overdraw

**Database Verification**:
```sql
-- Check final balance is correct
SELECT 
  blockchain, 
  token, 
  SUM(CAST(amount AS DECIMAL)) as net_balance 
FROM deposits 
WHERE messenger_user_id = '<your_user_id>' 
GROUP BY blockchain, token;
```

### 3. Quidax Withdrawal Failure

**Objective**: Verify proper error handling when bank transfer fails.

**Steps**:
1. Complete sell flow with valid crypto
2. Use invalid bank account number
3. Enter correct PIN

**Expected Results**:
- ✅ Quidax sell order succeeds
- ✅ Withdrawal fails with "Bank account validation failed"
- ✅ Error message shown to user
- ⚠️ **LIMITATION**: Crypto already sold (NGN in Quidax account)
- ✅ Support can manually complete withdrawal from Quidax dashboard

---

## Database Health Checks

After testing, verify database integrity:

```sql
-- All users should have wallet addresses
SELECT id, messenger_id, wallet_addresses FROM messenger_users;

-- All transactions should have Quidax IDs
SELECT id, blockchain, token, quidax_order_id, quidax_withdrawal_id, status 
FROM transactions 
WHERE status = 'completed';

-- Balance calculation (positive deposits - negative sells)
SELECT 
  blockchain, 
  token, 
  SUM(CAST(amount AS DECIMAL)) as net_balance 
FROM deposits 
WHERE messenger_user_id = '<your_user_id>' 
  AND status = 'confirmed' 
GROUP BY blockchain, token;
```

---

## Known Limitations (MVP)

1. **No Crypto Transfer to Quidax**: Currently assumes ExBit owner manually funds Quidax account. Future enhancement: automated crypto transfers from custodial wallets to Quidax.

2. **No Beneficiary Reuse**: Bank details must be entered each time. Schema exists but feature not implemented.

3. **No Transaction History**: Users can't view past transactions in bot. Database has records.

4. **English Only**: No multi-language support.

---

## Troubleshooting

### Bot Not Responding
1. Check server logs in Replit
2. Verify webhook URL is correct in Facebook
3. Check ALCHEMY_BASE_API_KEY and QUIDAX_SECRET_KEY are set

### Deposits Not Detected
1. Check blockchain explorer (BSCScan, Etherscan, etc.)
2. Verify transaction has 2+ confirmations
3. Check server logs for "[BlockchainMonitor]" messages
4. Verify wallet address matches user's address

### Quidax Errors
1. Check Quidax account has sufficient balance
2. Verify QUIDAX_SECRET_KEY is correct
3. Test Quidax API separately: https://docs.quidax.io

### Bank Transfer Delays
1. Quidax withdrawals can take 5-30 minutes
2. Check Quidax dashboard for withdrawal status
3. Contact Quidax support if >1 hour delay

---

## Success Criteria

The MVP is **production-ready** if:
- ✅ All test cases pass
- ✅ No data loss or corruption
- ✅ Quidax sell and withdrawal work reliably
- ✅ Bank transfers arrive consistently
- ✅ No sensitive data leaks in chat
- ✅ Error messages are user-friendly
- ✅ Server logs show no critical errors

---

## Next Steps After Testing

1. **Small-Scale Launch**: Test with 5-10 friends/family
2. **Iterate on UX**: Fix any confusing flows
3. **Monitor Costs**: Track Alchemy API calls, Quidax fees
4. **Plan Scaling**: Quidax business account if volume increases
5. **Add Enhancements**: Beneficiary reuse, transaction history, multi-language

---

**Good luck with testing! 🚀**
