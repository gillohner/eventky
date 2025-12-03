# Eventky Local Development Setup

## Quick Start with pubky-docker

The easiest way to run the full Pubky stack locally is using [pubky-docker](https://github.com/pubky/pubky-docker).

### 1. Setup Directory Structure

Clone all required repositories at the same level:

```bash
cd ~/Repositories

# Clone pubky-docker (orchestration)
git clone https://github.com/pubky/pubky-docker.git

# Clone required dependencies (if not already cloned)
git clone https://github.com/pubky/pkarr.git
git clone https://github.com/pubky/pubky-core.git
git clone https://github.com/pubky/pubky-nexus.git
git clone https://github.com/pubky/pubky-app.git

# Your directory should look like:
# ~/Repositories/
# ├── eventky/          # This project
# ├── pubky-docker/     # Orchestration
# ├── pkarr/
# ├── pubky-core/
# ├── pubky-nexus/
# └── pubky-app/
```

### 2. Configure pubky-docker

```bash
cd ~/Repositories/pubky-docker

# Copy environment template
cp .env-sample .env

# The defaults are fine for testnet:
# NETWORK=testnet
# POSTGRES_USER=test_user
# POSTGRES_PASSWORD=test_pass
# POSTGRES_DB=pubky_homeserver
```

### 3. Start the Pubky Stack

```bash
cd ~/Repositories/pubky-docker
docker compose up -d
```

This starts:
- **Pkarr Relay** (port 6882)
- **PostgreSQL** (port 5432)
- **Pubky Homeserver** (ports 6286, 6287, 6288, 15411, 15412)
- **Nexus API** (port 8080, 8081)
- **Neo4j** (ports 7474, 7687)
- **Redis** (ports 6379, 8001)
- **Pubky App** (port 4200)

Wait for all services to initialize.

### 4. Configure Eventky

Update your `.env.local`:

```bash
NEXT_PUBLIC_PUBKY_ENV=testnet
NEXT_PUBLIC_PUBKY_RELAY=http://localhost:15412/link
```

### 5. Start Eventky

```bash
cd ~/Repositories/eventky
npm run dev
```

## Testing Your Setup

1. **Eventky**: http://localhost:3000
2. **Nexus Swagger UI**: http://localhost:8080/swagger-ui/
3. **Neo4j Browser**: http://localhost:7474 (neo4j/12345678)
4. **Redis Insight**: http://localhost:8001
5. **Pubky App**: http://localhost:4200

### Create and Verify Events

1. Sign in to Eventky at http://localhost:3000
2. Create a calendar and event
3. Open Swagger UI at http://localhost:8080/swagger-ui/
4. Try `/v0/stream/events` endpoint
5. Your event should appear!

## Managing Services

```bash
# View logs
cd ~/Repositories/pubky-docker
docker compose logs -f nexusd     # Nexus logs
docker compose logs -f homeserver # Homeserver logs

# Restart a service
docker compose restart nexusd

# Stop everything
docker compose down

# Stop and remove volumes (clean slate)
docker compose down -v

# Start again
docker compose up -d
```

## Troubleshooting

### Services not starting

```bash
# Check status
docker compose ps

# Check logs
docker compose logs
```

### Nexus not indexing events

1. Check homeserver ID matches in config
2. Verify event was created (check Eventky UI)
3. Check Nexus logs: `docker compose logs nexusd`0
4. Give it a few seconds to index


### Clean restart

```bash
cd ~/Repositories/pubky-docker
docker compose down -v  # Remove volumes
docker compose up -d    # Start fresh
```

## Development Workflow

**Daily workflow:**

```bash
# Terminal 1: Start Pubky stack
cd ~/Repositories/pubky-docker
docker compose up

# Terminal 2: Start Eventky
cd ~/Repositories/eventky
npm run dev
```

**When you're done:**

```bash
# In Terminal 1 (pubky-docker)
Ctrl+C  # or docker compose down
```

## Building Custom Nexus Changes

If you're working on nexus improvements (like the simplified calendar/event models):

```bash
# Make your changes in pubky-nexus
cd ~/Repositories/pubky-nexus
# ... edit files ...

# Rebuild and restart
cd ~/Repositories/pubky-docker
docker compose build nexusd
docker compose up -d nexusd
```

## Environment Variables

Key environment variables in `pubky-docker/.env`:

- `NETWORK`: `testnet` or `mainnet`
- `NEXT_PUBLIC_HOMESERVER`: Homeserver ID (default: `8pinxxgqs41n4aididenw5apqp1urfmzdztr8jt4abrkdn435ewo`)
- `NEXT_PUBLIC_NEXUS`: Nexus URL (default: `http://localhost:8080`)
- `NEXT_PUBLIC_TESTNET`: `true` for testnet
- `NEXT_PUBLIC_DEFAULT_HTTP_RELAY`: HTTP relay URL (default: `http://localhost:15412/link/`)

## Local Nexus Development

Docker Nexus stop and setup local development:

```bash
# Stop the Docker Nexus container
cd ~/Repositories/pubky-docker
docker compose stop nexusd

# Install nightly Rust (required for pubky-core dependencies)
cd ~/Repositories/pubky-nexus
rustup install nightly
rustup override set nightly

# Run Nexus locally with Docker config
cargo run -p nexusd -- --config-dir=../pubky-docker

# To switch back to Docker:
# Ctrl+C to stop local nexusd
# cd ~/Repositories/pubky-docker && docker compose start nexusd
```

## Architecture Notes

### Event Fetching Architecture

Eventky uses a **hybrid approach** for event data:

1. **Creation**: Events are created directly on Pubky homeservers using `@synonymdev/pubky`
2. **Retrieval**: Events are fetched from Nexus API for optimal performance

**Why this approach?**
- **Nexus** provides indexed, cached, and optimized queries
- Direct homeserver writes ensure data is immediately available
- Nexus indexing happens within seconds after creation

**Key files:**
- `/lib/nexus/client.ts` - Axios client for Nexus API
- `/lib/nexus/events.ts` - Event fetching functions
- `/hooks/use-nexus-event.ts` - React Query hooks
- `/hooks/use-event.ts` - Backwards compatible wrapper
- `/lib/pubky/events.ts` - Direct homeserver operations (write only)

### Troubleshooting Nexus Event Indexing

**Events not appearing in Nexus?**

1. **CRITICAL: Sign out and create a new account**
   - Your existing session is tied to a specific homeserver
   - After changing `NEXT_PUBLIC_PUBKY_HOMESERVER`, you MUST sign out and create a new account
   - New accounts will be created on the homeserver specified in `.env.local`

2. **Check homeserver ID matches**: Verify both configs point to the same homeserver:
   - `~/.pubky-nexus/config.toml`: `homeserver = "8um71us3fyw6h8wbcxb5ar3rwusy1a6u49956ikzojg3gcwd1dty"`
   - `.env.local`: `NEXT_PUBLIC_PUBKY_HOMESERVER=8um71us3fyw6h8wbcxb5ar3rwusy1a6u49956ikzojg3gcwd1dty`

3. **Verify homeserver is accessible**:
   ```bash
   # Should respond (Synonym's homeserver)
   curl -I https://8um71us3fyw6h8wbcxb5ar3rwusy1a6u49956ikzojg3gcwd1dty.hs.qa.ink/
   ```

3. **Check Nexus watcher logs**:
   ```bash
   # Look for "Processing X event lines" and indexing activity
   # Should show events being processed every few seconds
   ```

4. **Test Nexus API directly**:
   ```bash
   # Check if any events are indexed
   curl http://localhost:8080/v0/stream/events
   
   # Check specific event
   curl http://localhost:8080/v0/event/{author_id}/{event_id}
   ```

5. **Force reindex**: Restart Nexus to trigger fresh indexing:
   ```bash
   # Ctrl+C in nexusd terminal, then restart
   cd ~/Repositories/pubky-nexus && cargo run -p nexusd
   ```
