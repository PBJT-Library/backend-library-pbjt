# PBJT Backend Library

Backend untuk aplikasi **Perpustakaan Desktop**, dibangun menggunakan **Elysia.js**, **TypeScript**, dan **PostgreSQL**.  
Backend ini mengelola data **Buku**, **Member**, **Peminjaman**, serta **Admin Authorization**.

[![Elysia](https://img.shields.io/badge/Elysia-Latest-orange.svg)](https://elysiajs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.2-blue.svg?logo=typescript)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16.11-blue.svg?logo=postgresql)](https://www.postgresql.org/)

## 🚀 Tech Stack

- **Runtime**: Bun
- **Framework**: Elysia.js
- **Language**: TypeScript
- **Database**: PostgreSQL 16
- **Authentication**: JWT
- **Password Hashing**: bcrypt

## 📂 Project Structure

```bash
backend-library/
├── src/
│   ├── modules/
│   │   ├── book/
│   │   │   ├── book.model.ts
│   │   │   ├── book.repository.ts
│   │   │   ├── book.service.ts
│   │   │   └── book.route.ts
│   │   │
│   │   ├── member/
│   │   │   ├── member.model.ts
│   │   │   ├── member.repository.ts
│   │   │   ├── member.service.ts
│   │   │   └── member.route.ts
│   │   │
│   │   │── loan/
│   │   │   ├── loan.model.ts
│   │   │   ├── loan.repository.ts
│   │   │   ├── loan.service.ts
│   │   │   └── loan.route.ts
│   │   │
│   │   └── admin/
│   │       ├── admin.model.ts
│   │       ├── admin.repository.ts
│   │       ├── auth.service.ts
│   │       └── admin.route.ts
│   │
│   ├── config/
│   │   ├── db.ts
│   │   └── env.ts
│   │
│   ├── database/
│   │   └── schema.sql
│   │
│   └── app.ts
├── .env.example
├── .gitignore
├── bun.lockb
├── package.json
├── README.md
└── tsconfig.json
```

## ⚙️ Installation & Setup

### 📥 Clone Repository

```bash
git clone https://github.com/Ryanz23/library-pbjt.git
cd library-pbjt
```

### 📦 Install Dependencies

```bash
bun install
```

### 🔐 Konfigurasi Environment

```bash
cp .env.example .env
```

Sesuaikan isi `.env`:

```bash
# App Settings
APP_PORT=3000
APP_ENV=development

# Database Settings
DB_HOST=
DB_PORT=
DB_NAME=
DB_USER=
DB_PASSWORD=

# JWT Settings
JWT_SECRET=secret-token-here
JWT_EXPIRES_IN=1d
```

### 🗄️ Setup Database

```bash
psql -U postgres -c "CREATE DATABASE library_db;" && \
psql -U postgres -d library_db -f schema.sql
```

### ▶️ Run Server

```bash
bun run dev
```

Server akan berjalan di:

```bash
http://localhost:3000
```

## 🐳 Docker Deployment

### Quick Start dengan Docker

```bash
# Development
docker compose up -d

# Production
docker compose -f docker-compose.prod.yml up -d
```

### CI/CD Deployment

Project ini sudah dilengkapi dengan GitHub Actions untuk automated deployment ke Debian server:

- ✅ Auto build Docker image (multi-platform)
- ✅ Push ke GitHub Container Registry
- ✅ Deploy via Tailscale SSH
- ✅ Database backup otomatis
- ✅ Health checks & rollback

**Untuk panduan lengkap deployment, lihat [DEPLOYMENT.md](./DEPLOYMENT.md)**

## 📌 API Endpoints

### 📚 Books

```md
| Method | Endpoint     | Description      |
| ------ | ------------ | ---------------- |
| GET    | `/books`     | Ambil semua buku |
| GET    | `/books/:id` | Ambil buku (id)  |
| POST   | `/books`     | Tambah buku      |
| PUT    | `/books/:id` | Update buku (id) |
| DELETE | `/books/:id` | Hapus buku (id)  |
```

### 👤 Members

```md
| Method | Endpoint       | Description        |
| ------ | -------------- | ------------------ |
| GET    | `/members`     | Ambil semua member |
| GET    | `/members/:id` | Ambil member (id)  |
| POST   | `/members`     | Tambah member      |
| PUT    | `/members/:id` | Update member (id) |
| DELETE | `/members/:id` | Hapus member (id)  |
```

### 🔁 Loans

```md
| Method | Endpoint     | Description          |
| ------ | ------------ | -------------------- |
| GET    | `/loans`     | Ambil semua data     |
| GET    | `/loans/:id` | Ambil data (id)      |
| POST   | `/loans`     | Tambah pinjaman      |
| PUT    | `/loans/:id` | Update pinjaman (id) |
| DELETE | `/loans/:id` | Hapus pinjaman (id)  |
```

### 🛡️ Admin

```md
| Method | Endpoint          | Description       |
| ------ | ----------------- | ----------------- |
| GET    | `/admin/me`       | Ambil data admin  |
| POST   | `/admin/register` | Tambah admin baru |
| POST   | `/admin/login`    | Login admin       |
| PUT    | `/admin/me`       | Update admin      |
| PUT    | `/admin/me/pass`  | Change password   |
```

## 🧪 Testing (cURL)

```bash
curl -X POST http://localhost:3000/members \
-H "Content-Type: application/json" \
-d '{
  "id": "MB001",
  "name": "Your Name",
  "study_program": "Study Program",
  "semester": 1
}'
```

## ✍️ Author

Ariyan Andryan Aryja - Politeknik Baja Tegal - Teknik Informatika
