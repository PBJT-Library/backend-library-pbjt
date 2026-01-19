# 🔐 GitHub Actions Setup Guide

## 📋 **Prerequisites**

1. GitHub repository created
2. Server dengan Docker installed
3. SSH access ke server

---

## 🔑 **Step 1: Generate SSH Key for GitHub Actions**

```bash
# Di local machine
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github-actions

# Output:
# ~/.ssh/github-actions (private key)
# ~/.ssh/github-actions.pub (public key)
```

---

## 📤 **Step 2: Add Public Key to Server**

```bash
# Copy public key
cat ~/.ssh/github-actions.pub

# SSH to server
ssh root@your-server-ip

# Add to authorized_keys
mkdir -p ~/.ssh
echo "your-public-key-here" >> ~/.ssh/authorized_keys
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

**Test SSH access:**
```bash
ssh -i ~/.ssh/github-actions root@your-server-ip
#Should login without password!
```

---

## 🔒 **Step 3: Add Secrets to GitHub**

Go to: **GitHub Repository → Settings → Secrets and variables → Actions**

Click **New repository secret** and add:

### **Secret 1: SERVER_HOST**
- **Name:** `SERVER_HOST`
- **Value:** `123.456.789.0` (your server IP or domain)

### **Secret 2: SERVER_USER**
- **Name:** `SERVER_USER`
- **Value:** `root` (or your SSH user)

### **Secret 3: SERVER_PORT** (optional)
- **Name:** `SERVER_PORT`
- **Value:** `22` (atau custom SSH port)

### **Secret 4: SSH_PRIVATE_KEY**
- **Name:** `SSH_PRIVATE_KEY`
- **Value:** Full private key content

```bash
# Copy private key content
cat ~/.ssh/github-actions

# Paste ENTIRE output including:
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtz...
...
...full key content...
...
-----END OPENSSH PRIVATE KEY-----
```

⚠️ **IMPORTANT:** Include BEGIN and END lines!

---

## 📁 **Step 4: Prepare Server Directory**

```bash
# SSH to server
ssh root@your-server-ip

# Create project directory
mkdir -p /opt/pbjt-library
cd /opt/pbjt-library

# Clone repository (optional, CI/CD will handle this)
git clone https://github.com/yourusername/pbjt-library.git .

# Create .env file
cp .env.example .env
nano .env
# Fill with production values
```

---

## 🐳 **Step 5: Setup Docker on Server**

```bash
# Install Docker (if not installed)
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt-get update
apt-get install docker-compose-plugin

# Verify
docker --version
docker compose version
```

---

## 🔄 **Step 6: Test GitHub Actions Workflow**

### **Method 1: Push to main**
```bash
# On local machine
git add .
git commit -m "feat: add CI/CD pipeline"
git push origin main

# Go to GitHub → Actions tab
# Watch the workflow run
```

### **Method 2: Manual trigger (optional)**

Add to `.github/workflows/ci-cd.yml`:
```yaml
on:
  push:
    branches: [ main ]
  workflow_dispatch:  # Add this for manual trigger
```

Then: **GitHub → Actions → CI/CD Pipeline → Run workflow**

---

## ✅ **Step 7: Verify Deployment**

After GitHub Actions completes:

```bash
# SSH to server
ssh root@your-server-ip

# Check containers
docker compose ps

# Check logs
docker compose logs -f backend

# Test API
curl http://localhost:3000/health
```

---

## 🎯 **GitHub Container Registry (GHCR) Setup**

**Enable GHCR:**
1. Go to **GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)**
2. Click **Generate new token (classic)**
3. Select scopes:
   - ✅ `write:packages`
   - ✅ `read:packages`
   - ✅ `delete:packages`
4. Click **Generate token**
5. **Copy token** (won't be shown again!)

**Login to GHCR on server:**
```bash
# On server
echo "YOUR_GITHUB_TOKEN" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

**Note:** GitHub Actions uses `GITHUB_TOKEN` automatically (no manual setup needed)

---

## 📊 **Workflow Stages**

```
┌──────────┐
│ 1. Test  │  - Type checking
│          │  - Linting
│          │  - Unit tests (if added)
└─────┬────┘
      ↓
┌──────────┐
│ 2. Build │  - Build Docker image
│          │  - Push to GHCR
│          │  - Tag: main- sha, latest
└─────┬────┘
      ↓
┌──────────┐
│ 3. Deploy│  - SSH to server
│          │  - Pull latest image
│          │  - Run migrations
│          │  - Restart containers
│          │  - Health check
└──────────┘
```

---

## 🐛 **Troubleshooting**

### **Error: Permission denied (publickey)**
```bash
# Solution: Check SSH private key in GitHub Secrets
# Must include -----BEGIN and -----END lines
# Test locally:
ssh -i ~/.ssh/github-actions root@your-server-ip
```

### **Error: docker: command not found**
```bash
# Solution: Install Docker on server
curl -fsSL https://get.docker.com | sh
```

### **Error: Cannot connect to Docker daemon**
```bash
# Solution: Start Docker service
systemctl start docker
systemctl enable docker
```

### **Error: Image pull failed**
```bash
# Solution: Login to GHCR on server
docker login ghcr.io -u yourusername
```

### **Error: Health check failed**
```bash
# Solution: Check backend logs
docker compose logs backend
# Common issues:
# - Database not ready (increase health check start-period)
# - Redis not connected (check REDIS_HOST in .env)
# - Port already in use (check port 3000)
```

---

## ✅ **Success Checklist**

- [ ] SSH key pair generated
- [ ] Public key added to server
- [ ] All secrets added to GitHub
- [ ] Server directory created (`/opt/pbjt-library`)
- [ ] Docker & Docker Compose installed on server
- [ ] `.env` file configured on server
- [ ] GitHub Actions workflow file committed
- [ ] First deployment successful
- [ ] Health check passes
- [ ] API accessible

---

## 📞 **Quick Reference**

### **GitHub Secrets (4 required):**
```
SERVER_HOST=123.456.789.0
SERVER_USER=root
SERVER_PORT=22
SSH_PRIVATE_KEY=<full-private-key-content>
```

### **Test Deployment:**
```bash
# Local
git push origin main

# Server
ssh root@your-server
docker compose ps
curl http://localhost:3000/health
```

### **Manual Deployment (fallback):**
```bash
ssh root@your-server
cd /opt/pbjt-library
git pull
docker compose up -d --build
```

---

**Setup Time:** ~15-20 minutes 🚀
