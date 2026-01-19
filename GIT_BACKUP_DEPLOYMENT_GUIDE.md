# 🔄 Git Backup & Deployment Strategy

## 📋 **LANGKAH-LANGKAH**

### **Step 1: Backup Main Branch ke `old-v1`**

```bash
# Pastikan di main branch dan up-to-date
git checkout main
git pull origin main

# Buat branch backup dari current main
git checkout -b old-v1

# Push backup branch ke GitHub
git push origin old-v1

# Kembali ke main
git checkout main
```

**Hasil:** Branch `old-v1` sekarang berisi backup dari main yang lama ✅

---

### **Step 2: Siapkan Perubahan Baru di Branch `test-deployment`**

```bash
# Dari main, buat branch test-deployment
git checkout -b test-deployment

# Verify changes (pastikan semua file security fixes ada)
git status

# Add semua perubahan
git add .

# Commit dengan message yang jelas
git commit -m "security: production hardening - 11 critical fixes applied

- Docker: Close Postgres & Redis ports
- Docker: Fix Redis healthcheck with password
- Docker: Change eviction policy to volatile-ttl  
- Docker: Use GHCR image instead of local build
- Docker: Isolate backup volume
- CI/CD: Remove test skip (real CI)
- CI/CD: Use immutable SHA tags
- CI/CD: Fix GHCR login with PAT
- CI/CD: Add SSH host verification
- CI/CD: Health check polling
- CI/CD: Deployment concurrency control"

# Push ke GitHub
git push origin test-deployment
```

**Hasil:** Branch `test-deployment` dibuat dengan semua security fixes ✅

---

### **Step 3: Test Deployment**

**Option A: Test via GitHub Actions**

1. Go to GitHub → Settings → Environments
2. Create environment: `test-deployment`
3. Modify `.github/workflows/ci-cd.yml` temporarily:
   ```yaml
   deploy:
     if: github.ref == 'refs/heads/test-deployment'  # Test branch
     environment:
       name: test-deployment
   ```

4. Push to trigger workflow:
   ```bash
   git push origin test-deployment
   ```

5. Monitor: https://github.com/yourusername/pbjt-library/actions

**Option B: Test Manual Deploy**

```bash
# SSH to server
ssh root@your-server

# Clone test branch
cd /opt
git clone -b test-deployment https://github.com/yourusername/pbjt-library.git pbjt-library-test

cd pbjt-library-test

# Setup .env
cp .env.example .env
nano .env  # Fill values

# Test deploy
docker compose up -d

# Verify
docker compose ps
curl http://localhost:3000/health
```

---

### **Step 4: Merge to Main (After Testing Success)**

```bash
# Kembali ke local machine
git checkout main

# Merge test-deployment ke main
git merge test-deployment

# Push ke GitHub (akan trigger production deploy!)
git push origin main
```

**Alternative: Via Pull Request (Recommended)**

1. Go to GitHub repository
2. Click "Pull requests" → "New pull request"
3. Base: `main` ← Compare: `test-deployment`
4. Title: "Production Security Hardening - 11 Critical Fixes"
5. Add description (list all fixes)
6. Create pull request
7. Review changes
8. Merge pull request
9. Delete test-deployment branch (optional)

---

## 🎯 **WORKFLOW DIAGRAM**

```
┌─────────────────────────────────────────────┐
│ STEP 1: Backup Current Main                │
└──────────────────┬──────────────────────────┘
                   ↓
         main → old-v1 (backup)
                   ↓
┌─────────────────────────────────────────────┐
│ STEP 2: Create test-deployment Branch      │
└──────────────────┬──────────────────────────┘
                   ↓
         main → test-deployment (new changes)
                   ↓
┌─────────────────────────────────────────────┐
│ STEP 3: Test Deployment                    │
│ - Run GitHub Actions                        │
│ - Or manual deploy to test server          │
└──────────────────┬──────────────────────────┘
                   ↓
              ✅ Tests Pass?
                   ↓
┌─────────────────────────────────────────────┐
│ STEP 4: Merge to Main                      │
│ - Via git merge or Pull Request            │
└──────────────────┬──────────────────────────┘
                   ↓
         test-deployment → main (production)
                   ↓
         🚀 Auto-deploy to production!
```

---

## 📝 **COMPLETE COMMAND SEQUENCE**

```bash
# === BACKUP CURRENT MAIN ===
git checkout main
git pull origin main
git checkout -b old-v1
git push origin old-v1
git checkout main

# === CREATE TEST BRANCH ===
git checkout -b test-deployment
git add .
git commit -m "security: production hardening - 11 critical fixes"
git push origin test-deployment

# === AFTER TESTING SUCCESS ===
# Option 1: Direct merge
git checkout main
git merge test-deployment
git push origin main

# Option 2: Via Pull Request (recommended)
# Go to GitHub → New PR → test-deployment → main → Merge
```

---

## 🔍 **VERIFICATION CHECKLIST**

### **After Creating old-v1:**
- [ ] Branch exists on GitHub: `https://github.com/user/repo/tree/old-v1`
- [ ] Contains old code (before security fixes)
- [ ] Main branch still active

### **After Creating test-deployment:**
- [ ] Branch exists on GitHub
- [ ] Contains all security fixes
- [ ] Workflow file updated (if testing via Actions)

### **After Merge to Main:**
- [ ] Main branch has all fixes
- [ ] GitHub Actions triggered
- [ ] Production deployment successful
- [ ] Health check passes: `curl https://api.yourdomain.com/health`

---

## 🚨 **EMERGENCY ROLLBACK**

Jika ada masalah setelah deploy ke main:

### **Rollback to old-v1:**
```bash
# Option 1: Revert merge
git checkout main
git revert -m 1 HEAD  # Revert last merge
git push origin main

# Option 2: Hard reset to old-v1 (DANGER!)
git checkout main
git reset --hard old-v1
git push origin main --force  # ⚠️ Use with caution!

# Option 3: Create hotfix from old-v1
git checkout old-v1
git checkout -b hotfix-rollback
git push origin hotfix-rollback
# Then deploy this branch manually
```

---

## 💡 **TIPS**

1. **Naming Convention:**
   - Backup: `old-v1`, `old-v2`, `backup-2026-01-19`
   - Feature: `feature/name`, `fix/name`
   - Test: `test-deployment`, `staging`

2. **Protection:**
   ```bash
   # Protect old-v1 branch from deletion
   # GitHub → Settings → Branches → Add rule → old-v1
   ```

3. **Tags (Alternative):**
   ```bash
   # Instead of branch, use tag
   git tag -a v1.0-old -m "Pre-security-fixes version"
   git push origin v1.0-old
   ```

4. **GitHub Actions Trigger:**
   ```yaml
   # Only run on main (skip test branches)
   on:
     push:
       branches: [main]
   ```

---

## ✅ **EXPECTED TIMELINE**

| Task | Time | Notes |
|------|------|-------|
| Backup to old-v1 | 1 min | Simple branch + push |
| Create test-deployment | 2 min | Commit + push |
| Test deployment | 5-10 min | Depends on method |
| Merge to main | 1 min | Via PR or git merge |
| Production deploy | 3-5 min | Auto via GitHub Actions |
| **Total** | **12-19 min** | End-to-end |

---

## 🎯 **RECOMMENDED APPROACH**

**Best Practice:**
1. ✅ Backup to `old-v1` (safety)
2. ✅ Push to `test-deployment` (testing)
3. ✅ Create Pull Request (review)
4. ✅ Merge via PR (documentation)
5. ✅ Monitor production deploy (verification)

**Why Pull Request?**
- Code review opportunity
- Audit trail
- Can request reviews from team
- GitHub auto-deploys after merge
- Easy to revert if needed

---

**Status:** Ready to execute! 🚀
**Next Command:** `git checkout main && git pull origin main`
