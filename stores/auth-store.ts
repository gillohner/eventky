import { create } from "zustand";
import type { Keypair, Session } from "@synonymdev/pubky";
import { AuthData, SerializableAuthData } from "@/types/auth";

const STORAGE_KEY = "pubky_auth";

const defaultAuthData: AuthData = {
    isAuthenticated: false,
    publicKey: null,
    keypair: null,
    session: null,
};

interface AuthStore extends AuthData {
    isHydrated: boolean;
    isRestoringSession: boolean;
    signin: (publicKey: string, keypair: Keypair, session: Session) => void;
    signinWithSession: (publicKey: string, session: Session) => void;
    logout: () => void;
    hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
    ...defaultAuthData,
    isHydrated: false,
    isRestoringSession: false,

    signin: (publicKey, keypair, session) => {
        const authData: AuthData = {
            isAuthenticated: true,
            publicKey,
            keypair,
            session,
        };

        set(authData);

        try {
            // Extract keypair seed for session reconstruction
            const secretKeyBytes = keypair.secretKey();
            const keypairSeed = Array.from(secretKeyBytes.slice(0, 32)) as number[];

            const serializableData: SerializableAuthData = {
                isAuthenticated: authData.isAuthenticated,
                publicKey: authData.publicKey,
                keypairSeed,
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(serializableData));
        } catch (error) {
            console.error("Error saving auth to localStorage:", error);
        }
    },

    signinWithSession: (publicKey, session) => {
        const authData: AuthData = {
            isAuthenticated: true,
            publicKey,
            keypair: null, // QR auth provides session but not keypair
            session,
        };

        set(authData);

        try {
            // QR auth: We have a valid session but can't serialize it to localStorage.
            // Store auth state so user appears logged in, but session won't persist across page refresh.
            // User will need to re-scan QR code after refresh to get a new session.
            const serializableData: SerializableAuthData = {
                isAuthenticated: true, // User IS authenticated with valid session
                publicKey: authData.publicKey,
                keypairSeed: null, // No keypair available - can't restore session
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(serializableData));
        } catch (error) {
            console.error("Error saving auth to localStorage:", error);
        }
    },

    logout: () => {
        set({
            ...defaultAuthData,
            isHydrated: true, // Keep hydrated flag to avoid loading state
        });

        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (error) {
            console.error("Error removing auth from localStorage:", error);
        }
    },

    hydrate: async () => {
        // Only hydrate once
        if (get().isHydrated) return;

        set({ isRestoringSession: true });

        try {
            const storedAuth = localStorage.getItem(STORAGE_KEY);
            if (storedAuth) {
                const parsed: SerializableAuthData = JSON.parse(storedAuth);

                // If we have a keypair seed, recreate the session
                if (parsed.isAuthenticated && parsed.keypairSeed && parsed.publicKey) {
                    try {
                        // Dynamically import Pubky SDK to avoid SSR issues
                        const { Keypair, Pubky } = await import("@synonymdev/pubky");

                        // Recreate keypair from seed
                        const seedArray = new Uint8Array(parsed.keypairSeed);
                        const keypair = Keypair.fromSecretKey(seedArray);

                        // Recreate session
                        const pubky = new Pubky();
                        const signer = pubky.signer(keypair);
                        const session = await signer.signin();

                        set({
                            isAuthenticated: true,
                            publicKey: parsed.publicKey,
                            keypair,
                            session,
                            isHydrated: true,
                            isRestoringSession: false,
                        });
                        return;
                    } catch (sessionError) {
                        console.error("Error restoring session:", sessionError);
                        // Fall through to set non-authenticated state
                    }
                }

                // QR auth case: User was authenticated but we can't restore session (no keypair seed)
                // Mark as not authenticated so they need to re-scan QR code
                set({
                    isAuthenticated: false,
                    publicKey: parsed.publicKey,
                    keypair: null,
                    session: null,
                    isHydrated: true,
                    isRestoringSession: false,
                });
            } else {
                set({ isHydrated: true, isRestoringSession: false });
            }
        } catch (error) {
            console.error("Error loading auth from localStorage:", error);
            set({ isHydrated: true, isRestoringSession: false });
        }
    },
}));
