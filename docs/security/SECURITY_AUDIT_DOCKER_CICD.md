# 🚨 SECURITY & RELIABILITY AUDIT - CRITICAL ISSUES FOUND

## 🔴 **CRITICAL RISKS IDENTIFIED**

### **A) Docker Compose Security Vulnerabilities**

#### **1. POSTGRES & REDIS EXPOSED TO PUBLIC** 🔴 **CRITICAL**
**Risk:** Ports 5432 dan 6379 exposed ke 0.0.0.0 → bisa diakses dari internet!
```yaml
# ❌ CURRENT (VULNERABLE)
ports:
  - "5432:5432"  # Accessible from ANYWHERE
  - "6379:6379"  # Accessible from ANYWHERE
```

**Impact:**
- Attacker bisa brute force Redis password
- Attacker bisa brute force Postgres password
- DDoS attack target
- Data breach if password weak

**Fix:** Bind to localhost only atau remove ports completely
```yaml
# ✅ OPTION 1: Localhost only (if need host access)
ports:
  - "127.0.0.1:5432:5432"
  - "127.0.0.1:6379:6379"

# ✅ OPTION 2: No ports (best - Docker network only)
# Remove ports entirely - backend can still access via service name
```

---

#### **2. REDIS HEALTHCHECK BROKEN** 🔴 **CRITICAL**
**Risk:** Healthcheck tidak pakai password + command salah
```yaml
# ❌ CURRENT (BROKEN)
healthcheck:
  test: [ "CMD", "redis-cli", "--raw", "incr", "ping" ]
  # ❌ No password auth
  # ❌ Wrong command (incr ping tidak valid)
```

**Impact:**
- Healthcheck always fails atau false-positive
- Container restarted unnecessarily
- Deployment fails

**Fix:** Use PING with auth
```yaml
# ✅ CORRECT
healthcheck:
  test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "PING"]
  interval: 10s
  timeout: 3s
  retries: 5
```

---

#### **3. REDIS SECURITY CONFIG INCOMPLETE** 🟡 **MEDIUM**
**Issue:** Redis sudah pakai password & maxmemory, tapi:
- Eviction policy `-lru` salah untuk security use-case
- No TTL enforcement di config
- Persistence config bisa better

**Current:**
```yaml
command: >
  redis-server
  --requirepass ${REDIS_PASSWORD}
  --maxmemory 256mb
  --maxmemory-policy allkeys-lru  # ❌ Wrong for security
  --appendonly yes
  --save 900 1
```

**Fix:**
```yaml
# ✅ SECURITY-OPTIMIZED
command: >
  redis-server
  --requirepass ${REDIS_PASSWORD}
  --maxmemory 256mb
  --maxmemory-policy volatile-ttl  # ✅ Evict keys with TTL first
  --appendonly yes
  --appendfilename "appendonly.aof"
  --save 900 1 --save 300 10
  --timeout 300  # Auto-close idle connections
```

**Why `volatile-ttl`:**
- Rate limit keys → TTL (expires automatically)
- Blacklist tokens → TTL (expires when token would expire)
- OTP/Session → TTL (temporary by nature)
- Evict expired security data first, not random cache

---

#### **4. BACKUP FOLDER EXPOSED** 🟡 **MEDIUM**
**Risk:** `./backups` mounted ke container
```yaml
volumes:
  - ./backups:/backups  # ❌ Host folder exposed
```

**Impact:**
- Backup files readable by container
- If container compromised, backups compromised
- Backup tidak encrypted

**Fix:** Move to named volume + strict permissions
```yaml
volumes:
  - postgres_backups:/backups  # ✅ Named volume (isolated)

# On host, ensure permissions:
chmod 700 ./backups
```

---

#### **5. BACKEND BUILD ON SERVER** 🟡 **MEDIUM**
**Risk:** Backend using `build:` instead of pre-built image
```yaml
# ❌ CURRENT
backend:
  build:
    context: .
    dockerfile: Dockerfile
```

**Impact:**
- Slow deployment (rebuild setiap kali)
- Inconsistent builds (different from CI)
- Cache miss issues

**Fix:** Use pre-built image from GHCR
```yaml
# ✅ CORRECT
backend:
  image: ghcr.io/yourusername/pbjt-library:${IMAGE_TAG:-latest}
```

---

### **B) GitHub Actions CI/CD Vulnerabilities**

#### **6. FAKE CI - TESTS SKIPPED** 🔴 **CRITICAL**
**Risk:** CI always pass karena error di-skip
```yaml
# ❌ CURRENT (USELESS)
- name: Run type check
  run: bun run typecheck || echo "Type checking skipped"
- name: Run linter
  run: bun run lint || echo "Linting skipped"
```

**Impact:**
- TypeScript errors not caught
- Lint errors not caught
- Broken code deployed to production

**Fix:** Remove skip - fail on error
```yaml
# ✅ CORRECT
- name: Run type check
  run: bun run typecheck  # No skip!

- name: Run linter
  run: bun run lint  # No skip!
```

---

#### **7. MUTABLE IMAGE TAG (latest)** 🔴 **CRITICAL**
**Risk:** Deploy using `latest` tag
```yaml
# ❌ CURRENT
type=raw,value=latest,enable={{is_default_branch}}

# Deploy pulls "latest"
docker compose pull backend  # ❌ Which version??
```

**Impact:**
- Race condition (2 deploy overlap, wrong image)
- Can't rollback (which image was deployed?)
- Cache poisoning
- Inconsistent deploys

**Fix:** Use immutable SHA tag
```yaml
# ✅ CORRECT
- name: Set image tag
  id: image
  run: echo "tag=main-${{ github.sha }}" >> $GITHUB_OUTPUT

# Deploy specific tag
IMAGE_TAG=${{ steps.image.outputs.tag }} docker compose pull backend
```

---

#### **8. INSECURE GHCR LOGIN ON SERVER** 🔴 **CRITICAL**
**Risk:** GITHUB_TOKEN tidak bisa dipakai untuk pull dari server
```yaml
# ❌ CURRENT (WILL FAIL)
echo "${{ secrets.GITHUB_TOKEN }}" | docker login ghcr.io -u ${{ github.actor }}
```

**Why broken:**
- `GITHUB_TOKEN` hanya valid dalam Actions context
- Server SSH tidak punya akses ke `GITHUB_TOKEN`
- Login will fail

**Fix:** Use dedicated PAT token
```yaml
# ✅ CORRECT
# Need: Create GHCR_PAT secret with read:packages scope
echo "${{ secrets.GHCR_PAT }}" | docker login ghcr.io -u yourusername
```

---

#### **9. NO SSH HOST KEY VERIFICATION** 🔴 **CRITICAL**
**Risk:** SSH connection vulnerable to MITM
```yaml
# ❌ CURRENT
uses: appleboy/ssh-action@v1.0.0
with:
  host: ${{ secrets.SERVER_HOST }}
  # ❌ No fingerprint verification
```

**Impact:**
- Man-in-the-middle attack possible
- Attacker could intercept deployment
- Steal secrets during deploy

**Fix:** Add SSH fingerprint verification
```yaml
# ✅ CORRECT
- name: Add SSH host key
  run: |
    mkdir -p ~/.ssh
    ssh-keyscan -H ${{ secrets.SERVER_HOST }} >> ~/.ssh/known_hosts

- name: Deploy
  uses: appleboy/ssh-action@v1.0.0
  # Now SSH verified
```

---

#### **10. SLEEP INSTEAD OF HEALTH POLLING** 🟡 **MEDIUM**
**Risk:** Fixed sleep 10s - might be too short or too long
```bash
# ❌ CURRENT
sleep 10  # What if app needs 15s?
curl -f http://localhost:3000/health || exit 1  # Only checks once!
```

**Impact:**
- False failures (app not ready yet)
- Slow deploys (waiting unnecessarily)
- Single point failure (network blip = failed deploy)

**Fix:** Poll health check with timeout
```bash
# ✅ CORRECT
MAX_WAIT=60
ELAPSED=0
until curl -f http://localhost:3000/health > /dev/null 2>&1; do
  if [ $ELAPSED -ge $MAX_WAIT ]; then
    echo "Health check timeout!"
    exit 1
  fi
  echo "Waiting for app... ($ELAPSED/$MAX_WAIT)"
  sleep 3
  ELAPSED=$((ELAPSED + 3))
done
echo "✅ App healthy!"
```

---

#### **11. NO DEPLOYMENT CONCURRENCY CONTROL** 🔴 **CRITICAL**
**Risk:** 2 deploys bisa jalan bersamaan
```yaml
# ❌ CURRENT
deploy:
  runs-on: ubuntu-latest
  # No concurrency control!
```

**Impact:**
- Deploy A starts
- Deploy B starts (overlaps)
- Race condition
- Corrupt state
- Wrong image deployed

**Fix:** Add concurrency group
```yaml
# ✅ CORRECT
deploy:
  runs-on: ubuntu-latest
  concurrency:
    group: production-deploy
    cancel-in-progress: false  # Queue deploys, don't cancel
```

---

## 📊 **RISK SUMMARY**

| Issue | Severity | Impact | Likelihood | Priority |
|-------|----------|--------|------------|----------|
| Postgres/Redis exposed | 🔴 Critical | Data breach | High | **P0** |
| Fake CI (skip tests) | 🔴 Critical | Broken code to prod | High | **P0** |
| Mutable image tag | 🔴 Critical | Wrong deploy | Medium | **P0** |
| GHCR login broken | 🔴 Critical | Deploy fails | High | **P0** |
| No SSH verification | 🔴 Critical | MITM attack | Low | **P1** |
| No concurrency | 🔴 Critical | Deploy race | Medium | **P0** |
| Redis healthcheck broken | 🔴 Critical | Container issues | High | **P0** |
| Redis eviction policy | 🟡 Medium | Memory issues | Medium | **P1** |
| Sleep vs polling | 🟡 Medium | False failures | Low | **P2** |
| Backup exposed | 🟡 Medium | Data leak | Low | **P2** |
| Build on server | 🟡 Medium | Slow deploy | Low | **P2** |

---

## ✅ **TOTAL ISSUES: 11**
- 🔴 **Critical:** 7
- 🟡 **Medium:** 4

**ALL MUST BE FIXED BEFORE PRODUCTION!**
