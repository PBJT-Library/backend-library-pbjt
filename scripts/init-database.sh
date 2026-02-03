#!/bin/bash
# ============================================
# Database Initialization Script
# Run this script to initialize database schema
# ============================================

set -e  # Exit on error

echo "🔧 Library API - Database Initialization"
echo "=========================================="

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create .env file with database credentials"
    exit 1
fi

# Load environment variables
source .env

# Database connection parameters
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-library_db}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD}"

echo "📋 Configuration:"
echo "   Database: $DB_NAME"
echo "   Host: $DB_HOST:$DB_PORT"
echo "   User: $DB_USER"
echo ""

# Check if database exists
echo "🔍 Checking if database exists..."
DB_EXISTS=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" postgres 2>/dev/null || echo "")

if [ -z "$DB_EXISTS" ]; then
    echo "📦 Creating database: $DB_NAME"
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c "CREATE DATABASE $DB_NAME;" postgres
    echo "✅ Database created"
else
    echo "ℹ️  Database already exists"
fi

# Check if tables exist
echo ""
echo "🔍 Checking if schema is initialized..."
TABLES_EXIST=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='admins';" 2>/dev/null || echo "0")

if [ "$TABLES_EXIST" = "0" ]; then
    echo "📋 Running schema initialization..."
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f src/database/schema.sql
    
    echo ""
    echo "✅ Database schema initialized successfully!"
    echo ""
    echo "📊 Database Statistics:"
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
        SELECT 
            (SELECT COUNT(*) FROM public.admins) as admins,
            (SELECT COUNT(*) FROM public.categories) as categories,
            (SELECT COUNT(*) FROM public.members) as members,
            (SELECT COUNT(*) FROM public.books) as books;
    "
    
    echo ""
    echo "🔐 Default Admin Credentials:"
    echo "   Username: admin"
    echo "   Password: admin"
    echo ""
    echo "⚠️  IMPORTANT: Change default password in production!"
else
    echo "⚠️  Schema already initialized. Skipping..."
    echo "   To reinitialize, please drop the database first:"
    echo "   PGPASSWORD=\$DB_PASSWORD psql -h \$DB_HOST -p \$DB_PORT -U \$DB_USER -c \"DROP DATABASE $DB_NAME;\" postgres"
fi

echo ""
echo "✅ Initialization complete!"
