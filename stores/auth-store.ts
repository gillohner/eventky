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
                sessionSnapshot: null, // Not needed for recovery file auth
                authMethod: "recovery",
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
            // Export session snapshot for persistence
            // SDK 0.6.0-rc.7+ supports session.export() which returns a string
            // containing public session metadata (no secrets)
            // The browser must keep the HTTP-only cookie alive for restore to work
            const sessionSnapshot = session.export();

            const serializableData: SerializableAuthData = {
                isAuthenticated: true,
                publicKey,
                seed: null, // No seed for QR auth
                sessionSnapshot, // Store the exported session snapshot
                authMethod: "qr",
            };

            // Store in localStorage for persistence across page reloads
            localStorage.setItem(STORAGE_KEY, JSON.stringify(serializableData));

            // Ingest user into Nexus for indexing
            import("@/lib/nexus/ingest").then(({ ingestUserIntoNexus }) => {
                ingestUserIntoNexus(publicKey).catch(console.error);
            });
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

            // If not in localStorage, check sessionStorage (QR auth)
            if (!storedAuth) {
                storedAuth = sessionStorage.getItem(STORAGE_KEY);
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

                    // Use testnet configuration if in testnet mode
                    const pubky = config.env === "testnet" ? Pubky.testnet() : new Pubky();

                    if (parsed.seed && parsed.authMethod === "recovery") {
                        // Recovery file auth: Recreate keypair and session from seed
                        const seedBytes = Uint8Array.from(atob(parsed.seed), c => c.charCodeAt(0));
                        const keypair = Keypair.fromSecretKey(seedBytes);

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
                    } else if (parsed.authMethod === "qr" && parsed.sessionSnapshot) {
                        // QR auth: Restore session from snapshot using SDK's restoreSession()
                        // This works as long as the browser's HTTP-only cookie is still valid
                        try {
                            const session = await pubky.restoreSession(parsed.sessionSnapshot);

                            console.log("QR auth session restored successfully");

                            set({
                                isAuthenticated: true,
                                publicKey: parsed.publicKey,
                                keypair: null,
                                session, // Restored Session object
                                isHydrated: true,
                                isRestoringSession: false,
                            });

                            // Ingest user into Nexus for indexing after hydration
                            import("@/lib/nexus/ingest").then(({ ingestUserIntoNexus }) => {
                                ingestUserIntoNexus(parsed.publicKey!).catch(console.error);
                            });
                        } catch (restoreError) {
                            // Session restore failed - cookie likely expired
                            console.warn(
                                "QR auth session restore failed. Please re-authenticate with Pubky Ring.",
                                restoreError
                            );
                            localStorage.removeItem(STORAGE_KEY);
                            set({ isHydrated: true, isRestoringSession: false });
                        }
                    } else if (parsed.seed) {
                        // Legacy: seed exists but no authMethod - treat as recovery
                        const seedBytes = Uint8Array.from(atob(parsed.seed), c => c.charCodeAt(0));
                        const keypair = Keypair.fromSecretKey(seedBytes);

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
                    } else {
                        // No seed and no valid QR auth snapshot - invalid state
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
