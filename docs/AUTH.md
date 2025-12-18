# Authentication

## Methods

| Method                   | Persistence   | Notes                                                     |
| ------------------------ | ------------- | --------------------------------------------------------- |
| **Recovery File**        | ✅ Persistent | Upload `.pkarr` + passphrase, seed stored in localStorage |
| **QR Code (Pubky Ring)** | ❌ Ephemeral  | Session lost on page reload                               |
| **Testnet Signup**       | ✅ Persistent | Downloads `.pkarr` file automatically                     |


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
