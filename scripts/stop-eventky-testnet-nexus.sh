#!/bin/bash

# Script to stop Eventky development environment
# Usage: ./stop-eventky-testnet-nexus.sh

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Stopping Eventky Development Environment${NC}"
echo "=========================================="
echo ""

# Kill tmux session if it exists
if tmux has-session -t eventky-dev 2>/dev/null; then
    echo -e "${YELLOW}Stopping tmux session 'eventky-dev'...${NC}"
    tmux kill-session -t eventky-dev
    echo -e "${GREEN}✓ Tmux session stopped${NC}"
else
    echo -e "${YELLOW}No tmux session found${NC}"
fi

# Stop PostgreSQL
echo -e "${YELLOW}Stopping PostgreSQL...${NC}"
if docker ps -a --format '{{.Names}}' | grep -q "^eventky-postgres$"; then
    docker stop eventky-postgres
    echo -e "${GREEN}✓ PostgreSQL stopped${NC}"
else
    echo -e "${YELLOW}PostgreSQL container not found${NC}"
fi

# Stop Neo4j and Redis from pubky-nexus
echo -e "${YELLOW}Stopping Neo4j and Redis...${NC}"
cd /home/gil/Repositories/pubky-nexus/docker
docker compose stop neo4j redis
echo -e "${GREEN}✓ Neo4j and Redis stopped${NC}"

echo ""
echo -e "${GREEN}✓ All services stopped${NC}"
echo ""
echo "To remove containers and volumes:"
echo "  - Remove PostgreSQL: docker rm eventky-postgres"
echo "  - Remove PostgreSQL data: docker volume rm eventky-postgres-data"
echo "  - Remove Neo4j/Redis: cd /home/gil/Repositories/pubky-nexus/docker && docker compose down -v"
