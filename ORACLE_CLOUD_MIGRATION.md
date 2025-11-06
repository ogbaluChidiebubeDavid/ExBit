# 🚀 ExBit Migration to Oracle Cloud (Free Forever)

## Why Oracle Cloud?
- ✅ **FREE Static IP** (never changes)
- ✅ **FREE Forever** (no trial expiration)
- ✅ **Unlimited Bandwidth**
- ✅ **Better Resources**: 2 AMD VMs or 4 ARM cores + 24GB RAM
- ✅ **Full Control** over your infrastructure

---

## 📋 Step 1: Create Oracle Cloud Account

1. **Go to:** https://www.oracle.com/cloud/free/
2. **Click:** "Start for free"
3. **Fill in details:**
   - Email, password
   - Home region: **Choose carefully** (can't change later - pick closest to Nigeria: UK London or Germany Frankfurt)
   - Credit card required (won't charge without explicit upgrade)
4. **Verify email** and complete setup
5. **Important:** Don't skip the verification email!

**Time: 5 minutes**

---

## 📋 Step 2: Create Ubuntu VM with Static IP

### 2.1 Create Virtual Cloud Network (VCN)

1. **Login to:** https://cloud.oracle.com
2. **Navigate:** Hamburger Menu → Networking → Virtual Cloud Networks
3. **Click:** "Start VCN Wizard"
4. **Select:** "Create VCN with Internet Connectivity"
5. **Configure:**
   - VCN Name: `exbit-vcn`
   - Compartment: (root)
   - Keep all other defaults
6. **Click:** "Next" → "Create"

**Time: 2 minutes**

---

### 2.2 Configure Security List (Open Firewall Ports)

1. **Navigate:** Networking → Virtual Cloud Networks → exbit-vcn
2. **Click:** Public Subnet → Default Security List
3. **Click:** "Add Ingress Rules"

**Add these rules one by one:**

**Rule 1: HTTP (Port 80)**
- Source CIDR: `0.0.0.0/0`
- IP Protocol: `TCP`
- Destination Port Range: `80`
- Description: `HTTP traffic`

**Rule 2: HTTPS (Port 443)**
- Source CIDR: `0.0.0.0/0`
- IP Protocol: `TCP`
- Destination Port Range: `443`
- Description: `HTTPS traffic`

**Rule 3: Custom App Port (Port 5000)**
- Source CIDR: `0.0.0.0/0`
- IP Protocol: `TCP`
- Destination Port Range: `5000`
- Description: `ExBit app`

*Note: SSH (port 22) is already open by default*

**Time: 3 minutes**

---

### 2.3 Create Compute Instance (VM)

1. **Navigate:** Hamburger Menu → Compute → Instances
2. **Click:** "Create Instance"
3. **Configure:**

   **Basic Info:**
   - Name: `exbit-server`
   - Compartment: (root)

   **Image and Shape:**
   - **Image:** Ubuntu 22.04 (click "Change Image" if needed)
   - **Shape:** Click "Change Shape"
     - Series: **Ampere** (ARM - more powerful and free)
     - Shape: **VM.Standard.A1.Flex**
     - OCPUs: **2** (or up to 4)
     - Memory: **12 GB** (or up to 24GB)
     - Click "Select Shape"

   **Networking:**
   - VCN: `exbit-vcn`
   - Subnet: Public Subnet
   - **CRITICAL:** ✅ Check "Assign a public IPv4 address"

   **SSH Keys:**
   - **Select:** "Generate a key pair for me"
   - **Download:** Save the private key (`.key` file) - YOU NEED THIS!
   - **Save the public key** too (optional, for backup)

4. **Click:** "Create"
5. **Wait:** 2-3 minutes for instance to provision
6. **Copy the Public IP Address** - This is your **STATIC IP!** 🎉

**Time: 5 minutes**

---

## 📋 Step 3: Connect to Your VM

### For Windows Users:

1. **Download:** PuTTY from https://www.putty.org/
2. **Convert key:**
   - Open PuTTYgen
   - Load your `.key` file
   - Click "Save private key" → save as `.ppk`
3. **Connect:**
   - Open PuTTY
   - Host: `ubuntu@YOUR_STATIC_IP`
   - Connection → SSH → Auth → Browse for your `.ppk` file
   - Click "Open"

### For Mac/Linux Users:

```bash
# Make key readable only by you
chmod 400 /path/to/your-key.key

# Connect via SSH
ssh -i /path/to/your-key.key ubuntu@YOUR_STATIC_IP
```

**You should now be logged into your Ubuntu server!** 🎊

**Time: 2 minutes**

---

## 📋 Step 4: Install Required Software

**Run these commands on your Oracle VM:**

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v20.x
npm --version

# Install PostgreSQL 15
sudo apt install -y postgresql postgresql-contrib

# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Install Nginx (web server)
sudo apt install -y nginx

# Install PM2 (process manager)
sudo npm install -g pm2

# Install Git
sudo apt install -y git
```

**Time: 5 minutes**

---

## 📋 Step 5: Set Up PostgreSQL Database

```bash
# Switch to postgres user
sudo -u postgres psql

# Inside PostgreSQL prompt, run these commands:
CREATE DATABASE exbit;
CREATE USER exbit_user WITH PASSWORD 'your_strong_password_here';
GRANT ALL PRIVILEGES ON DATABASE exbit TO exbit_user;
\q

# Exit PostgreSQL
```

**Save your database connection string:**
```
postgresql://exbit_user:your_strong_password_here@localhost:5432/exbit
```

**Time: 2 minutes**

---

## 📋 Step 6: Deploy ExBit Application

### 6.1 Clone Your Code

**Option A: From Replit (recommended)**

On your local computer:
1. Download your Replit project as ZIP
2. Extract it
3. Upload to VM using SCP:

```bash
# On your local computer
scp -i /path/to/your-key.key -r /path/to/exbit-folder ubuntu@YOUR_STATIC_IP:~/
```

**Option B: From Git (if you have it in GitHub)**

```bash
# On the VM
cd ~
git clone https://github.com/yourusername/exbit.git
cd exbit
```

**Time: 3 minutes**

---

### 6.2 Install Dependencies

```bash
cd ~/exbit  # or your project folder name
npm install
```

**Time: 2-3 minutes**

---

### 6.3 Set Up Environment Variables

```bash
# Create .env file
nano .env
```

**Paste this (update with YOUR values):**

```env
NODE_ENV=production
PORT=5000

# Database (use the connection string from Step 5)
DATABASE_URL=postgresql://exbit_user:your_strong_password_here@localhost:5432/exbit

# Flutterwave
FLUTTERWAVE_SECRET_KEY=your_flutterwave_secret_key_here

# Owner wallet
OWNER_WALLET_ADDRESS=0xbe3496154fec589f393717f730ae4b9ddda8564f
VITE_OWNER_WALLET_ADDRESS=0xbe3496154fec589f393717f730ae4b9ddda8564f

# Session
SESSION_SECRET=generate_a_random_32_character_string_here

# Postgres connection details (for drizzle)
PGHOST=localhost
PGPORT=5432
PGUSER=exbit_user
PGPASSWORD=your_strong_password_here
PGDATABASE=exbit
```

**Save:** Press `Ctrl+X`, then `Y`, then `Enter`

**Time: 2 minutes**

---

### 6.4 Run Database Migrations

```bash
# Push database schema
npm run db:push
```

**Time: 1 minute**

---

### 6.5 Build the Application

```bash
# Build frontend
npm run build
```

**Time: 1-2 minutes**

---

## 📋 Step 7: Start Application with PM2

```bash
# Start the app with PM2
pm2 start npm --name "exbit" -- run start

# Save PM2 configuration
pm2 save

# Set PM2 to start on boot
pm2 startup
# Copy and run the command it shows you
```

**Check if it's running:**
```bash
pm2 status
pm2 logs exbit --lines 50
```

**Test it:**
```bash
curl http://localhost:5000
```

**You should see HTML response!** ✅

**Time: 2 minutes**

---

## 📋 Step 8: Configure Nginx Reverse Proxy

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/exbit
```

**Paste this:**

```nginx
server {
    listen 80;
    server_name YOUR_STATIC_IP;  # Replace with your IP or domain

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Save:** Press `Ctrl+X`, then `Y`, then `Enter`

**Enable the site:**
```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/exbit /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

**Time: 2 minutes**

---

## 📋 Step 9: Configure Firewall (iptables)

```bash
# Allow HTTP
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT

# Allow HTTPS
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT

# Save rules
sudo netfilter-persistent save
```

**Time: 1 minute**

---

## 📋 Step 10: Whitelist IP in Flutterwave

1. **Copy your Oracle VM Static IP** from Step 2.3
2. **Go to:** https://dashboard.flutterwave.com
3. **Navigate:** Settings → API Settings → IP Whitelist
4. **Add IP:** YOUR_STATIC_IP
5. **Click:** SAVE!

**Time: 2 minutes**

---

## 📋 Step 11: Test Your Application!

1. **Open browser:** http://YOUR_STATIC_IP
2. **Connect wallet** (MetaMask)
3. **Try a swap:** 0.07 USDT on BSC
4. **Check if Naira arrives in your bank!** 💰

**If it works: 🎉 YOU'RE LIVE!**

---

## 🔒 Optional: Add SSL Certificate (HTTPS)

**Only if you have a domain name:**

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com
```

**Follow the prompts. It will auto-configure HTTPS!**

---

## 🛠️ Useful Commands

```bash
# Check app status
pm2 status

# View logs
pm2 logs exbit

# Restart app
pm2 restart exbit

# Stop app
pm2 stop exbit

# Check Nginx status
sudo systemctl status nginx

# Restart Nginx
sudo systemctl restart nginx

# Check database
sudo -u postgres psql -d exbit -c "SELECT COUNT(*) FROM transactions;"
```

---

## 📊 Your New Setup:

- **Static IP:** YOUR_STATIC_IP (never changes!)
- **Cost:** $0/month forever
- **Performance:** Better than Replit
- **Control:** Full root access
- **Bandwidth:** Unlimited

**Your ExBit platform is now production-ready!** 🚀

---

## 🆘 Troubleshooting

**App not starting?**
```bash
pm2 logs exbit --lines 100
```

**Can't access from browser?**
- Check firewall rules in Oracle Console (Step 2.2)
- Check iptables: `sudo iptables -L`
- Check Nginx: `sudo nginx -t`

**Database connection failed?**
- Check DATABASE_URL in .env
- Check PostgreSQL is running: `sudo systemctl status postgresql`

**Transfer still failing?**
- Verify IP whitelisted in Flutterwave
- Check actual outbound IP: `curl https://api.ipify.org`
- Test transfer: See below

---

## 🧪 Test Transfer Script

**Create this file on your VM:**

```bash
nano test-transfer.cjs
```

**Paste:**

```javascript
const https = require('https');
require('dotenv').config();

const testTransfer = () => {
  return new Promise((resolve) => {
    const data = JSON.stringify({
      account_bank: "100004",
      account_number: "8148463933",
      amount: 100,
      currency: "NGN",
      narration: "Oracle VM Test",
      reference: "oracle-" + Date.now(),
      debit_currency: "NGN"
    });

    const options = {
      hostname: 'api.flutterwave.com',
      path: '/v3/transfers',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(responseData) }));
    });
    req.on('error', resolve);
    req.write(data);
    req.end();
  });
};

(async () => {
  console.log('Testing from Oracle VM...\n');
  const result = await testTransfer();
  console.log('Status:', result.status);
  console.log(JSON.stringify(result.body, null, 2));
  
  if (result.status === 200) {
    console.log('\n✅ SUCCESS! Transfers working!');
  } else {
    console.log('\n❌ Failed - check IP whitelist');
  }
})();
```

**Run:**
```bash
node test-transfer.cjs
```

---

**Total Migration Time: ~45 minutes**

**You now have a FREE, production-ready platform with a STABLE IP!** 🎊
