"use client";

import { createContext, useContext, useEffect, useMemo, ReactNode } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { AuthController } from "@/lib/pubky/auth-controller";
import type { Session } from "@synonymdev/pubky";

// ============================================================================
// Context type — backwards-compatible with existing consumers
// ============================================================================

/** Auth data shape used by mutation hooks (auth.session, auth.publicKey) */
interface AuthData {
  isAuthenticated: boolean;
  publicKey: string | null;
  session: Session | null;
}

interface AuthContextType {
  /** Auth data bag (backwards-compatible with existing hook consumers) */
  auth: AuthData;
  /** The user's public key (z32-encoded), or null */
  publicKey: string | null;
  /** The live SDK Session object, or null */
  session: Session | null;
  /** Whether the user is authenticated (has a live session) */
  isAuthenticated: boolean;
  /** Whether auth state is still loading (hydration or restoration) */
  isLoading: boolean;
  /** Log out the current user */
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================================================
// Provider — mirrors pubky-app's RouteGuardProvider session restoration logic
// ============================================================================

export function AuthProvider({ children }: { children: ReactNode }) {
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const session = useAuthStore((state) => state.session);
  const sessionExport = useAuthStore((state) => state.sessionExport);
  const publicKey = useAuthStore((state) => state.publicKey);
  const isRestoringSession = useAuthStore((state) => state.isRestoringSession);

  // Session restoration watcher — identical to pubky-app's RouteGuardProvider useEffect.
  // Dependencies: [hasHydrated, session, sessionExport] — exactly like pubky-app.
  // No seed, no restorationFailed, no isRestoringSession in deps.
  useEffect(() => {
    if (!hasHydrated) return;        // Wait for Zustand rehydration
    if (session) return;             // Already have a live session
    if (!sessionExport) return;      // Nothing to restore

    AuthController.restorePersistedSession().catch((error) => {
      console.error("[AuthProvider] Failed to restore persisted session", error);
    });
  }, [hasHydrated, session, sessionExport]);

  // Loading state — identical to pubky-app's useAuthStatus isLoading formula.
  // isSessionRestorePending: sessionExport exists but live session hasn't been reconstructed yet.
  const isSessionRestorePending = useMemo(
    () => sessionExport !== null && session === null,
    [sessionExport, session]
  );

  const isLoading = !hasHydrated || isRestoringSession || isSessionRestorePending;

  const isAuthenticated = session !== null;

  const contextValue = useMemo((): AuthContextType => ({
    auth: {
      isAuthenticated,
      publicKey,
      session,
    },
    publicKey,
    session,
    isAuthenticated,
    isLoading,
    logout: AuthController.logout,
  }), [publicKey, session, isLoading, isAuthenticated]);

  // Show loading state during hydration or session restoration
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            {isRestoringSession ? "Restoring session..." : "Loading..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
