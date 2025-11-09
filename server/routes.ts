import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTransactionSchema, messengerUsers } from "@shared/schema";
import { z } from "zod";
import { priceService } from "./services/priceService";
import { flutterwaveService } from "./services/flutterwaveService";
import { messengerService } from "./services/messengerService";
import { commandHandler } from "./services/commandHandler";
import { db } from "./db";
import { eq } from "drizzle-orm";

export async function registerRoutes(app: Express): Promise<Server> {
  // Facebook Messenger Webhook - Verification (GET)
  app.get("/webhook", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token) {
      if (messengerService.verifyWebhookToken(token as string)) {
        console.log("[Webhook] Webhook verified successfully");
        res.status(200).send(challenge);
      } else {
        console.error("[Webhook] Webhook verification failed - invalid token");
        res.sendStatus(403);
      }
    } else {
      res.sendStatus(400);
    }
  });

  // Facebook Messenger Webhook - Message handling (POST)
  app.post("/webhook", async (req, res) => {
    const signature = req.headers["x-hub-signature-256"] as string;
    
    // Signature verification is MANDATORY for security
    if (!signature) {
      console.error("[Webhook] Missing X-Hub-Signature-256 header");
      return res.sendStatus(401);
    }

    // Verify request signature using raw body buffer
    const rawBody = req.rawBody as Buffer;
    if (!rawBody) {
      console.error("[Webhook] Raw body not available for signature verification");
      return res.sendStatus(500);
    }

    if (!messengerService.verifyWebhookSignature(signature, rawBody)) {
      console.error("[Webhook] Invalid signature - rejecting webhook");
      return res.sendStatus(403);
    }

    const body = req.body;

    // Handle webhook events
    if (body.object === "page") {
      body.entry?.forEach((entry: any) => {
        entry.messaging?.forEach((event: any) => {
          // Process messages, postbacks, and quick replies
          if (event.message || event.postback) {
            // Process event asynchronously
            commandHandler.handleMessage(event).catch((error) => {
              console.error("[Webhook] Error processing event:", error);
            });
          }
        });
      });

      res.status(200).send("EVENT_RECEIVED");
    } else {
      res.sendStatus(404);
    }
  });

  // Messenger Webview - PIN Entry
  app.get("/webview/pin-entry", (req, res) => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Set Your PIN</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 20px;
            }
            .container {
              background: white;
              border-radius: 16px;
              padding: 32px 24px;
              max-width: 400px;
              width: 100%;
              box-shadow: 0 20px 60px rgba(0,0,0,0.2);
            }
            h1 {
              font-size: 24px;
              color: #1a1a1a;
              margin-bottom: 8px;
              text-align: center;
            }
            .subtitle {
              font-size: 14px;
              color: #666;
              text-align: center;
              margin-bottom: 32px;
            }
            .form-group {
              margin-bottom: 24px;
            }
            label {
              display: block;
              font-size: 14px;
              font-weight: 600;
              color: #333;
              margin-bottom: 8px;
            }
            input, select {
              width: 100%;
              padding: 12px 16px;
              border: 2px solid #e0e0e0;
              border-radius: 8px;
              font-size: 16px;
              transition: border-color 0.3s;
            }
            input:focus, select:focus {
              outline: none;
              border-color: #667eea;
            }
            input[type="password"] {
              letter-spacing: 4px;
              font-size: 20px;
            }
            .btn {
              width: 100%;
              padding: 14px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              border: none;
              border-radius: 8px;
              font-size: 16px;
              font-weight: 600;
              cursor: pointer;
              transition: transform 0.2s;
            }
            .btn:hover { transform: translateY(-2px); }
            .btn:disabled {
              background: #ccc;
              cursor: not-allowed;
              transform: none;
            }
            .error {
              color: #e53e3e;
              font-size: 14px;
              margin-top: 8px;
              display: none;
            }
            .success {
              color: #38a169;
              font-size: 14px;
              margin-top: 8px;
              display: none;
            }
            .security-note {
              background: #f7fafc;
              border-left: 4px solid #667eea;
              padding: 12px;
              margin-top: 24px;
              font-size: 13px;
              color: #555;
              border-radius: 4px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🔐 Set Your Transaction PIN</h1>
            <p class="subtitle">Create a 4-digit PIN to secure your transactions</p>
            
            <form id="pinForm">
              <div class="form-group">
                <label for="pin">Enter 4-Digit PIN</label>
                <input type="password" id="pin" name="pin" maxlength="4" pattern="[0-9]{4}" inputmode="numeric" required placeholder="••••">
              </div>
              
              <div class="form-group">
                <label for="confirmPin">Confirm PIN</label>
                <input type="password" id="confirmPin" name="confirmPin" maxlength="4" pattern="[0-9]{4}" inputmode="numeric" required placeholder="••••">
              </div>
              
              <div class="form-group">
                <label for="securityQuestion">Security Question</label>
                <select id="securityQuestion" name="securityQuestion" required>
                  <option value="">Choose a question...</option>
                  <option value="mother">What is your mother's maiden name?</option>
                  <option value="pet">What was the name of your first pet?</option>
                  <option value="city">In what city were you born?</option>
                  <option value="school">What is the name of your first school?</option>
                </select>
              </div>
              
              <div class="form-group">
                <label for="securityAnswer">Answer</label>
                <input type="text" id="securityAnswer" name="securityAnswer" required placeholder="Your answer">
              </div>
              
              <button type="submit" class="btn" id="submitBtn">Set PIN</button>
              
              <div class="error" id="errorMsg"></div>
              <div class="success" id="successMsg"></div>
            </form>
            
            <div class="security-note">
              <strong>🛡️ Security Tips:</strong><br>
              • Never share your PIN with anyone<br>
              • Choose a unique PIN (not 1234 or 0000)<br>
              • Remember your security answer
            </div>
          </div>
          
          <script>
            (function(d, s, id){
              var js, fjs = d.getElementsByTagName(s)[0];
              if (d.getElementById(id)) { return; }
              js = d.createElement(s); js.id = id;
              js.src = "//connect.facebook.net/en_US/messenger.Extensions.js";
              fjs.parentNode.insertBefore(js, fjs);
            }(document, 'script', 'Messenger'));
            
            window.extAsyncInit = function() {
              MessengerExtensions.getUserID(function success(uids) {
                var psid = uids.psid;
                document.getElementById('pinForm').addEventListener('submit', handleSubmit);
                
                function handleSubmit(e) {
                  e.preventDefault();
                  const pin = document.getElementById('pin').value;
                  const confirmPin = document.getElementById('confirmPin').value;
                  const securityQuestion = document.getElementById('securityQuestion').value;
                  const securityAnswer = document.getElementById('securityAnswer').value;
                  const errorMsg = document.getElementById('errorMsg');
                  const successMsg = document.getElementById('successMsg');
                  const submitBtn = document.getElementById('submitBtn');
                  
                  errorMsg.style.display = 'none';
                  successMsg.style.display = 'none';
                  
                  if (!/^[0-9]{4}$/.test(pin)) {
                    errorMsg.textContent = 'PIN must be exactly 4 digits';
                    errorMsg.style.display = 'block';
                    return;
                  }
                  
                  if (pin !== confirmPin) {
                    errorMsg.textContent = 'PINs do not match';
                    errorMsg.style.display = 'block';
                    return;
                  }
                  
                  if (!securityQuestion || !securityAnswer.trim()) {
                    errorMsg.textContent = 'Please complete security question';
                    errorMsg.style.display = 'block';
                    return;
                  }
                  
                  submitBtn.disabled = true;
                  submitBtn.textContent = 'Setting PIN...';
                  
                  fetch('/api/webview/set-pin', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ psid, pin, securityQuestion, securityAnswer })
                  })
                  .then(res => res.json())
                  .then(data => {
                    if (data.success) {
                      successMsg.textContent = '✅ PIN set successfully!';
                      successMsg.style.display = 'block';
                      setTimeout(() => MessengerExtensions.requestCloseBrowser(), 1500);
                    } else {
                      throw new Error(data.error || 'Failed to set PIN');
                    }
                  })
                  .catch(err => {
                    errorMsg.textContent = err.message;
                    errorMsg.style.display = 'block';
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Set PIN';
                  });
                }
              }, function error(err, errorMessage) {
                console.error('Messenger Extensions error:', err, errorMessage);
              });
            };
          </script>
        </body>
      </html>
    `;
    res.send(html);
  });

  // Messenger Webview - Sell Amount Entry
  app.get("/webview/sell-amount", async (req, res) => {
    const psidParam = req.query.psid || "";
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Sell Crypto</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 20px;
            }
            .container {
              background: white;
              border-radius: 16px;
              padding: 32px 24px;
              max-width: 400px;
              width: 100%;
              box-shadow: 0 20px 60px rgba(0,0,0,0.2);
            }
            h1 {
              font-size: 24px;
              color: #1a1a1a;
              margin-bottom: 8px;
              text-align: center;
            }
            .subtitle {
              font-size: 14px;
              color: #666;
              text-align: center;
              margin-bottom: 24px;
            }
            .balance-list {
              margin-bottom: 24px;
            }
            .balance-item {
              background: #f3f4f6;
              padding: 16px;
              border-radius: 12px;
              margin-bottom: 12px;
              cursor: pointer;
              transition: all 0.2s;
              border: 2px solid transparent;
            }
            .balance-item:hover {
              background: #e5e7eb;
            }
            .balance-item.selected {
              background: #dbeafe;
              border-color: #3b82f6;
            }
            .balance-item .token-name {
              font-weight: 700;
              font-size: 16px;
              color: #1a1a1a;
              margin-bottom: 4px;
            }
            .balance-item .chain-name {
              font-size: 12px;
              color: #666;
              margin-bottom: 4px;
            }
            .balance-item .balance-amount {
              font-size: 20px;
              font-weight: 600;
              color: #3b82f6;
            }
            .form-group {
              margin-bottom: 20px;
            }
            label {
              display: block;
              font-size: 14px;
              font-weight: 600;
              color: #333;
              margin-bottom: 8px;
            }
            input {
              width: 100%;
              padding: 12px 16px;
              border: 2px solid #e0e0e0;
              border-radius: 8px;
              font-size: 16px;
              transition: border-color 0.3s;
            }
            input:focus {
              outline: none;
              border-color: #3b82f6;
            }
            .btn {
              width: 100%;
              padding: 14px;
              background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
              color: white;
              border: none;
              border-radius: 8px;
              font-size: 16px;
              font-weight: 600;
              cursor: pointer;
              transition: transform 0.2s;
            }
            .btn:hover { transform: translateY(-2px); }
            .btn:disabled {
              background: #ccc;
              cursor: not-allowed;
              transform: none;
            }
            .error-msg, .success-msg, .loading-msg {
              padding: 12px;
              border-radius: 8px;
              margin-bottom: 16px;
              display: none;
              text-align: center;
            }
            .error-msg { background: #fee2e2; color: #991b1b; }
            .success-msg { background: #d1fae5; color: #065f46; }
            .loading-msg { background: #dbeafe; color: #1e40af; }
            .loading-msg.show, .error-msg.show, .success-msg.show {
              display: block;
            }
            .max-btn {
              display: inline-block;
              background: #3b82f6;
              color: white;
              padding: 6px 12px;
              border-radius: 6px;
              font-size: 12px;
              font-weight: 600;
              cursor: pointer;
              margin-left: 8px;
            }
            .max-btn:hover {
              background: #2563eb;
            }
            #selectedBalance {
              display: none;
              background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
              color: white;
              padding: 16px;
              border-radius: 12px;
              text-align: center;
              margin-bottom: 20px;
            }
            #selectedBalance .label {
              font-size: 12px;
              opacity: 0.9;
              margin-bottom: 4px;
            }
            #selectedBalance .value {
              font-size: 24px;
              font-weight: 700;
            }
          </style>
          <script src="https://connect.facebook.net/en_US/messenger.Extensions.js"></script>
        </head>
        <body>
          <div class="container">
            <h1>💱 Sell Crypto</h1>
            <p class="subtitle">Select token and enter amount to sell</p>
            
            <div class="loading-msg" id="loadingMsg">Loading your balances...</div>
            <div class="error-msg" id="errorMsg"></div>
            <div class="success-msg" id="successMsg"></div>
            
            <div id="balanceList" class="balance-list"></div>
            
            <div id="selectedBalance"></div>
            
            <div class="form-group" id="amountGroup" style="display:none;">
              <label for="amount">Amount to Sell <span class="max-btn" onclick="setMaxAmount()">MAX</span></label>
              <input 
                type="number" 
                id="amount" 
                step="any" 
                placeholder="0.00"
                required
              >
            </div>
            
            <button type="button" class="btn" id="submitBtn" onclick="submitSellAmount()">Continue</button>
          </div>
          
          <script>
            let selectedToken = null;
            let userBalances = {};
            let psid = '';
            
            // Extract PSID from URL parameters
            const urlParams = new URLSearchParams(window.location.search);
            const psidFromUrl = urlParams.get('psid');
            console.log('[Webview] PSID from URL:', psidFromUrl);
            
            // Try URL parameter first (more reliable)
            if (psidFromUrl) {
              psid = psidFromUrl;
              console.log('[Webview] Using PSID from URL, loading balances...');
              loadBalances();
            }
            
            window.extAsyncInit = function() {
              // If we already have PSID from URL, skip Messenger Extensions
              if (psid) {
                console.log('[Webview] Already have PSID from URL, skipping Messenger Extensions');
                return;
              }
              
              MessengerExtensions.getContext('${process.env.FACEBOOK_APP_ID}',
                async function success(result) {
                  console.log('[Webview] Got PSID from Messenger Extensions:', result.psid);
                  psid = result.psid;
                  await loadBalances();
                },
                function error(err, errorMessage) {
                  console.error('[Webview] Messenger Extensions error:', err, errorMessage);
                  document.getElementById('errorMsg').textContent = 'Failed to get user context. Please try again.';
                  document.getElementById('errorMsg').classList.add('show');
                  document.getElementById('loadingMsg').classList.remove('show');
                }
              );
            };
            
            async function loadBalances() {
              console.log('[Webview] loadBalances() called, psid:', psid);
              const loadingMsg = document.getElementById('loadingMsg');
              const errorMsg = document.getElementById('errorMsg');
              const balanceList = document.getElementById('balanceList');
              
              loadingMsg.classList.add('show');
              
              try {
                console.log('[Webview] Fetching balances for psid:', psid);
                const response = await fetch('/api/webview/get-balances', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ psid })
                });
                
                console.log('[Webview] Response status:', response.status);
                const data = await response.json();
                console.log('[Webview] Response data:', data);
                loadingMsg.classList.remove('show');
                
                if (!data.success) {
                  throw new Error(data.error || 'Failed to load balances');
                }
                
                userBalances = data.balances;
                console.log('[Webview] User balances:', userBalances);
                
                if (Object.keys(userBalances).length === 0) {
                  errorMsg.textContent = '❌ No crypto found. Deposit first using /deposit command.';
                  errorMsg.classList.add('show');
                  document.getElementById('submitBtn').disabled = true;
                  return;
                }
                
                // Display balances
                for (const [key, amount] of Object.entries(userBalances)) {
                  const [blockchain, token] = key.split('-');
                  const chainNames = {
                    ethereum: 'Ethereum',
                    bsc: 'BSC',
                    polygon: 'Polygon',
                    arbitrum: 'Arbitrum',
                    base: 'Base'
                  };
                  
                  const balanceItem = document.createElement('div');
                  balanceItem.className = 'balance-item';
                  balanceItem.dataset.key = key;
                  balanceItem.innerHTML = \`
                    <div class="token-name">\${token}</div>
                    <div class="chain-name">\${chainNames[blockchain] || blockchain}</div>
                    <div class="balance-amount">\${amount} \${token}</div>
                  \`;
                  balanceItem.onclick = () => selectBalance(key, blockchain, token, amount);
                  balanceList.appendChild(balanceItem);
                }
                
                // Auto-select if only one balance
                if (Object.keys(userBalances).length === 1) {
                  const [key, amount] = Object.entries(userBalances)[0];
                  const [blockchain, token] = key.split('-');
                  selectBalance(key, blockchain, token, amount);
                }
              } catch (error) {
                console.error('[Webview] Error loading balances:', error);
                loadingMsg.classList.remove('show');
                errorMsg.textContent = error.message || 'Failed to load balances';
                errorMsg.classList.add('show');
                document.getElementById('submitBtn').disabled = true;
              }
            }
            
            function selectBalance(key, blockchain, token, amount) {
              selectedToken = { key, blockchain, token, amount };
              
              // Update UI
              document.querySelectorAll('.balance-item').forEach(item => {
                item.classList.remove('selected');
              });
              document.querySelector(\`[data-key="\${key}"]\`).classList.add('selected');
              
              // Show amount input
              document.getElementById('amountGroup').style.display = 'block';
              document.getElementById('selectedBalance').style.display = 'block';
              document.getElementById('selectedBalance').innerHTML = \`
                <div class="label">Available</div>
                <div class="value">\${amount} \${token}</div>
              \`;
              
              // Clear previous amount
              document.getElementById('amount').value = '';
              document.getElementById('submitBtn').disabled = false;
            }
            
            function setMaxAmount() {
              if (selectedToken) {
                document.getElementById('amount').value = selectedToken.amount;
              }
            }
            
            async function submitSellAmount() {
              const errorMsg = document.getElementById('errorMsg');
              const successMsg = document.getElementById('successMsg');
              const submitBtn = document.getElementById('submitBtn');
              const amount = document.getElementById('amount').value;
              
              errorMsg.classList.remove('show');
              successMsg.classList.remove('show');
              
              if (!selectedToken) {
                errorMsg.textContent = 'Please select a token to sell';
                errorMsg.classList.add('show');
                return;
              }
              
              if (!amount || parseFloat(amount) <= 0) {
                errorMsg.textContent = 'Please enter a valid amount';
                errorMsg.classList.add('show');
                return;
              }
              
              if (parseFloat(amount) > parseFloat(selectedToken.amount)) {
                errorMsg.textContent = \`Amount exceeds available balance (\${selectedToken.amount} \${selectedToken.token})\`;
                errorMsg.classList.add('show');
                return;
              }
              
              submitBtn.disabled = true;
              submitBtn.textContent = 'Processing...';
              
              try {
                const response = await fetch('/api/webview/save-sell-amount', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    psid,
                    blockchain: selectedToken.blockchain,
                    token: selectedToken.token,
                    amount: amount
                  })
                });
                
                const data = await response.json();
                
                if (data.success) {
                  successMsg.textContent = '✅ Saved! Closing...';
                  successMsg.classList.add('show');
                  
                  // Try to close webview immediately
                  if (typeof MessengerExtensions !== 'undefined') {
                    MessengerExtensions.requestCloseBrowser(
                      function success() {
                        console.log('[Webview] Closed via MessengerExtensions');
                      },
                      function error(err) {
                        console.error('[Webview] MessengerExtensions failed, using window.close()');
                        window.close();
                      }
                    );
                  } else {
                    console.log('[Webview] Using window.close()');
                    window.close();
                  }
                } else {
                  throw new Error(data.error || 'Failed to process sell request');
                }
              } catch (error) {
                errorMsg.textContent = error.message;
                errorMsg.classList.add('show');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Continue';
              }
            }
          </script>
        </body>
      </html>
    `;
    res.send(html);
  });

  // Messenger Webview - Bank Details Entry
  app.get("/webview/bank-details", (req, res) => {
    const amount = req.query.amount || "0";
    const token = req.query.token || "";
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Enter Bank Details</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 20px;
            }
            .container {
              background: white;
              border-radius: 16px;
              padding: 32px 24px;
              max-width: 400px;
              width: 100%;
              box-shadow: 0 20px 60px rgba(0,0,0,0.2);
            }
            h1 {
              font-size: 24px;
              color: #1a1a1a;
              margin-bottom: 8px;
              text-align: center;
            }
            .amount-display {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 16px;
              border-radius: 12px;
              text-align: center;
              margin: 16px 0 24px;
            }
            .amount-display .label {
              font-size: 12px;
              opacity: 0.9;
              margin-bottom: 4px;
            }
            .amount-display .value {
              font-size: 28px;
              font-weight: 700;
            }
            .form-group {
              margin-bottom: 20px;
            }
            label {
              display: block;
              font-size: 14px;
              font-weight: 600;
              color: #333;
              margin-bottom: 8px;
            }
            input, select {
              width: 100%;
              padding: 12px 16px;
              border: 2px solid #e0e0e0;
              border-radius: 8px;
              font-size: 16px;
              transition: border-color 0.3s;
            }
            input:focus, select:focus {
              outline: none;
              border-color: #667eea;
            }
            .btn {
              width: 100%;
              padding: 14px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              border: none;
              border-radius: 8px;
              font-size: 16px;
              font-weight: 600;
              cursor: pointer;
              transition: transform 0.2s;
            }
            .btn:hover { transform: translateY(-2px); }
            .btn:disabled {
              background: #ccc;
              cursor: not-allowed;
              transform: none;
            }
            .account-name {
              background: #f0fff4;
              border: 2px solid #48bb78;
              padding: 12px;
              border-radius: 8px;
              margin-top: 8px;
              font-size: 14px;
              color: #2f855a;
              display: none;
            }
            .error {
              color: #e53e3e;
              font-size: 14px;
              margin-top: 8px;
              display: none;
            }
            .success {
              color: #38a169;
              font-size: 14px;
              margin-top: 8px;
              display: none;
            }
            .loading {
              display: none;
              text-align: center;
              color: #667eea;
              margin-top: 8px;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>💳 Enter Bank Details</h1>
            
            <div class="amount-display">
              <div class="label">You will receive</div>
              <div class="value">₦${amount}</div>
            </div>
            
            <form id="bankForm">
              <div class="form-group">
                <label for="bankName">Bank Name</label>
                <select id="bankName" name="bankName" required>
                  <option value="">Select your bank...</option>
                  <option value="Access Bank">Access Bank</option>
                  <option value="Guaranty Trust Bank">GTBank</option>
                  <option value="United Bank for Africa">UBA</option>
                  <option value="Zenith Bank">Zenith Bank</option>
                  <option value="First Bank of Nigeria">First Bank</option>
                  <option value="Fidelity Bank">Fidelity Bank</option>
                  <option value="Union Bank">Union Bank</option>
                  <option value="Stanbic IBTC Bank">Stanbic IBTC</option>
                  <option value="Sterling Bank">Sterling Bank</option>
                  <option value="Wema Bank">Wema Bank</option>
                  <option value="Polaris Bank">Polaris Bank</option>
                  <option value="Ecobank">Ecobank</option>
                  <option value="Keystone Bank">Keystone Bank</option>
                  <option value="FCMB">FCMB</option>
                  <option value="Heritage Bank">Heritage Bank</option>
                  <option value="Jaiz Bank">Jaiz Bank</option>
                  <option value="Providus Bank">Providus Bank</option>
                  <option value="Kuda Bank">Kuda Bank</option>
                  <option value="Opay">OPay</option>
                  <option value="PalmPay">PalmPay</option>
                </select>
              </div>
              
              <div class="form-group">
                <label for="accountNumber">Account Number</label>
                <input type="text" id="accountNumber" name="accountNumber" maxlength="10" pattern="[0-9]{10}" inputmode="numeric" required placeholder="10-digit account number">
                <div class="loading" id="validating">Validating account...</div>
                <div class="account-name" id="accountNameDisplay"></div>
                <div class="error" id="accountError"></div>
              </div>
              
              <button type="submit" class="btn" id="submitBtn" disabled>Continue</button>
              
              <div class="error" id="errorMsg"></div>
              <div class="success" id="successMsg"></div>
            </form>
          </div>
          
          <script>
            (function(d, s, id){
              var js, fjs = d.getElementsByTagName(s)[0];
              if (d.getElementById(id)) { return; }
              js = d.createElement(s); js.id = id;
              js.src = "//connect.facebook.net/en_US/messenger.Extensions.js";
              fjs.parentNode.insertBefore(js, fjs);
            }(document, 'script', 'Messenger'));
            
            let psid = null;
            let validatedAccountName = null;
            
            // Get PSID from URL parameter
            const urlParams = new URLSearchParams(window.location.search);
            const psidFromUrl = urlParams.get('psid');
            if (psidFromUrl) {
              psid = psidFromUrl;
              setupForm();
            }
            
            window.extAsyncInit = function() {
              if (psid) return; // Already have PSID from URL
              
              MessengerExtensions.getUserID(function success(uids) {
                psid = uids.psid;
                setupForm();
              }, function error(err, errorMessage) {
                console.error('Messenger Extensions error:', err, errorMessage);
                // Try to setup form anyway if we don't have PSID
                if (!psid) {
                  setupForm();
                }
              });
            };
            
            function setupForm() {
              const bankName = document.getElementById('bankName');
              const accountNumber = document.getElementById('accountNumber');
              const submitBtn = document.getElementById('submitBtn');
              const accountError = document.getElementById('accountError');
              const accountNameDisplay = document.getElementById('accountNameDisplay');
              const validating = document.getElementById('validating');
              
              let validationTimeout = null;
              
              function validateAccount() {
                if (bankName.value && accountNumber.value.length === 10) {
                  accountError.style.display = 'none';
                  accountNameDisplay.style.display = 'none';
                  validating.style.display = 'block';
                  submitBtn.disabled = true;
                  
                  fetch('/api/validate-account', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      bankName: bankName.value,
                      accountNumber: accountNumber.value
                    })
                  })
                  .then(res => res.json())
                  .then(data => {
                    validating.style.display = 'none';
                    if (data.accountName) {
                      validatedAccountName = data.accountName;
                      accountNameDisplay.textContent = '✅ ' + data.accountName;
                      accountNameDisplay.style.display = 'block';
                      submitBtn.disabled = false;
                    } else {
                      throw new Error(data.error || 'Could not verify account');
                    }
                  })
                  .catch(err => {
                    validating.style.display = 'none';
                    accountError.textContent = err.message || 'Could not verify account. Please check details.';
                    accountError.style.display = 'block';
                    submitBtn.disabled = true;
                  });
                }
              }
              
              accountNumber.addEventListener('input', function() {
                clearTimeout(validationTimeout);
                accountNameDisplay.style.display = 'none';
                accountError.style.display = 'none';
                submitBtn.disabled = true;
                
                if (this.value.length === 10 && bankName.value) {
                  validationTimeout = setTimeout(validateAccount, 500);
                }
              });
              
              bankName.addEventListener('change', function() {
                if (accountNumber.value.length === 10) {
                  validateAccount();
                }
              });
              
              document.getElementById('bankForm').addEventListener('submit', function(e) {
                e.preventDefault();
                const errorMsg = document.getElementById('errorMsg');
                const successMsg = document.getElementById('successMsg');
                
                errorMsg.style.display = 'none';
                successMsg.style.display = 'none';
                submitBtn.disabled = true;
                submitBtn.textContent = 'Submitting...';
                
                fetch('/api/webview/save-bank-details', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    psid,
                    bankName: bankName.value,
                    accountNumber: accountNumber.value,
                    accountName: validatedAccountName,
                    token: '${token}'
                  })
                })
                .then(res => res.json())
                .then(data => {
                  if (data.success) {
                    successMsg.textContent = '✅ Bank details saved!';
                    successMsg.style.display = 'block';
                    
                    // Try to close webview immediately
                    if (typeof MessengerExtensions !== 'undefined') {
                      MessengerExtensions.requestCloseBrowser(
                        function success() {
                          console.log('[Webview] Closed via MessengerExtensions');
                        },
                        function error(err) {
                          console.error('[Webview] MessengerExtensions failed, using window.close()');
                          window.close();
                        }
                      );
                    } else {
                      console.log('[Webview] Using window.close()');
                      window.close();
                    }
                  } else {
                    throw new Error(data.error || 'Failed to save details');
                  }
                })
                .catch(err => {
                  errorMsg.textContent = err.message;
                  errorMsg.style.display = 'block';
                  submitBtn.disabled = false;
                  submitBtn.textContent = 'Continue';
                });
              });
            }
          </script>
        </body>
      </html>
    `;
    res.send(html);
  });

  // Messenger Webview - Confirm PIN for Transaction
  app.get("/webview/confirm-pin", async (req, res) => {
    const psidParam = req.query.psid || "";
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Confirm Transaction</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 20px;
            }
            .container {
              background: white;
              border-radius: 16px;
              padding: 32px 24px;
              max-width: 400px;
              width: 100%;
              box-shadow: 0 20px 60px rgba(0,0,0,0.2);
            }
            h1 {
              font-size: 24px;
              color: #1a1a1a;
              margin-bottom: 8px;
              text-align: center;
            }
            .subtitle {
              font-size: 14px;
              color: #666;
              text-align: center;
              margin-bottom: 24px;
            }
            .summary-box {
              background: #f7fafc;
              border-radius: 12px;
              padding: 16px;
              margin-bottom: 24px;
            }
            .summary-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              border-bottom: 1px solid #e2e8f0;
            }
            .summary-row:last-child {
              border-bottom: none;
              font-weight: 600;
              font-size: 18px;
              color: #2d3748;
              padding-top: 12px;
              margin-top: 8px;
              border-top: 2px solid #cbd5e0;
            }
            .summary-label {
              color: #718096;
              font-size: 14px;
            }
            .summary-value {
              color: #2d3748;
              font-weight: 500;
              font-size: 14px;
            }
            .form-group {
              margin-bottom: 24px;
            }
            label {
              display: block;
              font-size: 14px;
              font-weight: 600;
              color: #333;
              margin-bottom: 8px;
            }
            input {
              width: 100%;
              padding: 12px 16px;
              border: 2px solid #e0e0e0;
              border-radius: 8px;
              font-size: 16px;
              transition: border-color 0.3s;
            }
            input:focus {
              outline: none;
              border-color: #667eea;
            }
            input[type="password"] {
              letter-spacing: 8px;
              font-size: 24px;
              text-align: center;
            }
            .btn {
              width: 100%;
              padding: 14px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              border: none;
              border-radius: 8px;
              font-size: 16px;
              font-weight: 600;
              cursor: pointer;
              transition: transform 0.2s;
            }
            .btn:hover { transform: translateY(-2px); }
            .btn:disabled {
              background: #ccc;
              cursor: not-allowed;
              transform: none;
            }
            .error {
              color: #e53e3e;
              font-size: 14px;
              margin-top: 8px;
              text-align: center;
              display: none;
            }
            .success {
              color: #38a169;
              font-size: 14px;
              margin-top: 8px;
              text-align: center;
              display: none;
            }
            .security-note {
              background: #fff5f5;
              border-left: 4px solid #f56565;
              padding: 12px;
              margin-top: 16px;
              font-size: 13px;
              color: #c53030;
              border-radius: 4px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🔐 Confirm Transaction</h1>
            <p class="subtitle">Enter your PIN to complete the swap</p>
            
            <div class="summary-box" id="summaryBox">
              <div class="summary-row">
                <span class="summary-label">Loading transaction...</span>
              </div>
            </div>
            
            <form id="pinForm">
              <div class="form-group">
                <label for="pin">Enter 4-Digit PIN</label>
                <input type="password" id="pin" name="pin" maxlength="4" pattern="[0-9]{4}" inputmode="numeric" required placeholder="••••" autocomplete="off">
              </div>
              
              <button type="submit" class="btn" id="submitBtn">Confirm & Process</button>
              
              <div class="error" id="errorMsg"></div>
              <div class="success" id="successMsg"></div>
            </form>
            
            <div class="security-note">
              <strong>⚠️ Important:</strong> This action cannot be undone. Verify all details before confirming.
            </div>
          </div>
          
          <script>
            (function(d, s, id){
              var js, fjs = d.getElementsByTagName(s)[0];
              if (d.getElementById(id)) { return; }
              js = d.createElement(s); js.id = id;
              js.src = "//connect.facebook.net/en_US/messenger.Extensions.js";
              fjs.parentNode.insertBefore(js, fjs);
            }(document, 'script', 'Messenger'));
            
            let psid = null;
            let transactionData = null;
            
            // URL parameter method (primary)
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.has('psid')) {
              psid = urlParams.get('psid');
              console.log('[Webview] Got PSID from URL:', psid);
              setupForm();
            }
            
            // MessengerExtensions method (fallback)
            window.extAsyncInit = function() {
              if (!psid) {
                MessengerExtensions.getUserID(function success(uids) {
                  psid = uids.psid;
                  console.log('[Webview] Got PSID from MessengerExtensions:', psid);
                  setupForm();
                }, function error(err, errorMessage) {
                  console.error('[Webview] MessengerExtensions error:', err, errorMessage);
                  if (!psid) {
                    document.getElementById('errorMsg').textContent = 'Failed to load user data. Please try again.';
                    document.getElementById('errorMsg').style.display = 'block';
                  }
                });
              }
            };
            
            function setupForm() {
              // Load transaction summary
              fetch(\`/api/webview/get-transaction-summary?psid=\${psid}\`)
                .then(res => res.json())
                .then(data => {
                  if (data.success && data.summary) {
                    transactionData = data.summary;
                    displaySummary(data.summary);
                  } else {
                    throw new Error('Failed to load transaction details');
                  }
                })
                .catch(err => {
                  document.getElementById('errorMsg').textContent = err.message;
                  document.getElementById('errorMsg').style.display = 'block';
                });
              
              document.getElementById('pinForm').addEventListener('submit', handleSubmit);
            }
            
            function displaySummary(summary) {
              const summaryBox = document.getElementById('summaryBox');
              summaryBox.innerHTML = \`
                <div class="summary-row">
                  <span class="summary-label">Selling</span>
                  <span class="summary-value">\${summary.amount} \${summary.token}</span>
                </div>
                <div class="summary-row">
                  <span class="summary-label">Rate</span>
                  <span class="summary-value">₦\${summary.rate}/\${summary.token}</span>
                </div>
                <div class="summary-row">
                  <span class="summary-label">Bank</span>
                  <span class="summary-value">\${summary.bankName}</span>
                </div>
                <div class="summary-row">
                  <span class="summary-label">Account</span>
                  <span class="summary-value">\${summary.accountName}</span>
                </div>
                <div class="summary-row">
                  <span class="summary-label">Platform Fee</span>
                  <span class="summary-value">₦\${parseFloat(summary.platformFee).toFixed(2)}</span>
                </div>
                <div class="summary-row">
                  <span class="summary-label">💰 You receive</span>
                  <span class="summary-value">₦\${parseFloat(summary.netAmount).toFixed(2)}</span>
                </div>
              \`;
            }
            
            function handleSubmit(e) {
              e.preventDefault();
              const pin = document.getElementById('pin').value;
              const errorMsg = document.getElementById('errorMsg');
              const successMsg = document.getElementById('successMsg');
              const submitBtn = document.getElementById('submitBtn');
              
              errorMsg.style.display = 'none';
              successMsg.style.display = 'none';
              
              if (!/^[0-9]{4}$/.test(pin)) {
                errorMsg.textContent = 'PIN must be exactly 4 digits';
                errorMsg.style.display = 'block';
                return;
              }
              
              submitBtn.disabled = true;
              submitBtn.textContent = 'Processing...';
              
              fetch('/api/webview/confirm-pin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ psid, pin })
              })
              .then(res => res.json())
              .then(data => {
                if (data.success) {
                  successMsg.textContent = '✅ Transaction processing!';
                  successMsg.style.display = 'block';
                  
                  // Try to close webview
                  setTimeout(() => {
                    if (typeof MessengerExtensions !== 'undefined') {
                      MessengerExtensions.requestCloseBrowser(
                        function success() {
                          console.log('[Webview] Closed via MessengerExtensions');
                        },
                        function error(err) {
                          console.error('[Webview] MessengerExtensions failed, using window.close()');
                          window.close();
                        }
                      );
                    } else {
                      console.log('[Webview] Using window.close()');
                      window.close();
                    }
                  }, 1500);
                } else {
                  throw new Error(data.error || 'Invalid PIN');
                }
              })
              .catch(err => {
                errorMsg.textContent = err.message;
                errorMsg.style.display = 'block';
                submitBtn.disabled = false;
                submitBtn.textContent = 'Confirm & Process';
              });
            }
          </script>
        </body>
      </html>
    `;
    res.send(html);
  });

  // API endpoint - Save PIN from webview
  app.post("/api/webview/set-pin", async (req, res) => {
    try {
      const schema = z.object({
        psid: z.string(),
        pin: z.string().length(4).regex(/^[0-9]{4}$/),
        securityQuestion: z.string(),
        securityAnswer: z.string().min(1),
      });
      
      const { psid, pin, securityQuestion, securityAnswer } = schema.parse(req.body);
      
      // Import services
      const { pinService } = await import("./services/pinService");
      
      // Hash PIN and security answer
      const hashedPIN = await pinService.hashPIN(pin);
      const hashedAnswer = await pinService.hashSecurityAnswer(securityAnswer);
      
      // Save to database
      await db
        .update(messengerUsers)
        .set({
          transactionPin: hashedPIN,
          securityQuestion,
          securityAnswer: hashedAnswer,
        })
        .where(eq(messengerUsers.messengerId, psid));
      
      res.json({ success: true, message: "PIN set successfully" });
      
      // Server-initiated flow continuation (don't await - run async)
      const { commandHandler } = await import("./services/commandHandler");
      setTimeout(() => {
        commandHandler.handlePINWebviewCompletion(psid).catch(err => {
          console.error("[Webview] Error in PIN completion handler:", err);
        });
      }, 500); // Small delay to ensure response is sent first
    } catch (error: any) {
      console.error("[Webview] Error setting PIN:", error);
      res.status(400).json({ success: false, error: error.message || "Failed to set PIN" });
    }
  });

  // API endpoint - Get user balances for sell webview
  app.post("/api/webview/get-balances", async (req, res) => {
    try {
      const schema = z.object({
        psid: z.string(),
      });
      
      const { psid } = schema.parse(req.body);
      
      // Get user from PSID
      const [user] = await db
        .select()
        .from(messengerUsers)
        .where(eq(messengerUsers.messengerId, psid))
        .limit(1);
      
      if (!user) {
        return res.status(404).json({ success: false, error: "User not found" });
      }
      
      // Get balances
      const { blockchainMonitor } = await import("./services/blockchainMonitor");
      const balances = await blockchainMonitor.getDepositBalance(user.id);
      
      res.json({ success: true, balances });
    } catch (error: any) {
      console.error("[Webview] Error fetching balances:", error);
      res.status(400).json({ success: false, error: error.message || "Failed to fetch balances" });
    }
  });

  // API endpoint - Save sell amount from webview
  app.post("/api/webview/save-sell-amount", async (req, res) => {
    try {
      const schema = z.object({
        psid: z.string(),
        blockchain: z.string(),
        token: z.string(),
        amount: z.string(),
      });
      
      const data = schema.parse(req.body);
      
      // Get user
      const [user] = await db
        .select()
        .from(messengerUsers)
        .where(eq(messengerUsers.messengerId, data.psid))
        .limit(1);
      
      if (!user) {
        return res.status(404).json({ success: false, error: "User not found" });
      }
      
      // Validate amount
      const { blockchainMonitor } = await import("./services/blockchainMonitor");
      const balances = await blockchainMonitor.getDepositBalance(user.id);
      const balanceKey = `${data.blockchain}-${data.token}`;
      const availableBalance = balances[balanceKey] || 0;
      
      if (parseFloat(data.amount) > availableBalance) {
        return res.status(400).json({ 
          success: false, 
          error: `Insufficient balance. Available: ${availableBalance} ${data.token}` 
        });
      }
      
      // Get CoinGecko market price
      const { priceService } = await import("./services/priceService");
      const tokenUpper = data.token.toUpperCase();
      
      let nairaRate;
      try {
        nairaRate = await priceService.getTokenPriceInNaira(tokenUpper);
      } catch (error) {
        console.error("[Webview] Failed to fetch CoinGecko price:", error);
        return res.status(500).json({
          success: false,
          error: "Sorry, I couldn't fetch the current market price. Please try again in a moment."
        });
      }
      
      // Calculate amounts
      const amount = parseFloat(data.amount);
      const nairaAmount = amount * nairaRate;
      const platformFee = Math.max(25, nairaAmount * 0.0075); // 0.75% fee with ₦25 minimum
      const netAmount = nairaAmount - platformFee;
      
      // Save to conversation state
      await db
        .update(messengerUsers)
        .set({
          sellConversationState: "AWAIT_BANK_DETAILS",
          sellConversationData: {
            blockchain: data.blockchain,
            token: data.token,
            amount: data.amount,
            nairaRate: nairaRate.toString(),
            nairaAmount: nairaAmount.toString(),
            platformFee: platformFee.toString(),
            netAmount: netAmount.toString(),
          },
        })
        .where(eq(messengerUsers.id, user.id));
      
      res.json({ success: true, message: "Sell amount saved" });
      
      // Server-initiated flow continuation (don't await - run async)
      const { commandHandler } = await import("./services/commandHandler");
      setTimeout(() => {
        commandHandler.handleSellAmountWebviewCompletion(data.psid).catch(err => {
          console.error("[Webview] Error in sell amount completion handler:", err);
        });
      }, 500); // Small delay to ensure response is sent first
    } catch (error: any) {
      console.error("[Webview] Error saving sell amount:", error);
      res.status(400).json({ success: false, error: error.message || "Failed to save sell amount" });
    }
  });

  // API endpoint - Save bank details from webview
  app.post("/api/webview/save-bank-details", async (req, res) => {
    try {
      const schema = z.object({
        psid: z.string(),
        bankName: z.string(),
        accountNumber: z.string().length(10),
        accountName: z.string(),
        token: z.string().optional(),
      });
      
      const data = schema.parse(req.body);
      
      // CRITICAL: Re-validate account with Flutterwave on server side
      // This prevents bypassing client-side validation
      console.log(`[Webview] Validating bank account ${data.accountNumber} at ${data.bankName}`);
      
      const validationResult = await flutterwaveService.validateBankAccount(
        data.accountNumber,
        data.bankName
      );
      
      if (!validationResult || !validationResult.accountName) {
        console.error(`[Webview] Bank account validation failed for ${data.accountNumber}`);
        return res.status(400).json({ 
          success: false, 
          error: "Could not verify bank account. Please check account number and bank name." 
        });
      }
      
      // Verify the account name matches what was submitted
      // This ensures the user saw the correct name before submitting
      const normalizedSubmitted = data.accountName.toLowerCase().trim();
      const normalizedValidated = validationResult.accountName.toLowerCase().trim();
      
      if (normalizedSubmitted !== normalizedValidated) {
        console.error(`[Webview] Account name mismatch: submitted="${data.accountName}", validated="${validationResult.accountName}"`);
        return res.status(400).json({
          success: false,
          error: "Account name mismatch. Please re-enter your details."
        });
      }
      
      console.log(`[Webview] Bank account validated successfully: ${validationResult.accountName}`);
      
      // Store validated bank details temporarily in storage for the transaction
      await storage.savePendingBankDetails(data.psid, {
        bankName: data.bankName,
        accountNumber: data.accountNumber,
        accountName: validationResult.accountName, // Use Flutterwave's validated name
      });
      
      res.json({ success: true, message: "Bank details saved" });
      
      // Server-initiated flow continuation (don't await - run async)
      const { commandHandler } = await import("./services/commandHandler");
      setTimeout(() => {
        commandHandler.handleBankDetailsWebviewCompletion(data.psid).catch(err => {
          console.error("[Webview] Error in bank details completion handler:", err);
        });
      }, 500); // Small delay to ensure response is sent first
    } catch (error: any) {
      console.error("[Webview] Error saving bank details:", error);
      res.status(400).json({ success: false, error: error.message || "Failed to save bank details" });
    }
  });

  // API endpoint - Get transaction summary for PIN confirmation webview
  app.get("/api/webview/get-transaction-summary", async (req, res) => {
    try {
      const psid = req.query.psid as string;
      
      if (!psid) {
        return res.status(400).json({ success: false, error: "Missing PSID" });
      }
      
      // Get user's sell conversation data
      const user = await db.query.messengerUsers.findFirst({
        where: eq(messengerUsers.messengerId, psid),
      });
      
      if (!user || !user.sellConversationData) {
        return res.status(404).json({ success: false, error: "No pending transaction found" });
      }
      
      const data = user.sellConversationData as any;
      
      // Return summary for display
      res.json({
        success: true,
        summary: {
          amount: data.amount,
          token: data.token,
          blockchain: data.blockchain,
          rate: data.rate,
          totalNaira: data.totalNaira,
          platformFee: data.platformFee,
          netAmount: data.netAmount,
          bankName: data.bankName,
          accountNumber: data.accountNumber,
          accountName: data.accountName,
        }
      });
    } catch (error: any) {
      console.error("[API] Error getting transaction summary:", error);
      res.status(500).json({ success: false, error: "Failed to load transaction" });
    }
  });

  // API endpoint - Confirm PIN and process transaction
  app.post("/api/webview/confirm-pin", async (req, res) => {
    try {
      const schema = z.object({
        psid: z.string(),
        pin: z.string().length(4).regex(/^[0-9]{4}$/),
      });
      
      const { psid, pin } = schema.parse(req.body);
      
      // Get user
      const user = await db.query.messengerUsers.findFirst({
        where: eq(messengerUsers.messengerId, psid),
      });
      
      if (!user || !user.transactionPin) {
        return res.status(401).json({ success: false, error: "PIN not set" });
      }
      
      if (!user.sellConversationData) {
        return res.status(400).json({ success: false, error: "No pending transaction" });
      }
      
      // Verify PIN
      const { pinService } = await import("./services/pinService");
      const isValid = await pinService.verifyPIN(pin, user.transactionPin);
      
      if (!isValid) {
        return res.status(401).json({ success: false, error: "Incorrect PIN" });
      }
      
      res.json({ success: true, message: "PIN verified. Processing transaction..." });
      
      // Server-initiated transaction processing (don't await - run async)
      const { commandHandler } = await import("./services/commandHandler");
      setTimeout(() => {
        commandHandler.handlePINWebviewConfirmation(psid).catch(err => {
          console.error("[Webview] Error in PIN confirmation handler:", err);
        });
      }, 500);
    } catch (error: any) {
      console.error("[API] Error confirming PIN:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, error: "Invalid PIN format" });
      }
      
      res.status(500).json({ success: false, error: error.message || "Failed to verify PIN" });
    }
  });

  // Get exchange rates from CoinGecko API
  app.get("/api/rates", async (req, res) => {
    try {
      const allPrices = await priceService.getAllPrices();
      
      const rates = {
        ethereum: {
          ETH: allPrices.ETH || 5775000,
          USDT: allPrices.USDT || 1650,
          USDC: allPrices.USDC || 1650,
          DAI: allPrices.DAI || 1650,
        },
        bsc: {
          BNB: allPrices.BNB || 990000,
          USDT: allPrices.USDT || 1650,
          USDC: allPrices.USDC || 1650,
          BUSD: allPrices.BUSD || 1650,
        },
        polygon: {
          MATIC: allPrices.MATIC || 1485,
          USDT: allPrices.USDT || 1650,
          USDC: allPrices.USDC || 1650,
          DAI: allPrices.DAI || 1650,
        },
        arbitrum: {
          ETH: allPrices.ETH || 5775000,
          USDT: allPrices.USDT || 1650,
          USDC: allPrices.USDC || 1650,
          DAI: allPrices.DAI || 1650,
        },
        base: {
          ETH: allPrices.ETH || 5775000,
          USDC: allPrices.USDC || 1650,
          DAI: allPrices.DAI || 1650,
        },
      };

      res.json(rates);
    } catch (error) {
      console.error("Error fetching rates:", error);
      res.status(500).json({ error: "Failed to fetch exchange rates" });
    }
  });

  // Debug endpoint - Check Facebook secrets status
  app.get("/api/debug/secrets", async (req, res) => {
    const verifyToken = process.env.FACEBOOK_VERIFY_TOKEN;
    const pageToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
    const appSecret = process.env.FACEBOOK_APP_SECRET;
    
    res.json({
      FACEBOOK_VERIFY_TOKEN: verifyToken ? `Set (${verifyToken.length} chars): ${verifyToken}` : "NOT SET - using default",
      FACEBOOK_PAGE_ACCESS_TOKEN: pageToken ? `Set (${pageToken.length} chars)` : "NOT SET",
      FACEBOOK_APP_SECRET: appSecret ? `Set (${appSecret.length} chars)` : "NOT SET",
    });
  });

  // Diagnostic endpoint to check Flutterwave key status
  app.get("/api/payment-status", async (req, res) => {
    const apiKey = process.env.FLUTTERWAVE_SECRET_KEY;
    
    if (!apiKey) {
      return res.json({
        status: "missing",
        message: "FLUTTERWAVE_SECRET_KEY is not set",
      });
    }

    const keyType = apiKey.startsWith("FLWSECK-") ? "configured" : "unknown";
    const maskedKey = apiKey.slice(0, 15) + "..." + apiKey.slice(-4);
    
    res.json({
      status: "configured",
      keyType,
      maskedKey,
      message: `Flutterwave API key is configured`,
    });
  });

  // Check Flutterwave wallet balance
  app.get("/api/wallet-balance", async (req, res) => {
    try {
      const balance = await flutterwaveService.getWalletBalance();
      
      if (!balance) {
        return res.status(500).json({ 
          error: "Unable to fetch wallet balance",
          message: "Please check your Flutterwave API key configuration"
        });
      }

      res.json(balance);
    } catch (error: any) {
      console.error("[Balance] Error fetching wallet balance:", error);
      res.status(500).json({ 
        error: "Failed to fetch wallet balance",
        message: error.message 
      });
    }
  });

  // Validate bank account using Flutterwave API
  app.post("/api/validate-account", async (req, res) => {
    const schema = z.object({
      bankName: z.string(),
      accountNumber: z.string().length(10),
    });

    try {
      const { bankName, accountNumber } = schema.parse(req.body);
      
      console.log(`[Validation] Attempting to validate account at ${bankName}`);

      const result = await flutterwaveService.validateBankAccount(accountNumber, bankName);
      
      console.log(`[Validation] Account validation successful`);

      res.json({ accountName: result.accountName, verified: true });
    } catch (error: any) {
      console.error("[Validation] Error details:", {
        message: error.message,
        status: error.response?.status,
        bankName: req.body.bankName
      });
      
      const errorMessage = error.message || "Unable to fetch account details";
      res.status(400).json({ error: errorMessage });
    }
  });

  // Create transaction
  app.post("/api/transactions", async (req, res) => {
    try {
      const data = insertTransactionSchema.parse(req.body);
      const transaction = await storage.createTransaction(data);

      res.json(transaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid transaction data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create transaction" });
      }
    }
  });

  // Process blockchain transaction and initiate Naira transfer
  app.post("/api/transactions/:id/process", async (req, res) => {
    console.log(`[Process] Received process request for transaction ${req.params.id}`);
    
    const schema = z.object({
      transactionHash: z.string(),
    });

    try {
      const { transactionHash } = schema.parse(req.body);
      console.log(`[Process] Transaction hash: ${transactionHash}`);
      
      const transaction = await storage.getTransaction(req.params.id);
      console.log(`[Process] Transaction found:`, {
        id: transaction?.id,
        status: transaction?.status,
        hasAccountName: !!transaction?.accountName,
        hasAccountNumber: !!transaction?.accountNumber,
        hasBankName: !!transaction?.bankName
      });

      if (!transaction) {
        return res.status(404).json({ error: "Transaction not found" });
      }

      if (transaction.status !== "pending") {
        return res.status(400).json({ error: "Transaction already processed" });
      }

      await storage.updateTransaction(req.params.id, {
        depositTransactionHash: transactionHash,
        status: "processing",
      });

      const ownerWalletAddress = process.env.OWNER_WALLET_ADDRESS;
      if (!ownerWalletAddress) {
        console.warn("OWNER_WALLET_ADDRESS not set - platform fees will not be collected");
      }

      // Process transfer immediately (no setTimeout to avoid losing callbacks on restart)
      try {
        console.log(`[Transfer] Starting transfer process for transaction ${req.params.id}`);
        
        if (!transaction.accountName || !transaction.accountNumber || !transaction.bankName) {
          console.error(`[Transfer] Missing account details - accountName: ${!!transaction.accountName}, accountNumber: ${!!transaction.accountNumber}, bankName: ${!!transaction.bankName}`);
          await storage.updateTransactionStatus(req.params.id, "failed");
          return res.status(400).json({ error: "Missing bank account details" });
        }

        const netNairaAmount = parseFloat(transaction.netNairaAmount);
        console.log(`[Transfer] Attempting to transfer ₦${netNairaAmount} to ${transaction.bankName}`);

        // Flutterwave minimum transfer amount is ₦100
        if (netNairaAmount < 100) {
          console.error(`[Transfer] Amount below Flutterwave minimum: ₦${netNairaAmount} < ₦100`);
          await storage.updateTransactionStatus(req.params.id, "failed");
          return res.status(400).json({ error: `Transfer amount (₦${netNairaAmount}) is below the minimum ₦100 required by Flutterwave` });
        }

        const transferResult = await flutterwaveService.initiateTransfer(
          transaction.accountNumber,
          transaction.accountName,
          transaction.bankName,
          netNairaAmount,
          `exbit-${transaction.id}`
        );

        console.log(`[Transfer] Transfer initiated, reference: ${transferResult.reference}, status: ${transferResult.status}`);

        // Map Flutterwave status to our transaction status
        const fwStatus = transferResult.status;
        let transactionStatus: "completed" | "processing" | "failed";
        let message: string;
        
        if (fwStatus === "SUCCESSFUL" || fwStatus === "success") {
          transactionStatus = "completed";
          message = "Transfer completed successfully";
          console.log(`[Transfer] Transaction ${req.params.id} marked as completed`);
        } else if (fwStatus === "FAILED" || fwStatus === "REJECTED" || fwStatus === "CANCELLED") {
          transactionStatus = "failed";
          message = `Transfer ${fwStatus.toLowerCase()}. Please contact support.`;
          console.error(`[Transfer] Transaction ${req.params.id} ${fwStatus}. Flutterwave status: ${fwStatus}`);
        } else {
          // NEW, PENDING, or other statuses
          transactionStatus = "processing";
          message = "Transfer initiated and processing. Money will arrive in 2-30 minutes depending on your bank.";
          console.warn(`[Transfer] Transaction ${req.params.id} kept in 'processing' state. Flutterwave status: ${fwStatus}`);
          console.warn(`[Transfer] ⚠️ If auto-approval is disabled, go to Flutterwave dashboard to approve this transfer`);
        }
        
        await storage.updateTransaction(req.params.id, {
          flutterwaveReference: transferResult.reference,
          status: transactionStatus,
        });
        
        res.json({ 
          success: true, 
          message,
          status: transactionStatus,
          reference: transferResult.reference
        });
      } catch (error: any) {
        console.error(`[Transfer] Failed to process Naira transfer for ${req.params.id}:`, {
          message: error.message,
          stack: error.stack,
          response: error.response?.data
        });
        await storage.updateTransactionStatus(req.params.id, "failed");
        return res.status(500).json({ 
          error: error.message || "Failed to process transfer",
          details: "Transfer to bank account failed. Please contact support with your transaction ID."
        });
      }
    } catch (error: any) {
      console.error("Transaction processing error:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid request data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to process transaction" });
      }
    }
  });

  // Get transaction by ID
  app.get("/api/transactions/:id", async (req, res) => {
    const transaction = await storage.getTransaction(req.params.id);
    
    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    res.json(transaction);
  });

  // Get all transactions
  app.get("/api/transactions", async (req, res) => {
    const transactions = await storage.getAllTransactions();
    res.json(transactions);
  });

  // Web Chat API Routes

  // Connect wallet and create/get session
  app.post("/api/web-chat/connect", async (req, res) => {
    try {
      const { walletAddress } = req.body;
      
      if (!walletAddress) {
        return res.status(400).json({ error: "Wallet address is required" });
      }

      const { webChatHandler } = await import("./services/webChatHandler");
      const result = await webChatHandler.connectWallet(walletAddress);
      
      res.json(result);
    } catch (error: any) {
      console.error("[WebChat] Error connecting wallet:", error);
      res.status(500).json({ error: error.message || "Failed to connect wallet" });
    }
  });

  // Send message in web chat
  app.post("/api/web-chat/message", async (req, res) => {
    try {
      const { sessionId, message } = req.body;
      
      if (!sessionId || !message) {
        return res.status(400).json({ error: "Session ID and message are required" });
      }

      const { webChatHandler } = await import("./services/webChatHandler");
      const result = await webChatHandler.handleMessage(sessionId, message);
      
      res.json({
        message: result.userMsg,
        assistantMessage: result.assistantMsg,
      });
    } catch (error: any) {
      console.error("[WebChat] Error handling message:", error);
      res.status(500).json({ error: error.message || "Failed to send message" });
    }
  });

  // Validate bank account for web chat
  app.post("/api/web-chat/validate-bank", async (req, res) => {
    try {
      const { sessionId, bankName, accountNumber } = req.body;
      
      if (!sessionId || !bankName || !accountNumber) {
        return res.status(400).json({ error: "Session ID, bank name, and account number are required" });
      }

      const { webChatHandler } = await import("./services/webChatHandler");
      const result = await webChatHandler.validateBankAccount(sessionId, bankName, accountNumber);
      
      res.json(result);
    } catch (error: any) {
      console.error("[WebChat] Error validating bank account:", error);
      res.status(500).json({ error: error.message || "Failed to validate bank account" });
    }
  });

  // Save bank details and return swap data
  app.post("/api/web-chat/save-bank-details", async (req, res) => {
    try {
      const { sessionId, bankName, accountNumber, accountName } = req.body;
      
      if (!sessionId || !bankName || !accountNumber || !accountName) {
        return res.status(400).json({ error: "All bank details are required" });
      }

      const { webChatHandler } = await import("./services/webChatHandler");
      const result = await webChatHandler.saveBankDetails(sessionId, bankName, accountNumber, accountName);
      
      res.json(result);
    } catch (error: any) {
      console.error("[WebChat] Error saving bank details:", error);
      res.status(500).json({ error: error.message || "Failed to save bank details" });
    }
  });

  // Process swap after transaction is signed
  app.post("/api/web-chat/process-swap", async (req, res) => {
    try {
      const { sessionId, txHash } = req.body;
      
      if (!sessionId || !txHash) {
        return res.status(400).json({ error: "Session ID and transaction hash are required" });
      }

      const { webChatHandler } = await import("./services/webChatHandler");
      const result = await webChatHandler.processSwap(sessionId, txHash);
      
      res.json(result);
    } catch (error: any) {
      console.error("[WebChat] Error processing swap:", error);
      res.status(500).json({ error: error.message || "Failed to process swap" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
