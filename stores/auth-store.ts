import { AuthData } from "@/types/auth";
import type { Keypair, Session } from "@synonymdev/pubky";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { config } from "@/lib/config";

const STORAGE_KEY = "auth-store";
const LEGACY_STORAGE_KEY = "pubky_auth";

const defaultAuthData: AuthData & {
    sessionExport: string | null;
    isHydrated: boolean;
    isRestoringSession: boolean;
} = {
    isAuthenticated: false,
    publicKey: null,
    keypair: null,
    session: null,
    sessionExport: null,
    isHydrated: false,
    isRestoringSession: false,
};

interface AuthStore extends AuthData {
    sessionExport: string | null;
    isHydrated: boolean;
    isRestoringSession: boolean;
    signin: (publicKey: string, keypair: Keypair, session: Session) => void;
    signinWithSession: (publicKey: string, session: Session) => void;
    restoreSessionFromExport: () => Promise<void>;
    logout: () => void;
    setIsHydrated: (isHydrated: boolean) => void;
    setIsRestoringSession: (isRestoring: boolean) => void;
    migrateLegacyStorage?: () => void;
}

const safeSessionExport = (session: Session | null): string | null => {
    if (!session) return null;
    try {
        return typeof session.export === "function" ? session.export() : null;
    } catch (error) {
        console.warn("session.export() failed; skipping persistence", error);
        return null;
    }
};

export const useAuthStore = create<AuthStore>()(
    persist(
        (set, get) => {
            const migrateLegacyStorage = () => {
                try {
                    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
                    if (!legacy) return;

                    const parsed = JSON.parse(legacy);
                    // Legacy payloads were either { state: {...} } or plain
                    const legacyState = parsed?.state ?? parsed;
                    const publicKey = legacyState?.publicKey ?? null;
                    const sessionExport = legacyState?.sessionExport ?? legacyState?.sessionSnapshot ?? null;

                    set({
                        isAuthenticated: false,
                        publicKey,
                        keypair: null,
                        session: null,
                        sessionExport,
                        isRestoringSession: Boolean(sessionExport),
                        isHydrated: true,
                    });

                    localStorage.removeItem(LEGACY_STORAGE_KEY);
                    sessionStorage.removeItem(LEGACY_STORAGE_KEY);
                } catch (error) {
                    console.warn("Failed to migrate legacy auth storage", error);
                }
            };

            return {
            ...defaultAuthData,

            signin: (publicKey, keypair, session) => {
                set({
                    isAuthenticated: true,
                    publicKey,
                    keypair,
                    session,
                    sessionExport: safeSessionExport(session),
                });

                // Best-effort background ingestion so Nexus indexes the user
                import("@/lib/nexus/ingest").then(({ ingestUserIntoNexus }) => {
                    ingestUserIntoNexus(publicKey).catch(console.error);
                });
            },

            signinWithSession: (publicKey, session) => {
                set({
                    isAuthenticated: true,
                    publicKey,
                    keypair: null, // Pubky Ring auth does not return the keypair
                    session,
                    sessionExport: safeSessionExport(session),
                });

                // Best-effort background ingestion so Nexus indexes the user
                import("@/lib/nexus/ingest").then(({ ingestUserIntoNexus }) => {
                    ingestUserIntoNexus(publicKey).catch(console.error);
                });
            },

            restoreSessionFromExport: async () => {
                const { sessionExport, session, publicKey } = get();
                // Only skip when we have nothing to restore or already have a live session
                if (!sessionExport || session) return;

                set({ isRestoringSession: true });

                try {
                    const { Pubky } = await import("@synonymdev/pubky");
                    const sdk = config.env === "testnet" ? Pubky.testnet() : new Pubky();
                    // Add a timeout to avoid hanging forever on mobile browsers if cookies/network block the request
                    const restoredSession = await Promise.race([
                        sdk.restoreSession(sessionExport),
                        new Promise<Session>((_, reject) =>
                            setTimeout(() => reject(new Error("restoreSession timeout")), 8000),
                        ),
                    ]);

                    set({
                        isAuthenticated: true,
                        publicKey,
                        keypair: null,
                        session: restoredSession,
                        sessionExport: safeSessionExport(restoredSession),
                        isRestoringSession: false,
                    });
                } catch (error) {
                    console.warn("Failed to restore session from export; clearing snapshot", error);
                    set({
                        isAuthenticated: false,
                        publicKey: null,
                        keypair: null,
                        session: null,
                        sessionExport: null,
                        isRestoringSession: false,
                    });
                }
            },

            logout: () => {
                set({
                    ...defaultAuthData,
                    isHydrated: true, // avoid loading screen after logout
                });
            },

            setIsHydrated: (isHydrated: boolean) => set({ isHydrated }),
            setIsRestoringSession: (isRestoring: boolean) => set({ isRestoringSession: isRestoring }),
            migrateLegacyStorage,
        };
        },
        {
            name: STORAGE_KEY,
            version: 1,
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                publicKey: state.publicKey,
                sessionExport: state.sessionExport,
            }),
            onRehydrateStorage: () => (state) => {
                if (state) {
                    state.setIsHydrated(true);
                    if (state.sessionExport) {
                        state.setIsRestoringSession(true);
                    }
                    // One-time migration from legacy storage key
                    state.migrateLegacyStorage?.();
                }
            },
        },
    ),
);
