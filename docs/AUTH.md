# Authentication

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
6. Session persists across page reloads by recreating from seed

### QR Code Login (Pubky Ring)

1. System generates auth URL with capabilities
2. Displays QR code
3. User scans with Pubky Ring mobile app
4. Mobile app sends back authenticated session
5. Session snapshot exported via `session.export()` and stored in localStorage
6. Browser maintains HTTP-only cookie for session validity
7. Session persists across page reloads via `pubky.restoreSession(sessionSnapshot)`

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
- `signin()` - Stores base64-encoded seed for recovery file auth (persistent)
- `signinWithSession()` - Stores session snapshot for QR auth (persistent)
- `logout()` - Clears localStorage and state
- `hydrate()` - On app load, handles both auth methods:
  - **Recovery file auth**: 
    1. Reads seed and publicKey from localStorage
    2. Recreates keypair from base64-decoded seed
    3. Establishes new session via `signin()`
  - **QR auth**:
    1. Reads sessionSnapshot and publicKey from localStorage
    2. Restores session via `pubky.restoreSession(sessionSnapshot)`
    3. Requires valid HTTP-only cookie in browser
    4. Falls back to logout if cookie expired

### `/components/auth/auth-provider.tsx`

React context provider:

- Wraps Zustand store with React context
- Handles SSR hydration
- Prevents rendering until hydrated

### `/app/login/page.tsx`

Login UI with:

- QR code authentication (persistent via session snapshot)
- Recovery file upload + passphrase (persistent via seed)
- Testnet quick signup for development
- Error handling with toasts
- Responsive design

**Note**: Both QR and recovery file auth persist across page reloads. QR auth requires the browser's HTTP-only cookie to remain valid.
