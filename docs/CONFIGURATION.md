# Configuration

Environment-based configuration for Pubky services.

## Quick Start

```bash
cp .env.example .env.local
```

Set environment:
```bash
NEXT_PUBLIC_PUBKY_ENV=staging  # testnet | staging | production
```

## Environment Variables

### Required

- `NEXT_PUBLIC_PUBKY_ENV` - Environment selection (default: `staging`)

### Optional Overrides

- `NEXT_PUBLIC_PUBKY_HOMESERVER_PUBLIC_KEY` - Homeserver public key
- `NEXT_PUBLIC_PUBKY_RELAY_URL` - HTTP relay for QR auth
- `NEXT_PUBLIC_PUBKY_GATEWAY_URL` - Gateway for pubky:// URLs
- `NEXT_PUBLIC_PUBKY_PROFILE_PATH` - Profile path (default: `/pub/pubky.app/profile.json`)

## Configuration Usage

```typescript
import { config } from "@/lib/config";

config.environment          // "testnet" | "staging" | "production"
config.homeserver.publicKey // Homeserver public key
config.relay.url            // HTTP relay URL
config.gateway.url          // Gateway URL
config.profile.path         // Profile storage path
```

## File Resolution

Images resolve via gateway:

```
pubky://USER_ID/pub/pubky.app/files/FILE_ID
  ↓
https://gateway.example.com/USER_ID/pub/pubky.app/files/FILE_ID
```

Transformations via query params: `?w=400&h=300&q=80&f=webp`

## Development

```bash
npm run dev  # http://localhost:3000
```

See [PUBKY_AUTH.md](./PUBKY_AUTH.md) for authentication.
