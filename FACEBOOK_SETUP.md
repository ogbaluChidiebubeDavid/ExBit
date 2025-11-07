# Facebook Messenger Bot Setup Guide (Updated 2024-2025)

This guide walks you through setting up ExBit as a Facebook Messenger bot using the latest Meta for Developers platform.

## Prerequisites

✅ Facebook account  
✅ Facebook Page (create at [facebook.com/pages/create](https://facebook.com/pages/create))  
✅ Replit project running (ExBit webhook ready)

## Step 1: Create a Facebook App

1. Go to [Meta for Developers](https://developers.facebook.com)
2. Click **"My Apps"** (top right) → **"Create App"**
3. **Select app type**: Choose **"Business"** → Click **"Next"**
4. **Fill in basic information**:
   - **App Name**: `ExBit` (or your preferred name)
   - **Contact Email**: Your email address
5. Click **"Create App"**
6. **Enter your Facebook password** to confirm creation

## Step 2: Add Messenger Product

1. From your app dashboard, scroll to **"Add Products to Your App"**
2. Find **"Messenger"** in the product list
3. Click **"Set Up"** next to Messenger
4. Messenger will be added to your left sidebar navigation

## Step 3: Get App Credentials

### Get App Secret (for webhook signature verification)

1. In the left sidebar, click **Settings → Basic**
2. Copy your **App ID** (save this)
3. Click **"Show"** next to **App Secret**
4. Copy the **App Secret**
5. In Replit, add this as a secret:
   - Secret Name: `FACEBOOK_APP_SECRET`
   - Secret Value: (paste the App Secret here)

⚠️ **Keep this secret secure!** It verifies webhook requests are from Facebook.

## Step 4: Generate Page Access Token

### If you don't have a Facebook Page yet:
1. Go to [facebook.com/pages/create](https://facebook.com/pages/create)
2. Create a page for your bot (e.g., "ExBit Bot")
3. Choose category: "Financial Service" or "App Page"

### Generate the token:

1. In your app dashboard, go to **Messenger → Messenger API Settings**
2. Scroll to **"Access Tokens"** section
3. Click **"Add or Remove Pages"**
4. Select your Facebook Page and grant all requested permissions
5. Click **"Generate Token"** next to your page
6. **Copy the Page Access Token** (starts with `EAA...`)
7. In Replit, add this as a secret:
   - Secret Name: `FACEBOOK_PAGE_ACCESS_TOKEN`
   - Secret Value: (paste the token here)

⚠️ **Critical**: This token allows sending messages as your page - never share it!

## Step 5: Create a Verify Token

1. Choose a random, secure string (e.g., `exbit_webhook_verify_123abc`)
2. In Replit, add this as a secret:
   - Secret Name: `FACEBOOK_VERIFY_TOKEN`
   - Secret Value: (your chosen string)

This token verifies Facebook is connecting to your webhook.

## Step 6: Configure Webhook in Facebook

### A. Get Your Replit Webhook URL

Your webhook URL format is:
```
https://[username]-[project-name].repl.co/webhook
```

Example: `https://johndoe-exbit.repl.co/webhook`

⚠️ **Make sure your Replit app is RUNNING before the next step!**

### B. Add the Webhook to Facebook

1. In **Messenger API Settings**, scroll to **"Webhooks"** section
2. Click **"Add Callback URL"**
3. Enter:
   - **Callback URL**: Your Replit webhook URL from above
   - **Verify Token**: The exact token you created in Step 5
4. Click **"Verify and Save"**

✅ You should see "Complete" with a green checkmark

**If it fails:**
- Check your Replit app is running
- Verify the `FACEBOOK_VERIFY_TOKEN` secret matches exactly
- Check the webhook URL is correct (no typos)

### C. Subscribe to Events

1. Still in the Webhooks section, click **"Add Subscriptions"**
2. Check these boxes:
   - ✅ `messages` (required - receive messages)
   - ✅ `messaging_postbacks` (required - handle buttons)
   - ☐ `message_deliveries` (optional)
   - ☐ `message_reads` (optional)
3. Click **"Save"**

## Step 7: Subscribe App to Your Page

1. In the Webhooks section, find **"Add Subscriptions"** dropdown
2. Select your Facebook Page
3. Click **"Subscribe"**

Your bot is now connected! 🎉

## Step 8: Test Your Bot!

### Send a Test Message

1. Go to your Facebook Page (on Facebook)
2. Click **"Send Message"**
3. Type: `hi`

**Expected response:**
```
Welcome to ExBit, [Your Name]! 👋

I'm your crypto exchange assistant...

🔐 To keep your funds secure, let's set up a 4-digit transaction PIN.

Please enter a 4-digit PIN (e.g., 1234):
```

### Test Commands

Once onboarded, try these:
- `/deposit` - Get your wallet address
- `/balance` - Check crypto balance
- `/sell` - Convert crypto to Naira
- `/reset-pin` - Reset your PIN
- `/help` - Show all commands

### Check Logs

In your Replit console, you should see:
```
[Webhook] Received message from user: ...
[CommandHandler] Processing message...
```

**If the bot doesn't respond:**
1. Check all 3 secrets are set in Replit
2. Verify webhook is subscribed to your page
3. Ensure Replit app is running
4. Check Replit logs for errors

## Troubleshooting

### Webhook Verification Failed
- **Error**: "The URL couldn't be validated"
- **Fix**: 
  - Ensure your Repl is running
  - Check that `FACEBOOK_VERIFY_TOKEN` secret matches exactly
  - Verify the callback URL is correct

### Bot Not Responding to Messages
- **Error**: Messages sent but no reply
- **Fix**:
  - Check Replit logs for errors
  - Verify `FACEBOOK_PAGE_ACCESS_TOKEN` is correct
  - Ensure webhook subscriptions include "messages"
  - Check that `FACEBOOK_APP_SECRET` is correct

### Invalid Signature Errors
- **Error**: "Invalid signature - rejecting webhook"
- **Fix**:
  - Verify `FACEBOOK_APP_SECRET` is correct
  - Check that you're using the App Secret, not the Access Token

### Messages Not Reaching Webhook
- **Fix**:
  - Go to **Webhooks** section and click **"Test"** button
  - Check subscription fields are enabled
  - Verify page is correctly linked to the app

## Production Checklist

Before launching ExBit publicly:

- [ ] Set up business verification for Facebook App
- [ ] Request advanced permissions if needed
- [ ] Add privacy policy URL in App Settings
- [ ] Add terms of service URL
- [ ] Configure data deletion callback URL
- [ ] Test with multiple users
- [ ] Set up error monitoring
- [ ] Configure Quidax business account
- [ ] Add bank account validation
- [ ] Implement transaction PINs
- [ ] Test full deposit → sell → withdraw flow

## Security Best Practices

1. **Never share**:
   - Page Access Token
   - App Secret
   - Verify Token

2. **Rotate tokens** if compromised:
   - Generate new Page Access Token
   - Update Replit secrets
   - Regenerate App Secret if needed

3. **Monitor webhook logs**:
   - Watch for suspicious activity
   - Set up alerts for failed verifications

4. **Use HTTPS only**:
   - Replit automatically provides HTTPS
   - Never use HTTP for webhooks

## Resources

- [Facebook Messenger Platform Docs](https://developers.facebook.com/docs/messenger-platform)
- [Webhook Reference](https://developers.facebook.com/docs/messenger-platform/webhooks)
- [Send API Reference](https://developers.facebook.com/docs/messenger-platform/send-messages)
- [Quidax API Docs](https://docs.quidax.io/)

## Support

If you encounter issues:
1. Check Replit logs first
2. Review Facebook App dashboard for errors
3. Test webhook with Facebook's test tools
4. Verify all secrets are correctly configured

---

**Ready to test?** Send a message to your Facebook Page and type `/help`!
