# Pubky Authentication Implementation

This document describes the Pubky authentication system implemented in Eventky.

## Architecture

The implementation follows a clean architecture pattern with separation of concerns:

```
lib/
  pubky/
    client.ts              # Pubky SDK wrapper with auth methods
stores/
  auth-store.ts           # Zustand store for auth state management
components/
  auth/
    auth-provider.tsx     # React context provider for auth
  providers/
    query-provider.tsx    # TanStack Query provider
types/
  auth.ts                 # TypeScript type definitions
hooks/
  use-profile.ts          # Custom hook for profile queries
app/
  login/
    page.tsx              # Login page with QR & recovery file
```

## Key Features

### 1. **Dual Authentication Methods**

- **Pubky Ring (QR Code)**: Mobile app scans QR code for seamless login
- **Recovery File**: Upload `.pubky` file with passphrase

### 2. **State Management**

- **Zustand** for global auth state
- **TanStack Query** for server state (profiles, events, calendar data)
- **localStorage** for credential persistence

**Session Persistence Architecture:**

Eventky follows the same pattern as pubky-app for secure, persistent authentication:

- **Storage Strategy**: Store only serializable credentials, never WASM instances
  - `publicKey`: User's public key (string)
  - `seed`: Base64-encoded secret key bytes (string, 64 bytes)
  - Sessions are **never stored** - they contain WASM instances that cannot be serialized

- **Recovery File Auth** (Persistent):
  1. User uploads `.pubky` file with passphrase
  2. Keypair is restored and used to create session via `signin()`
  3. Only the base64-encoded `seed` and `publicKey` are stored in localStorage
  4. On page reload: Keypair is recreated from seed, new session is established via `signin()`
  5. SDK's cookie-based session management handles HTTP authentication automatically

- **QR Code Auth** (Limited Persistence):
  1. User scans QR code with Pubky Ring mobile app
  2. Session created and stored in Zustand (memory) + sessionStorage (tab-scoped)
  3. **Current Limitation**: Session JavaScript object lost on page reload
  4. HTTP session cookies persist, but we need Session object for `session.storage` API
  5. **Workaround**: Uses sessionStorage to detect QR auth, prompts user to re-authenticate
  6. **Future**: Waiting for SDK to expose `exportSecret()`/`importSecret()` methods
  7. **Result**: Currently QR auth does NOT fully persist across page reloads
  
**Note**: The Pubky Rust SDK has `export_secret()` and `import_secret()` methods that would enable full QR auth persistence by storing a session token (`<pubkey>:<cookie>`). Once these are exposed in the JS bindings, QR auth will persist properly.

- **Key Insight**: Sessions don't need to be stored because:
  - Recovery file auth: Can recreate session from stored seed
  - QR auth: Intentionally ephemeral (no keypair to recreate)
  - SDK's HTTP cookie-based session management handles persistence within a browser session

## Architecture Principles (Inspired by pubky-app)

Eventky's authentication follows the proven patterns from pubky-app:

**What We Store:**
- ✅ `publicKey` - User's z32-encoded public key (string)
- ✅ `seed` - Base64-encoded 64-byte secret key (string)
- ❌ `session` - Never stored (WASM instance, not serializable)
- ❌ `keypair` - Never stored (WASM instance, recreated from seed)

**Session Recreation Flow:**
1. **Initial Login**: User authenticates → Create session → Store only seed+publicKey
2. **Page Reload**: Read seed from localStorage → Recreate keypair → Call `signin()` → New session
3. **HTTP Requests**: SDK's cookie-based auth handles authentication automatically

**Why This Works:**
- Pubky SDK maintains session cookies in the browser
- Cookies persist across page reloads within browser session
- No need to manually pass session objects to API calls
- Recovery file provides seed, enabling full session recreation
- QR auth has no seed, so it's intentionally ephemeral

## Usage

### Using Authentication

```typescript
import { useAuth } from "@/components/auth/auth-provider";

function MyComponent() {
  const { isAuthenticated, auth, logout } = useAuth();

  if (!isAuthenticated) {
    return <LoginPrompt />;
  }

  return <div>Welcome {auth.publicKey}!</div>;
}
```

### Using Profile Data

```typescript
import { useProfile } from "@/hooks/use-profile";

function ProfileComponent() {
  const { profile, isLoading } = useProfile();

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h1>{profile?.name}</h1>
      <p>{profile?.bio}</p>
      {/* Profile updates are managed in pubky.app */}
    </div>
  );
}
```

## Login Flow

### Recovery File Login

1. User uploads `.pubky` recovery file
2. Enters passphrase
3. System restores `Keypair` from encrypted file
4. Creates session via `Pubky().signer(keypair).signin()`
5. Stores base64-encoded `seed` and `publicKey` in localStorage
6. On page reload: Recreates keypair from seed, establishes new session

### QR Code Login (Pubky Ring)

1. System generates auth URL with capabilities
2. Displays QR code
3. User scans with Pubky Ring mobile app
4. Mobile app sends back authenticated session
5. Session stored in memory only (no localStorage)
6. On page reload: User must re-authenticate (ephemeral by design)

## File Structure Details

### `/lib/pubky/client.ts`

Core Pubky SDK wrapper providing:

- `restoreFromRecoveryFile()` - Restore keypair from encrypted backup
- `signin()` - Create session with keypair
- `getProfile()` - Profile retrieval (SDK's cookies handle auth automatically)

**Note**: Profiles are read-only in Eventky, managed via pubky.app

### `/stores/auth-store.ts`

Zustand store managing:

- Auth state (authenticated, publicKey, keypair, session)
- `signin()` - Stores base64-encoded seed for recovery file auth
- `signinWithSession()` - QR auth (ephemeral, no storage)
- `logout()` - Clears localStorage and state
- `hydrate()` - On app load:
  1. Reads seed and publicKey from localStorage
  2. Recreates keypair from base64-decoded seed
  3. Establishes new session via `signin()`
  4. SDK's cookie-based session management handles HTTP auth

### `/components/auth/auth-provider.tsx`

React context provider:

- Wraps Zustand store with React context
- Handles SSR hydration
- Prevents rendering until hydrated

### `/app/login/page.tsx`

Login UI with:

- QR code authentication (ephemeral)
- Recovery file upload + passphrase (persistent)
- Testnet quick signup for development
- Error handling with toasts
- Responsive design

**Important**: QR auth does not store credentials - sessions are ephemeral and require re-authentication after page reload. This is by design for security.

