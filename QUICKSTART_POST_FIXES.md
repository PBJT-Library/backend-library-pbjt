# 🚀 QUICK START - POST SECURITY FIXES

## ⚡ **30-SECOND SETUP**

### **Step 1: Update Local .env** (30s)
```bash
# Add to .env file
GITHUB_REPOSITORY=yourusername/pbjt-library
IMAGE_TAG=latest
```

### **Step 2: Create GitHub Secrets** (2 min)
1. Go to: https://github.com/yourusername/pbjt-library/settings/secrets/actions
2. Click "New repository secret"
3. Add:
   - `GHCR_PAT` = (Create PAT: Settings → Developer settings → Personal access tokens → generate with `read:packages` scope)
   - `GHCR_USERNAME` = yourusername

### **Step 3: Test Locally** (1 min)
```bash
docker compose down -v
docker compose up -d
docker compose ps  # All healthy?
curl http://localhost:3000/health  # {"status":"healthy"}?
```

### **Step 4: Deploy**  (Auto!)
```bash
git add .
git commit -m "security: production hardening"
git push origin main
# ✅ GitHub Actions will auto-deploy!
```

---

## 🔍 **VERIFY SUCCESS**

### **Check 1: Docker Compose**
```bash
# Postgres NOT publicly accessible
curl -v telnet://your-server-ip:5432
# Should: Connection refused ✅

# Redis NOT publicly accessible  
curl -v telnet://your-server-ip:6379
# Should: Connection refused ✅

# Backend IS accessible
curl http://your-server-ip:3000/health
# Should: {"status":"healthy"} ✅
```

### **Check 2: GitHub Actions**
- Go to: https://github.com/yourusername/repo/actions
- Latest workflow should:
  - ✅ Test pass (no skip)
  - ✅ Build & push image with SHA tag
  - ✅ Deploy to production
  - ✅ Health check pass

### **Check 3: Server**
```bash
# SSH to server
ssh root@your-server

# Check containers
docker compose ps
# All should be "healthy"

# Check image tag
docker compose images
# Should show: ghcr.io/user/repo:main-abc123 (SHA tag)

# Check logs
docker compose logs redis | grep PONG
# Should see: PONG responses
```

---

## 🐛 **TROUBLESHOOTING**

### **Issue: Compose fails with "image not found"**
**Solution:**
```bash
# On server
echo "YOUR_GHCR_PAT" | docker login ghcr.io -u yourusername --password-stdin

# Pull manually
IMAGE_TAG=latest docker compose pull backend
```

### **Issue: Redis healthcheck failing**
**Solution:**
```bash
# Check Redis password in .env
cat .env | grep REDIS_PASSWORD

# Test manually
docker exec pbjt-redis redis-cli -a "YOUR_PASSWORD" PING
# Should return: PONG
```

### **Issue: GitHub Actions deploy fails "Permission denied"**
**Solution:**
```bash
# Verify GHCR_PAT has correct scope
# Go to: GitHub → Settings → Developer settings → Personal access tokens
# Scope must include: read:packages
```

---

## ✅ **SUCCESS CRITERIA**

Your system is **PRODUCTION READY** when:

1. ✅ `docker compose ps` - All containers healthy
2. ✅ `curl localhost:3000/health` - Returns healthy
3. ✅ GitHub Actions - Workflow passes
4. ✅ Postgres - NOT accessible from outside (port closed)
5. ✅ Redis - NOT accessible from outside (port closed)
6. ✅ Redis healthcheck - Shows PONG in logs
7. ✅ Image tag - Uses SHA (not latest) in production

---

## 📞 **COMMANDS CHEAT SHEET**

```bash
# Local Development
docker compose up -d                    # Start services
docker compose ps                       # Check status
docker compose logs -f backend          # Follow logs
docker compose down -v                  # Stop & cleanup

# Testing
curl http://localhost:3000/health       # Health check
docker exec pbjt-redis redis-cli -a "$REDIS_PASSWORD" PING  # Test Redis

# Server Deployment (Manual)
ssh root@your-server
cd /opt/pbjt-library
export IMAGE_TAG=main-abc123            # Use specific SHA
docker compose pull backend
docker compose up -d --no-deps backend

# Rollback (Emergency)
export IMAGE_TAG=main-previous-sha
docker compose pull backend
docker compose up -d --no-deps backend
```

---

**Total Setup Time:** ~5 minutes
**Deploy Time:** ~3 minutes (automatic)
**Security Status:** ✅ Production-ready
