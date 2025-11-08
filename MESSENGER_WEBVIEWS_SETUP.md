# Messenger Webviews Setup Guide

## Overview
Messenger Webviews allow users to securely enter sensitive data (PINs, bank details) in forms that open inside Messenger, without exposing this information in the chat history.

## Prerequisites
- Facebook App configured with Messenger Platform
- ExBit bot running on a public domain (Replit provides this automatically)
- Facebook Page Access Token

## Step 1: Get Your Domain URL
Your Replit app URL is automatically available. The format is:
```
https://your-replit-project.repl.co
```

Or if you've configured a custom domain:
```
https://exbit.example.com
```

## Step 2: Whitelist Your Domain in Facebook App

1. Go to [Facebook Developers Console](https://developers.facebook.com/apps)
2. Select your ExBit Facebook App
3. Navigate to **Messenger** → **Settings** in the left sidebar
4. Scroll down to **Whitelisted Domains**
5. Click **Add Domain**
6. Enter your domain (without `https://`):
   ```
   your-replit-project.repl.co
   ```
7. Click **Save**

**Note**: You may need to verify domain ownership by adding a meta tag or DNS record. Follow Facebook's instructions if prompted.

## Step 3: Test Webviews

### PIN Entry Webview
URL: `https://your-domain.repl.co/webview/pin-entry`

This webview allows users to:
- Set a 4-digit transaction PIN
- Choose a security question
- Provide a security answer

### Bank Details Webview
URL: `https://your-domain.repl.co/webview/bank-details?amount=143503`

This webview allows users to:
- Select their Nigerian bank
- Enter their 10-digit account number
- Auto-validate account details using Flutterwave API
- Submit verified bank information

## Step 4: Integration with Messenger Bot

The webviews are triggered by sending special button payloads from the bot:

### PIN Entry Button
```json
{
  "type": "web_url",
  "url": "https://your-domain.repl.co/webview/pin-entry",
  "title": "Set PIN",
  "webview_height_ratio": "tall",
  "messenger_extensions": true
}
```

### Bank Details Button
```json
{
  "type": "web_url",
  "url": "https://your-domain.repl.co/webview/bank-details?amount=143503&token=abc123",
  "title": "Enter Bank Details",
  "webview_height_ratio": "tall",
  "messenger_extensions": true
}
```

## Security Features

1. **Messenger Extensions SDK**: Automatically retrieves the user's Page-Scoped ID (PSID) without manual input
2. **No Chat History**: Sensitive data entered in webviews is NOT visible in the Messenger chat thread
3. **Direct Server Submission**: Form data goes directly to ExBit's server, bypassing Facebook's servers
4. **Time-Expiry**: Pending bank details expire after 30 minutes
5. **Account Validation**: Bank accounts are verified using Flutterwave API before acceptance

## API Endpoints

### POST /api/webview/set-pin
Saves user's transaction PIN and security question.

**Request Body:**
```json
{
  "psid": "1234567890",
  "pin": "1234",
  "securityQuestion": "mother",
  "securityAnswer": "Smith"
}
```

**Response:**
```json
{
  "success": true,
  "message": "PIN set successfully"
}
```

### POST /api/webview/save-bank-details
Saves validated bank details for a transaction.

**Request Body:**
```json
{
  "psid": "1234567890",
  "bankName": "Access Bank",
  "accountNumber": "0123456789",
  "accountName": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Bank details saved"
}
```

## Troubleshooting

### Issue: "Messenger Extensions not loaded"
**Solution**: Ensure your domain is whitelisted in Facebook App Settings and that you're testing inside Messenger (not a regular browser).

### Issue: "Cannot get user PSID"
**Solution**: Make sure `messenger_extensions: true` is set in the button payload and that the Messenger Extensions SDK is loaded.

### Issue: "Account validation fails"
**Solution**: 
- Check that `FLUTTERWAVE_SECRET_KEY` is configured
- Ensure the account number is exactly 10 digits
- Verify the bank name matches Flutterwave's bank list exactly

### Issue: "Webview doesn't open"
**Solution**:
- Verify the URL is accessible (try opening in a browser first)
- Check that the domain is whitelisted
- Ensure `webview_height_ratio` is set to "compact", "tall", or "full"

## Next Steps

After setting up webviews:
1. Update command handler to send webview buttons instead of text prompts for sensitive data
2. Test the full flow: User clicks button → Webview opens → User submits form → Webview closes → Bot confirms
3. Implement Quidax integration for selling crypto and withdrawing to bank accounts

## References

- [Facebook Messenger Webviews Documentation](https://developers.facebook.com/docs/messenger-platform/webview)
- [Messenger Extensions SDK](https://developers.facebook.com/docs/messenger-platform/webview/extensions)
- [Domain Whitelisting Guide](https://developers.facebook.com/docs/messenger-platform/reference/messenger-extensions-sdk/whitelisting)
