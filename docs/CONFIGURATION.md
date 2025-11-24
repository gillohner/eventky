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
- `NEXT_PUBLIC_PUBKY_GATEWAY_URL` - Gateway for pubky:// URLs (Nexus by default)
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

In `/lib/pubky/utils.ts` we provide utilities to resolve different `pubky-app-specs` resources through the gateway.

### Avatar Resolution
Avatars are resolved through the gateway's avatar endpoint with optimized sizing:

```typescript
getPubkyAvatarUrl("pubky://USER_ID/pub/pubky.app/files/FILE_ID")
```

### Image Resolution with Variants
Images support different size variants (`main`, `feed`) for optimized loading:

```typescript
getPubkyImageUrl("pubky://USER_ID/pub/pubky.app/files/FILE_ID", "feed")
```

Available variants in `/types/image.ts`:
- `main` - Full size image
- `feed` - Optimized for feed display

### General File Resolution
For non-image files or when you don't need variants:

```typescript
getPubkyFileUrl("pubky://USER_ID/pub/pubky.app/files/FILE_ID")
```

## Development

```bash
npm run dev  # http://localhost:3000
```

See [PUBKY_AUTH.md](./PUBKY_AUTH.md) for authentication.
