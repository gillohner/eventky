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
}

export interface AuthContextType {
  auth: AuthData;
  signin: (publicKey: string, keypair: Keypair, session: Session) => void;
  signinWithSession: (publicKey: string, session: Session) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

