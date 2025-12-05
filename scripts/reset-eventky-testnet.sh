#!/bin/bash

# Script to fully reset Eventky development environment
# This will wipe all data and start fresh
# Usage: ./reset-eventky-testnet.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${RED}!!! FULL RESET WARNING !!!${NC}"
echo "This will:"
echo "  - Stop all services"
echo "  - Delete PostgreSQL database"
echo "  - Delete Neo4j graph database"
echo "  - Delete Redis cache (including cursor)"
echo "  - Remove all Docker volumes"
echo ""
read -p "Are you sure you want to continue? [y/N] " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
fi

echo ""
echo -e "${YELLOW}Stopping all services...${NC}"

# Kill tmux session if it exists
if tmux has-session -t eventky-dev 2>/dev/null; then
    echo -e "${YELLOW}Killing tmux session...${NC}"
    tmux kill-session -t eventky-dev
fi

# Stop and remove PostgreSQL
echo -e "${YELLOW}Removing PostgreSQL...${NC}"
docker stop eventky-postgres 2>/dev/null || true
docker rm eventky-postgres 2>/dev/null || true
docker volume rm eventky-postgres-data 2>/dev/null || true

# Stop and remove Neo4j and Redis with volumes
echo -e "${YELLOW}Removing Neo4j and Redis...${NC}"
cd /home/gil/Repositories/pubky-nexus/docker
docker compose down -v

echo ""
echo -e "${GREEN}✓ Full reset complete!${NC}"
echo ""
echo "You can now run: ./start-eventky-testnet-nexus.sh"
