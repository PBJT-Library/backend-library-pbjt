# 🧪 COMPREHENSIVE TESTING GUIDE

## 📋 **Step-by-Step Testing**

Testing dibagi menjadi 3 tahap:
1. **Local Testing** (Development)
2. **JWT Security Testing**
3. **Production Deployment Testing**

---

## 🔧 **TAHAP 1: Local Testing**

### **1.1 Database Migration**

```bash
# Masuk ke WSL
cd /mnt/c/Users/RAFLY\ A.R/Documents/Portfolio-Rafly/pbjt-library/backend-library

# Run migration untuk token versioning
psql -h localhost -U pbjt_app -d pbjt_library -f migrations/add_token_versioning.sql

# Verify migration
psql -h localhost -U pbjt_app -d pbjt_library -c "\d admins"
```

**Expected Output:**
```
Column       | Type    | Modifiers
-------------|---------|----------
id           | uuid    | not null
username     | text    | not null
password     | text    | not null
token_version| integer | not null default 0  ← HARUS ADA
created_at   | timestamp|...
```

---

### **1.2 Start Backend**

```bash
# Clean start
docker compose down -v
docker compose up --build

# Or without Docker
bun install
bun run src/app.ts
```

**Expected Output:**
```
🚀 Server running on http://localhost:3000
📚 Swagger UI: http://localhost:3000/pbjt-library-api
✅ Redis connected
✅ Database connected
```

---

### **1.3 Health Check Test**

```bash
curl http://localhost:3000/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-01-18T23:56:43.000Z",
 " uptime": 123.45,
  "services": {
    "redis": {
      "status": "healthy",
      "version": "7.x.x",
      "used_memory": "1.23M",
      "connected_clients": 1
    },
    "database": {
      "status": "healthy"
    }
  }
}
```

✅ **PASS:** Semua services status "healthy"
❌ **FAIL:** Ada yang "unhealthy" → check logs

---

## 🔒 **TAHAP 2: JWT Security Testing**

### **2.1 Admin Registration (Must Require Auth)**

```bash
# Attempt 1: Register without token (SHOULD FAIL)
curl -X POST http://localhost:3000/admin/register \
  -H "Content-Type: application/json" \
  -d '{"username":"hacker","password":"password123"}'
```

**Expected Response (401):**
```json
{
  "message": "Token tidak ditemukan",
  "status": 401
}
```

✅ **PASS:** Returns 401 Unauthorized
❌ **FAIL:** Allows registration → **CRITICAL SECURITY BUG!**

---

### **2.2 Admin Login & JWT Generation**

```bash
# First, create admin manually via DB
psql -h localhost -U pbjt_app -d pbjt_library -c "
INSERT INTO admins (username, password, token_version) 
VALUES ('testadmin', '\$2b\$10\$hashedpasswordhere', 0);"

# Login
curl -X POST http://localhost:3000/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testadmin","password":"yourpassword"}'
```

**Expected Response (200):**
```json
{
  "message": "Login berhasil",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "admin": {
    "id": "uuid-here",
    "username": "testadmin",
    "token_version": 0,
    "created_at": "..."
  }
}
```

✅ **PASS:** Returns token with admin data
❌ **FAIL:** No token → check JWT configuration

**Save the token for next tests!**

---

### **2.3 JWT Payload Verification**

Decode JWT di https://jwt.io:

**Expected Payload:**
```json
{
  "sub": "admin-uuid",
  "username": "testadmin",
  "role": "admin",
  "jti": "unique-uuid-v4",  ← MUST HAVE
  "version": 0,              ← MUST HAVE
  "exp": 1234567890
}
```

✅ **PASS:** Has `jti` and `version` fields
❌ **FAIL:** Missing fields → JWT generation broken

---

### **2.4 Token Versioning Test**

```bash
# Set TOKEN from login response
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Test 1: Access protected endpoint (SHOULD WORK)
curl -X POST http://localhost:3000/admin/register \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"username":"newadmin","password":"password123"}'
```

**Expected (200):**
```json
{
  "message": "Registrasi admin baru berhasil",
  "admin": {...}
}
```

✅ **PASS:** Registration successful
❌ **FAIL:** 401/403 → Auth middleware issue

---

```bash
# Test 2: Logout (increment token_version)
curl -X POST http://localhost:3000/admin/logout \
  -H "Authorization: Bearer $TOKEN"
```

**Expected (200):**
```json
{
  "message": "Logout berhasil, semua sesi telah dicabut"
}
```

---

```bash
# Test 3: Try using OLD token (SHOULD FAIL)
curl -X POST http://localhost:3000/admin/register \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"username":"hacker2","password":"password123"}'
```

**Expected (401):**
```json
{
  "message": "Token kadaluarsa, silakan login kembali",
  "status": 401
}
```

✅ **PASS:** Old token rejected after logout
❌ **FAIL:** Still works → **TOKEN VERSIONING BROKEN!**

---

### **2.5 Password Change Revocation Test**

```bash
# Login again
NEW_TOKEN=$(curl -X POST http://localhost:3000/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testadmin","password":"yourpassword"}' | jq -r '.token')

# Change password
curl -X PUT http://localhost:3000/admin/me/pass \
  -H "Authorization: Bearer $NEW_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"currentPassword":"yourpassword","newPassword":"newpassword123"}'
```

**Expected (200):**
```json
{
  "message": "Password berhasil diubah, semua sesi telah dicabut"
}
```

---

```bash
# Try using token after password change (SHOULD FAIL)
curl -X GET http://localhost:3000/admin/me \
  -H "Authorization: Bearer $NEW_TOKEN"
```

**Expected (401):**
```json
{
  "message": "Token kadaluarsa, silakan login kembali"
}
```

✅ **PASS:** Token invalid after password change
❌ **FAIL:** Still works → **PASSWORD CHANGE REVOCATION BROKEN!**

---

### **2.6 DB Role Check Test**

```bash
# Manually change JWT payload role to "superadmin"
# (requires JWT secret - security test only)

# If you modify role in JWT but admin.role in DB is still "admin"
# Auth middleware SHOULD still reject

# Auth middleware checks: admin.role from DB, not JWT payload
```

✅ **PASS:** Middleware checks DB role,not JWT
❌ **FAIL:** Trusts JWT payload → **SECURITY VULNERABILITY!**

---

## 🚀 **TAHAP 3: Production Deployment Testing**

### **3.1 GitHub Actions Setup**

**Step 1: Add GitHub Secrets**

Go to: `GitHub Repo → Settings → Secrets and variables → Actions → New repository secret`

Add:
```
SERVER_HOST=your-server-ip
SERVER_USER=root
SERVER_PORT=22
SSH_PRIVATE_KEY=<your-ssh-private-key>
```

**Step 2: Test Workflow**

```bash
# Push to main branch
git add .
git commit -m "test: CI/CD deployment"
git push origin main
```

**Expected:**
- GitHub Actions runs automatically
- Build passes
- Docker image pushed to GHCR
- Deployment to server successful

---

### **3.2 Docker Build Test**

```bash
# Local Docker build test
docker build -t pbjt-backend:test .

# Should complete without errors
# Expected layers:
# - deps (dependencies)
# - builder (build stage)
# - production (final image)
```

✅ **PASS:** Build successful
❌ **FAIL:** Build errors → Fix Dockerfile

---

### **3.3 Docker Compose Test**

```bash
# Full stack test
docker compose up -d

# Check all containers running
docker compose ps
```

**Expected Output:**
```
NAME              STATUS         PORTS
pbjt-postgres     Up (healthy)   5432->5432
pbjt-redis        Up (healthy)   6379->6379
pbjt-backend      Up (healthy)   3000->3000
```

✅ **PASS:** All containers healthy
❌ **FAIL:** Any unhealthy → Check logs (`docker compose logs`)

---

### **3.4 Production API Test**

```bash
# Replace with your production URL
PROD_URL="https://api.yourdomain.com"

# Health check
curl $PROD_URL/health

# Test login
curl -X POST $PROD_URL/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"yourpassword"}'
```

✅ **PASS:** All endpoints respond correctly
❌ **FAIL:** Errors → Check Nginx config & firewall

---

## 📊 **TESTING CHECKLIST**

### **Local Development:**
- [ ] Migration successful (token_version column added)
- [ ] Backend starts without errors
- [ ] Health check returns healthy
- [ ] Redis connected
- [ ] Database connected

### **JWT Security:**
- [ ] Admin registration requires auth ✅
- [ ] Login returns JWT with jti & version ✅
- [ ] Logout invalidates token ✅
- [ ] Password change revokes all tokens ✅
- [ ] Old tokens rejected after logout ✅
- [ ] DB role check (not JWT payload) ✅

### **Route Security:**
- [ ] POST/PUT/DELETE books require auth ✅
- [ ] POST/PUT/DELETE loans require auth ✅
- [ ] POST/PUT/DELETE members require auth ✅
- [ ] GET endpoints are public ✅

### **Production:**
- [ ] Docker build successful ✅
- [ ] Docker compose up works ✅
- [ ] All containers healthy ✅
- [ ] GitHub Actions runs ✅
- [ ] Deployment successful ✅
- [ ] Production API accessible ✅
- [ ] SSL/HTTPS working ✅

---

## 🐛 **Common Issues & Solutions**

### **Issue 1: Migration Fails**
```bash
# Error: relation "admins" does not exist
# Solution: Run schema creation first
psql -f src/database/schema_v3.sql
```

### **Issue 2: Docker Build Fails**
```bash
# Error: COPY failed
# Solution: Check .dockerignore, ensure files exist
cat .dockerignore
```

### **Issue 3: Redis Connection Failed**
```bash
# Error: ECONNREFUSED 127.0.0.1:6379
# Solution: Check Redis container
docker compose logs redis
```

### **Issue 4: Token Still Valid After Logout**
```bash
# Problem: token_version not incremented
# Solution: Check logout endpoint code
# Should have: SET token_version = token_version + 1
```

### **Issue 5: GitHub Actions Deploy Fails**
```bash
# Error: Permission denied (publickey)
# Solution: Check SSH_PRIVATE_KEY secret
# Must be full private key including:
# -----BEGIN OPENSSH PRIVATE KEY-----
# ...
# -----END OPENSSH PRIVATE KEY-----
```

---

## ✅ **SUCCESS CRITERIA**

Your backend is **PRODUCTION READY** if:

1. ✅ All local tests pass
2. ✅ All JWT security tests pass
3. ✅ Docker build & compose work
4. ✅ GitHub Actions pipeline succeeds
5. ✅ Production deployment successful
6. ✅ Health check returns healthy
7. ✅ All security measures verified

---

## 📞 **Quick Test Commands**

```bash
# === LOCAL TESTING ===
# Health check
curl http://localhost:3000/health

# Login (save token)
curl -X POST http://localhost:3000/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"yourpass"}'

# Test protected endpoint
curl -X POST http://localhost:3000/admin/register \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"username":"newadmin","password":"pass123"}'

# Logout
curl -X POST http://localhost:3000/admin/logout \
  -H "Authorization: Bearer YOUR_TOKEN"

# === DOCKER TESTING ===
# Build & run
docker compose up --build -d

# Check logs
docker compose logs -f backend

# Check health
docker compose ps

# === PRODUCTION TESTING ===
# Test production API
curl https://api.yourdomain.com/health
```

---

**Testing Time Estimate:** 15-20 minutes untuk full test 🚀
