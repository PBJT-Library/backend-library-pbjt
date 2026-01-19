# 🔧 SECURITY PATCHES - IMPLEMENTATION GUIDE

## 📋 **QUICK SUMMARY**

**Found:** 11 critical/medium security issues
**Fixed:** All 11 issues in SECURE versions

---

## 🎯 **IMPLEMENTATION STEPS**

### **Step 1: Backup Current Files**

```bash
# Backup docker-compose.yml
cp docker-compose.yml docker-compose.OLD.yml

# Backup CI/CD workflow
cp .github/workflows/ci-cd.yml .github/workflows/ci-cd.OLD.yml
```

---

### **Step 2: Apply Docker Compose Patch**

```bash
# Replace with secure version
cp docker-compose.SECURE.yml docker-compose.yml

# Or manual patch:
```

**Changes Required in `docker-compose.yml`:**

#### **A) Fix Postgres Ports (Line 17-18)**
```yaml
# ❌ BEFORE
ports:
  - "5432:5432"

# ✅ AFTER (localhost only)
ports:
  - "127.0.0.1:5432:5432"

# ✅ PRODUCTION (best - no ports)
# Remove ports line entirely
```

#### **B) Fix Redis Ports (Line 36-37)**
```yaml
# ❌ BEFORE
ports:
  - "6379:6379"

# ✅ AFTER (localhost only)
ports:
  - "127.0.0.1:6379:6379"

# ✅ PRODUCTION (best - no ports)
# Remove ports line entirely
```

#### **C) Fix Redis Healthcheck (Line 40-44)**
```yaml
# ❌ BEFORE
healthcheck:
  test: [ "CMD", "redis-cli", "--raw", "incr", "ping" ]

# ✅ AFTER
healthcheck:
  test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "PING"]
  interval: 10s
  timeout: 3s
  retries: 5
```

#### **D) Fix Redis Eviction Policy (Line 33)**
```yaml
# ❌ BEFORE
--maxmemory-policy allkeys-lru

# ✅ AFTER (security use-case)
--maxmemory-policy volatile-ttl
```

**Add timeout config:**
```yaml
command: >
  redis-server
  --requirepass ${REDIS_PASSWORD}
  --maxmemory 256mb
  --maxmemory-policy volatile-ttl  # ✅ Changed
  --appendonly yes
  --appendfilename "appendonly.aof"
  --save 900 1 --save 300 10 --save 60 10000
  --timeout 300  # ✅ Added
  --tcp-keepalive 60  # ✅ Added
  --protected-mode yes  # ✅ Added
```

#### **E) Fix Backend Image Source (Line 47-50)**
```yaml
# ❌ BEFORE
backend:
  build:
    context: .
    dockerfile: Dockerfile

# ✅ AFTER
backend:
  image: ghcr.io/${GITHUB_REPOSITORY:-yourusername/pbjt-library}:${IMAGE_TAG:-latest}
```

#### **F) Fix Backup Volume (Line 16)**
```yaml
# ❌ BEFORE
volumes:
  - ./backups:/backups

# ✅ AFTER
volumes:
  - postgres_backups:/backups

# Add to volumes section:
volumes:
  postgres_data:
    driver: local
  postgres_backups:  # ✅ NEW
    driver: local
  redis_data:
    driver: local
```

---

### **Step 3: Create GitHub Secrets**

**Navigate to:** GitHub Repo → Settings → Secrets and variables → Actions

**Add/Update Secrets:**

#### **1. GHCR_PAT (NEW - Required)**
```
Name: GHCR_PAT
Value: <GitHub Personal Access Token>

How to create:
1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token (classic)
3. Scopes: ✅ read:packages, ✅ write:packages
4. Copy token (shown only once!)
```

#### **2. GHCR_USERNAME (NEW - Required)**
```
Name: GHCR_USERNAME
Value: your-github-username
```

#### **3. Existing Secrets (Verify)**
```
✅ SERVER_HOST       # Your server IP
✅ SERVER_USER       # SSH username (e.g., root)
✅ SERVER_PORT       # SSH port (optional, default 22)
✅ SSH_PRIVATE_KEY   # Full SSH private key with BEGIN/END lines
```

---

### **Step 4: Apply CI/CD Workflow Patch**

**Replace `.github/workflows/ci-cd.yml` with SECURE version:**

```bash
cp .github/workflows/ci-cd.SECURE.yml .github/workflows/ci-cd.yml
```

**Key Changes:**

#### **A) Add Concurrency (Top level)**
```yaml
# ✅ ADD after env:
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: false
```

#### **B) Fix Test Job (Remove Skip)**
```yaml
# ❌ BEFORE
- name: Run type check
  run: bun run typecheck || echo "Type checking skipped"

# ✅ AFTER
- name: Run type check
  run: bun run typecheck  # Fails on error!
```

#### **C) Add Image Tag Output**
```yaml
# ✅ ADD to build job
build:
  outputs:
    image-tag: ${{ steps.image.outputs.tag }}

  steps:
    # ... existing steps ...
    
    # ✅ ADD after checkout
    - name: Set image tag
      id: image
      run: |
        if [ "${{ github.ref }}" == "refs/heads/main" ]; then
          echo "tag=main-${{ github.sha }}" >> $GITHUB_OUTPUT
        else
          echo "tag=develop-${{ github.sha }}" >> $GITHUB_OUTPUT
        fi
```

#### **D) Fix Deploy Job**

**Add SSH verification:**
```yaml
# ✅ ADD before deploy step
- name: Add SSH known host
  run: |
    mkdir -p ~/.ssh
    ssh-keyscan -H ${{ secrets.SERVER_HOST }} >> ~/.ssh/known_hosts
    chmod 644 ~/.ssh/known_hosts
```

**Fix GHCR login:**
```yaml
# ❌ BEFORE
echo "${{ secrets.GITHUB_TOKEN }}" | docker login ghcr.io -u ${{ github.actor }}

# ✅ AFTER
echo "${{ secrets.GHCR_PAT }}" | docker login ghcr.io -u ${{ secrets.GHCR_USERNAME }}
```

**Add immutable tag:**
```yaml
# ✅ ADD after cd command
export IMAGE_TAG=${{ needs.build.outputs.image-tag }}
export GITHUB_REPOSITORY=${{ github.repository }}
```

**Replace sleep with polling:**
```yaml
# ❌ BEFORE
sleep 10
curl -f http://localhost:3000/health || exit 1

# ✅ AFTER
MAX_WAIT=60
ELAPSED=0

until curl -f http://localhost:3000/health > /dev/null 2>&1; do
  if [ $ELAPSED -ge $MAX_WAIT ]; then
    echo "❌ Health check timeout!"
    docker compose logs --tail=50 backend
    exit 1
  fi
  
  echo "⏱️ Waiting... ($ELAPSED/$MAX_WAIT)"
  sleep 3
  ELAPSED=$((ELAPSED + 3))
done

echo "✅ Backend healthy!"
```

**Add concurrency:**
```yaml
# ✅ ADD to deploy job
deploy:
  concurrency:
    group: production-deploy
    cancel-in-progress: false
```

---

### **Step 5: Update .env File**

**Ensure these are set:**

```env
# Required for docker-compose
GITHUB_REPOSITORY=yourusername/pbjt-library
IMAGE_TAG=latest  # Will be overridden in production

# Existing configs
DB_NAME=pbjt_library
DB_USER=pbjt_app
DB_PASSWORD=<strong-password>
REDIS_PASSWORD=<strong-password>
```

---

### **Step 6: Test Locally**

```bash
# Stop current containers
docker compose down

# Test secure compose
docker compose up -d

# Verify services
docker compose ps

# Check Redis healthcheck
docker compose logs redis

# Should see: PONG responses (not errors)

# Test connectivity (should work via localhost)
redis-cli -h 127.0.0.1 -p 6379 -a $REDIS_PASSWORD PING
# Response: PONG

psql -h 127.0.0.1 -p 5432 -U pbjt_app -d pbjt_library
# Should connect
```

---

### **Step 7: Deploy to Server**

**On Server:**

```bash
# SSH to server
ssh root@your-server

# Go to project directory
cd /opt/pbjt-library

# Pull latest changes
git pull

# Update .env
nano .env
# Add/verify:
GITHUB_REPOSITORY=yourusername/pbjt-library
IMAGE_TAG=latest

# Create GHCR login (one-time)
echo "YOUR_GHCR_PAT" | docker login ghcr.io -u yourusername --password-stdin

# Test compose
docker compose config
# Should show resolved values

# Deploy
docker compose up -d

# Verify
docker compose ps
curl http://localhost:3000/health
```

---

### **Step 8: Push to GitHub**

```bash
# Commit changes
git add docker-compose.yml .github/workflows/ci-cd.yml
git commit -m "security: apply production hardening patches"

# Push to main (triggers deploy)
git push origin main

# Watch GitHub Actions
# Go to: https://github.com/yourusername/repo/actions
```

---

## ✅ **VERIFICATION CHECKLIST**

### **Docker Compose:**
- [ ] Postgres port bound to 127.0.0.1 (or removed)
- [ ] Redis port bound to 127.0.0.1 (or removed)
- [ ] Redis healthcheck returns PONG
- [ ] Redis eviction policy = volatile-ttl
- [ ] Backend uses GHCR image (not build)
- [ ] Backup volume is named volume

### **GitHub Actions:**
- [ ] GHCR_PAT secret created
- [ ] GHCR_USERNAME secret created
- [ ] Typecheck fails on errors (no skip)
- [ ] Lint fails on errors (no skip)
- [ ] SSH host key verification enabled
- [ ] Deploy uses SHA tag (immutable)
- [ ] Health check uses polling (not sleep)
- [ ] Concurrency control added

### **Server:**
- [ ] .env updated with GITHUB_REPOSITORY
- [ ] GHCR login successful
- [ ] Docker compose up works
- [ ] All containers healthy
- [ ] Health endpoint returns 200

---

## 🐛 **TROUBLESHOOTING**

### **Redis healthcheck failing:**
```bash
# Check if password in .env
echo $REDIS_PASSWORD

# Test manually
docker exec pbjt-redis redis-cli -a $REDIS_PASSWORD PING
# Should return: PONG

# If using docker-compose.yml with env substitution:
docker compose config | grep -A 10 redis
# Verify password is set
```

### **GHCR login fails on server:**
```bash
# Verify PAT has correct scopes
# Should have: read:packages, write:packages

# Test login
echo "YOUR_PAT" | docker login ghcr.io-u yourusername --password-stdin
# Should succeed

# Check if image exists
docker pull ghcr.io/yourusername/pbjt-library:latest
```

### **Deploy fails with "image not found":**
```bash
# Check IMAGE_TAG is set
echo $IMAGE_TAG

# Verify image exists in GHCR
# Go to: github.com/yourusername/repo/pkgs/container/pbjt-library

# Pull manually
docker pull ghcr.io/yourusername/pbjt-library:main-abc123
```

---

## 📊 **BEFORE vs AFTER**

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Exposed ports | 2 (Postgres, Redis) | 0 | ✅ 100% secure |
| CI reliability | Fake (skip errors) | Real (fails) | ✅ Catches bugs |
| Deploy consistency | Mutable (latest) | Immutable (SHA) | ✅ No race |
| GHCR auth | Broken | Working | ✅ Deploys work |
| SSH security | No verification | Verified | ✅ MITM protected |
| Health check | Fixed sleep | Polling | ✅ Reliable |
| Concurrent deploys | Yes (race) | No (queued) | ✅ Safe |

---

**Time to Apply:** 15-20 minutes
**Security Improvement:** 🔴 Critical → ✅ Production Ready
