#!/bin/bash

# Exit on error
set -e

# Update system
sudo apt-get update
sudo apt-get upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Nginx
sudo apt-get install -y nginx

# Install Certbot for SSL
sudo apt-get install -y certbot python3-certbot-nginx

# Create webadmin user
sudo useradd -m -s /bin/bash webadmin || true
sudo mkdir -p /var/www/215webconnect
sudo chown -R webadmin:webadmin /var/www/215webconnect

# Install PM2 globally
sudo npm install -g pm2

# Setup firewall
sudo apt-get install -y ufw
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# Install fail2ban for security
sudo apt-get install -y fail2ban
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

echo "Server setup complete!"
