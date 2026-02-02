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

## 🤖 **GitHub Actions CI/CD Setup**

### **Overview**

GitHub Actions akan otomatis build dan deploy backend Anda setiap kali push ke branch `main` atau `test-deployment`.

**Workflow:**

1. Push code → GitHub
2. GitHub Actions: Build Docker image
3. Push image ke GHCR (GitHub Container Registry)
4. SSH ke Debian server
5. Pull latest image
6. Deploy via docker compose

---

### **Step 1: Generate SSH Key untuk CI/CD**

```bash
# Di local machine
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github-actions-deploy

# Output:
# ~/.ssh/github-actions-deploy (private key) ← untuk GitHub Secret
# ~/.ssh/github-actions-deploy.pub (public key) ← untuk server
```

**Copy public key:**

```bash
cat ~/.ssh/github-actions-deploy.pub
```

---

### **Step 2: Add Public Key ke Debian Server**

```bash
# SSH ke Debian server
ssh root@your-debian-ip

# Add public key ke authorized_keys
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Paste public key (dari step sebelumnya)
nano ~/.ssh/authorized_keys
# Paste dan save (Ctrl+O, Enter, Ctrl+X)

chmod 600 ~/.ssh/authorized_keys
```

**Test SSH connection:**

```bash
# Di local machine
ssh -i ~/.ssh/github-actions-deploy root@your-debian-ip
# Should login without password!
```

---

### **Step 3: Setup GitHub Secrets**

Go to: **GitHub Repository → Settings → Secrets and variables → Actions → New repository secret**

Add these secrets:

#### **1. SERVER_HOST**

```
Name: SERVER_HOST
Value: 123.456.789.0  # IP atau domain Debian server Anda
```

#### **2. SERVER_USER**

```
Name: SERVER_USER
Value: root  # atau user dengan Docker access
```

#### **3. SERVER_PORT**

```
Name: SERVER_PORT
Value: 22  # SSH port (default 22)
```

#### **4. SSH_PRIVATE_KEY**

```bash
# Copy private key
cat ~/.ssh/github-actions-deploy

# Paste SELURUH output ke GitHub Secret
Name: SSH_PRIVATE_KEY
Value: (paste entire private key including BEGIN and END lines)
```

**PENTING:** Private key harus termasuk:

```
-----BEGIN OPENSSH PRIVATE KEY-----
...full key content...
-----END OPENSSH PRIVATE KEY-----
```

#### **5. GHCR_PAT (GitHub Personal Access Token)**

1. Go to: **GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)**
2. Click **Generate new token (classic)**
3. Name: `GHCR Deploy Token`
4. Select scopes:
   - ✅ `write:packages`
   - ✅ `read:packages`
   - ✅ `delete:packages`
5. Click **Generate token**
6. **Copy token** (won't be shown again!)
7. Add to GitHub Secrets:
   ```
   Name: GHCR_PAT
   Value: ghp_xxxxxxxxxxxxxxxxxxxxx
   ```

---

### **Step 4: Setup GHCR Login on Debian Server**

```bash
# SSH ke Debian server
ssh root@your-debian-ip

# Login ke GHCR
echo "YOUR_GHCR_PAT_TOKEN" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin

# Verify login
docker pull ghcr.io/YOUR_USERNAME/test-image || echo "Login successful!"
```

**Save credentials permanently:**

```bash
# Docker akan save credentials di ~/.docker/config.json
cat ~/.docker/config.json
# Should contain ghcr.io auth
```

---

### **Step 5: Update Environment Variables on Server**

```bash
# Di Debian server
cd /opt/pbjt-library/backend-library

# Edit .env untuk production
nano .env
```

**Add IMAGE_TAG variable:**

```env
# Docker Image Configuration (MUST be lowercase for GHCR compatibility!)
GITHUB_REPOSITORY=pbjt-library/backend-library-pbjt  # Use lowercase!
IMAGE_TAG=latest  # Will be overridden by CI/CD with SHA tag

# App Settings
APP_PORT=3000
APP_ENV=production

# ... (rest of your .env)
```

---

### **Step 6: Verify GitHub Actions Workflow**

File `.github/workflows/ci-cd.yml` sudah ada dan configured.

**Review key sections:**

```yaml
# Build stage
- name: Build and push Docker image
  uses: docker/build-push-action@v5
  with:
    push: true
    tags: |
      ghcr.io/${{ github.repository }}:main-${{ github.sha }}
      ghcr.io/${{ github.repository }}:latest

# Deploy stage
- name: Deploy to server
  uses: appleboy/ssh-action@v1.0.0
  with:
    host: ${{ secrets.SERVER_HOST }}
    username: ${{ secrets.SERVER_USER }}
    key: ${{ secrets.SSH_PRIVATE_KEY }}
    port: ${{ secrets.SERVER_PORT }}
    script: |
      cd /opt/pbjt-library/backend-library
      echo "${{ secrets.GHCR_PAT }}" | docker login ghcr.io -u ${{ github.actor }} --password-stdin
      IMAGE_TAG=main-${{ github.sha }} docker compose pull backend
      IMAGE_TAG=main-${{ github.sha }} docker compose up -d backend
```

---

### **Step 7: Test First Deployment**

```bash
# Di local machine
git add .
git commit -m "feat: test CI/CD pipeline"
git push origin main
```

**Monitor deployment:**

1. Go to: **GitHub → Actions tab**
2. Watch workflow run
3. Should see:
   - ✅ Build job (type check, lint, build image)
   - ✅ Deploy job (SSH, pull, deploy)

**Expected duration:** 3-5 minutes

---

### **Step 8: Verify Deployment on Server**

```bash
# SSH ke Debian server
ssh root@your-debian-ip

# Check containers
docker compose ps

# Expected output:
# NAME              STATUS         PORTS
# pbjt-postgres     Up (healthy)   5432->5432
# pbjt-redis        Up (healthy)   6379->6379
# pbjt-backend      Up (healthy)   3000->3000

# Check backend logs
docker compose logs -f backend

# Test health endpoint
curl http://localhost:3000/health
```

---

### **Troubleshooting CI/CD**

#### **Error: Permission denied (publickey)**

```bash
# Solution: Check SSH_PRIVATE_KEY in GitHub Secrets
# Must include -----BEGIN and -----END lines
# Test locally:
ssh -i ~/.ssh/github-actions-deploy root@your-server-ip
```

#### **Error: Cannot pull image from GHCR**

```bash
# Solution 1: Re-login to GHCR on server
echo "YOUR_PAT" | docker login ghcr.io -u username --password-stdin

# Solution 2: Check GHCR_PAT has correct permissions
# Go to GitHub → Settings → Developer settings → PAT
# Verify write:packages, read:packages are checked
```

#### **Error: Docker compose up fails**

```bash
# Solution: Check logs on server
ssh root@your-server
cd /opt/pbjt-library/backend-library
docker compose logs

# Common issues:
# - .env file missing variables
# - Database not initialized (run migration)
# - Port 3000 already in use
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

## 🗄️ **Database Initialization & Migration**

### **Initial Database Setup**

```bash
# SSH ke Debian server
ssh root@your-debian-ip

# Access PostgreSQL container
docker exec -it pbjt-postgres psql -U pbjt_app -d pbjt_library
```

### **Run Database Schema**

```bash
# Option 1: From local schema file
cd /opt/pbjt-library/backend-library
docker exec -i pbjt-postgres psql -U pbjt_app -d pbjt_library < scripts/migrations/backup_schema_only.sql

# Option 2: Direct psql
docker exec -it pbjt-postgres psql -U pbjt_app -d pbjt_library -f /app/scripts/migrations/backup_schema_only.sql
```

### **Verify Database Setup**

```sql
-- Check tables
\dt

-- Expected tables:
-- admins
-- book_catalog
-- book_inventory
-- members
-- loans
-- categories

-- Verify admin table has token_version column
\d admins

-- Should show:
-- id | uuid | primary key
-- username | text | not null
-- password | text | not null
-- token_version | integer | default 0
-- created_at | timestamp
```

### **Create Initial Admin User**

```bash
# Generate password hash (run di local dengan bun)
bun -e "console.log(await Bun.password.hash('YourSecurePassword123!', {algorithm: 'bcrypt', cost: 10}))"

# Copy the hash output, then in psql:
docker exec -it pbjt-postgres psql -U pbjt_app -d pbjt_library
```

```sql
-- Insert admin user
INSERT INTO admins (username, password, token_version)
VALUES ('admin', '$2b$10$yourHashedPasswordHere', 0);

-- Verify
SELECT id, username, token_version, created_at FROM admins;
```

### **Database Backup Script**

Create `/opt/pbjt-library/scripts/backup-database.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/opt/pbjt-library/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup PostgreSQL
docker exec pbjt-postgres pg_dump -U pbjt_app pbjt_library | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Keep only last 7 days
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +7 -delete

echo "✅ Database backup completed: db_$DATE.sql.gz"
```

```bash
# Make executable
chmod +x /opt/pbjt-library/scripts/backup-database.sh

# Test backup
/opt/pbjt-library/scripts/backup-database.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add line:
0 2 * * * /opt/pbjt-library/scripts/backup-database.sh >> /var/log/pbjt-backup.log 2>&1
```

### **Database Restore (If Needed)**

```bash
# List available backups
ls -lh /opt/pbjt-library/backups/

# Restore from backup
gunzip < /opt/pbjt-library/backups/db_20260120_020000.sql.gz | \
  docker exec -i pbjt-postgres psql -U pbjt_app -d pbjt_library

# Verify restore
docker exec -it pbjt-postgres psql -U pbjt_app -d pbjt_library -c "SELECT COUNT(*) FROM admins;"
```

---

## 🔄 **Rollback Procedure**

### **Emergency Rollback (If Deployment Fails)**

#### **Option 1: Rollback Docker Image**

```bash
# SSH ke Debian server
ssh root@your-debian-ip
cd /opt/pbjt-library/backend-library

# Check image history
docker images | grep pbjt-library

# Rollback to previous image
IMAGE_TAG=main-PREVIOUS_SHA docker compose up -d backend

# Verify
docker compose ps
curl http://localhost:3000/health
```

#### **Option 2: Git Rollback + Rebuild**

```bash
# On GitHub, find the previous working commit SHA
# Then on server:
cd /opt/pbjt-library/backend-library

# Backup current code
cp -r . ../backend-library-backup-$(date +%Y%m%d)

# Reset to previous commit
git fetch origin
git reset --hard PREVIOUS_COMMIT_SHA

# Rebuild and deploy
docker compose down
docker compose up -d --build

# Verify
docker compose logs -f backend
```

#### **Option 3: Database Rollback**

```bash
# If migration broke database, restore from backup
gunzip < /opt/pbjt-library/backups/db_BEFORE_MIGRATION.sql.gz | \
  docker exec -i pbjt-postgres psql -U pbjt_app -d pbjt_library

# Restart backend
docker compose restart backend
```

### **Rollback Checklist**

- [ ] Backup current database before rollback
- [ ] Note current commit SHA for reference
- [ ] Stop backend container
- [ ] Restore database (if needed)
- [ ] Deploy previous image/code
- [ ] Verify health check passes
- [ ] Test critical API endpoints
- [ ] Monitor logs for errors
- [ ] Update team about rollback

---

## 🗄️ **Database Initialization** (Legacy - use above instead)

### 1. Access PostgreSQL Container

```bash
docker exec -it pbjt-postgres psql -U pbjt_app -d pbjt_library
```

### 2. Run Migrations

```sql
-- Your database schema here
-- Run schema.sql for complete database setup

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
    "redis": { "status": "healthy", "connected": true },
    "database": { "status": "healthy", "connected": true }
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
