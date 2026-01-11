#!/bin/bash
set -e

# Deployment script for PBJT Backend Library
# This script handles the complete deployment process on Debian server

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.production"
BACKUP_DIR="./backups"
IMAGE_NAME="${GITHUB_REPOSITORY:-username/backend-library}"
IMAGE_TAG="${IMAGE_TAG:-latest}"

echo -e "${GREEN}🚀 Starting deployment process...${NC}"

# Check if .env.production exists
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}❌ Error: $ENV_FILE not found!${NC}"
    echo "Please create $ENV_FILE with required environment variables."
    exit 1
fi

# Load environment variables
export $(cat $ENV_FILE | grep -v '^#' | xargs)

# Create backup directory if not exists
mkdir -p "$BACKUP_DIR"

# Step 1: Backup database
echo -e "${YELLOW}📦 Creating database backup...${NC}"
./scripts/backup-db.sh || {
    echo -e "${RED}❌ Backup failed!${NC}"
    exit 1
}
echo -e "${GREEN}✅ Backup completed${NC}"

# Step 2: Pull latest Docker image
echo -e "${YELLOW}📥 Pulling latest Docker image...${NC}"
docker pull "ghcr.io/${IMAGE_NAME}:${IMAGE_TAG}" || {
    echo -e "${RED}❌ Failed to pull image!${NC}"
    exit 1
}
echo -e "${GREEN}✅ Image pulled successfully${NC}"

# Step 3: Stop old containers gracefully
echo -e "${YELLOW}🛑 Stopping old containers...${NC}"
docker-compose -f "$COMPOSE_FILE" down --timeout 30 || {
    echo -e "${YELLOW}⚠️  Warning: Failed to stop containers gracefully${NC}"
}

# Step 4: Start new containers
echo -e "${YELLOW}🚀 Starting new containers...${NC}"
docker-compose -f "$COMPOSE_FILE" up -d || {
    echo -e "${RED}❌ Failed to start containers!${NC}"
    echo -e "${YELLOW}🔄 Attempting rollback...${NC}"
    ./scripts/rollback.sh
    exit 1
}

# Step 5: Wait for services to be healthy
echo -e "${YELLOW}⏳ Waiting for services to be healthy...${NC}"
sleep 10

# Step 6: Health check
echo -e "${YELLOW}🏥 Running health checks...${NC}"
./scripts/health-check.sh || {
    echo -e "${RED}❌ Health check failed!${NC}"
    echo -e "${YELLOW}🔄 Attempting rollback...${NC}"
    ./scripts/rollback.sh
    exit 1
}

# Step 7: Cleanup old images
echo -e "${YELLOW}🧹 Cleaning up old images...${NC}"
docker image prune -f

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo -e "${GREEN}🎉 Backend is now running on the latest version${NC}"

# Show running containers
echo -e "${YELLOW}📊 Running containers:${NC}"
docker-compose -f "$COMPOSE_FILE" ps
