# Eventky

__⚠️ This project is under active development. Breaking changes may occur.__

A decentralized calendar and event management platform built on [Pubky](https://pubky.org) using existing RFC standards.

## Local Development Setup

This guide sets up a complete local testnet environment for development.

### Prerequisites

- **Node.js 20+** - for the Next.js frontend
- **Rust & wasm-pack** - for building pubky-app-specs WASM
- **Docker & Docker Compose** - for Neo4j, Redis, PostgreSQL databases
- **tmux** - for running multiple services (testnet, nexus, frontend) in one terminal

### Clone Repositories

```bash
# Clone all 4 repos to the same directory
cd ~/Repositories

git clone https://github.com/gillohner/eventky
git clone https://github.com/gillohner/pubky-app-specs
git clone https://github.com/gillohner/pubky-nexus
git clone https://github.com/pubky/pubky-core
```

### Build pubky-app-specs (WASM)

```bash
cd ~/Repositories/pubky-app-specs

# Install wasm-pack if needed
cargo install wasm-pack

# Build for bundler target (Next.js)
wasm-pack build --target bundler
```

### Install Eventky Dependencies

```bash
cd ~/Repositories/eventky
npm install
```

### Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```bash
NEXT_PUBLIC_PUBKY_ENV=testnet
```

### Start Development Environment

```bash
./scripts/start-eventky-testnet-nexus.sh
```

This starts everything in a tmux session with 4 windows:
1. **testnet** - Pubky testnet (homeserver + relay)
2. **nexus** - Pubky Nexus indexer
3. **eventky** - Next.js dev server
4. **commands** - Service info and ports

**Tmux controls:**
- `Ctrl+b` then `1`/`2`/`3`/`4` - switch windows
- `Ctrl+b` then `d` - detach (services keep running)
- `tmux attach -t eventky-dev` - reattach

Eventky: [http://localhost:3000](http://localhost:3000)  
Swagger Nexus API: [http://localhost:8080/swagger-ui/](http://localhost:8080/swagger-ui/)  
Neo4j Browser: [http://localhost:7474/](http://localhost:7474/)  
Homeserver: [http://localhost:6286/](http://localhost:6286/)

### Other Scripts

```bash
# Stop all services
./scripts/stop-eventky-testnet-nexus.sh

# Full reset (wipes all databases)
./scripts/reset-eventky-testnet.sh
```

## Project Structure

```
eventky/
├── app/                 # Next.js App Router pages
├── components/          # React components
├── hooks/               # React Query hooks
├── lib/                 # Core utilities
│   ├── cache/           # Optimistic caching
│   ├── datetime/        # Date/time utilities
│   ├── nexus/           # Nexus API client
│   └── pubky/           # Pubky SDK wrappers
├── stores/              # Zustand stores
├── types/               # TypeScript types
├── docs/                # Documentation
└── scripts/             # Development scripts
```

## Technologies

- Next.js 16 with App Router & Turbopack
- Zustand + TanStack Query
- Shadcn UI + Tailwind CSS v4
- @synonymdev/pubky
- pubky-app-specs (WASM)

## Documentation

See the [docs/](docs/) folder:

- [AUTH.md](docs/AUTH.md) - Authentication flow
- [CACHING.md](docs/CACHING.md) - Optimistic caching strategy
- [DATA_MODEL.md](docs/DATA_MODEL.md) - Data structures
- [DATETIME.md](docs/DATETIME.md) - Date/time handling
- [LOCATIONS.md](docs/LOCATIONS.md) - Location & BTCMap integration
- [RECURRENCE.md](docs/RECURRENCE.md) - Recurring events (RFC 5545)
- [VPS_SETUP.md](docs/VPS_SETUP.md) - Production deployment

## Rebuilding pubky-app-specs

When you make changes to `pubky-app-specs`:

```bash
cd ~/Repositories/pubky-app-specs
wasm-pack build --target bundler

# Reinstall in eventky to pick up changes
cd ~/Repositories/eventky
npm install
```

## License

MIT License - see [LICENSE](LICENSE)
