# PBJT Library Backend API

> REST API untuk sistem manajemen perpustakaan dengan ElysiaJS, TypeScript, dan PostgreSQL

[![Elysia](https://img.shields.io/badge/Elysia-Latest-orange.svg)](https://elysiajs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue.svg)](https://www.postgresql.org/)

---

## 🚀 Tech Stack

| Category      | Technology     |
| ------------- | -------------- |
| **Runtime**   | Bun            |
| **Framework** | ElysiaJS       |
| **Language**  | TypeScript 5.8 |
| **Database**  | PostgreSQL 16  |
| **Cache**     | Redis 7        |
| **Auth**      | JWT + bcrypt   |

---

## ⚙️ Quick Start

### Prerequisites

- Bun v1.0+
- PostgreSQL 16
- Redis 7 (optional)

### Installation

```bash
# 1. Install dependencies
bun install

# 2. Setup environment
cp .env.example .env

# 3. Create database
createdb pbjt_library

# 4. Run schema
psql -U postgres -d pbjt_library -f scripts/migrations/schema.sql

# 5. Start server
bun run dev
```

Server: `http://localhost:3000`  
Swagger: `http://localhost:3000/pbjt-library-api`

---

## 🐳 Docker Deployment

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f backend

# Stop services
docker compose down
```

**Services:** PostgreSQL, Redis, Backend API

📖 Production deployment: See [DEPLOYMENT.md](DEPLOYMENT.md)

---

## 📌 API Endpoints

### Authentication

| Method | Endpoint             | Description     | Auth |
| ------ | -------------------- | --------------- | ---- |
| POST   | `/admin/register`    | Register admin  | ❌   |
| POST   | `/admin/login`       | Login           | ❌   |
| GET    | `/admin/me`          | Get profile     | ✅   |
| PUT    | `/admin/me/password` | Change password | ✅   |

### Categories

| Method | Endpoint          | Description     | Auth |
| ------ | ----------------- | --------------- | ---- |
| GET    | `/categories`     | List categories | ❌   |
| POST   | `/categories`     | Create category | ✅   |
| PUT    | `/categories/:id` | Update category | ✅   |
| DELETE | `/categories/:id` | Delete category | ✅   |

### Books

| Method | Endpoint       | Description | Auth |
| ------ | -------------- | ----------- | ---- |
| GET    | `/books`       | List books  | ❌   |
| GET    | `/books/:uuid` | Get book    | ❌   |
| POST   | `/books`       | Add book    | ✅   |
| PUT    | `/books/:uuid` | Update book | ✅   |
| DELETE | `/books/:uuid` | Delete book | ✅   |

**Status:** `available`, `loaned`, `reserved`, `maintenance`, `lost`

### Members

| Method | Endpoint         | Description     | Auth |
| ------ | ---------------- | --------------- | ---- |
| GET    | `/members`       | List members    | ❌   |
| POST   | `/members`       | Register member | ✅   |
| PUT    | `/members/:uuid` | Update member   | ✅   |
| DELETE | `/members/:uuid` | Delete member   | ✅   |

### Loans

| Method | Endpoint            | Description | Auth |
| ------ | ------------------- | ----------- | ---- |
| GET    | `/loans`            | List loans  | ❌   |
| POST   | `/loans`            | Create loan | ✅   |
| PUT    | `/loans/:id`        | Update loan | ✅   |
| PATCH  | `/loans/:id/return` | Return book | ✅   |
| DELETE | `/loans/:id`        | Delete loan | ✅   |

**Status:** `active`, `completed`, `overdue`

### System

| Method | Endpoint            | Description  |
| ------ | ------------------- | ------------ |
| GET    | `/health`           | Health check |
| GET    | `/pbjt-library-api` | Swagger docs |

---

## 🧪 Testing

```bash
# Type check
bun run typecheck

# Lint
bun run lint

# API test (cURL)
curl http://localhost:3000/health
```

---

## 🔒 Security

- ✅ JWT authentication (7-day expiration)
- ✅ bcrypt password hashing
- ✅ Rate limiting (100 req/min global, 5 req/min auth)
- ✅ SQL injection protection
- ✅ CORS whitelist
- ✅ Token revocation (Redis)
- ✅ Swagger basic auth protection

📖 Full audit: [docs/SECURITY.md](docs/SECURITY.md)

---

## 📂 Project Structure

```
backend-library/
├── src/
│   ├── modules/       # Feature modules (admin, books, members, loans, categories)
│   ├── config/        # Database & env config
│   ├── middleware/    # Auth, error, rate limiter, security
│   ├── utils/         # Helper functions
│   └── app.ts         # Main app
├── scripts/
│   └── migrations/    # Database schema & backups
├── config/nginx/      # Nginx config
├── docs/              # Documentation
└── docker-compose.yml
```

---

## 🌐 Environment Variables

```env
# Required
APP_PORT=3000
APP_ENV=development

DB_HOST=localhost
DB_PORT=5432
DB_NAME=pbjt_library
DB_USER=postgres
DB_PASSWORD=your_secure_database_password_here

# Prisma (if using ORM)
DATABASE_URL=postgresql://postgres:password@localhost:5432/pbjt_library

JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRES_IN=7d

# Optional - Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password_here

# Optional - CORS & Security
ALLOWED_ORIGINS=http://localhost:5173,tauri://localhost
RATE_LIMIT_DURATION=60000
RATE_LIMIT_MAX=100
RATE_LIMIT_AUTH_MAX=5

# Optional - Swagger
SWAGGER_ENABLED=true
SWAGGER_USERNAME=admin
SWAGGER_PASSWORD=change_this_password_in_production
```

See [.env.example](.env.example) for full template.

---

## 📖 Documentation

- [DEPLOYMENT.md](DEPLOYMENT.md) - Production deployment guide
- [docs/SECURITY.md](docs/SECURITY.md) - Security audit
- [docs/TESTING_GUIDE.md](docs/TESTING_GUIDE.md) - Testing guide
- [src/database/README.md](src/database/README.md) - Database schema

---

## 🚀 Development Scripts

```bash
bun run dev        # Development server
bun run start      # Production server
bun run typecheck  # Type check
bun run lint       # Code lint
```

---

## 📄 License

Developed for **Politeknik Baja Tegal** - Library Management System

---

## ✍️ Author

**Ariyan Andryan Aryja**  
Politeknik Baja Tegal - Teknik Informatika

---

**Built with ❤️ using ElysiaJS and TypeScript**
