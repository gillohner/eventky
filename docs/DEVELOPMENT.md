# Development Setup

## Quick Start

```bash
# 1. Clone repos
cd ~/Repositories

git clone https://github.com/gillohner/pubky-nexus.git     
git clone https://github.com/gillohner/pubky-app-specs.git
```

```bash
# 2. Start Pubky stack (testnet)
cd eventky/scripts
./start-pubky-stack.sh

# Use `./stop-pubky-stack.sh` in separate terminal to stop
```

## Local URLs

| Service    | URL                                    |
| ---------  | -------------------------------------- |
| Eventky    | http://localhost:3000                  |
| Nexus API  | http://localhost:8080/swagger-ui/      |
| Neo4j      | http://localhost:7474 (neo4j/12345678) |
| Redis      | http://localhost:8001                  |
| Homeserver | http://localhost:6286/events/          |

## Architecture

**Hybrid approach:**

- **Writes** → Direct to Pubky homeserver via `@synonymdev/pubky`
- **Reads** → Nexus API for indexed, cached queries

**Key files:**

- `lib/nexus/client.ts` - Nexus API client
- `lib/pubky/events.ts` - Homeserver writes
- `hooks/use-event.ts` - TanStack Query hooks

## Troubleshooting

| Issue               | Fix                                              |
| ------------------- | ------------------------------------------------ |
| Events not indexing | `docker compose logs nexusd`, wait a few seconds |
| Services down       | `docker compose ps`, check logs                  |
