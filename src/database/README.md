# Database Documentation

This folder provides documentation for the PBJT Library Backend database schema.

> **📍 Actual Schema Location:** `scripts/migrations/backup_schema_only.sql`

---

## Schema Location

The production database schema is located at:

```
backend-library/
└── scripts/
    └── migrations/
        ├── schema.sql              ← Production schema (SOURCE OF TRUTH)
        ├── backup_schema_only.sql  ← Latest production backup (schema only)
        ├── backup_data_only.sql    ← Latest production backup (data only)
        └── fresh_setup.bat         ← Windows setup utility
```

---

## Schema Overview

### Tables

1. **admins** - Admin users with JWT token versioning
2. **books** - Book catalog with status tracking
3. **categories** - Book categories (e.g., Fiction, Science, History)
4. **members** - Library members with semester tracking
5. **loans** - Loan transactions with status tracking
6. **loan_items** - Individual books in each loan (1:1 relationship)

### Key Features

- **SERIAL Primary Keys**: Auto-incrementing integers for all tables
- **UUID Support**: Secondary unique identifiers for API use
- **ENUM Types**: Type-safe status fields (`book_status`, `loan_status`)
- **Token Versioning**: Admin JWT invalidation on password change
- **Triggers**: Auto-update `updated_at` timestamps
- **Indexes**: Optimized for common queries (UUIDs, statuses, relationships)

---

## Data Types

### ENUMs

```sql
-- Book availability status
CREATE TYPE book_status AS ENUM (
    'available',   -- Ready to loan
    'loaned',      -- Currently borrowed
    'reserved',    -- Reserved by member
    'maintenance', -- Under repair
    'lost'         -- Missing/lost
);

-- Loan transaction status
CREATE TYPE loan_status AS ENUM (
    'active',      -- Currently active
    'completed',   -- Returned successfully
    'overdue'      -- Past due date
);
```

### ID Formats

- **Internal IDs**: SERIAL integers (1, 2, 3, ...)
- **UUIDs**: For API references (`uuid` field)
- **Human-Readable IDs**:
  - Books: `MAT000001`, `FIS000002` (category prefix + 6 digits)
  - Loans: `LN001`, `LN002` (auto-generated)
  - Members: `MBR001`, `MBR002`

---

## Fresh Installation

### Step 1: Create Database

```bash
# Local PostgreSQL
createdb library_db

# Or via Docker
docker-compose exec postgres createdb -U postgres library_db
```

### Step 2: Run Schema

```bash
# Local installation
psql -U postgres -d library_db -f scripts/migrations/schema.sql

# Docker installation
docker-compose exec postgres psql -U postgres -d library_db -f /app/scripts/migrations/schema.sql
```

### Step 3: Verify Installation

```sql
-- List all tables
\dt

-- Check ENUM types
\dT+

-- Verify admins table
\d admins

-- Verify triggers
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public';
```

---

## Environment Setup

Ensure your `.env` file has correct database credentials:

```env
DB_HOST=localhost          # or 'postgres' for Docker
DB_PORT=5432
DB_NAME=library_db         # Database name
DB_USER=postgres
DB_PASSWORD=your_password  # Change in production!
```

---

## Database Relationships

```
categories (1) ←──→ (N) books
members (1) ←──→ (N) loans
loans (1) ←──→ (1) loan_items
books (1) ←──→ (N) loan_items
```

### Foreign Key Constraints

- `books.category_id` → `categories.id` (SET NULL on delete)
- `loans.member_uuid` → `members.uuid` (CASCADE on delete)
- `loan_items.loan_id` → `loans.id` (CASCADE on delete)
- `loan_items.book_id` → `books.id` (CASCADE on delete)

---

## Backup & Restore

### Create Backup

```bash
# Schema only
pg_dump -h localhost -U postgres -d library_db --schema-only \
  -f scripts/migrations/backup_schema_only.sql

# Data only
pg_dump -h localhost -U postgres -d library_db --data-only \
  -f scripts/migrations/backup_data_only.sql

# Full backup
pg_dump -h localhost -U postgres -d library_db \
  -f scripts/migrations/backup_full.sql
```

### Restore from Backup

```bash
# Restore schema
psql -U postgres -d library_db -f scripts/migrations/backup_schema_only.sql

# Restore data
psql -U postgres -d library_db -f scripts/migrations/backup_data_only.sql
```

---

## Common Queries

### Check Database Structure

```sql
-- Table sizes
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Index usage
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

### Verify Data Integrity

```sql
-- Check for orphaned loan_items (should be 0)
SELECT COUNT(*) FROM loan_items li
LEFT JOIN loans l ON li.loan_id = l.id
WHERE l.id IS NULL;

-- Check for books without categories
SELECT book_id, title FROM books WHERE category_id IS NULL;
```

---

## Migration Notes

- This schema uses **SERIAL PKs** (not VARCHAR-based)
- Categories use **integer IDs** (not code-based PKs)
- Single `books` table (not dual-table catalog/inventory design)
- Requires PostgreSQL 16+ for full compatibility

---

## See Also

- [Main README](../../README.md) - Getting started guide
- [DEPLOYMENT.md](../../DEPLOYMENT.md) - Production deployment
- [SECURITY.md](../SECURITY.md) - Security best practices
