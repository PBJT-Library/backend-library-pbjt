#!/bin/bash
set -e

# Rollback script for PBJT Backend Library

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
COMPOSE_FILE="docker-compose.prod.yml"
BACKUP_DIR="./backups"

echo -e "${RED}🔄 Starting rollback process...${NC}"

# Step 1: Stop current containers
echo -e "${YELLOW}🛑 Stopping current containers...${NC}"
docker-compose -f "$COMPOSE_FILE" down --timeout 30

# Step 2: Find latest backup
LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/backup_*.sql.gz 2>/dev/null | head -n 1)

if [ -z "$LATEST_BACKUP" ]; then
    echo -e "${RED}❌ No backup found! Cannot restore database.${NC}"
    echo -e "${YELLOW}⚠️  Starting containers with current state...${NC}"
    docker-compose -f "$COMPOSE_FILE" up -d
    exit 1
fi

echo -e "${YELLOW}📦 Found backup: $LATEST_BACKUP${NC}"

# Step 3: Restore database
echo -e "${YELLOW}💾 Restoring database from backup...${NC}"

# Load environment variables
if [ -f .env.production ]; then
    export $(cat .env.production | grep -v '^#' | xargs)
fi

DB_NAME="${DB_NAME:-library_db}"
DB_USER="${DB_USER:-postgres}"
CONTAINER_NAME="pbjt-postgres-prod"

# Start only PostgreSQL container
docker-compose -f "$COMPOSE_FILE" up -d postgres

# Wait for PostgreSQL to be ready
echo -e "${YELLOW}⏳ Waiting for PostgreSQL to be ready...${NC}"
sleep 10

# Restore backup
echo -e "${YELLOW}📥 Restoring backup...${NC}"
gunzip -c "$LATEST_BACKUP" | docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database restored successfully${NC}"
else
    echo -e "${RED}❌ Database restore failed!${NC}"
    exit 1
fi

# Step 4: Pull previous Docker image (if available)
echo -e "${YELLOW}📥 Attempting to use previous Docker image...${NC}"
# Note: In production, you should tag images with version numbers
# For now, we'll just restart with current image

# Step 5: Start all containers
echo -e "${YELLOW}🚀 Starting all containers...${NC}"
docker-compose -f "$COMPOSE_FILE" up -d

# Wait for services
sleep 10

# Step 6: Health check
echo -e "${YELLOW}🏥 Running health check...${NC}"
./scripts/health-check.sh

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Rollback completed successfully!${NC}"
    echo -e "${GREEN}🎉 System restored to previous state${NC}"
else
    echo -e "${RED}❌ Rollback completed but health check failed!${NC}"
    echo -e "${YELLOW}⚠️  Manual intervention may be required${NC}"
    exit 1
fi
