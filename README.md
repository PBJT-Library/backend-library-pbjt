# PBJT Library Backend API

> **Modern REST API** untuk sistem manajemen perpustakaan dengan ElysiaJS, TypeScript, dan PostgreSQL

[![Elysia](https://img.shields.io/badge/Elysia-Latest-orange.svg)](https://elysiajs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg?logo=typescript)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue.svg?logo=postgresql)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg?logo=docker)](https://www.docker.com/)
[![Security](https://img.shields.io/badge/Security-A-brightgreen.svg)](docs/SECURITY.md)

---

## 📋 Overview

Backend API untuk aplikasi **Perpustakaan Desktop** yang mengelola data **Buku**, **Anggota**, **Peminjaman**, **Kategori**, serta **Autentikasi Admin** dengan fitur JWT authentication, rate limiting, dan Redis caching.

**Key Features:**
- ✅ RESTful API with comprehensive Swagger documentation
- ✅ JWT-based authentication with role-based access control
- ✅ Redis caching & rate limiting
- ✅ PostgreSQL database with optimized schema
- ✅ Docker-ready with production-grade configuration
- ✅ CI/CD pipeline with automated deployment
- ✅ Production-ready security measures

---

## 🚀 Tech Stack

| Category | Technology |
|----------|-----------|
| **Runtime** | [Bun](https://bun.sh) |
| **Framework** | [ElysiaJS](https://elysiajs.com) |
| **Language** | [TypeScript 5.8](https://www.typescriptlang.org) |
| **ORM** | [Prisma 5.22](https://www.prisma.io) ✨ |
| **Database** | [PostgreSQL 16](https://www.postgresql.org) |
| **Cache** | [Redis 7](https://redis.io) |
| **Authentication** | JWT + bcrypt |
| **Deployment** | Docker + GitHub Actions |
| **Reverse Proxy** | Nginx + Let's Encrypt |

---

## 📂 Project Structure

```
backend-library/
├── src/
│   ├── modules/          # Feature modules
│   │   ├── admin/       # Admin auth & management
│   │   ├── books/       # Book catalog & inventory
│   │   ├── members/     # Member management
│   │   ├── loans/       # Loan transactions
│   │   └── categories/  # Book categories
│   ├── config/          # Configuration
│   │   ├── db.ts       # Database connection
│   │   └── env.ts      # Environment variables
│   ├── middleware/      # Custom middleware
│   │   ├── auth.middleware.ts
│   │   ├── error.middleware.ts
│   │   └── rate-limiter.middleware.ts
│   ├── utils/          # Utility functions
│   └── app.ts          # Main application
├── database/           # Database schemas
│   └── schema.sql     # PostgreSQL schema
├── docs/              # Documentation
│   ├── SECURITY.md    # Security overview
│   ├── TESTING_GUIDE.md
│   └── deployment/    # Deployment guides
├── .github/workflows/ # CI/CD pipelines
├── docker-compose.yml # Production Docker config
├── Dockerfile         # Application container
└── README.md         # This file
```

---

## ⚙️ Installation & Setup

### Prerequisites

- [Bun](https://bun.sh) v1.0 or higher
- [PostgreSQL](https://www.postgresql.org) 16
- [Redis](https://redis.io) 7 (optional, for rate limiting & caching)
- [Docker](https://www.docker.com) (for containerized deployment)

### Quick Start (Local Development)

1. **Clone Repository**
   ```bash
   git clone https://github.com/PBJT-Library/backend-library-pbjt.git
   cd backend-library-pbjt
   ```

2. **Install Dependencies**
   ```bash
   bun install
   ```

3. **Configure Environment**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   # App Settings
   APP_PORT=3000
   APP_ENV=development
   
   # Database
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=pbjt_library
   DB_USER=postgres
   DB_PASSWORD=your_secure_password
   
   # JWT
   JWT_SECRET=your_32_char_random_secret_here
   JWT_EXPIRES_IN=7d
   
   # Redis (optional for development)
   REDIS_HOST=localhost
   REDIS_PORT=6379
   REDIS_PASSWORD=your_redis_password
   
   # Security
   ALLOWED_ORIGINS=http://localhost:5173
   RATE_LIMIT_MAX=100
   RATE_LIMIT_AUTH_MAX=5
   ```

4. **Setup Database**
   ```bash
   # Create database
   createdb pbjt_library
   
   # Run migrations
   psql -U postgres -d pbjt_library -f database/schema.sql
   ```

5. **Generate Prisma Client**
   ```bash
   bunx prisma generate
   ```

6. **Run Development Server**
   ```bash
   bun run dev
   ```
   
   Server runs at: **http://localhost:3000**  
   Swagger UI: **http://localhost:3000/pbjt-library-api**

---

## 🐳 Docker Deployment

### Quick Start with Docker Compose

```bash
# Start all services (PostgreSQL + Redis + Backend)
docker compose up -d

# View logs
docker compose logs -f backend

# Stop services
docker compose down
```

**Included Services:**
- **PostgreSQL 16** - Database with persistent volume
- **Redis 7** - Caching & rate limiting
- **Backend API** - ElysiaJS application

### Production Deployment

For complete production setup with Nginx, SSL, and Tailscale:

📖 **See [DEPLOYMENT.md](DEPLOYMENT.md)** for detailed instructions

---

## 📌 API Endpoints

### Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/admin/register` | Register new admin | ❌ |
| POST | `/admin/login` | Admin login | ❌ |
| GET | `/admin/me` | Get current admin | ✅ |
| PUT | `/admin/me` | Update admin profile | ✅ |
| PUT | `/admin/me/password` | Change password | ✅ |
| POST | `/admin/logout` | Logout (blacklist token) | ✅ |

### Categories

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/categories` | List all categories | ❌ |
| GET | `/categories/:id` | Get category by ID | ❌ |
| POST | `/categories` | Create category | ✅ |
| PUT | `/categories/:id` | Update category | ✅ |
| DELETE | `/categories/:id` | Delete category | ✅ |

### Books

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/books` | List all books | ❌ |
| GET | `/books/:uuid` | Get book by UUID | ❌ |
| POST | `/books` | Add new book | ✅ |
| PUT | `/books/:uuid` | Update book | ✅ |
| DELETE | `/books/:uuid` | Delete book | ✅ |

**Note:** Books use dual-table design:
- `book_catalog` - Book metadata (title, author, ISBN, etc.)
- `book_inventory` - Physical copies with availability tracking

### Members

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/members` | List all members | ❌ |
| GET | `/members/:uuid` | Get member by UUID | ❌ |
| POST | `/members` | Register member | ✅ |
| PUT | `/members/:uuid` | Update member | ✅ |
| DELETE | `/members/:uuid` | Delete member | ✅ |

### Loans

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/loans` | List all loans | ❌ |
| GET | `/loans/:id` | Get loan by ID | ❌ |
| POST | `/loans` | Create loan | ✅ |
| PUT | `/loans/:id` | Update loan | ✅ |
| DELETE | `/loans/:id` | Delete loan | ✅ |

**Loan Statuses:**
- `borrowed` - Book currently loaned
- `returned` - Book returned on time
- `overdue` - Book not returned by due date

### System

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/health` | Health check | ❌ |
| GET | `/pbjt-library-api` | Swagger documentation | ⚠️ Basic Auth (production) |

---

## 🧪 Testing

### Manual Testing with cURL

**Register Admin:**
```bash
curl -X POST http://localhost:3000/admin/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "SecurePassword123!"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:3000/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "SecurePassword123!"
  }'
```

**Create Category (with JWT token):**
```bash
curl -X POST http://localhost:3000/categories \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Fiction",
    "description": "Fictional books"
  }'
```

### Automated Testing

```bash
# Type checking
bun run typecheck

# Linting
bun run lint

# Run all checks
bun run typecheck && bun run lint
```

For comprehensive testing guide, see **[docs/TESTING_GUIDE.md](docs/TESTING_GUIDE.md)**

---

## 🔒 Security

This backend implements production-grade security:

- ✅ **Authentication**: JWT tokens with 7-day expiration
- ✅ **Password Security**: bcrypt hashing (10 rounds)
- ✅ **Rate Limiting**: 100 req/min global, 5 req/min auth
- ✅ **SQL Injection**: Parameterized queries
- ✅ **CORS**: Configurable origin whitelist
- ✅ **Token Revocation**: Redis-based blacklisting
- ✅ **Security Headers**: X-Frame-Options, CSP, etc.
- ✅ **Error Handling**: No stack trace leaks in production

**Security Score: A** (Production Ready)

📖 **Full security audit:** [docs/SECURITY.md](docs/SECURITY.md)

---

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [README.md](README.md) | This file - Getting started guide |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Production deployment guide (Proxmox + Docker + Nginx) |
| [docs/SECURITY.md](docs/SECURITY.md) | Comprehensive security audit & best practices |
| [docs/TESTING_GUIDE.md](docs/TESTING_GUIDE.md) | Testing procedures and quality assurance |
| [database/README.md](database/README.md) | Database schema documentation |
| [.github/workflows/](..github/workflows/) | CI/CD pipeline configuration |

---

## 🚀 CI/CD Pipeline

GitHub Actions workflow automatically:

1. **Build Stage**
   - Type checks TypeScript code
   - Runs ESLint for code quality
   - Builds multi-platform Docker image
   - Pushes to GitHub Container Registry

2. **Deploy Stage**
   - Backs up database before deployment
   - Pulls pre-built image to server via Tailscale SSH
   - Updates containers with zero-downtime strategy
   - Verifies health checks
   - Automatic rollback on failure

**Deployment Targets:**
- `main` branch → Production server
- `test-deployment` branch → Staging environment

---

## 🛠️ Development

### Available Scripts

```bash
# Development
bun run dev          # Start dev server with hot reload

# Quality Checks
bun run typecheck    # TypeScript type checking
bun run lint         # ESLint code quality check

# Production
bun run start        # Start production server
```

### Code Structure Guidelines

- **Modular architecture**: Each feature in its own module
- **Repository pattern**: Separation of data access logic
- **Service layer**: Business logic isolated from routes
- **Type safety**: Strict TypeScript configuration
- **Error handling**: Centralized error middleware

---

## 🌐 Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `APP_PORT` | Application port | `3000` |
| `APP_ENV` | Environment mode | `development` or `production` |
| `DB_HOST` | PostgreSQL host | `localhost` or `postgres` (Docker) |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_NAME` | Database name | `pbjt_library` |
| `DB_USER` | Database user | `postgres` |
| `DB_PASSWORD` | Database password | `your_secure_password` |
| `JWT_SECRET` | JWT signing secret | 32+ random characters |
| `JWT_EXPIRES_IN` | Token expiration | `7d` (7 days) |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `REDIS_HOST` | Redis host | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `REDIS_PASSWORD` | Redis password | - |
| `ALLOWED_ORIGINS` | CORS origins | `*` (dev), specific domain (prod) |
| `RATE_LIMIT_MAX` | Global rate limit | `100` |
| `RATE_LIMIT_AUTH_MAX` | Auth rate limit | `5` |
| `SWAGGER_ENABLED` | Enable Swagger UI | `true` |
| `SWAGGER_USERNAME` | Swagger basic auth user | `admin` |
| `SWAGGER_PASSWORD` | Swagger basic auth password | - |

See [.env.example](.env.example) for complete configuration template.

---

## 📄 License

This project is developed for **Politeknik Baja Tegal** - Library Management System.

---

## ✍️ Author

**Ariyan Andryan Aryja**  
Politeknik Baja Tegal - Teknik Informatika

---

## 🤝 Contributing

This is an academic project for PBJT (Politeknik Baja Tegal). For issues or suggestions, please contact the development team.

---

## 📞 Support

- **Technical Issues**: Check [docs/TESTING_GUIDE.md](docs/TESTING_GUIDE.md#troubleshooting)
- **Deployment Help**: See [DEPLOYMENT.md](DEPLOYMENT.md#troubleshooting)
- **Security Concerns**: Review [docs/SECURITY.md](docs/SECURITY.md)

---

**Built with ❤️ using ElysiaJS and TypeScript**
