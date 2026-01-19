# Database Setup

This folder contains the production-ready database schema for the PBJT Library Backend.

## Files

- `schema.sql` - Complete database schema with all tables, constraints, and indexes

## Schema Overview

### Tables

1. **admins** - Admin users with JWT token versioning
2. **books** - Book catalog with stock management  
3. **members** - Library members
4. **loans** - Book borrowing records

### Features

- ✅ UUIDs for all primary keys
- ✅ Token versioning for admin authentication (security feature)
- ✅ Auto-generated loan IDs (LN001, LN002, etc.)
- ✅ Stock validation with check constraints
- ✅ Foreign key relationships with ON DELETE RESTRICT
- ✅ Indexes on frequently queried columns

---

## Fresh Installation

For new deployments, run the complete schema:

```bash
# Using psql
psql -U your_username -d library_db -f database/schema.sql

# Using docker-compose
docker-compose exec postgres psql -U postgres -d library_db -f /database/schema.sql
```

---

## Migration from Existing Database

If you have an existing database without token versioning, see [MIGRATION.md](../MIGRATION.md) for upgrade instructions.

Quick migration:
```sql
ALTER TABLE admins ADD COLUMN token_version integer DEFAULT 1 NOT NULL;
```

---

## Environment Setup

Make sure your `.env` file has database credentials:

```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=library_db
DB_USER=postgres
DB_PASSWORD=your_password
```

---

## Verification

After running the schema, verify tables were created:

```sql
-- List all tables
\dt

-- Check admin table structure
\d admins

-- Verify token_version column exists
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'admins' AND column_name = 'token_version';
```

---

## Notes

- **Token Versioning**: The `token_version` field enables automatic JWT invalidation when admins change passwords
- **Stock Management**: Books table has stock validation (cannot be negative)
- **Loan Tracking**: Loans automatically generate sequential IDs (LN001, LN002, etc.)
- **Data Integrity**: Foreign keys prevent orphaned records

---

For deployment instructions, see [DEPLOYMENT.md](../DEPLOYMENT.md)
