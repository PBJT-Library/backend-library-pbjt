# 🧪 Testing Guide

Quick reference for testing the PBJT Library Backend API.

---

## Local Testing

### 1. Setup & Start

```bash
# Install dependencies
bun install

# Setup database
psql -U postgres -d pbjt_library -f database/schema.sql

# Start server
bun run dev
```

### 2. Health Check

```bash
curl http://localhost:3000/health
```

**Expected**: Status "healthy" for all services (Redis, Database)

---

## JWT Security Testing

### Admin Login

```bash
curl -X POST http://localhost:3000/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"yourpassword"}'
```

Save the returned token for authenticated requests.

### Protected Endpoints

```bash
# Use Bearer token
curl -X POST http://localhost:3000/categories \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Fiction","description":"Fiction books"}'
```

### Token Revocation Test

```bash
# Logout (invalidates token)
curl -X POST http://localhost:3000/admin/logout \
  -H "Authorization: Bearer YOUR_TOKEN"

# Old token should now fail (401)
curl -X GET http://localhost:3000/admin/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Docker Testing

```bash
# Start all services
docker compose up -d

# Check container health
docker compose ps

# View logs
docker compose logs -f backend

# Stop services
docker compose down
```

---

## Production Testing

```bash
# Health check
curl https://api.yourdomain.com/health

# Test login
curl -X POST https://api.yourdomain.com/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"yourpassword"}'
```

---

## Common Issues

| Issue | Solution |
|-------|----------|
| Database connection failed | Check Docker container: `docker compose logs postgres` |
| Redis connection failed | Verify Redis is running: `docker compose logs redis` |
| Token still valid after logout | Check token_version implementation |
| Port already in use | Stop existing process: `lsof -i :3000` |

---

## Quick Commands

```bash
# Development
bun run dev              # Start dev server
bun run typecheck        # Type check
bun run lint             # Lint code

# Docker
docker compose up -d     # Start services
docker compose logs -f   # View logs
docker compose down      # Stop services

# Database
psql -U pbjt_app -d pbjt_library -c "\dt"  # List tables
```

---

For detailed testing procedures, see [DEPLOYMENT.md](../DEPLOYMENT.md#verification-testing)
