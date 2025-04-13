#!/bin/bash

# Exit on error
set -e

# Configuration
DEPLOY_PATH=/var/www/215webconnect
NGINX_CONF=/etc/nginx/sites-available/215webconnect
DOMAIN=215webconnect.com

# Copy files to server
echo "Copying files..."
sudo cp -r ../* $DEPLOY_PATH/
sudo chown -R webadmin:webadmin $DEPLOY_PATH

# Install dependencies
echo "Installing dependencies..."
cd $DEPLOY_PATH
npm install --production

# Setup Nginx configuration
echo "Configuring Nginx..."
sudo tee $NGINX_CONF > /dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    
    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;

    # SSL configuration will be added by Certbot

    root $DEPLOY_PATH/public;
    index index.html;

    # Security headers
    add_header X-Frame-Options "DENY";
    add_header X-Content-Type-Options "nosniff";
    add_header X-XSS-Protection "1; mode=block";
    add_header Content-Security-Policy "default-src 'self';";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Deny access to . files
    location ~ /\. {
        deny all;
    }
}
EOF

# Enable the site
sudo ln -sf $NGINX_CONF /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Setup SSL with Let's Encrypt
echo "Setting up SSL..."
sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@215webconnect.com

# Setup systemd service
echo "Setting up systemd service..."
sudo cp 215webconnect.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable 215webconnect
sudo systemctl start 215webconnect

# Restart Nginx
echo "Restarting Nginx..."
sudo systemctl restart nginx

echo "Deployment complete! Site should be live at https://$DOMAIN"
