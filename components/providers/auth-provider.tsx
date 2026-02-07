"use client";

import { createContext, useContext, useEffect, useMemo, ReactNode } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { AuthContextType } from "@/types/auth";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const authStore = useAuthStore();
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const session = useAuthStore((state) => state.session);
  const sessionExport = useAuthStore((state) => state.sessionExport);
  const seed = useAuthStore((state) => state.seed);
  const isRestoringSession = useAuthStore((state) => state.isRestoringSession);
  const restorationFailed = useAuthStore((state) => state.restorationFailed);

  // Reactive session restoration watcher.
  // Modeled on pubky-app's RouteGuardProvider pattern:
  // Whenever hasHydrated is true but we have persisted credentials (sessionExport or seed)
  // without a live session, attempt to restore the session.
  // This handles:
  // - Initial page load (Zustand persist rehydrates → credentials exist → restore)
  // - Session loss mid-use (session becomes null → re-attempt)
  // - Page resume on mobile (tab was killed, session object lost → retry)
  //
  // Does NOT retry after a failed restoration — the user can reload or log in again.
  useEffect(() => {
    if (!hasHydrated) return;
    if (session) return; // Already have a live session
    if (!sessionExport && !seed) return; // No credentials to restore
    if (restorationFailed) return; // Previous attempt failed — don't loop
    if (isRestoringSession) return; // Already in progress

    authStore.restoreSession().catch((error) => {
      console.error("[AuthProvider] Failed to restore session:", error);
    });
  }, [hasHydrated, session, sessionExport, seed, restorationFailed, isRestoringSession, authStore]);

  // Compute whether we're in a "loading" state:
  // 1. Zustand persist hasn't rehydrated yet
  // 2. Active session restoration in progress
  // 3. Credentials exist but live session hasn't been restored yet AND restoration hasn't failed
  //    (isSessionRestorePending — matches pubky-app's useAuthStatus pattern)
  const isSessionRestorePending = useMemo(
    () => hasHydrated && !session && !restorationFailed && (!!sessionExport || !!seed),
    [hasHydrated, session, restorationFailed, sessionExport, seed]
  );

  const isLoading = !hasHydrated || isRestoringSession || isSessionRestorePending;

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

  const isAuthenticated = session !== null;

  const contextValue: AuthContextType = {
    auth: {
      isAuthenticated,
      publicKey: authStore.publicKey,
      keypair: authStore.keypair,
      session: authStore.session,
    },
    signin: authStore.signin,
    signinWithSession: authStore.signinWithSession,
    logout: authStore.logout,
    isAuthenticated,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
