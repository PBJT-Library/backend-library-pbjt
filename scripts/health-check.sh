#!/bin/bash
set -e

# Health check script for PBJT Backend Library

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
API_URL="${API_URL:-http://localhost:3000}"
MAX_RETRIES=5
RETRY_DELAY=5

echo -e "${YELLOW}🏥 Running health checks...${NC}"

# Function to check API health
check_api() {
    local retries=0
    while [ $retries -lt $MAX_RETRIES ]; do
        if curl -f -s "${API_URL}/pbjt-library-api" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ API is healthy${NC}"
            return 0
        fi
        retries=$((retries + 1))
        if [ $retries -lt $MAX_RETRIES ]; then
            echo -e "${YELLOW}⏳ API not ready, retrying in ${RETRY_DELAY}s... (${retries}/${MAX_RETRIES})${NC}"
            sleep $RETRY_DELAY
        fi
    done
    echo -e "${RED}❌ API health check failed after ${MAX_RETRIES} attempts${NC}"
    return 1
}

# Function to check database
check_database() {
    if [ -f .env.production ]; then
        export $(cat .env.production | grep -v '^#' | xargs)
    fi
    
    CONTAINER_NAME="pbjt-postgres-prod"
    DB_NAME="${DB_NAME:-library_db}"
    DB_USER="${DB_USER:-postgres}"
    
    if docker exec "$CONTAINER_NAME" pg_isready -U "$DB_USER" -d "$DB_NAME" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Database is healthy${NC}"
        return 0
    else
        echo -e "${RED}❌ Database health check failed${NC}"
        return 1
    fi
}

# Function to check container status
check_containers() {
    COMPOSE_FILE="docker-compose.prod.yml"
    
    # Check if all containers are running
    if docker-compose -f "$COMPOSE_FILE" ps | grep -q "Up"; then
        echo -e "${GREEN}✅ Containers are running${NC}"
        
        # Show container status
        echo -e "${YELLOW}📊 Container status:${NC}"
        docker-compose -f "$COMPOSE_FILE" ps
        return 0
    else
        echo -e "${RED}❌ Some containers are not running${NC}"
        docker-compose -f "$COMPOSE_FILE" ps
        return 1
    fi
}

# Run all health checks
FAILED=0

check_containers || FAILED=1
check_database || FAILED=1
check_api || FAILED=1

# Summary
echo ""
echo "================================"
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All health checks passed!${NC}"
    echo "================================"
    exit 0
else
    echo -e "${RED}❌ Some health checks failed!${NC}"
    echo "================================"
    exit 1
fi
