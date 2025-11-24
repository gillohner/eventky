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
- **localStorage** for persistence (serializable data only)

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
3. System restores `Keypair` from file
4. Signs in to homeserver to get `Session`
5. Stores auth state in Zustand + localStorage

### QR Code Login (Pubky Ring)

1. System generates auth URL with challenge
2. Displays QR code
3. User scans with Pubky Ring mobile app
4. Mobile app sends back authenticated session
5. System verifies challenge and stores session

## File Structure Details

### `/lib/pubky/client.ts`

Core Pubky SDK wrapper providing:

- `restoreFromRecoveryFile()` - Restore keypair from backup
- `signin()` - Sign in with keypair
- `getProfile()` - Profile retrieval (read-only, managed in pubky.app)

### `/stores/auth-store.ts`

Zustand store managing:

- Auth state (authenticated, publicKey, keypair, session)
- Login/signin/logout actions
- localStorage persistence
- Hydration on app load

### `/components/auth/auth-provider.tsx`

React context provider:

- Wraps Zustand store with React context
- Handles SSR hydration
- Prevents rendering until hydrated

### `/app/login/page.tsx`

Login UI with:

- Left side: QR code display with copy URL
- Right side: Recovery file upload + passphrase
- Error handling with toasts
- Responsive design

