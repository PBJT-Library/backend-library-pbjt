#!/bin/bash
set -e

# Database initialization script for Docker
# This script will be executed when PostgreSQL container starts for the first time

echo "🚀 Initializing PBJT Library Database..."

# Wait for PostgreSQL to be ready
until pg_isready -U "${POSTGRES_USER}" -d "${POSTGRES_DB}"; do
  echo "⏳ Waiting for PostgreSQL to be ready..."
  sleep 2
done

echo "✅ PostgreSQL is ready!"

# Check if database is already initialized
INITIALIZED=$(psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='admins';")

if [ "$INITIALIZED" -eq "0" ]; then
  echo "📦 Database not initialized. Running schema.sql..."
  
  # Execute schema.sql if it exists
  if [ -f /docker-entrypoint-initdb.d/01-schema.sql ]; then
    psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -f /docker-entrypoint-initdb.d/01-schema.sql
    echo "✅ Schema initialized successfully!"
  else
    echo "⚠️  Warning: schema.sql not found!"
  fi
  
  # Optional: Insert default admin user (uncomment if needed)
  # echo "👤 Creating default admin user..."
  # psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" <<-EOSQL
  #   INSERT INTO admins (username, password) 
  #   VALUES ('admin', '\$2b\$10\$YourHashedPasswordHere')
  #   ON CONFLICT (username) DO NOTHING;
  # EOSQL
  
  echo "🎉 Database initialization completed!"
else
  echo "ℹ️  Database already initialized. Skipping schema creation."
fi

echo "✨ Database is ready for use!"
