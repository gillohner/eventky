import { AuthData, SerializableAuthData } from "@/types/auth";
import type { Keypair, Session } from "@synonymdev/pubky";
import { create } from "zustand";

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
            // Recovery file auth: Store keypair seed to recreate session on refresh
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

        // QR auth: Session persists in memory during browser session only
        // Cannot be serialized to localStorage (Session object is not JSON-serializable)
        // Sessions from QR auth are temporary and managed by the authenticator app
        // User will need to re-authenticate with QR code after page refresh
        // This is by design for security - similar to WhatsApp Web
    },

    logout: () => {
        set({
            ...defaultAuthData,
            isHydrated: true, // Keep hydrated flag to avoid loading state
        });

        try {
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(`${STORAGE_KEY}_session_url`);
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

                // Recovery file auth: Recreate session from keypair seed
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
                        console.error("Error restoring session from keypair:", sessionError);
                        // Fall through to logout state
                    }
                }

                // QR auth case: No keypair seed means session can't be restored
                // User needs to re-authenticate with QR code
                set({
                    isAuthenticated: false,
                    publicKey: null,
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
