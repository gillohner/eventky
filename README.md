# Eventky

__⚠️ This project is under active development. Breaking changes may occur.__

A calendar and event management platform built with Next.js and Pubky Core.

## Getting Started

### Prerequisites

- Node.js 20+
- NPM (workspace setup for monorepo)

### Setup

This project uses an NPM workspace setup to link the local updated `pubky-app-specs` package.

1. **Clone both projects to same Root**:
```bash
# From ~/Repositories
git clone https://github.com/gillohner/eventky
git clone https://github.com/gillohner/pubky-app-specs

cd pubky-app-specs
git checkout feat/eventky
```

2. **Install dependencies**:
```bash
cd eventky
npm i
```

ℹ️ During development `../pubky-app-specs/pkg` is needed.

3. **Configure environment**:
```bash
cd eventky
cp .env.example .env.local
```

Edit `.env.local` to configure your environment:
- `NEXT_PUBLIC_PUBKY_ENV`: Choose `testnet`, `staging`, or `production`
- Optionally override specific URLs for homeserver, relay, or gateway
- See `.env.example` for detailed documentation of all settings

3. **Run the development server**:
```bash
cd eventky
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Technologies

- **Framework**: Next.js 16 with App Router & Turbopack
- **Authentication**: @synonymdev/pubky
- **State Management**: Zustand + TanStack Query
- **UI**: Shadcn UI + Tailwind CSS v4
- **Types**: pubky-app-specs (local workspace package)

## Development Notes

### Configuration

All Pubky-related configuration is centralized in `/lib/config.ts`, which reads from environment variables. Configuration includes:

- **Environment Selection**: `testnet`, `staging`, or `production`
- **Homeserver**: Public key for the Pubky homeserver
- **HTTP Relay**: URL for QR code authentication relay
- **Gateway**: URL for resolving `pubky://` URLs to HTTP
- **Profile Path**: Storage path for user profiles

See `.env.example` for detailed documentation and default values for each environment.

### Turbopack Setup

Next.js is configured to resolve the workspace package with Turbopack:

```typescript
// next.config.ts
turbopack: {
  root: join(__dirname, ".."), // Points to monorepo root
}
```

### Rebuilding pubky-app-specs

When you make changes to `pubky-app-specs`:

```bash
cd ~/Repositories/pubky-app-specs
cargo run --bin bundle_specs_npm

# The workspace link is automatic - just restart dev server
cd ~/Repositories/eventky
npm run dev
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
