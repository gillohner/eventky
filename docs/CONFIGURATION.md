# Configuration Guide

This document explains the centralized configuration system for Pubky services in Eventky.

## Overview

All Pubky-related configuration is managed through environment variables and centralized in `/lib/config.ts`. This provides a single source of truth for all environment-specific settings.

## Configuration Architecture

```
.env.local (git-ignored)
     ↓
lib/config.ts (reads env vars)
     ↓
Components & Services (import config)
```

## Environment Variables

All environment variables are prefixed with `NEXT_PUBLIC_` to make them available in the browser.

### Core Configuration

#### `NEXT_PUBLIC_PUBKY_ENV`
**Type**: `testnet` | `staging` | `production`  
**Default**: `staging`  
**Description**: Selects the environment preset. Each environment has default values for homeserver, relay, and gateway.

### Per-Service Configuration

#### Homeserver
- **Variable**: `NEXT_PUBLIC_PUBKY_HOMESERVER`
- **Description**: Public key of the Pubky homeserver
- **Defaults**:
  - `testnet`: `8pinxxgqs41n4aididenw5apqp1urfmzdztr8jt4abrkdn435ewo`
  - `staging`: `ufibwbmed6jeq9k4p583go95wofakh9fwpp4k734trq79pd9u1uy`
  - `production`: `ufibwbmed6jeq9k4p583go95wofakh9fwpp4k734trq79pd9u1uy`

#### HTTP Relay (QR Authentication)
- **Variable**: `NEXT_PUBLIC_PUBKY_RELAY`
- **Description**: URL for QR code authentication relay
- **Defaults**:
  - `testnet`: `http://localhost:15412/link`
  - `staging`: `https://httprelay.staging.pubky.app/link/`
  - `production`: `https://httprelay.pubky.app/link/`

#### Gateway (URL Resolution)
- **Variable**: `NEXT_PUBLIC_PUBKY_GATEWAY`
- **Description**: URL for resolving `pubky://` URLs to HTTP
- **Defaults**:
  - `testnet`: `http://localhost:8080`
  - `staging`: `https://gateway.staging.pubky.app`
  - `production`: `https://gateway.pubky.app`

#### Profile Path
- **Variable**: `NEXT_PUBLIC_PUBKY_PROFILE_PATH`
- **Description**: Storage path for user profiles
- **Default**: `/pub/pubky.app/profile.json`

## Usage in Code

### Importing Configuration

```typescript
import { config, isTestnet, isProduction, isStaging } from "@/lib/config";
```

### Accessing Values

```typescript
// Get homeserver public key
const homeserver = config.homeserver.publicKey;

// Get relay URL
const relayUrl = config.relay.url;

// Get gateway URL
const gatewayUrl = config.gateway.url;

// Get profile path
const profilePath = config.profile.path;

// Check environment
if (isTestnet) {
  console.log("Running in testnet mode");
}
```

### Example: PubkyClient

```typescript
import { config } from "@/lib/config";
import { PublicKey } from "@synonymdev/pubky";

const homeserver = PublicKey.from(config.homeserver.publicKey);
const profilePath = config.profile.path;
```

### Example: Auth Widget

```typescript
import { config } from "@/lib/config";

// Use configured relay URL
const relayUrl = relay || config.relay.url;
```

### Example: Image URLs

```typescript
import { config } from "@/lib/config";

// Convert pubky:// URL to HTTP
const httpUrl = `${config.gateway.url}/${path}`;
```

## Setup Instructions

1. **Copy the example file**:
   ```bash
   cp .env.example .env.local
   ```

2. **Choose your environment**:
   ```bash
   # For local development with testnet
   NEXT_PUBLIC_PUBKY_ENV=testnet
   
   # For staging (default)
   NEXT_PUBLIC_PUBKY_ENV=staging
   
   # For production
   NEXT_PUBLIC_PUBKY_ENV=production
   ```

3. **Override specific values** (optional):
   ```bash
   # Use a custom homeserver
   NEXT_PUBLIC_PUBKY_HOMESERVER=your_homeserver_publickey_here
   
   # Use a custom relay
   NEXT_PUBLIC_PUBKY_RELAY=https://your-relay.example.com/link/
   ```

## Environment Presets

### Testnet (Local Development)
- **Homeserver**: Local testnet homeserver
- **Relay**: `http://localhost:15412/link`
- **Gateway**: `http://localhost:8080`
- **Use Case**: Local development with Pubky testnet

### Staging (Default)
- **Homeserver**: Staging homeserver
- **Relay**: `https://httprelay.staging.pubky.app/link/`
- **Gateway**: `https://gateway.staging.pubky.app`
- **Use Case**: Development and testing against staging infrastructure

### Production
- **Homeserver**: Production homeserver
- **Relay**: `https://httprelay.pubky.app/link/`
- **Gateway**: `https://gateway.pubky.app`
- **Use Case**: Production deployment

## Migration from Old Code

### Before (Hardcoded Values)
```typescript
const DEFAULT_HOMESERVER = "ufibwbmed6jeq9k4p583go95wofakh9fwpp4k734trq79pd9u1uy";
const RELAY = "https://httprelay.staging.pubky.app/link/";
```

### After (Centralized Config)
```typescript
import { config } from "@/lib/config";

const homeserver = config.homeserver.publicKey;
const relay = config.relay.url;
```

## Benefits

✅ **Single Source of Truth**: All configuration in one place  
✅ **Environment-Aware**: Automatic defaults per environment  
✅ **Override Flexibility**: Can override any value via env vars  
✅ **Type-Safe**: TypeScript types for all config values  
✅ **Well-Documented**: Clear documentation in `.env.example`  
✅ **Git-Safe**: `.env.local` is git-ignored  

## Troubleshooting

### Configuration not updating?
Restart the dev server after changing `.env.local`:
```bash
npm run dev
```

### Using wrong environment?
Check your `NEXT_PUBLIC_PUBKY_ENV` value in `.env.local`

### Need to see current config?
Add to your code temporarily:
```typescript
import { config } from "@/lib/config";
console.log("Current config:", config);
```
