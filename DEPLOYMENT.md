# 🚀 PBJT Library Backend - Production Deployment Guide

**Target Environment:** Proxmox VE > Debian VM > Docker

---

## 📋 **Table of Contents**

1. [Prerequisites](#prerequisites)
2. [Server Preparation](#server-preparation)
3. [Docker Setup](#docker-setup)
4. [Nginx Reverse Proxy](#nginx-reverse-proxy)
5. [Swagger Protection](#swagger-protection)
6. [Tailscale Integration](#tailscale-integration)
7. [Database Initialization](#database-initialization)
8. [Security Hardening](#security-hardening)
9. [Backup & Monitoring](#backup--monitoring)
10. [Troubleshooting](#troubleshooting)

---

## 🔧 **Prerequisites**

### On Proxmox Host:
- Proxmox VE 8.x installed
- Debian 12 LXC container or VM created
- At least 2GB RAM, 20GB storage allocated

### In Debian Container/VM:
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y \
  curl \
  wget \
  git \
  ufw \
  fail2ban \
  htop
```

---

## 🐳 **Docker Setup**

### 1. Install Docker & Docker Compose

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh

# Add user to docker group
sudo usermod -aG docker $USER

# Enable Docker service
sudo systemctl enable docker
sudo systemctl start docker

# Verify installation
docker --version
docker compose version
```

### 2. Clone Repository

```bash
# Create application directory
sudo mkdir -p /opt/pbjt-library
sudo chown $USER:$USER /opt/pbjt-library
cd /opt/pbjt-library

# Clone from GitHub
git clone https://github.com/YOUR_USERNAME/backend-library.git
cd backend-library
```

### 3. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit production environment
nano .env
```

**Production `.env` configuration:**

```env
# App Settings
APP_PORT=3000
APP_ENV=production

# Database Settings
DB_HOST=postgres  # Docker service name
DB_PORT=5432
DB_NAME=pbjt_library
DB_USER=pbjt_app
DB_PASSWORD=STRONG_DATABASE_PASSWORD_HERE  # Change this!

# JWT Settings  
JWT_SECRET=GENERATE_WITH_openssl_rand_base64_32  # Change this!
JWT_EXPIRES_IN=7d

# Security Settings
ALLOWED_ORIGINS=https://yourdomain.com
RATE_LIMIT_DURATION=60000
RATE_LIMIT_MAX=100
RATE_LIMIT_AUTH_MAX=5
ENABLE_THROTTLE=true

# Redis Settings
REDIS_HOST=redis  # Docker service name
REDIS_PORT=6379
REDIS_PASSWORD=GENERATE_WITH_openssl_rand_base64_24  # Change this!
REDIS_DB=0

# Swagger/API Docs
SWAGGER_ENABLED=true
SWAGGER_USERNAME=admin
SWAGGER_PASSWORD=STRONG_SWAGGER_PASSWORD  # Change this!
```

### 4. Start Services

```bash
# Build and start containers
docker compose up -d

# Check container status
docker compose ps

# View logs
docker compose logs -f backend
```

---

## 🔒 **Nginx Reverse Proxy**

### 1. Install Nginx

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

### 2. Configure Backend Proxy

Create `/etc/nginx/sites-available/pbjt-backend`:

```nginx
# Upstream backend
upstream pbjt_backend {
    server 127.0.0.1:3000;
    keepalive 64;
}

# HTTP - Redirect to HTTPS
server {
    listen 80;
    server_name api.yourdomain.com;
    
    # Let's Encrypt ACME challenge
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    # Redirect all other traffic to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;
    
    # SSL Certificates (from Certbot)
    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;
    
    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    
    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000" always;
    
    # Backend API
    location / {
        proxy_pass http://pbjt_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Health Check (no logging)
    location /health {
        proxy_pass http://pbjt_backend/health;
        access_log off;
    }
    
    # Swagger Protection (Basic Auth)
    location /pbjt-library-api {
        auth_basic "API Documentation";
        auth_basic_user_file /etc/nginx/.htpasswd;
        
        proxy_pass http://pbjt_backend/pbjt-library-api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 3. Create Basic Auth for Swagger

```bash
# Install htpasswd tool
sudo apt install -y apache2-utils

# Create password file (username: admin)
sudo htpasswd -c /etc/nginx/.htpasswd admin
# Enter your Swagger password when prompted

# Set permissions
sudo chmod 640 /etc/nginx/.htpasswd
sudo chown root:www-data /etc/nginx/.htpasswd
```

### 4. Enable Site & SSL

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/pbjt-backend /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Get SSL certificate
sudo certbot --nginx -d api.yourdomain.com

# Reload Nginx
sudo systemctl reload nginx
```

---

## 🌐 **Tailscale Integration**

### 1. Install Tailscale

```bash
# Install Tailscale
curl -fsSL https://tailscale.com/install.sh | sh

# Start with SSH enabled
sudo tailscale up --ssh --advertise-tags=tag:server

# Get machine name
tailscale status
```

### 2. Access via Tailscale

```bash
# SSH via Tailscale (from any device on your tailnet)
ssh user@your-debian-server

# Optional: Setup Tailscale Funnel for public access
sudo tailscale funnel 443
```

---

## 🗄️ **Database Initialization**

### 1. Access PostgreSQL Container

```bash
docker exec -it pbjt-postgres psql -U pbjt_app -d pbjt_library
```

### 2. Run Migrations

```sql
-- Your database schema here
-- Or use migration tool like Prisma

-- Example: Create tables
CREATE TABLE IF NOT EXISTS books_catalog (...);
CREATE TABLE IF NOT EXISTS book_inventory (...);
-- etc.
```

### 3. Verify Database

```bash
# Check tables
docker exec -it pbjt-postgres psql -U pbjt_app -d pbjt_library -c "\dt"

# Check Redis
docker exec -it pbjt-redis redis-cli -a YOUR_REDIS_PASSWORD ping
```

---

## 🔐 **Security Hardening**

### 1. Firewall (UFW)

```bash
# Enable UFW
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow Tailscale
sudo ufw allow 41641/udp

# Enable firewall
sudo ufw enable
sudo ufw status
```

### 2. Fail2Ban

```bash
# Install Fail2Ban
sudo apt install -y fail2ban

# Configure
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
sudo nano /etc/fail2ban/jail.local

# Add Nginx protection
[nginx-limit-req]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log

# Restart
sudo systemctl restart fail2ban
```

### 3. Auto-Updates

```bash
# Install unattended-upgrades
sudo apt install -y unattended-upgrades

# Enable
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

---

## 💾 **Backup & Monitoring**

### 1. Database Backups

Create `/opt/pbjt-library/backup.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/opt/pbjt-library/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup PostgreSQL
docker exec pbjt-postgres pg_dump -U pbjt_app pbjt_library | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Backup Redis
docker exec pbjt-redis redis-cli -a $REDIS_PASSWORD SAVE
docker cp pbjt-redis:/data/dump.rdb $BACKUP_DIR/redis_$DATE.rdb

# Keep only last 7 days
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +7 -delete
find $BACKUP_DIR -name "redis_*.rdb" -mtime +7 -delete

echo "Backup completed: $DATE"
```

```bash
# Make executable
chmod +x /opt/pbjt-library/backup.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add line:
0 2 * * * /opt/pbjt-library/backup.sh >> /var/log/pbjt-backup.log 2>&1
```

### 2. Monitoring

```bash
# View backend logs
docker compose logs -f backend

# View all services
docker compose logs -f

# Check resource usage
docker stats

# Check health
curl http://localhost:3000/health
```

---

## ❓ **Troubleshooting**

### Container Won't Start

```bash
# Check logs
docker compose logs backend

# Rebuild containers
docker compose down
docker compose up --build -d
```

### Database Connection Failed

```bash
# Verify database is running
docker compose ps postgres

# Check database logs
docker compose logs postgres

# Test connection
docker exec -it pbjt-postgres psql -U pbjt_app -d pbjt_library
```

### Redis Connection Issues

```bash
# Check Redis logs
docker compose logs redis

# Test Redis
docker exec -it pbjt-redis redis-cli -a YOUR_PASSWORD ping
```

### Nginx Issues

```bash
# Test configuration
sudo nginx -t

# Check error logs
sudo tail -f /var/log/nginx/error.log
```

---

## 📊 **Health Check**

Visit: `https://api.yourdomain.com/health`

Expected response:
```json
{
  "status": "healthy",
  "services": {
    "redis": {"status": "healthy", "connected": true},
    "database": {"status": "healthy", "connected": true}
  }
}
```

---

## 🎯 **Quick Commands**

```bash
# Start all services
cd /opt/pbjt-library/backend-library && docker compose up -d

# Stop all services
docker compose down

# Restart backend only
docker compose restart backend

# View logs
docker compose logs -f backend

# Update from Git
git pull && docker compose up -d --build

# Backup now
/opt/pbjt-library/backup.sh
```

---

**Deployment Complete! 🎉**

Your PBJT Library Backend is now running securely on Proxmox + Debian + Docker with Nginx reverse proxy and Tailscale access.
