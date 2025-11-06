#!/bin/bash

# ExBit Oracle Cloud Deployment Script
# Run this script AFTER you've SSH'd into your Oracle VM

set -e  # Exit on error

echo "🚀 ExBit Deployment Script for Oracle Cloud"
echo "============================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
    print_error "Please do not run as root"
    exit 1
fi

print_info "Step 1: Updating system..."
sudo apt update && sudo apt upgrade -y
print_success "System updated"

print_info "Step 2: Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
print_success "Node.js installed: $(node --version)"

print_info "Step 3: Installing PostgreSQL..."
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
print_success "PostgreSQL installed and started"

print_info "Step 4: Installing Nginx..."
sudo apt install -y nginx
print_success "Nginx installed"

print_info "Step 5: Installing PM2..."
sudo npm install -g pm2
print_success "PM2 installed"

print_info "Step 6: Installing Git..."
sudo apt install -y git
print_success "Git installed"

print_info "Step 7: Setting up PostgreSQL database..."
read -p "Enter database password for exbit_user: " DB_PASSWORD
sudo -u postgres psql <<EOF
CREATE DATABASE exbit;
CREATE USER exbit_user WITH PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE exbit TO exbit_user;
\q
EOF
print_success "Database created"

print_info "Step 8: Creating .env file..."
cat > .env <<EOF
NODE_ENV=production
PORT=5000

# Database
DATABASE_URL=postgresql://exbit_user:$DB_PASSWORD@localhost:5432/exbit

# Flutterwave (REPLACE WITH YOUR KEY)
FLUTTERWAVE_SECRET_KEY=REPLACE_WITH_YOUR_KEY

# Owner wallet
OWNER_WALLET_ADDRESS=0xbe3496154fec589f393717f730ae4b9ddda8564f
VITE_OWNER_WALLET_ADDRESS=0xbe3496154fec589f393717f730ae4b9ddda8564f

# Session (REPLACE WITH RANDOM STRING)
SESSION_SECRET=REPLACE_WITH_RANDOM_32_CHAR_STRING

# Postgres
PGHOST=localhost
PGPORT=5432
PGUSER=exbit_user
PGPASSWORD=$DB_PASSWORD
PGDATABASE=exbit
EOF
print_success ".env file created"

print_info "⚠️  IMPORTANT: Edit .env and add your Flutterwave key and session secret!"
read -p "Press Enter after you've edited .env..."

print_info "Step 9: Installing dependencies..."
npm install
print_success "Dependencies installed"

print_info "Step 10: Running database migrations..."
npm run db:push
print_success "Database schema created"

print_info "Step 11: Building application..."
npm run build
print_success "Application built"

print_info "Step 12: Starting application with PM2..."
pm2 start npm --name "exbit" -- run start
pm2 save
pm2 startup
print_success "Application started"

# Get the server IP
SERVER_IP=$(curl -s https://api.ipify.org)
print_success "Your server IP: $SERVER_IP"

print_info "Step 13: Configuring Nginx..."
sudo tee /etc/nginx/sites-available/exbit > /dev/null <<EOF
server {
    listen 80;
    server_name $SERVER_IP;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/exbit /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx
print_success "Nginx configured"

print_info "Step 14: Configuring firewall..."
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo apt install -y iptables-persistent
sudo netfilter-persistent save
print_success "Firewall configured"

echo ""
echo "============================================"
print_success "🎉 Deployment Complete!"
echo "============================================"
echo ""
print_info "Your ExBit app is now live at: http://$SERVER_IP"
echo ""
print_info "Next steps:"
echo "1. Whitelist this IP in Flutterwave: $SERVER_IP"
echo "2. Visit http://$SERVER_IP in your browser"
echo "3. Test a swap transaction"
echo ""
print_info "Useful commands:"
echo "  - View logs: pm2 logs exbit"
echo "  - Restart app: pm2 restart exbit"
echo "  - Check status: pm2 status"
echo ""
