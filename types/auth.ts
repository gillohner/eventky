import { Keypair, Session } from "@synonymdev/pubky";

export interface AuthData {
  isAuthenticated: boolean;
  publicKey: string | null;
  keypair: Keypair | null;
  session: Session | null;
}

export interface SerializableAuthData {
  isAuthenticated: boolean;
  publicKey: string | null;
  // Store base64-encoded secret key for recovery file auth
  // Session will be recreated on hydration via signin()
  // SDK's cookie-based session management handles persistence
  seed: string | null; // Base64-encoded secret key (64 bytes)
  // For QR auth: session snapshot from session.export()
  // Allows restoring session via pubky.restoreSession() on page reload
  // Only works if browser HTTP-only cookie is still valid
  sessionSnapshot: string | null;
  // Auth method for clarity on how to restore session
  authMethod: "recovery" | "qr" | null;
}

export interface AuthContextType {
  auth: AuthData;
  signin: (publicKey: string, keypair: Keypair, session: Session) => void;
  signinWithSession: (publicKey: string, session: Session) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

