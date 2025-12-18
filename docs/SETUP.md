# Setup & Configuration

## Quick Start

```bash
# 1. Configure environment
cp .env.example .env.local

# 2. Start Pubky stack (testnet)
cd scripts && ./start-pubky-stack.sh

# 3. Run Eventky
npm run dev
```

## Environment Variables

```bash
NEXT_PUBLIC_PUBKY_ENV=testnet  # testnet | staging | production
```

| Environment  | Homeserver                   | Nexus                   | Relay                         |
| ------------ | ---------------------------- | ----------------------- | ----------------------------- |
| testnet      | localhost:6286               | localhost:8080          | localhost:15412               |
| staging      | homeserver.staging.pubky.app | nexus.staging.pubky.app | httprelay.staging.pubky.app   |
| production   | homeserver.pubky.app         | nexus.pubky.app         | httprelay.pubky.app           |

## Local URLs

| Service    | URL                                    |
| ---------- | -------------------------------------- |
| Eventky    | http://localhost:3000                  |
| Nexus API  | http://localhost:8080/swagger-ui/      |
| Neo4j      | http://localhost:7474 (neo4j/12345678) |
| Redis      | http://localhost:8001                  |
| Homeserver | http://localhost:6286/events/          |

## Usage in Code

```typescript
import { config } from "@/lib/config";

config.environment;          // "testnet" | "staging" | "production"
config.homeserver.publicKey;
config.gateway.url;          // Nexus URL
```

### File URLs

```typescript
import { getPubkyAvatarUrl, getPubkyImageUrl } from "@/lib/pubky/utils";

getPubkyImageUrl(pubkyUri, "main");  // Full size
getPubkyImageUrl(pubkyUri, "feed");  // Thumbnail
getPubkyAvatarUrl(pubkyUri);         // Avatar
```

## QR Auth (Pubky Ring)

For mobile QR authentication on local network:

```bash
NEXT_PUBLIC_PUBKY_RELAY=http://192.168.1.x:15412/link
sudo ufw allow 15412/tcp  # If using firewall
```

## Architecture

**Hybrid approach:**

- **Writes** → Direct to Pubky homeserver via `@synonymdev/pubky`
- **Reads** → Nexus API for indexed, cached queries

## Troubleshooting

| Issue               | Fix                                              |
| ------------------- | ------------------------------------------------ |
| Events not indexing | `docker compose logs nexusd`, wait a few seconds |
| Services down       | `docker compose ps`, check logs                  |
| Port conflicts      | Verify ports 3000, 8080, 15412 are available     |
