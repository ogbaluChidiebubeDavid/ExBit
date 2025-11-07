# Facebook Messenger Bot Setup Guide

This guide will walk you through setting up ExBit as a Facebook Messenger bot, from creating a Facebook App to connecting the webhook.

## Prerequisites

- Facebook account
- Facebook Page (create one if you don't have it)
- Replit project running (ExBit backend must be accessible via HTTPS)

## Step 1: Create a Facebook App

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Click **"My Apps"** → **"Create App"**
3. Choose **"Business"** as the app type
4. Fill in app details:
   - **App Name**: ExBit
   - **App Contact Email**: Your email
   - **Business Account**: (Optional) Create or select one
5. Click **"Create App"**

## Step 2: Add Messenger Product

1. In your app dashboard, find **"Add Products to Your App"**
2. Locate **"Messenger"** and click **"Set Up"**
3. This will add Messenger to your app

## Step 3: Create a Facebook Page (if you don't have one)

1. Go to [Facebook Pages](https://www.facebook.com/pages/create)
2. Choose **"Business or Brand"**
3. Enter page details:
   - **Page Name**: ExBit
   - **Category**: Financial Service or Technology Company
   - **Description**: "Convert cryptocurrency to Naira instantly via Messenger"
4. Click **"Create Page"**

## Step 4: Generate Page Access Token

1. In your Facebook App dashboard, go to **Messenger** → **Settings**
2. Scroll to **"Access Tokens"** section
3. Click **"Add or Remove Pages"**
4. Select your ExBit page and grant permissions
5. Click **"Generate Token"** for your page
6. **IMPORTANT**: Copy this token - you'll need it for Replit secrets

## Step 5: Configure Replit Secrets

Add these secrets to your Replit project:

### Required Secrets:

1. **FACEBOOK_PAGE_ACCESS_TOKEN**
   - Value: The token you generated in Step 4
   - This allows ExBit to send messages as your page

2. **FACEBOOK_APP_SECRET**
   - Go to **App Dashboard** → **Settings** → **Basic**
   - Copy the **"App Secret"** (click "Show")
   - This is used to verify webhook requests

3. **FACEBOOK_VERIFY_TOKEN**
   - Create your own random string (e.g., `exbit_verify_2024_secure`)
   - This is used during webhook setup
   - Keep it secure and unique

### How to Add Secrets in Replit:
1. Open your Replit project
2. Click the **🔒 Secrets** icon (or Tools → Secrets)
3. Add each secret with the exact key names above
4. Paste the corresponding values

## Step 6: Get Your Webhook URL

Your Replit webhook URL will be:
```
https://YOUR-REPL-NAME.YOUR-USERNAME.repl.co/webhook
```

For example:
```
https://exbit.yourusername.repl.co/webhook
```

**Note**: Your Replit app must be running for the webhook to work!

## Step 7: Set Up Webhook in Facebook

1. Go to **Messenger** → **Settings** in your Facebook App
2. Scroll to **"Webhooks"** section
3. Click **"Add Callback URL"**

4. Enter webhook details:
   - **Callback URL**: `https://YOUR-REPL-NAME.YOUR-USERNAME.repl.co/webhook`
   - **Verify Token**: The same value you used for `FACEBOOK_VERIFY_TOKEN` secret
   
5. Click **"Verify and Save"**

6. If successful, you'll see a green checkmark ✅

## Step 8: Subscribe to Webhook Events

After adding the callback URL:

1. In the **"Webhooks"** section, find your page
2. Click **"Add Subscriptions"**
3. Select these events:
   - ✅ **messages** (required for receiving user messages)
   - ✅ **messaging_postbacks** (optional, for button clicks)
   - ✅ **message_deliveries** (optional, for delivery receipts)
   - ✅ **message_reads** (optional, for read receipts)

4. Click **"Save"**

## Step 9: Test Your Bot

### Option 1: Message Your Page Directly
1. Go to your Facebook Page
2. Click **"Send Message"**
3. Type `/help` to test the bot

### Option 2: Use Messenger Platform Tester
1. In Facebook App dashboard, go to **Messenger** → **Settings**
2. Scroll to **"Built-In NLP"**
3. Use the test console to send messages

### Expected Bot Responses:
- `/help` - Shows available commands
- `/deposit` - Shows blockchain selection buttons
- `/balance` - Shows balance (coming soon)
- `/sell` - Initiates sell flow (coming soon)

## Step 10: Verify Webhook is Working

Check your Replit logs for webhook activity:

1. Open Replit **Shell** or **Console**
2. Look for log messages like:
   ```
   [Webhook] Webhook verified successfully
   [CommandHandler] Processing message from user...
   ```

3. If you see errors, check:
   - All secrets are correctly set
   - Webhook URL matches your Repl URL
   - Verify token matches exactly
   - App is running on Replit

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
