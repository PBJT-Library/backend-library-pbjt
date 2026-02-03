#!/bin/bash
# ============================================
# Database Initialization Script
# Run this script to initialize database schema
# Uses Docker exec to run psql inside PostgreSQL container
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

# Database parameters
DB_NAME="${DB_NAME:-library_db}"
DB_USER="${DB_USER:-postgres}"
POSTGRES_CONTAINER="library-api-postgres"

echo "📋 Configuration:"
echo "   Database: $DB_NAME"
echo "   User: $DB_USER"
echo "   Container: $POSTGRES_CONTAINER"
echo ""

# Check if PostgreSQL container is running
if ! docker ps | grep -q "$POSTGRES_CONTAINER"; then
    echo "❌ Error: PostgreSQL container '$POSTGRES_CONTAINER' is not running!"
    echo "Please start the containers first: docker compose up -d"
    exit 1
fi

# Check if database exists
echo "🔍 Checking if database exists..."
DB_EXISTS=$(docker exec $POSTGRES_CONTAINER psql -U $DB_USER -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" postgres 2>/dev/null || echo "")

if [ -z "$DB_EXISTS" ]; then
    echo "📦 Creating database: $DB_NAME"
    docker exec $POSTGRES_CONTAINER psql -U $DB_USER -c "CREATE DATABASE $DB_NAME;" postgres
    echo "✅ Database created"
else
    echo "ℹ️  Database already exists"
fi

# Check if tables exist
echo ""
echo "🔍 Checking if schema is initialized..."
TABLES_EXIST=$(docker exec $POSTGRES_CONTAINER psql -U $DB_USER -d $DB_NAME -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='admins';" 2>/dev/null || echo "0")

if [ "$TABLES_EXIST" = "0" ]; then
    echo "📋 Running schema initialization..."
    
    # Copy schema file into container and execute
    docker cp src/database/schema.sql $POSTGRES_CONTAINER:/tmp/schema.sql
    docker exec $POSTGRES_CONTAINER psql -U $DB_USER -d $DB_NAME -f /tmp/schema.sql
    docker exec $POSTGRES_CONTAINER rm /tmp/schema.sql
    
    echo ""
    echo "✅ Database schema initialized successfully!"
    echo ""
    echo "📊 Database Statistics:"
    docker exec $POSTGRES_CONTAINER psql -U $DB_USER -d $DB_NAME -c "
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
    echo ""
    echo "📊 Current Database Statistics:"
    docker exec $POSTGRES_CONTAINER psql -U $DB_USER -d $DB_NAME -c "
        SELECT 
            (SELECT COUNT(*) FROM public.admins) as admins,
            (SELECT COUNT(*) FROM public.categories) as categories,
            (SELECT COUNT(*) FROM public.members) as members,
            (SELECT COUNT(*) FROM public.books) as books;
    "
fi

echo ""
echo "✅ Initialization complete!"
