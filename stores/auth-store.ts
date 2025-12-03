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
            // Store base64-encoded secret key for persistence
            // Session will be recreated on hydration via signin()
            // SDK's cookie-based session management handles persistence
            const secretKeyBytes = keypair.secretKey();
            const seed = btoa(String.fromCharCode(...secretKeyBytes));

            const serializableData: SerializableAuthData = {
                isAuthenticated: true,
                publicKey,
                seed,
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(serializableData));

            // Ingest user into Nexus for indexing
            import("@/lib/nexus/ingest").then(({ ingestUserIntoNexus }) => {
                ingestUserIntoNexus(publicKey).catch(console.error);
            });
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
            // Store publicKey for QR auth in sessionStorage (tab-scoped persistence)
            // Session object stays in memory, cookies maintained by browser
            // This allows auth to persist across page reloads within same tab
            const serializableData: SerializableAuthData = {
                isAuthenticated: true,
                publicKey,
                seed: null, // No seed for QR auth
            };

            // Use sessionStorage for tab-scoped persistence (not localStorage)
            // This way QR auth persists in the tab but not across new tabs
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(serializableData));

            // Ingest user into Nexus for indexing
            import("@/lib/nexus/ingest").then(({ ingestUserIntoNexus }) => {
                ingestUserIntoNexus(publicKey).catch(console.error);
            });
        } catch (error) {
            console.error("Error saving auth to sessionStorage:", error);
        }
    },

    logout: () => {
        set({
            ...defaultAuthData,
            isHydrated: true, // Keep hydrated flag to avoid loading state
        });

        try {
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(`${STORAGE_KEY}_session_url`);
            sessionStorage.removeItem(STORAGE_KEY);
        } catch (error) {
            console.error("Error removing auth from storage:", error);
        }
    },

    hydrate: async () => {
        // Only hydrate once
        if (get().isHydrated) return;

        set({ isRestoringSession: true });

        try {
            // Check localStorage first (recovery file auth with seed)
            let storedAuth = localStorage.getItem(STORAGE_KEY);
            let isQrAuth = false;

            // If not in localStorage, check sessionStorage (QR auth)
            if (!storedAuth) {
                storedAuth = sessionStorage.getItem(STORAGE_KEY);
                isQrAuth = true;
            }

            if (storedAuth) {
                const parsed: SerializableAuthData = JSON.parse(storedAuth);

                // Validate stored data
                if (!parsed.isAuthenticated || !parsed.publicKey) {
                    console.warn("Invalid stored auth data, clearing...");
                    localStorage.removeItem(STORAGE_KEY);
                    sessionStorage.removeItem(STORAGE_KEY);
                    set({ isHydrated: true, isRestoringSession: false });
                    return;
                }

                try {
                    const { Keypair, Pubky } = await import("@synonymdev/pubky");
                    const { config } = await import("@/lib/config");

                    if (parsed.seed) {
                        // Recovery file auth: Recreate keypair and session from seed
                        const seedBytes = Uint8Array.from(atob(parsed.seed), c => c.charCodeAt(0));
                        const keypair = Keypair.fromSecretKey(seedBytes);

                        // Use testnet configuration if in testnet mode
                        const pubky = config.env === "testnet" ? Pubky.testnet() : new Pubky();
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

                        // Ingest user into Nexus for indexing after hydration
                        if (parsed.publicKey) {
                            import("@/lib/nexus/ingest").then(({ ingestUserIntoNexus }) => {
                                ingestUserIntoNexus(parsed.publicKey!).catch(console.error);
                            });
                        }
                    } else if (isQrAuth) {
                        // QR auth: Session cookies should still be valid in this browser tab
                        // We can't recreate the Session object without the keypair,
                        // but browser maintains HTTP session cookies
                        // User needs to re-scan QR code to get a new Session object
                        console.warn("QR auth detected but Session object lost on reload");
                        console.warn("Please re-authenticate with QR code");
                        sessionStorage.removeItem(STORAGE_KEY);
                        set({ isHydrated: true, isRestoringSession: false });
                    } else {
                        // No seed and not QR auth - invalid state
                        console.warn("Invalid auth state, clearing...");
                        localStorage.removeItem(STORAGE_KEY);
                        set({ isHydrated: true, isRestoringSession: false });
                    }
                } catch (error) {
                    console.error("Could not restore session:", error);
                    localStorage.removeItem(STORAGE_KEY);
                    sessionStorage.removeItem(STORAGE_KEY);
                    set({ isHydrated: true, isRestoringSession: false });
                }
            } else {
                set({ isHydrated: true, isRestoringSession: false });
            }
        } catch (error) {
            console.error("Error loading auth from storage:", error);
            localStorage.removeItem(STORAGE_KEY);
            sessionStorage.removeItem(STORAGE_KEY);
            set({ isHydrated: true, isRestoringSession: false });
        }
    },
}));
