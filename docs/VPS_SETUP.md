# VPS Setup Guide

## Quick Reference (Daily Operations)

**SSH into VPS:**
```bash
ssh eventky@34.88.231.77
```

**Update to latest main:**
```bash
cd ~/apps/eventky && git pull && npm install && npm run build && sudo systemctl restart eventky.service
```

**Test a different branch:**
```bash
cd ~/apps/eventky && git fetch origin && git checkout BRANCH_NAME && npm install && npm run build && sudo systemctl restart eventky.service
```

**View logs:**
```bash
sudo journalctl -u eventky.service -f     # Eventky logs
sudo journalctl -u nexus.service -f       # Nexus logs
```

**Check status:**
```bash
sudo systemctl status eventky.service nexus.service eventky-db.service
```

---

## Architecture

```mermaid
flowchart TB
    subgraph VPS["Ubuntu VPS (34.88.231.77)"]
        subgraph Systemd["Systemd Services"]
            NEO4J["neo4j.service<br/>(Docker)"]
            REDIS["redis.service<br/>(Docker)"]
            NEXUS["nexus.service<br/>(Binary)"]
            EVENTKY["eventky.service<br/>(Node.js)"]
        end
    end
    
    subgraph Synonym["Synonym Production"]
        HS["homeserver.pubky.app"]
        RELAY["httprelay.pubky.app"]
    end
    
    USER["Users"] --> VPS
    EVENTKY -->|"reads"| NEXUS
    EVENTKY -->|"writes"| HS
    EVENTKY -->|"auth"| RELAY
    NEXUS -->|"indexes"| HS
    NEXUS --> NEO4J
    NEXUS --> REDIS
```

---

## Phase 1: VPS Initial Setup

### 1.1 Connect and Update

```bash
ssh root@34.88.231.77

# Update system
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y curl wget git build-essential
```

### 1.2 Create App User

```bash
# Create dedicated user for running services
sudo adduser --disabled-password --gecos "" eventky
sudo usermod -aG sudo eventky

# Allow sudo without password (optional, for convenience)
echo "eventky ALL=(ALL) NOPASSWD:ALL" | sudo tee /etc/sudoers.d/eventky
# Switch to eventky user
sudo su - eventky
```

### 1.3 Install Docker

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Logout and login to apply docker group
exit
sudo su - eventky

# Verify
docker --version
```

### 1.4 Install Node.js

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc

# Install Node.js 20 LTS
nvm install 20
nvm use 20
nvm alias default 20

# Verify
node --version  # Should be v20.x.x
npm --version
```

### 1.5 Install Rust (for building Nexus)

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source ~/.cargo/env

# Verify
rustc --version
cargo --version
```

### 1.6 Install ImageMagick (for Nexus image processing)

```bash
# Required for Nexus to create avatar/image variants (thumbnails, resizing)
sudo apt install -y imagemagick

# Verify
convert --version

## Phase 2: Database Setup (Docker)

### 2.1 Create Directory Structure

```bash
mkdir -p ~/apps/docker/neo4j/{conf,data,logs}
mkdir -p ~/apps/docker/redis/data
cd ~/apps/docker
```

### 2.2 Create Docker Compose File

```bash
cat > docker-compose.yml << 'EOF'
services:
  neo4j:
    image: neo4j:5.26.7-community
    container_name: neo4j
    restart: unless-stopped
    ports:
      - "7474:7474"
      - "7687:7687"
    volumes:
      - ./neo4j/conf:/conf:Z
      - ./neo4j/data:/data:Z
      - ./neo4j/logs:/logs:Z
    environment:
      NEO4J_initial_dbms_default__database: neo4j
      NEO4J_AUTH: neo4j/eventky_neo4j_secure_2024
      NEO4J_server_memory_pagecache_size: 512M
      NEO4J_server_memory_heap_initial__size: 512M
      NEO4J_server_memory_heap_max__size: 1G

  redis:
    image: redis/redis-stack:7.2.0-v11
    container_name: redis
    restart: unless-stopped
    ports:
      - "6379:6379"
      - "8001:8001"
    volumes:
      - ./redis/data:/data
EOF
```

### 2.3 Start Databases

```bash
docker compose up -d

# Verify
docker compose ps
docker compose logs neo4j
docker compose logs redis
```

### 2.4 Create Systemd Service for Docker Compose

```bash
sudo cat > /etc/systemd/system/eventky-db.service << 'EOF'
[Unit]
Description=Eventky Databases (Neo4j + Redis)
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
User=eventky
WorkingDirectory=/home/eventky/apps/docker
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable eventky-db.service
```

---

## Phase 3: Nexus Setup

### 3.1 Clone and Build Nexus

```bash
cd ~/apps
git clone https://github.com/gillohner/pubky-nexus.git
cd pubky-nexus

# Build release binary (takes ~5-10 minutes)
cargo build --release -p nexusd

# Verify binary
./target/release/nexusd --help
```

### 3.2 Create Nexus Config

```bash
mkdir -p ~/apps/nexus-config
cat > ~/apps/nexus-config/config.toml << 'EOF'
[api]
name = "nexusd.api"
public_ip = "34.88.231.77"
public_addr = "0.0.0.0:8080"
pubky_listen_socket = "0.0.0.0:8081"

[watcher]
name = "nexusd.watcher"
# IMPORTANT: Set to false for production homeserver
testnet = false
# Required field even when testnet=false
testnet_host = "localhost"
homeserver = "ufibwbmed6jeq9k4p583go95wofakh9fwpp4k734trq79pd9u1uy"
events_limit = 50
watcher_sleep = 5000
moderation_id = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
moderated_tags = [
    "hatespeech",
    "harassement",
    "terrorism",
    "violence",
    "illegal_activities",
    "il_adult_nu_sex_act",
]

[stack]
log_level = "info"
files_path = "/home/eventky/apps/nexus-data/static/files"

[stack.db]
redis = "redis://127.0.0.1:6379"

[stack.db.neo4j]
uri = "bolt://127.0.0.1:7687"
password = "eventky_neo4j_secure_2024"
EOF

# Create data directory
mkdir -p ~/apps/nexus-data/static/files
```

### 3.3 Create Nexus Systemd Service

```bash
sudo cat > /etc/systemd/system/nexus.service << 'EOF'
[Unit]
Description=Pubky Nexus Indexer
After=network.target eventky-db.service
Requires=eventky-db.service

[Service]
Type=simple
User=eventky
Environment=RUST_LOG=info
WorkingDirectory=/home/eventky/apps/pubky-nexus
ExecStart=/home/eventky/apps/pubky-nexus/target/release/nexusd --config-dir /home/eventky/apps/nexus-config
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable nexus.service
sudo systemctl start nexus.service

# Check status
sudo systemctl status nexus.service
sudo journalctl -u nexus.service -f
```

### 3.4 Verify Nexus

```bash
# Check API is responding
curl http://localhost:8080/v0/info

# Swagger UI should be accessible at:
# http://34.88.231.77:8080/swagger-ui/
```

---

## Phase 4: Eventky Setup

### 4.1 Clone Repository

```bash
cd ~/apps
git clone https://github.com/gillohner/eventky.git
cd eventky
```

### 4.2 Install pubky-app-specs

```bash
# Clone and build locally
cd ~/apps
git clone https://github.com/gillohner/pubky-app-specs.git
cd pubky-app-specs
# Build WASM package (requires wasm-pack)
cargo install wasm-pack
./build.sh

# Return to eventky and link
cd ~/apps/eventky
npm install ../pubky-app-specs/pkg
```

### 4.3 Install Dependencies

```bash
cd ~/apps/eventky
npm install
```

### 4.4 Create Environment File

```bash
cat > .env.local << 'EOF'
# Production environment with custom Nexus
NEXT_PUBLIC_PUBKY_ENV=production

# Override gateway to use VPS Nexus
NEXT_PUBLIC_PUBKY_GATEWAY=http://34.88.231.77:8080

# Use production Synonym homeserver (default for production env)
# NEXT_PUBLIC_PUBKY_HOMESERVER=ufibwbmed6jeq9k4p583go95wofakh9fwpp4k734trq79pd9u1uy

# Use production Synonym relay (default for production env)
# NEXT_PUBLIC_PUBKY_RELAY=https://httprelay.pubky.app/link/

# App configuration
NEXT_PUBLIC_APP_NAME=Eventky Demo
NEXT_PUBLIC_APP_VERSION=0.1.0
NEXT_PUBLIC_GITHUB_REPO=https://github.com/gillohner/eventky

# Debug available for demo
NEXT_PUBLIC_DEBUG_AVAILABLE=true
EOF
```

### 4.5 Build Production Bundle

```bash
npm run build
```

### 4.6 Create Eventky Systemd Service

```bash
sudo cat > /etc/systemd/system/eventky.service << 'EOF'
[Unit]
Description=Eventky Next.js Application
After=network.target nexus.service

[Service]
Type=simple
User=eventky
WorkingDirectory=/home/eventky/apps/eventky
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=PATH=/home/eventky/.nvm/versions/node/v20.19.6/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
ExecStart=/home/eventky/.nvm/versions/node/v20.19.6/bin/npm start
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable eventky.service
sudo systemctl start eventky.service

# Check status
sudo systemctl status eventky.service
sudo journalctl -u eventky.service -f
```

**Note:** Adjust the Node.js path in `ExecStart` based on your installed version:
```bash
which node  # Shows the correct path
```

## Phase 5: Verification

### 5.1 Check All Services

```bash
# Check service status
sudo systemctl status eventky-db.service
sudo systemctl status nexus.service
sudo systemctl status eventky.service

# Check Docker containers
docker ps

# Check ports
sudo netstat -tlnp | grep -E '3000|6379|7474|7687|8080'
```

### 5.2 Test Endpoints

```bash
# Eventky frontend
curl -I http://34.88.231.77:3000

# Nexus API
curl http://34.88.231.77:8080/v0/info

# Neo4j (if port open)
curl -I http://34.88.231.77:7474
```

### 5.3 Access URLs

| Service | URL |
|---------|-----|
| **Eventky** | http://34.88.231.77:3000 |
| **Nexus API** | http://34.88.231.77:8080 |
| **Nexus Swagger** | http://34.88.231.77:8080/swagger-ui/ |
| **Neo4j Browser** | http://34.88.231.77:7474 |
| **Redis Insight** | http://34.88.231.77:8001 |

---

## Management Commands

### Service Control

```bash
# Start all
sudo systemctl start eventky-db.service
sudo systemctl start nexus.service
sudo systemctl start eventky.service

# Stop all
sudo systemctl stop eventky.service
sudo systemctl stop nexus.service
sudo systemctl stop eventky-db.service

# Restart individual service
sudo systemctl restart eventky.service

# View logs
sudo journalctl -u nexus.service -f
sudo journalctl -u eventky.service -f
```

### Update Eventky (Main Branch)

```bash
cd ~/apps/eventky
git pull
npm install
npm run build
sudo systemctl restart eventky.service
```

### Test a Feature Branch on VPS

```bash
cd ~/apps/eventky

# 1. Save current state (optional - useful if you have local changes)
git stash

# 2. Fetch all remote branches
git fetch origin

# 3. Checkout the feature branch
git checkout feature/some-branch
# Or create local tracking branch:
git checkout -b feature/some-branch origin/feature/some-branch

# 4. Install dependencies (in case package.json changed)
npm install

# 5. Build and restart
npm run build
sudo systemctl restart eventky.service

# 6. Test the feature...

# 7. When done, go back to main
git checkout main
git pull
npm install
npm run build
sudo systemctl restart eventky.service

# 8. Restore any stashed changes (if needed)
git stash pop
```

### Quick Deploy Script

Create a deploy script for convenience:

```bash
# Create deploy script
cat > ~/deploy-eventky.sh << 'EOF'
#!/bin/bash
set -e

BRANCH=${1:-main}
cd ~/apps/eventky

echo "🔄 Fetching latest changes..."
git fetch origin

echo "📦 Checking out $BRANCH..."
git checkout $BRANCH
git pull origin $BRANCH || true  # Pull fails on detached HEAD, that's ok

echo "📥 Installing dependencies..."
npm install

echo "🔨 Building..."
npm run build

echo "🔄 Restarting service..."
sudo systemctl restart eventky.service

echo "✅ Deployed $BRANCH successfully!"
echo "📊 Check status: sudo systemctl status eventky.service"
echo "📝 View logs: sudo journalctl -u eventky.service -f"
EOF

chmod +x ~/deploy-eventky.sh
```

Usage:
```bash
# Deploy main branch
~/deploy-eventky.sh

# Deploy a feature branch
~/deploy-eventky.sh feature/auth-improvements

# Deploy a specific commit/tag
~/deploy-eventky.sh v0.1.0
```

### Update Nexus

```bash
cd ~/apps/pubky-nexus
git pull
cargo build --release -p nexusd
sudo systemctl restart nexus.service
```

### Reset Nexus Index

```bash
# Stop Nexus
sudo systemctl stop nexus.service

# Clear Neo4j data
docker exec neo4j cypher-shell -u neo4j -p eventky_neo4j_secure_2024 "MATCH (n) DETACH DELETE n"

# Clear Redis cursor
docker exec redis redis-cli FLUSHDB

# Restart Nexus (will re-index from homeserver)
sudo systemctl start nexus.service
```

---

## Troubleshooting

| Issue | Check |
|-------|-------|
| Nexus not starting | `journalctl -u nexus.service -e` |
| Can't connect to Neo4j | Password in config matches docker-compose |
| Eventky build fails | Node version (`node -v`), dependencies |
| Login not working | Production relay URL, CORS |
| Events not appearing | Nexus logs, homeserver connection |
| Port not accessible | `ufw status`, security groups |

### Common Fixes

```bash
# If Neo4j auth fails, reset:
cd ~/apps/docker
docker compose down -v
rm -rf neo4j/data/*
docker compose up -d

# If Eventky won't start, check Node path:
which node
# Update systemd service with correct path

# If ports blocked by cloud provider:
# Check GCP/AWS security group rules
```

---
