import { Session } from "@synonymdev/pubky";

/**
 * Auth data shape exposed via the AuthContext.
 * Contains only the fields that consumers need.
 */
export interface AuthData {
    isAuthenticated: boolean;
    publicKey: string | null;
    session: Session | null;
}

export interface AuthContextType {
    auth: AuthData;
    publicKey: string | null;
    session: Session | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    logout: () => Promise<void>;
}
