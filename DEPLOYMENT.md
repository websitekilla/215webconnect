# Deployment Guide for 215webconnect.com

## Prerequisites
1. Node.js >= 14.0.0
2. Domain name (215webconnect.com) already registered
3. SSL certificate for HTTPS
4. Production server (e.g., AWS EC2, DigitalOcean Droplet)

## Environment Variables
Set these in your production environment:
```bash
# Required
export NODE_ENV=production
export PORT=3000  # or 80/443 for production
export SESSION_SECRET=your-very-long-random-string
export ADMIN_USERNAME=your-admin-username
export ADMIN_PASSWORD=your-secure-password

# Optional
export DOMAIN=215webconnect.com
```

## Production Setup Steps

1. **Install Node.js on your server**
```bash
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt-get install -y nodejs
```

2. **Clone and Setup Application**
```bash
git clone [your-repository]
cd work-website
npm install --production
```

3. **Configure Nginx as Reverse Proxy**
```nginx
server {
    listen 80;
    server_name 215webconnect.com www.215webconnect.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name 215webconnect.com www.215webconnect.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

4. **Setup SSL with Let's Encrypt**
```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d 215webconnect.com -d www.215webconnect.com
```

5. **Start Application**
```bash
# Install PM2 for process management
npm install -g pm2

# Start the application
pm2 start server.js --name "215webconnect"

# Ensure it starts on system reboot
pm2 startup
pm2 save
```

## Security Considerations
1. All production passwords should be strong and unique
2. Session secret should be a long random string
3. Admin credentials should be changed from defaults
4. Keep Node.js and npm packages updated
5. Regular security audits with `npm audit`
6. Configure firewall (UFW) to only allow necessary ports
7. Set up fail2ban for additional brute force protection

## Monitoring
1. Use PM2 for process monitoring
2. Set up application logging
3. Configure server monitoring (e.g., DataDog, New Relic)
4. Regular backup strategy for user data

## Maintenance
1. Regular security updates
2. Database backups (when implemented)
3. Log rotation
4. SSL certificate renewal

## Troubleshooting
1. Check application logs: `pm2 logs 215webconnect`
2. Check nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Verify SSL: `sudo certbot certificates`
4. Check process status: `pm2 status`
