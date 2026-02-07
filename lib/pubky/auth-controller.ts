/**
 * AuthController — mirrors pubky-app's AuthController (core/controllers/auth/auth.ts)
 *
 * Orchestrates authentication flows:
 * - Session restoration from persisted sessionExport
 * - Sign-in via keypair (recovery file)
 * - Sign-in via QR/Ring session
 * - Logout
 *
 * Uses the singleton PubkyService for all SDK operations.
 */
import type { Keypair, Session } from "@synonymdev/pubky";
import { useAuthStore } from "@/stores/auth-store";
import { clearCookies } from "@/stores/auth-store";
import { PubkyService } from "@/lib/pubky/service";
import { ingestUserIntoNexus } from "@/lib/nexus/ingest";

// ============================================================================
// Singleton promise for session restoration
// Matches pubky-app's AuthApplication.restoreSessionPromise pattern
// ============================================================================

type RestoreSessionResult = { session: Session } | null;
let restoreSessionPromise: Promise<RestoreSessionResult> | null = null;

export class AuthController {
    private constructor() { } // Prevent instantiation

    /**
     * Restore a persisted session from the auth store's sessionExport.
     * Mirrors pubky-app's AuthController.restorePersistedSession() +
     * AuthApplication.restorePersistedSession() combined.
     *
     * @returns true if session was restored, false otherwise
     */
    static async restorePersistedSession(): Promise<boolean> {
        const authStore = useAuthStore.getState();
        console.log("[AuthController] restorePersistedSession called");
        console.log("[AuthController] sessionExport:", authStore.sessionExport ? `string(${authStore.sessionExport.length} chars)` : authStore.sessionExport);
        console.log("[AuthController] publicKey:", authStore.publicKey);

        // If already restoring, return the existing promise
        if (restoreSessionPromise) {
            const result = await restoreSessionPromise;
            return result !== null;
        }

        // Safety: if no sessionExport, bail
        if (!authStore.sessionExport) {
            if (authStore.isRestoringSession) {
                authStore.setIsRestoringSession(false);
            }
            return false;
        }

        // Start restoration and store the promise so concurrent calls await the same one
        restoreSessionPromise = (async (): Promise<RestoreSessionResult> => {
            authStore.setIsRestoringSession(true);
            try {
                const pubkySdk = PubkyService.getInstance();
                const session = await pubkySdk.restoreSession(authStore.sessionExport!);
                console.log("[AuthController] Session restored successfully");
                return { session };
            } catch (error) {
                console.error("[AuthController] Failed to restore session from persisted export", error);
                // On failure: clear all auth state (matches pubky-app behavior)
                authStore.init({ session: null, publicKey: null });
                return null;
            } finally {
                authStore.setIsRestoringSession(false);
                restoreSessionPromise = null;
            }
        })();

        const result = await restoreSessionPromise;
        if (!result) return false;

        const { session } = result;
        const publicKey = session.info.publicKey.z32();

        // Initialize auth state with restored session
        authStore.init({ session, publicKey });

        return true;
    }

    /**
     * Sign in with a keypair (recovery file flow).
     * Mirrors pubky-app's AuthController.signIn()
     */
    static async signinWithKeypair(keypair: Keypair): Promise<void> {
        const pubkySdk = PubkyService.getInstance();
        const signer = pubkySdk.signer(keypair);
        const session = await signer.signin();
        const publicKey = session.info.publicKey.z32();

        const authStore = useAuthStore.getState();
        authStore.init({ session, publicKey });

        // Ingest into Nexus
        ingestUserIntoNexus(publicKey).catch(console.error);
    }

    /**
     * Initialize an authenticated session from a QR/Ring auth flow.
     * Mirrors pubky-app's AuthController.initializeAuthenticatedSession()
     */
    static async initializeAuthenticatedSession(session: Session): Promise<void> {
        console.log("[AuthController] initializeAuthenticatedSession called");
        console.log("[AuthController] session object:", session);
        console.log("[AuthController] session.info:", session.info);

        const authStore = useAuthStore.getState();
        const publicKey = session.info.publicKey.z32();
        console.log("[AuthController] publicKey:", publicKey);

        // Test session.export() explicitly before passing to store
        try {
            const exported = typeof session.export === "function" ? session.export() : null;
            console.log("[AuthController] session.export() result:", exported ? `string(${exported.length} chars)` : exported);
        } catch (e) {
            console.error("[AuthController] session.export() threw:", e);
        }

        authStore.init({ session, publicKey });

        // Verify what was persisted
        const stateAfter = useAuthStore.getState();
        console.log("[AuthController] After init - sessionExport:", stateAfter.sessionExport ? `string(${stateAfter.sessionExport.length} chars)` : stateAfter.sessionExport);
        console.log("[AuthController] After init - publicKey:", stateAfter.publicKey);
        console.log("[AuthController] After init - session:", stateAfter.session ? "present" : "null");

        // Also verify localStorage directly
        try {
            const stored = localStorage.getItem("auth-store");
            console.log("[AuthController] localStorage 'auth-store':", stored ? `string(${stored.length} chars)` : stored);
        } catch (e) {
            console.warn("[AuthController] Could not read localStorage:", e);
        }

        // Ingest into Nexus
        ingestUserIntoNexus(publicKey).catch(console.error);
    }

    /**
     * Log out the current user.
     * Mirrors pubky-app's AuthController.logout()
     */
    static async logout(): Promise<void> {
        const authStore = useAuthStore.getState();
        const session = authStore.session;

        if (session) {
            try {
                await session.signout();
            } catch (error) {
                console.warn("[AuthController] Homeserver logout failed, clearing local state anyway", error);
            }
        }

        authStore.reset();
        clearCookies();
    }
}
