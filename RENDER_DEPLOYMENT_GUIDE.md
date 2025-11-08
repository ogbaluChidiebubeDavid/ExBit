# ExBit Render Deployment Guide

## Overview
This guide will help you deploy ExBit (both Messenger bot and Web agent) to Render.com. Render provides reliable hosting with PostgreSQL database, environment secrets, and automatic deployments.

---

## Prerequisites

Before deploying to Render, you need:

### 1. Facebook Messenger Setup
- ✅ Facebook Developer account
- ✅ Facebook Page for your bot
- ✅ Messenger App created (with Page Access Token)
- ✅ Webhook verify token configured

### 2. Flutterwave Account
- ✅ Business account with verified identity
- ✅ Prefunded NGN balance for payouts
- ✅ Secret API key

### 3. Blockchain Setup
- ✅ Your owner wallet address (to receive crypto from users)
- ✅ Alchemy API key (recommended for reliable RPC)

---

## Step-by-Step Deployment

### Step 1: Create Render Account
1. Go to [render.com](https://render.com)
2. Sign up with GitHub (recommended for automatic deployments)
3. Verify your email

### Step 2: Connect Your GitHub Repository
1. Push your ExBit code to a GitHub repository
2. In Render dashboard, click **"New +"** → **"Web Service"**
3. Connect your GitHub account
4. Select your ExBit repository

### Step 3: Configure Web Service

**Basic Settings:**
- **Name**: `exbit-messenger-bot` (or your preferred name)
- **Region**: Choose closest to Nigeria (e.g., Frankfurt, London)
- **Branch**: `main` (or your deployment branch)
- **Root Directory**: Leave blank (unless your code is in a subfolder)
- **Runtime**: `Node`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`

**Instance Type:**
- **Free tier**: Good for testing (512 MB RAM, sleeps after inactivity)
- **Starter ($7/month)**: Recommended for production (512 MB RAM, no sleep)
- **Standard ($25/month)**: For high traffic (2 GB RAM)

### Step 4: Set Up PostgreSQL Database

1. In Render dashboard, click **"New +"** → **"PostgreSQL"**
2. **Name**: `exbit-database`
3. **Database**: `exbit_db`
4. **User**: `exbit_user` (auto-generated)
5. **Region**: Same as your web service
6. **PostgreSQL Version**: 16
7. **Instance Type**:
   - Free tier: Good for testing (1 GB storage, expires after 90 days)
   - Starter ($7/month): Recommended for production (10 GB storage)

8. Click **"Create Database"**

9. **Copy the Internal Database URL** (starts with `postgresql://`)
   - You'll need this for the `DATABASE_URL` environment variable

### Step 5: Configure Environment Variables

In your Web Service settings, go to **"Environment"** tab and add these variables:

#### **Required Secrets**

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string from Step 4 | `postgresql://exbit_user:password@oregon-postgres.render.com/exbit_db` |
| `SESSION_SECRET` | Random string for session encryption | `your-very-long-random-string-here` |
| `WALLET_ENCRYPTION_KEY` | 32-byte hex string for wallet encryption | Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `OWNER_WALLET_ADDRESS` | Your Ethereum wallet address (to receive crypto) | `0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb2` |
| `FLUTTERWAVE_SECRET_KEY` | Your Flutterwave secret key | `FLWSECK_TEST-xxxxx` or `FLWSECK-xxxxx` |
| `PAGE_ACCESS_TOKEN` | Facebook Page Access Token | `EAAxxxxx` (from Facebook Developer) |
| `VERIFY_TOKEN` | Facebook webhook verify token | `your-custom-verify-token-123` |
| `APP_SECRET` | Facebook App Secret (for signature verification) | `abc123def456` (from Facebook App settings) |

#### **Optional (Recommended for Production)**

| Variable | Description | Example |
|----------|-------------|---------|
| `ALCHEMY_API_KEY` | Alchemy API key for all chains | `abc123def456` |
| `ALCHEMY_BASE_API_KEY` | Dedicated Alchemy key for Base chain | `xyz789abc123` (if different) |
| `PORT` | Server port (Render auto-configures) | `5000` (default) |
| `NODE_ENV` | Environment mode | `production` |

#### **Optional (For Development/Testing)**

| Variable | Description | Default |
|----------|-------------|---------|
| `DISABLE_BLOCKCHAIN_MONITORING` | Set to `true` to disable deposit monitoring | `false` |

#### **How to Generate Required Secrets**

**WALLET_ENCRYPTION_KEY:**
```bash
# On your local terminal
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**SESSION_SECRET:**
```bash
# Any long random string
openssl rand -base64 32
```

**VERIFY_TOKEN:**
```bash
# Create any custom string (you'll use this in Facebook webhook setup)
echo "my-custom-verify-token-$(date +%s)"
```

### Step 6: Deploy Your Application

1. Click **"Create Web Service"** (Render will start building)
2. Wait for the build to complete (~2-5 minutes)
3. Once deployed, copy your **Service URL** (e.g., `https://exbit-messenger-bot.onrender.com`)

### Step 7: Configure Facebook Messenger Webhook

1. Go to [Facebook Developers](https://developers.facebook.com)
2. Select your Messenger App
3. Go to **Messenger** → **Settings**
4. In **Webhooks** section, click **"Add Callback URL"**
5. **Callback URL**: `https://exbit-messenger-bot.onrender.com/webhook`
6. **Verify Token**: Use the `VERIFY_TOKEN` you set in Step 5
7. Click **"Verify and Save"**
8. **Subscribe to webhook fields**:
   - ✅ `messages`
   - ✅ `messaging_postbacks`
   - ✅ `message_deliveries`
   - ✅ `message_reads`

9. **Subscribe your Page** to the webhook:
   - In Webhooks section, click **"Add Subscriptions"**
   - Select your Facebook Page
   - Click **"Subscribe"**

### Step 8: Test Your Deployment

#### Test the Web Agent (Non-Custodial)
1. Visit: `https://your-service-name.onrender.com`
2. Click **"Connect Wallet"**
3. Connect MetaMask
4. Try a test swap: `"Swap 0.01 USDT on BSC to Naira"`

#### Test the Messenger Bot (Custodial)
1. Open Messenger and search for your Facebook Page
2. Send: `hi` or `hello`
3. Bot should respond with welcome message
4. Create a wallet: Follow bot's instructions to set PIN
5. Get deposit address: Send `/deposit`
6. Send small test amount: `0.01 USDT` on BSC
7. Wait for deposit notification (30-60 seconds)
8. Check balance: Send `/balance`
9. Test sell: Send `/sell`

---

## Production Checklist

Before going live:

### Security
- ✅ All environment variables configured correctly
- ✅ `APP_SECRET` set for Facebook signature verification
- ✅ `WALLET_ENCRYPTION_KEY` is secure (32-byte hex)
- ✅ `FLUTTERWAVE_SECRET_KEY` is production key (not test)
- ✅ Database has backups enabled

### Flutterwave
- ✅ Business account verified
- ✅ NGN account prefunded with sufficient balance
- ✅ Test a small payout to verify it works
- ✅ Monitor Flutterwave balance regularly

### Blockchain
- ✅ Owner wallet address is correct
- ✅ Test crypto transfer to owner wallet with small amount
- ✅ Verify Alchemy API key has sufficient quota
- ✅ Monitor for failed transactions

### Messenger
- ✅ Facebook Page is published
- ✅ Webhook is verified and subscribed
- ✅ Test all commands: `/deposit`, `/sell`, `/balance`, `/help`
- ✅ PIN creation and verification working
- ✅ Bank account validation working

### Database
- ✅ Migrations applied successfully (auto-applied on first deploy)
- ✅ Database backups configured (Render Pro plan recommended)
- ✅ Connection pooling working (via DATABASE_URL)

---

## Monitoring & Maintenance

### View Logs
1. In Render dashboard, select your Web Service
2. Go to **"Logs"** tab
3. Monitor for errors:
   - `[BlockchainMonitor]` - Deposit detection
   - `[CommandHandler]` - User commands
   - `[Flutterwave]` - Bank payouts
   - `[Web3Transfer]` - Crypto transfers

### Common Issues & Solutions

#### Issue: Blockchain monitoring not working
**Solution**: Check Alchemy API key is set and valid
```bash
# Check logs for:
[BlockchainMonitor] Blockchain monitoring ENABLED
```

#### Issue: Flutterwave payouts failing
**Causes**:
- Insufficient NGN balance in Flutterwave account
- Invalid bank account details
- API key is test key (not production)

**Solution**: 
- Refund your Flutterwave account
- Verify bank details
- Use production API key

#### Issue: Crypto transfers failing
**Causes**:
- User's custodial wallet has no gas fees (native token)
- Invalid owner wallet address
- RPC provider down

**Solution**:
- Fund user wallets with small gas (0.001 ETH/BNB/MATIC)
- Verify `OWNER_WALLET_ADDRESS` is correct
- Check RPC provider status

#### Issue: Database connection errors
**Solution**: 
- Verify `DATABASE_URL` is correct
- Check database instance is running
- Increase connection pool size if needed

### Scaling Considerations

**When to upgrade:**
- **Free → Starter ($7/month)**: When you have regular users (no sleep)
- **Starter → Standard ($25/month)**: When you have 100+ active users
- **Standard → Pro ($85/month)**: When you have 500+ active users

**Database scaling:**
- **Free → Starter ($7/month)**: When you need persistent data (no expiry)
- **Starter → Standard ($20/month)**: When you need 50 GB storage
- **Standard → Pro ($90/month)**: When you need 500 GB storage

---

## Cost Breakdown

### Minimal Setup (Testing)
- **Web Service**: Free (sleeps after inactivity)
- **Database**: Free (90-day limit)
- **Total**: $0/month

### Recommended Production
- **Web Service**: Starter - $7/month (no sleep)
- **Database**: Starter - $7/month (persistent)
- **Total**: $14/month

### High-Traffic Production
- **Web Service**: Standard - $25/month (2GB RAM)
- **Database**: Standard - $20/month (50GB storage)
- **Total**: $45/month

---

## Automatic Deployments

Render automatically deploys when you push to your GitHub repository:

1. Make changes to your code locally
2. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "Update features"
   git push origin main
   ```
3. Render automatically detects the push and redeploys
4. Wait ~2-5 minutes for deployment to complete
5. Test your changes at your service URL

---

## Rolling Back

If a deployment breaks your app:

1. Go to Render dashboard → Your Web Service
2. Click **"Events"** tab
3. Find the last working deployment
4. Click **"Rollback"** next to that deployment
5. Confirm rollback

---

## Backup & Disaster Recovery

### Database Backups (Render Pro)
- Automatic daily backups (Pro plan only)
- Manual backups: Dashboard → Database → **"Backups"**

### Manual Database Export
```bash
# Install PostgreSQL client
brew install postgresql  # macOS
sudo apt install postgresql-client  # Linux

# Export database
pg_dump $DATABASE_URL > exbit_backup_$(date +%Y%m%d).sql

# Restore database
psql $DATABASE_URL < exbit_backup_20250108.sql
```

### Code Backups
- Always use Git for version control
- Push to GitHub regularly
- Tag releases: `git tag v1.0.0 && git push --tags`

---

## Support & Troubleshooting

### Render Support
- Free tier: Community support (forum)
- Paid tier: Email support (support@render.com)
- Documentation: https://render.com/docs

### ExBit Issues
- Check logs first: Render Dashboard → Logs
- Monitor Flutterwave balance
- Verify Alchemy quota
- Test with small amounts first

### Emergency Contacts
- Flutterwave: support@flutterwave.com
- Alchemy: support@alchemy.com
- Render: support@render.com

---

## Next Steps After Deployment

1. **Test thoroughly** with small amounts
2. **Monitor logs** for errors
3. **Fund Flutterwave** with sufficient NGN balance
4. **Announce launch** to your Nigerian crypto community
5. **Gather feedback** from early users
6. **Iterate and improve** based on feedback

---

## Alternative: Replit Deployment

If you prefer to stay on Replit:

**Advantages:**
- ✅ Already configured and working
- ✅ Integrated secrets management
- ✅ PostgreSQL database included
- ✅ Automatic restarts

**Limitations:**
- Free tier has usage limits
- May sleep after inactivity (upgrade to Reserved VM)

**Replit Reserved VM:**
- $20/month per project
- Always-on (no sleep)
- Dedicated resources
- Good for production

---

## Success Metrics to Track

- **Daily Active Users**: Users who interact with the bot
- **Transaction Volume**: Total crypto swapped daily
- **Platform Fees Earned**: Your revenue
- **Average Transaction Size**: User swap amounts
- **Successful Swap Rate**: % of swaps completed successfully
- **Error Rate**: Failed transactions / total transactions

---

## Legal Considerations (Nigeria)

Before public launch:

1. **Business Registration**: Consider registering with CAC (Corporate Affairs Commission)
2. **Tax Compliance**: Consult a Nigerian tax advisor
3. **KYC Requirements**: Research Central Bank of Nigeria regulations
4. **Terms of Service**: Create user agreement
5. **Privacy Policy**: GDPR/NDPR compliance

---

## Questions?

If you encounter issues during deployment, check:
1. Render dashboard logs
2. Database connection status
3. Environment variables configuration
4. Facebook webhook subscription
5. Flutterwave account balance

Good luck with your deployment! 🚀
