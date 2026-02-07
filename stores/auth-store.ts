import type { Keypair, Session } from "@synonymdev/pubky";
import { create } from "zustand";
import { persist } from "zustand/middleware";

const STORAGE_KEY = "pubky_auth";

// ============================================================================
// Types
// ============================================================================

interface AuthState {
    /** The user's public key (z32-encoded) */
    publicKey: string | null;
    /** Live SDK Session object (not serializable, not persisted) */
    session: Session | null;
    /** Serialized session snapshot from session.export() — persisted to localStorage */
    sessionExport: string | null;
    /** Live SDK Keypair object (not serializable, not persisted) */
    keypair: Keypair | null;
    /** Base64-encoded secret key for recovery file auth — persisted to localStorage */
    seed: string | null;
    /** Auth method used: "recovery" (has seed) or "qr" (has sessionExport only) */
    authMethod: "recovery" | "qr" | null;
    /** Whether Zustand persist has finished rehydrating from localStorage */
    hasHydrated: boolean;
    /** Whether an async session restoration is currently in progress */
    isRestoringSession: boolean;
    /** Whether session restoration was attempted and failed */
    restorationFailed: boolean;
}

interface AuthActions {
    /** Sign in with recovery file (has keypair + seed) */
    signin: (publicKey: string, keypair: Keypair, session: Session) => void;
    /** Sign in with QR/Pubky Ring (session only, no keypair) */
    signinWithSession: (publicKey: string, session: Session) => void;
    /** Log out and clear all auth state + persisted data */
    logout: () => void;
    /** Restore session from persisted credentials (called by provider) */
    restoreSession: () => Promise<void>;
    /** Set hasHydrated flag (called by onRehydrateStorage) */
    setHasHydrated: (value: boolean) => void;
    /** Set isRestoringSession flag */
    setIsRestoringSession: (value: boolean) => void;
    /** Set restorationFailed flag */
    setRestorationFailed: (value: boolean) => void;
}

export type AuthStore = AuthState & AuthActions;

// ============================================================================
// Helpers
// ============================================================================

/**
 * Safely export a session to a string snapshot.
 * Returns null if session is null or export fails.
 * Matches pubky-app's safeSessionExport pattern.
 */
function safeSessionExport(session: Session | null): string | null {
    if (!session) return null;
    try {
        if (typeof session.export === "function") {
            return session.export();
        }
    } catch {
        // ignore export errors; session persistence is best-effort
    }
    return null;
}

/**
 * Clear all cookies to prevent stale HTTP-only cookies from interfering.
 * Matches pubky-app's clearCookies pattern on logout.
 */
function clearCookies(): void {
    try {
        document.cookie.split(";").forEach((c) => {
            const name = c.split("=")[0].trim();
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
        });
    } catch {
        // Cookie clearing is best-effort
    }
}

// ============================================================================
// Initial state
// ============================================================================

const authInitialState: AuthState = {
    publicKey: null,
    session: null,
    sessionExport: null,
    keypair: null,
    seed: null,
    authMethod: null,
    hasHydrated: false,
    isRestoringSession: false,
    restorationFailed: false,
};

// ============================================================================
// Singleton promise for session restoration
// Prevents concurrent restoreSession() calls (e.g., from React StrictMode
// double-mount or multiple watchers). Matches pubky-app's
// AuthApplication.restoreSessionPromise pattern.
// ============================================================================

let restoreSessionPromise: Promise<void> | null = null;

// ============================================================================
// Store
// ============================================================================

export const useAuthStore = create<AuthStore>()(
    persist(
        (set, get) => ({
            ...authInitialState,

            // ----------------------------------------------------------------
            // Actions
            // ----------------------------------------------------------------

            setHasHydrated: (value: boolean) => {
                set({ hasHydrated: value });
            },

            setIsRestoringSession: (value: boolean) => {
                set({ isRestoringSession: value });
            },

            setRestorationFailed: (value: boolean) => {
                set({ restorationFailed: value });
            },

            signin: (publicKey, keypair, session) => {
                const secretKeyBytes = keypair.secretKey();
                const seed = btoa(String.fromCharCode(...secretKeyBytes));

                set({
                    publicKey,
                    keypair,
                    session,
                    sessionExport: safeSessionExport(session),
                    seed,
                    authMethod: "recovery",
                    isRestoringSession: false,
                    restorationFailed: false,
                });

                // Ingest user into Nexus for indexing
                import("@/lib/nexus/ingest").then(({ ingestUserIntoNexus }) => {
                    ingestUserIntoNexus(publicKey).catch(console.error);
                });
            },

            signinWithSession: (publicKey, session) => {
                set({
                    publicKey,
                    keypair: null,
                    session,
                    sessionExport: safeSessionExport(session),
                    seed: null,
                    authMethod: "qr",
                    isRestoringSession: false,
                    restorationFailed: false,
                });

                // Ingest user into Nexus for indexing
                import("@/lib/nexus/ingest").then(({ ingestUserIntoNexus }) => {
                    ingestUserIntoNexus(publicKey).catch(console.error);
                });
            },

            logout: () => {
                // Clear SDK cookies to prevent stale auth state
                clearCookies();

                set({
                    ...authInitialState,
                    hasHydrated: true, // Preserve hydration state to avoid loading flash
                    restorationFailed: false,
                });

                // Zustand persist will auto-save the reset state (all nulls)
                // to localStorage, effectively clearing persisted credentials
            },

            restoreSession: async () => {
                const state = get();

                // If already restoring, wait for the existing promise
                if (restoreSessionPromise) {
                    await restoreSessionPromise;
                    return;
                }

                // Nothing to restore
                if (!state.seed && !state.sessionExport) {
                    if (state.isRestoringSession) {
                        set({ isRestoringSession: false });
                    }
                    return;
                }

                // Already have a live session
                if (state.session) {
                    if (state.isRestoringSession) {
                        set({ isRestoringSession: false });
                    }
                    return;
                }

                restoreSessionPromise = (async () => {
                    set({ isRestoringSession: true, restorationFailed: false });

                    try {
                        const { Keypair, Pubky } = await import("@synonymdev/pubky");
                        const { config } = await import("@/lib/config");

                        const pubky =
                            config.env === "testnet" ? Pubky.testnet() : new Pubky();

                        if (state.seed && (state.authMethod === "recovery" || !state.authMethod)) {
                            // Recovery file auth: recreate keypair and session from seed
                            const seedBytes = Uint8Array.from(atob(state.seed), (c) =>
                                c.charCodeAt(0)
                            );
                            const keypair = Keypair.fromSecretKey(seedBytes);
                            const signer = pubky.signer(keypair);
                            const session = await signer.signin();

                            set({
                                keypair,
                                session,
                                sessionExport: safeSessionExport(session),
                                isRestoringSession: false,
                            });

                            // Ingest user into Nexus after restoration
                            if (state.publicKey) {
                                import("@/lib/nexus/ingest").then(({ ingestUserIntoNexus }) => {
                                    ingestUserIntoNexus(state.publicKey!).catch(console.error);
                                });
                            }
                        } else if (state.authMethod === "qr" && state.sessionExport) {
                            // QR auth: restore session from snapshot
                            const session = await pubky.restoreSession(state.sessionExport);
                            console.log("QR auth session restored successfully");

                            set({
                                session,
                                sessionExport: safeSessionExport(session),
                                isRestoringSession: false,
                            });

                            // Ingest user into Nexus after restoration
                            if (state.publicKey) {
                                import("@/lib/nexus/ingest").then(({ ingestUserIntoNexus }) => {
                                    ingestUserIntoNexus(state.publicKey!).catch(console.error);
                                });
                            }
                        } else {
                            // No valid credentials to restore
                            console.warn("No valid credentials to restore session");
                            set({ isRestoringSession: false });
                        }
                    } catch (error) {
                        console.error("Could not restore session:", error);
                        // IMPORTANT: Do NOT delete persisted credentials on error.
                        // The next page load can retry. Only reset runtime state.
                        // Set restorationFailed so the provider breaks out of the
                        // loading state instead of retrying infinitely.
                        set({
                            session: null,
                            keypair: null,
                            isRestoringSession: false,
                            restorationFailed: true,
                        });
                    } finally {
                        restoreSessionPromise = null;
                    }
                })();

                await restoreSessionPromise;
            },
        }),
        {
            name: STORAGE_KEY,

            // Only persist serializable fields needed to restore session
            partialize: (state) => ({
                publicKey: state.publicKey,
                sessionExport: state.sessionExport,
                seed: state.seed,
                authMethod: state.authMethod,
                // Always persist hasHydrated as false — will be set true
                // by onRehydrateStorage after restore from localStorage
                hasHydrated: false,
            }),

            // Synchronous callback after Zustand restores state from localStorage.
            // This runs BEFORE any React render, so the UI immediately knows
            // whether persisted credentials exist.
            onRehydrateStorage: () => (state) => {
                if (state) {
                    state.setHasHydrated(true);
                    // If we have credentials to restore, flag it immediately
                    // so the UI shows "Restoring session..." instead of
                    // briefly flashing the unauthenticated state
                    if (state.sessionExport || state.seed) {
                        state.setIsRestoringSession(true);
                    }
                }
            },
        }
    )
);
