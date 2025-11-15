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

### 3. **Session Handling**

⚠️ **Important**: `Keypair` and `Session` objects cannot be serialized to JSON.

- On login: Store `keypair` and `session` in memory
- On page refresh: User must re-authenticate
- Stored in localStorage: `publicKey`, `plan`, `signupCompletedAt`, `seedPhrase`

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

⚠️ **Note**: QR code polling mechanism needs backend implementation

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

## Security Considerations

1. **Passphrase**: Never stored, only used to decrypt recovery file
2. **Private Key**: Only in memory, never persisted
3. **Session**: Only in memory, requires re-auth on refresh
4. **Recovery File**: Encrypted with user passphrase

## Next Steps

### Required Backend Implementation

1. **QR Code Polling**
   - Endpoint to check auth completion
   - Challenge verification
   - Session return

2. **Invite Code System** (if signup is added later)
   - Generate invite codes
   - Track usage
   - Rate limiting

### Optional Enhancements

1. Remember device (longer session storage)
2. Biometric authentication
3. Session refresh tokens
4. Multi-device management

## Dependencies

```json
{
  "@synonymdev/pubky": "0.6.0-rc.6",
  "pubky-app-specs": "file:../pubky-app-specs/pkg",
  "zustand": "^5.x",
  "@tanstack/react-query": "^5.x",
  "qrcode.react": "^4.x"
}
```

## Local Development with pubky-app-specs

The project uses NPM workspaces to link the local `pubky-app-specs` package for development.

### Workspace Setup

1. **Build pubky-app-specs**:
   ```bash
   cd ~/Repositories/pubky-app-specs
   cargo run --bin bundle_specs_npm
   ```

2. **Install from monorepo root**:
   ```bash
   cd ~/Repositories
   npm install
   ```

3. **Next.js Turbopack configuration** handles the local package resolution:
   ```typescript
   // next.config.ts
   import { join } from "path";
   
   turbopack: {
     root: join(__dirname, ".."), // Points to monorepo root
   }
   ```

The workspace configuration is at `/home/gil/Repositories/package.json`:
```json
{
  "workspaces": [
    "eventky",
    "pubky-app-specs/pkg"
  ]
}
```

Changes to `pubky-app-specs` are automatically picked up - just rebuild and restart the dev server.

## Environment Variables

Currently using hardcoded homeserver. Add to `.env.local`:

```
NEXT_PUBLIC_PUBKY_HOMESERVER=ufibwbmed6jeq9k4p583go95wofakh9fwpp4k734trq79pd9u1uy
```

## Testing

To test the login page:

1. Start dev server: `npm run dev`
2. Navigate to `/login`
3. Use recovery file method (requires existing Pubky account)
4. QR code method requires backend polling implementation

## Troubleshooting

### "No active session" error

- User needs to re-authenticate after page refresh
- Keypair and session are not persisted

### Recovery file not loading

- Ensure file ends with `.pubky` extension
- Verify passphrase is correct
- Check browser console for errors

### QR code not working

- Verify Pubky Ring app is installed
- Check auth URL format
- Backend polling needs to be implemented

## Resources

- [Pubky SDK Documentation](https://github.com/pubky/pubky)
- [Homegate Reference Implementation](https://github.com/pubky/homegate)
- [Zustand Documentation](https://zustand-demo.pmnd.rs/)
- [TanStack Query Documentation](https://tanstack.com/query/latest)
