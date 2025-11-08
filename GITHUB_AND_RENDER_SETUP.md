# Push ExBit to GitHub and Deploy to Render

## 📦 Step 1: Download Your Code from Replit

### Option A: Download as ZIP (Easiest)
1. In Replit, click the **3-dot menu** (⋮) in the Files panel
2. Click **"Download as ZIP"**
3. Save `workspace.zip` to your computer
4. Extract the ZIP file

### Option B: Use Git Clone (If You Know Git)
```bash
# On your local computer
git clone <your-repl-url>
```

---

## 🐙 Step 2: Create GitHub Repository

### Create New Repo on GitHub
1. Go to [github.com/new](https://github.com/new)
2. **Repository name**: `exbit-messenger-bot` (or your choice)
3. **Description**: `ExBit - Facebook Messenger crypto-to-Naira exchange bot`
4. **Visibility**: ✅ **Private** (recommended) or Public
5. **DON'T** check any boxes (no README, no .gitignore, no license)
6. Click **"Create repository"**

### Get Your Repository URL
Copy the URL shown (should look like):
```
https://github.com/YOUR_USERNAME/exbit-messenger-bot.git
```

---

## 💻 Step 3: Push Code to GitHub

### If You Downloaded ZIP:

**Open Terminal (or Command Prompt) and navigate to extracted folder:**

```bash
# Navigate to your extracted code folder
cd path/to/exbit-code

# Initialize git
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - ExBit Messenger bot"

# Add GitHub remote (replace with YOUR URL)
git remote add origin https://github.com/YOUR_USERNAME/exbit-messenger-bot.git

# Push to GitHub
git branch -M main
git push -u origin main
```

**If git asks for credentials:**
- Username: Your GitHub username
- Password: Use a **Personal Access Token** (not your password!)
  - Create token at: [github.com/settings/tokens](https://github.com/settings/tokens)
  - Generate new token (classic)
  - Select scopes: ✅ `repo`
  - Copy the token and use it as password

---

## 🚀 Step 4: Deploy to Render

### A. Create Render Account
1. Go to [render.com](https://render.com)
2. Sign up with GitHub (easiest - auto-connects your repos)
3. Verify email

---

### B. Create PostgreSQL Database

1. In Render dashboard, click **"New +"** → **"PostgreSQL"**
2. Fill in:
   - **Name**: `exbit-database`
   - **Database**: `exbit_db`
   - **User**: `exbit_user` (auto-generated)
   - **Region**: **Frankfurt** or **London** (closest to Nigeria)
   - **PostgreSQL Version**: **16**
   - **Instance Type**: 
     - **Free** (for testing - expires in 90 days)
     - **Starter $7/month** (recommended for production)

3. Click **"Create Database"**

4. **COPY THE INTERNAL DATABASE URL** 
   - Look for **"Internal Database URL"**
   - Starts with: `postgresql://...`
   - Click copy button
   - **Save this somewhere safe!** You'll need it in the next step

---

### C. Create Web Service

1. Click **"New +"** → **"Web Service"**

2. **Connect Repository:**
   - If you signed up with GitHub, your repos will show
   - Select: `exbit-messenger-bot` (or whatever you named it)
   - Click **"Connect"**

3. **Configure Settings:**

   **Basic Info:**
   - **Name**: `exbit-messenger-bot`
   - **Region**: **Frankfurt** or **London** (same as database!)
   - **Branch**: `main`
   - **Root Directory**: (leave blank)
   - **Runtime**: **Node**

   **Build & Start:**
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

   **Instance Type:**
   - **Free** (for testing - sleeps after inactivity)
   - **Starter $7/month** (recommended - always on + static IP!)

4. **DON'T CLICK CREATE YET!** - Scroll to Environment Variables first

---

### D. Add Environment Variables

**Click "Advanced" → "Add Environment Variable"**

Add these **one by one** (click "+ Add Environment Variable" for each):

#### Required Variables:

| Variable Name | Value | Where to Get It |
|---------------|-------|-----------------|
| `DATABASE_URL` | `postgresql://...` | The URL you copied from Step B |
| `SESSION_SECRET` | Any long random string | Generate: `openssl rand -base64 32` |
| `WALLET_ENCRYPTION_KEY` | 32-byte hex string | From Replit Secrets (or generate new) |
| `OWNER_WALLET_ADDRESS` | Your wallet address | From Replit Secrets |
| `FLUTTERWAVE_SECRET_KEY` | Your Flutterwave key | From Replit Secrets |
| `PAGE_ACCESS_TOKEN` | Facebook token | From Replit Secrets |
| `VERIFY_TOKEN` | Facebook verify token | From Replit Secrets |
| `APP_SECRET` | Facebook app secret | From Replit Secrets |
| `ALCHEMY_API_KEY` | Your Alchemy key | From Replit Secrets |
| `VITE_OWNER_WALLET_ADDRESS` | Your wallet address | Same as OWNER_WALLET_ADDRESS |
| `NODE_ENV` | `production` | Type this manually |
| `PORT` | `5000` | Type this manually |

#### Optional (but recommended):
| Variable Name | Value |
|---------------|-------|
| `ALCHEMY_BASE_API_KEY` | Your Base Alchemy key (if different) |

---

### E. Get Your Replit Secrets

**To copy secrets from Replit:**

1. Open your Replit project
2. Click 🔒 **Secrets** (lock icon in left sidebar)
3. Copy each secret value and paste into Render

**Secrets you need:**
- `WALLET_ENCRYPTION_KEY`
- `OWNER_WALLET_ADDRESS`
- `FLUTTERWAVE_SECRET_KEY`
- `PAGE_ACCESS_TOKEN`
- `VERIFY_TOKEN`
- `APP_SECRET`
- `ALCHEMY_API_KEY`

---

### F. Deploy!

1. **After adding all environment variables**, scroll down
2. Click **"Create Web Service"**
3. Render will start building (takes 2-5 minutes)
4. **Watch the logs** - should see:
   ```
   npm install
   npm run build
   Build succeeded
   Starting service...
   ```

5. **Once deployed**, you'll get a URL like:
   ```
   https://exbit-messenger-bot.onrender.com
   ```

6. **COPY THIS URL!** You need it for Facebook webhook

---

## 🔗 Step 5: Update Facebook Webhook

1. Go to [Facebook Developers](https://developers.facebook.com)
2. Select your ExBit app
3. Go to **Messenger** → **Settings**
4. Find **Webhooks** section
5. Click **"Edit"** next to your callback URL
6. **Update Callback URL** to:
   ```
   https://exbit-messenger-bot.onrender.com/webhook
   ```
7. Keep the same **Verify Token** (from your Replit secrets)
8. Click **"Verify and Save"**

**Should see:** ✅ "Success! Webhook verified"

---

## 🎯 Step 6: Get Your Static IP (Starter Plan Only)

**If you chose Render Starter ($7/month):**

1. In your Web Service dashboard
2. Go to **Settings** tab
3. Scroll to **Outbound IPs**
4. You'll see your **static IP address** (e.g., `216.24.57.1`)
5. **Copy this IP**

**Add to Flutterwave:**
1. Login to [Flutterwave Dashboard](https://dashboard.flutterwave.com)
2. Go to **Settings** → **API Keys**
3. Find **IP Whitelisting**
4. Add your Render static IP
5. Save

**Note:** Free tier does NOT get static IP (will have same Replit issue)

---

## ✅ Step 7: Test Your Deployment

### Test Web Agent:
1. Visit: `https://exbit-messenger-bot.onrender.com`
2. Should see your ExBit landing page ✅
3. Try connecting MetaMask
4. Try a test swap

### Test Messenger Bot:
1. Open Facebook Messenger
2. Search for your Facebook Page
3. Send: `hi`
4. Bot should respond ✅
5. Try creating wallet
6. Try `/deposit`

---

## 🐛 Troubleshooting

### Build Fails
**Error:** `npm install failed`
**Fix:** Check that `package.json` exists in your GitHub repo

### Webhook Verification Fails
**Error:** "The URL couldn't be validated"
**Fix:** 
- Make sure your service is **running** (not failed)
- Check `VERIFY_TOKEN` matches what Facebook expects
- Check logs in Render dashboard

### Database Connection Errors
**Error:** "Can't connect to database"
**Fix:**
- Verify `DATABASE_URL` is correct
- Check database is running
- Make sure database and web service are in **same region**

### Blockchain Monitoring Not Working
**Check logs for:** `[BlockchainMonitor] Blockchain monitoring ENABLED`
**If disabled:** Remove `DISABLE_BLOCKCHAIN_MONITORING` from env variables

---

## 💰 Cost Breakdown

### Free Testing:
- **Web Service**: Free (sleeps after inactivity)
- **Database**: Free (90 days only)
- **Total**: $0/month

### Recommended Production (with Static IP):
- **Web Service**: Starter - $7/month
- **Database**: Starter - $7/month
- **Total**: $14/month
- **Includes:** ✅ Static IP for Flutterwave

---

## 📋 Quick Checklist

Before going live:

- [ ] Code pushed to GitHub
- [ ] Render Web Service created
- [ ] Render PostgreSQL created
- [ ] All environment variables added
- [ ] Build succeeded
- [ ] Facebook webhook updated
- [ ] Static IP added to Flutterwave (Starter plan only)
- [ ] Tested web agent
- [ ] Tested Messenger bot
- [ ] Tested deposit detection
- [ ] Tested sell flow
- [ ] Tested Flutterwave payout

---

## 🎉 You're Done!

Your ExBit bot is now live on Render with:
- ✅ Static IP (Starter plan)
- ✅ Reliable hosting
- ✅ Auto-deployments from GitHub
- ✅ No more Flutterwave IP issues

**Next:** Test with small amounts, then invite friends to try it!

---

## Need Help?

If you get stuck:
1. Check Render logs (Dashboard → your service → Logs)
2. Check Facebook webhook status
3. Verify all environment variables are set
4. Make sure database is running

Good luck! 🚀
