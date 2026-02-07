import type { Session } from "@synonymdev/pubky";
import { create } from "zustand";
import { persist } from "zustand/middleware";

const STORAGE_KEY = "auth-store";

// ============================================================================
// Types — mirrors pubky-app's auth.types.ts
// ============================================================================

interface AuthInitParams {
    publicKey: string | null;
    session: Session | null;
}

interface AuthState {
    /** The user's public key (z32-encoded) */
    publicKey: string | null;
    /** Live SDK Session object (WASM-backed, not serializable, NOT persisted) */
    session: Session | null;
    /** Serialized session snapshot from session.export() — persisted to localStorage */
    sessionExport: string | null;
    /** Whether Zustand persist has finished rehydrating from localStorage */
    hasHydrated: boolean;
    /** Whether an async session restoration is currently in progress */
    isRestoringSession: boolean;
}

interface AuthActions {
    /** Initialize auth state (sets session + publicKey + sessionExport atomically) */
    init: (params: AuthInitParams) => void;
    /** Update session + sessionExport (used when session rotates) */
    setSession: (session: Session | null) => void;
    /** Reset all auth state (logout) */
    reset: () => void;
    /** Set hasHydrated flag (called by onRehydrateStorage) */
    setHasHydrated: (value: boolean) => void;
    /** Set isRestoringSession flag */
    setIsRestoringSession: (value: boolean) => void;
}

export type AuthStore = AuthState & AuthActions;

// ============================================================================
// Helpers — identical to pubky-app
// ============================================================================

/**
 * Safely export a session to a string snapshot.
 * Returns null if session is null or export fails.
 * Identical to pubky-app's safeSessionExport in auth.actions.ts
 */
function safeSessionExport(session: Session | null): string | null {
    if (!session) {
        console.log("[auth-store] safeSessionExport: session is null");
        return null;
    }
    try {
        if (typeof session.export === "function") {
            const result = session.export();
            console.log("[auth-store] safeSessionExport: export() returned", result ? `string(${result.length} chars)` : result);
            return result;
        }
        console.warn("[auth-store] safeSessionExport: session.export is not a function, type:", typeof session.export);
    } catch (e) {
        console.error("[auth-store] safeSessionExport: export() threw:", e);
    }
    return null;
}

/**
 * Clear all cookies to prevent stale HTTP-only cookies from interfering.
 * Identical to pubky-app's clearCookies in libs/utils/utils.ts
 */
export function clearCookies(): void {
    if (typeof document !== "undefined") {
        document.cookie.split(";").forEach((cookie) => {
            const eqPos = cookie.indexOf("=");
            const name = eqPos > -1 ? cookie.substring(0, eqPos) : cookie;
            document.cookie = `${name.trim()}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
        });
    }
}

// ============================================================================
// Initial state — matches pubky-app's authInitialState
// ============================================================================

const authInitialState: AuthState = {
    publicKey: null,
    session: null,
    sessionExport: null,
    hasHydrated: false,
    isRestoringSession: false,
};

// ============================================================================
// Manual persistence helper
// Zustand persist's subscribe-based writes can fail silently when the state
// contains non-serializable WASM objects (like Session). We write explicitly
// to guarantee sessionExport/publicKey reach localStorage.
// ============================================================================

function persistToStorage(state: AuthState): void {
    try {
        const data = {
            state: {
                publicKey: state.publicKey,
                sessionExport: state.sessionExport,
                hasHydrated: false,
            },
            version: 0,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        console.log("[auth-store] persistToStorage: wrote", JSON.stringify(data).length, "chars");
    } catch (e) {
        console.error("[auth-store] persistToStorage: failed", e);
    }
}

// ============================================================================
// Store — mirrors pubky-app's auth.store.ts + auth.actions.ts
// ============================================================================

export const useAuthStore = create<AuthStore>()(
    persist(
        (set) => ({
            ...authInitialState,

            // ----------------------------------------------------------------
            // Actions — match pubky-app's createAuthActions exactly
            // ----------------------------------------------------------------

            init: ({ session, publicKey }: AuthInitParams) => {
                const sessionExport = safeSessionExport(session);
                console.log("[auth-store] init: publicKey=", publicKey?.substring(0, 8), "sessionExport=", sessionExport ? `${sessionExport.length}ch` : null);

                set({
                    session,
                    sessionExport,
                    publicKey,
                });

                // Explicit write to localStorage as safety net
                const state = useAuthStore.getState();
                persistToStorage(state);
            },

            // Mirrors pubky-app's setSession, used when the SDK rotates sessions
            setSession: (session: Session | null) => {
                const sessionExport = safeSessionExport(session);
                set((state) => ({
                    ...state,
                    session,
                    sessionExport,
                }));

                // Explicit write to localStorage
                const state = useAuthStore.getState();
                persistToStorage(state);
            },

            reset: () => {
                set((state) => ({
                    ...authInitialState,
                    hasHydrated: state.hasHydrated, // Preserve hydration state
                }));

                // Explicit write to localStorage
                persistToStorage({ ...authInitialState, hasHydrated: true, isRestoringSession: false });
            },

            setHasHydrated: (value: boolean) => {
                set({ hasHydrated: value });
            },

            setIsRestoringSession: (value: boolean) => {
                set({ isRestoringSession: value });
            },
        }),
        {
            name: STORAGE_KEY,

            // Only persist serializable fields needed to restore session.
            // Matches pubky-app's partialize exactly.
            // NOTE: session (live WASM object) is NOT persisted.
            //       Only sessionExport (base64 string from session.export()) is.
            partialize: (state) => ({
                publicKey: state.publicKey,
                sessionExport: state.sessionExport,
                hasHydrated: false, // Always stored as false; set true by rehydration
            }),

            // Matches pubky-app's onRehydrateStorage exactly.
            // Runs synchronously BEFORE any React render.
            onRehydrateStorage: () => (state) => {
                if (state) {
                    state.setHasHydrated(true);
                    // If we have a sessionExport to restore, eagerly flag it
                    // so the UI shows loading instead of flashing unauthenticated
                    if (state.sessionExport) {
                        state.setIsRestoringSession(true);
                    }
                }
            },
        }
    )
);
