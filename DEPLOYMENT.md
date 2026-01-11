# 🚀 Deployment Guide - PBJT Backend Library

Panduan lengkap untuk deployment backend-library ke Debian server menggunakan Docker dan GitHub Actions CI/CD.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Server Setup](#server-setup)
- [GitHub Configuration](#github-configuration)
- [Local Development](#local-development)
- [Production Deployment](#production-deployment)
- [Maintenance](#maintenance)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Local Development
- [Bun](https://bun.sh/) >= 1.0
- [Docker](https://www.docker.com/) >= 24.0
- [Docker Compose](https://docs.docker.com/compose/) >= 2.20

### Production Server (Debian)
- Debian 11/12 or Ubuntu 22.04+
- Docker Engine >= 24.0
- Docker Compose >= 2.20
- Minimum 1GB RAM, 2GB recommended
- 10GB free disk space
- [Tailscale](https://tailscale.com/) untuk secure SSH access

## Server Setup

### 1. Install Docker on Debian Server

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y ca-certificates curl gnupg

# Add Docker's official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Verify installation
docker --version
docker compose version
```

### 2. Install Tailscale

```bash
# Install Tailscale
curl -fsSL https://tailscale.com/install.sh | sh

# Start Tailscale
sudo tailscale up

# Get your Tailscale IP
tailscale ip -4
```

### 3. Setup Project Directory

```bash
# Create project directory
mkdir -p ~/pbjt-library/backend-library
cd ~/pbjt-library/backend-library

# Create backups directory
mkdir -p backups
```

### 4. Setup SSH Key Authentication

Pada local machine:

```bash
# Generate SSH key (jika belum ada)
ssh-keygen -t ed25519 -C "github-actions@pbjt-library"

# Copy public key ke server
ssh-copy-id user@your-tailscale-ip
```

## GitHub Configuration

### 1. Enable GitHub Container Registry

1. Go to GitHub repository settings
2. Navigate to **Actions** > **General**
3. Scroll to **Workflow permissions**
4. Select **Read and write permissions**
5. Check **Allow GitHub Actions to create and approve pull requests**
6. Click **Save**

### 2. Configure GitHub Secrets

Go to repository **Settings** > **Secrets and variables** > **Actions** dan tambahkan secrets berikut:

#### Required Secrets

| Secret Name | Description | Example |
|------------|-------------|---------|
| `TAILSCALE_OAUTH_CLIENT_ID` | Tailscale OAuth Client ID | `kxxx...` |
| `TAILSCALE_OAUTH_SECRET` | Tailscale OAuth Secret | `tskey-client-xxx...` |
| `SSH_PRIVATE_KEY` | Private SSH key untuk akses server | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `SSH_HOST` | Tailscale IP atau hostname server | `100.x.x.x` |
| `SSH_USER` | Username SSH | `debian` atau `ubuntu` |
| `DB_NAME` | Nama database PostgreSQL | `library_db` |
| `DB_USER` | Username database | `postgres` |
| `DB_PASSWORD` | Password database (secure!) | `your-secure-password` |
| `JWT_SECRET` | Secret key untuk JWT | Generate dengan: `openssl rand -base64 32` |
| `APP_PORT` | Port aplikasi | `3000` |

#### Optional Secrets

| Secret Name | Description | Default |
|------------|-------------|---------|
| `PRODUCTION_URL` | URL production untuk environment | `http://your-server:3000` |

### 3. Setup Tailscale OAuth

1. Go to [Tailscale Admin Console](https://login.tailscale.com/admin/settings/oauth)
2. Generate OAuth Client
3. Set tags: `tag:ci`
4. Copy Client ID dan Secret ke GitHub Secrets

## Local Development

### 1. Clone Repository

```bash
git clone https://github.com/your-username/backend-library.git
cd backend-library
```

### 2. Install Dependencies

```bash
bun install
```

### 3. Setup Environment

```bash
cp .env.example .env
# Edit .env dengan konfigurasi local Anda
```

### 4. Run with Docker Compose

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f backend

# Stop services
docker compose down
```

### 5. Access Application

- **API**: http://localhost:3000
- **Swagger Docs**: http://localhost:3000/pbjt-library-api
- **PostgreSQL**: localhost:5432

## Production Deployment

### Automated Deployment (Recommended)

Deployment otomatis akan berjalan setiap kali ada push ke branch `main`:

```bash
git add .
git commit -m "feat: your changes"
git push origin main
```

GitHub Actions akan:
1. ✅ Build Docker image (multi-platform: amd64, arm64)
2. ✅ Push image ke GitHub Container Registry
3. ✅ Connect ke server via Tailscale
4. ✅ Backup database
5. ✅ Deploy container baru
6. ✅ Run health checks
7. ✅ Rollback otomatis jika gagal

### Manual Deployment

Jika ingin deploy manual:

```bash
# SSH ke server via Tailscale
ssh user@your-tailscale-ip

# Navigate to project directory
cd ~/pbjt-library/backend-library

# Pull latest changes
git pull origin main

# Create .env.production
cp .env.production.example .env.production
# Edit .env.production dengan nilai production

# Run deployment script
chmod +x scripts/*.sh
./scripts/deploy.sh
```

### First Time Deployment

Untuk deployment pertama kali:

```bash
# SSH ke server
ssh user@your-tailscale-ip

# Clone repository
git clone https://github.com/your-username/backend-library.git ~/pbjt-library/backend-library
cd ~/pbjt-library/backend-library

# Create .env.production
cp .env.production.example .env.production
nano .env.production  # Edit dengan nilai production

# Login ke GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Pull image
docker pull ghcr.io/your-username/backend-library:latest

# Initialize database
docker compose -f docker-compose.prod.yml up -d postgres
sleep 10
docker exec pbjt-postgres-prod psql -U postgres -d library_db -f /docker-entrypoint-initdb.d/01-schema.sql

# Start all services
docker compose -f docker-compose.prod.yml up -d

# Verify
./scripts/health-check.sh
```

## Maintenance

### Database Backup

Backup otomatis dilakukan sebelum setiap deployment. Untuk backup manual:

```bash
# SSH ke server
ssh user@your-tailscale-ip
cd ~/pbjt-library/backend-library

# Run backup script
./scripts/backup-db.sh

# Backups disimpan di ./backups/ dengan retention 7 hari
```

### Database Restore

```bash
# List available backups
ls -lh backups/

# Restore dari backup tertentu
gunzip -c backups/backup_20260111_230000.sql.gz | \
  docker exec -i pbjt-postgres-prod psql -U postgres -d library_db
```

### View Logs

```bash
# View all logs
docker compose -f docker-compose.prod.yml logs -f

# View backend logs only
docker compose -f docker-compose.prod.yml logs -f backend

# View database logs
docker compose -f docker-compose.prod.yml logs -f postgres
```

### Update Application

```bash
# Trigger deployment via git push
git push origin main

# Atau manual pull dan restart
ssh user@your-tailscale-ip
cd ~/pbjt-library/backend-library
./scripts/deploy.sh
```

### Rollback

Jika terjadi masalah setelah deployment:

```bash
ssh user@your-tailscale-ip
cd ~/pbjt-library/backend-library
./scripts/rollback.sh
```

## Troubleshooting

### Container tidak start

```bash
# Check container status
docker compose -f docker-compose.prod.yml ps

# Check logs
docker compose -f docker-compose.prod.yml logs

# Restart containers
docker compose -f docker-compose.prod.yml restart
```

### Database connection error

```bash
# Check database health
docker exec pbjt-postgres-prod pg_isready -U postgres -d library_db

# Check database logs
docker compose -f docker-compose.prod.yml logs postgres

# Restart database
docker compose -f docker-compose.prod.yml restart postgres
```

### Health check failed

```bash
# Run health check manually
./scripts/health-check.sh

# Check API endpoint
curl http://localhost:3000/pbjt-library-api

# Check container resources
docker stats
```

### Disk space full

```bash
# Check disk usage
df -h

# Clean up old Docker images
docker image prune -a

# Clean up old backups (keep last 3)
cd ~/pbjt-library/backend-library/backups
ls -t backup_*.sql.gz | tail -n +4 | xargs rm -f
```

### GitHub Actions failed

1. Check workflow logs di GitHub Actions tab
2. Verify GitHub Secrets sudah benar
3. Verify Tailscale connection
4. Check SSH access ke server

### Cannot pull image from GHCR

```bash
# Login to GHCR
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Make sure image is public atau token punya akses
# Go to package settings di GitHub
```

## Performance Tuning

### Resource Limits

Edit `docker-compose.prod.yml` untuk adjust resource limits:

```yaml
deploy:
  resources:
    limits:
      cpus: '2.0'      # Increase CPU limit
      memory: 1G       # Increase memory limit
```

### Database Optimization

```bash
# Connect to database
docker exec -it pbjt-postgres-prod psql -U postgres -d library_db

# Check database size
SELECT pg_size_pretty(pg_database_size('library_db'));

# Vacuum database
VACUUM ANALYZE;
```

## Security Best Practices

1. ✅ Gunakan strong passwords untuk database
2. ✅ Rotate JWT_SECRET secara berkala
3. ✅ Keep Docker dan system updated
4. ✅ Gunakan Tailscale untuk secure access
5. ✅ Regular backup database
6. ✅ Monitor logs untuk suspicious activity
7. ✅ Limit container resources
8. ✅ Use non-root user di container (sudah configured)

## Monitoring

### Basic Monitoring

```bash
# Check container health
docker compose -f docker-compose.prod.yml ps

# Check resource usage
docker stats

# Check logs
docker compose -f docker-compose.prod.yml logs --tail=100 -f
```

### Setup Automated Monitoring (Optional)

Consider using:
- **Uptime Kuma** - Self-hosted monitoring
- **Prometheus + Grafana** - Metrics dan dashboards
- **Loki** - Log aggregation

## Support

Jika mengalami masalah:

1. Check logs: `docker compose -f docker-compose.prod.yml logs`
2. Run health check: `./scripts/health-check.sh`
3. Check GitHub Actions logs
4. Review dokumentasi ini

---

**Author**: Ariyan Andryan Aryja - Politeknik Baja Tegal  
**Last Updated**: 2026-01-11
