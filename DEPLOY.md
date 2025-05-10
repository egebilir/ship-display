# Deployment Guide

## Prerequisites
- Node.js (v14 or higher)
- MongoDB
- Nginx (for reverse proxy)
- PM2 (for process management)

## Server Setup

1. Install Node.js and MongoDB:
```bash
# Update package list
sudo apt update

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt install -y nodejs

# Install MongoDB
sudo apt install -y mongodb
```

2. Install PM2 globally:
```bash
sudo npm install -g pm2
```

3. Install Nginx:
```bash
sudo apt install -y nginx
```

## Application Deployment

1. Clone the repository:
```bash
git clone <your-repo-url>
cd ship-display
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start the application with PM2:
```bash
pm2 start server.js --name "ship-display"
pm2 save
```

## Nginx Configuration

1. Create a new Nginx configuration:
```bash
sudo nano /etc/nginx/sites-available/ship-display
```

2. Add the following configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

3. Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/ship-display /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## SSL Setup (Optional but Recommended)

1. Install Certbot:
```bash
sudo apt install -y certbot python3-certbot-nginx
```

2. Obtain SSL certificate:
```bash
sudo certbot --nginx -d your-domain.com
```

## Maintenance

- View logs: `pm2 logs ship-display`
- Restart application: `pm2 restart ship-display`
- Monitor application: `pm2 monit`

## Troubleshooting

1. Check application logs:
```bash
pm2 logs ship-display
```

2. Check Nginx logs:
```bash
sudo tail -f /var/log/nginx/error.log
```

3. Check MongoDB status:
```bash
sudo systemctl status mongodb
``` 