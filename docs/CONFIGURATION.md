# Configuration

```bash
cp .env.example .env.local
```

## Environment

```bash
NEXT_PUBLIC_PUBKY_ENV=testnet  # testnet | staging | production
```

| Env        | Homeserver                   | Nexus                   |
| ---------- | ---------------------------- | ----------------------- |
| testnet    | localhost:6286               | localhost:8080          |
| staging    | homeserver.staging.pubky.app | nexus.staging.pubky.app |
| production | homeserver.pubky.app         | nexus.pubky.app         |

## Usage

```typescript
import { config } from "@/lib/config";

config.environment; // "testnet" | "staging" | "production"
config.homeserver.publicKey;
config.gateway.url; // Nexus URL
```

## File URLs

```typescript
import { getPubkyAvatarUrl, getPubkyImageUrl } from "@/lib/pubky/utils";

getPubkyImageUrl(pubkyUri, "main"); // Full size
getPubkyImageUrl(pubkyUri, "feed"); // Thumbnail
getPubkyAvatarUrl(pubkyUri); // Avatar
```
