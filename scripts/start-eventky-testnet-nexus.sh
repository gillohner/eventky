#!/bin/bash

# Script to start Eventky development environment with Nexus and Pubky testnet
# Usage: ./start-eventky-testnet-nexus.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting Eventky Development Environment${NC}"
echo "=========================================="
echo ""

# Check if tmux is installed
if ! command -v tmux &> /dev/null; then
    echo -e "${RED}Error: tmux is not installed${NC}"
    echo "Install it with: sudo apt install tmux"
    exit 1
fi

# Check if docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: docker is not installed${NC}"
    echo "Install it with: https://docs.docker.com/engine/install/"
    exit 1
fi

# Start Neo4j and Redis from pubky-nexus/docker
echo -e "${GREEN}Starting Neo4j and Redis from pubky-nexus...${NC}"
cd /home/gil/Repositories/pubky-nexus/docker
if ! docker compose up -d neo4j redis; then
    echo -e "${RED}Error: Failed to start Neo4j and Redis${NC}"
    exit 1
fi

# Start PostgreSQL for testnet as standalone container
echo -e "${GREEN}Starting PostgreSQL for testnet...${NC}"
# Check if postgres container already exists
if docker ps -a --format '{{.Names}}' | grep -q "^eventky-postgres$"; then
    echo -e "${YELLOW}PostgreSQL container already exists, starting...${NC}"
    docker start eventky-postgres || {
        echo -e "${YELLOW}Container exists but failed to start, recreating...${NC}"
        docker rm -f eventky-postgres
        docker run -d \
            --name eventky-postgres \
            -e POSTGRES_USER=test_user \
            -e POSTGRES_PASSWORD=test_pass \
            -e POSTGRES_DB=pubky_homeserver \
            -p 5432:5432 \
            -v eventky-postgres-data:/var/lib/postgresql/data \
            postgres:17-alpine
    }
else
    echo -e "${GREEN}Creating new PostgreSQL container...${NC}"
    docker run -d \
        --name eventky-postgres \
        -e POSTGRES_USER=test_user \
        -e POSTGRES_PASSWORD=test_pass \
        -e POSTGRES_DB=pubky_homeserver \
        -p 5432:5432 \
        -v eventky-postgres-data:/var/lib/postgresql/data \
        postgres:17-alpine
fi

# Wait for services to be ready
echo -e "${YELLOW}Waiting for Neo4j, Redis, and PostgreSQL to be ready...${NC}"
sleep 8

# Check if services are running
if ! docker ps | grep -q neo4j; then
    echo -e "${RED}Error: Neo4j container is not running${NC}"
    exit 1
fi

if ! docker ps | grep -q redis; then
    echo -e "${RED}Error: Redis container is not running${NC}"
    exit 1
fi

if ! docker ps | grep -q "eventky-postgres"; then
    echo -e "${RED}Error: PostgreSQL container is not running${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Neo4j, Redis, and PostgreSQL are running${NC}"

# Reset Nexus cursor to 0 for fresh start
echo -e "${YELLOW}Resetting Nexus cursor to 0...${NC}"
HOMESERVER_KEY="Homeserver:8pinxxgqs41n4aididenw5apqp1urfmzdztr8jt4abrkdn435ewo"
if docker exec redis redis-cli EXISTS "$HOMESERVER_KEY" 2>/dev/null | grep -q "1"; then
    docker exec redis redis-cli JSON.SET "$HOMESERVER_KEY" '.cursor' '"0"' > /dev/null 2>&1
    echo -e "${GREEN}✓ Cursor reset to 0${NC}"
else
    echo -e "${YELLOW}Note: Homeserver not in Redis yet (will be created on first run)${NC}"
fi
echo ""

# Kill existing tmux session if it exists
if tmux has-session -t eventky-dev 2>/dev/null; then
    echo -e "${YELLOW}Killing existing eventky-dev session...${NC}"
    tmux kill-session -t eventky-dev
fi

# Create new tmux session
echo -e "${GREEN}Creating tmux session 'eventky-dev'...${NC}"
tmux new-session -d -s eventky-dev -n "testnet"

# Window 1: Pubky Testnet (START FIRST - Nexus depends on it)
echo -e "${GREEN}[1/3] Starting Pubky Testnet...${NC}"
tmux send-keys -t eventky-dev:testnet "cd /home/gil/Repositories/pubky-core" C-m
tmux send-keys -t eventky-dev:testnet "export TEST_PUBKY_CONNECTION_STRING='postgres://test_user:test_pass@localhost:5432/pubky_homeserver'" C-m
tmux send-keys -t eventky-dev:testnet "cargo run --bin pubky-testnet" C-m

# Wait for testnet to start (relay needs to be ready before Nexus)
echo -e "${YELLOW}Waiting for testnet relay to start...${NC}"
sleep 10

# Window 2: Nexus
echo -e "${GREEN}[2/3] Starting Nexus (testnet mode)...${NC}"
tmux new-window -t eventky-dev -n "nexus"
tmux send-keys -t eventky-dev:nexus "cd /home/gil/Repositories/pubky-nexus" C-m
tmux send-keys -t eventky-dev:nexus "cargo run -p nexusd" C-m

# Window 3: Eventky
echo -e "${GREEN}[3/3] Starting Eventky frontend...${NC}"
tmux new-window -t eventky-dev -n "eventky"
tmux send-keys -t eventky-dev:eventky "cd /home/gil/Repositories/eventky" C-m
tmux send-keys -t eventky-dev:eventky "sleep 5" C-m
tmux send-keys -t eventky-dev:eventky "npm run dev" C-m

# Window 4: Logs/Commands
echo -e "${GREEN}Creating command window...${NC}"
tmux new-window -t eventky-dev -n "commands"
tmux send-keys -t eventky-dev:commands "cd /home/gil/Repositories/eventky" C-m
tmux send-keys -t eventky-dev:commands "echo -e '${GREEN}Eventky Dev Environment Ready!${NC}'" C-m
tmux send-keys -t eventky-dev:commands "echo ''" C-m
tmux send-keys -t eventky-dev:commands "echo 'Services:'" C-m
tmux send-keys -t eventky-dev:commands "echo '  PostgreSQL:   localhost:5432 (test_user/test_pass)'" C-m
tmux send-keys -t eventky-dev:commands "echo '  Neo4j:        http://localhost:7474 (neo4j/12345678)'" C-m
tmux send-keys -t eventky-dev:commands "echo '  Redis:        http://localhost:8001'" C-m
tmux send-keys -t eventky-dev:commands "echo '  Nexus:        http://localhost:8080'" C-m
tmux send-keys -t eventky-dev:commands "echo '  Eventky:      http://localhost:3000'" C-m
tmux send-keys -t eventky-dev:commands "echo '  Testnet:      localhost:4173'" C-m
tmux send-keys -t eventky-dev:commands "echo '  HTTP Relay:   localhost:15412'" C-m
tmux send-keys -t eventky-dev:commands "echo ''" C-m
tmux send-keys -t eventky-dev:commands "echo 'Tmux Controls:'" C-m
tmux send-keys -t eventky-dev:commands "echo '  Switch windows: Ctrl+b [1-4]'" C-m
tmux send-keys -t eventky-dev:commands "echo '  Detach:         Ctrl+b d'" C-m
tmux send-keys -t eventky-dev:commands "echo '  Kill session:   tmux kill-session -t eventky-dev'" C-m
tmux send-keys -t eventky-dev:commands "echo ''" C-m

# Select testnet window first (since it starts first now)
tmux select-window -t eventky-dev:testnet

echo ""
echo -e "${GREEN}✓ Environment started in tmux session 'eventky-dev'${NC}"
echo ""
echo "Attaching to tmux session..."
echo "  - Use Ctrl+b then 1/2/3/4 to switch between windows"
echo "  - Use Ctrl+b then d to detach (services keep running)"
echo "  - Use 'tmux attach -t eventky-dev' to reattach"
echo "  - Use 'tmux kill-session -t eventky-dev' to stop everything"
echo ""
sleep 2

# Attach to the session
tmux attach-session -t eventky-dev
