#!/usr/bin/env bash
# Database Migration Script - v1 to v2
# Run this script to migrate from single books table to catalog + inventory

set -e  # Exit on error

echo "========================================="
echo "PBJT Library Database Migration v1 to v2"
echo "========================================="
echo ""

# Database connection details from .env
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-library_db}"
DB_USER="${DB_USER:-postgres}"

echo "Database: $DB_NAME"
echo "Host: $DB_HOST:$DB_PORT"
echo "User: $DB_USER"
echo ""

# Confirm before proceeding
read -p "⚠️  This will modify your database. Have you backed up? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "❌ Migration cancelled."
    exit 1
fi

echo ""
echo "Step 1: Creating backup tables..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
    CREATE TABLE IF NOT EXISTS books_backup AS SELECT * FROM books;
    CREATE TABLE IF NOT EXISTS loans_backup AS SELECT * FROM loans;
"
echo "✅ Backup created"

echo ""
echo "Step 2: Creating new schema (catalog + inventory)..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$(dirname "$0")/../src/database/schema_v2.sql"
echo "✅ Schema created"

echo ""
echo "Step 3: Running migration..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$(dirname "$0")/../src/database/migration_v1_to_v2.sql"
echo "✅ Migration completed"

echo ""
echo "========================================="
echo "Migration Summary"
echo "========================================="
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
    SELECT 
        (SELECT COUNT(*) FROM book_catalog) as catalog_count,
        (SELECT COUNT(*) FROM book_inventory) as inventory_count,
        (SELECT COUNT(*) FROM books_backup) as original_books,
        (SELECT COUNT(*) FROM loans WHERE inventory_id IS NOT NULL) as loans_migrated;
"

echo ""
echo "✅ Migration completed successfully!"
echo ""
echo "⚠️  IMPORTANT: Test your application before dropping backup tables"
echo "   To rollback: psql -d $DB_NAME -f rollback.sql"
echo ""
