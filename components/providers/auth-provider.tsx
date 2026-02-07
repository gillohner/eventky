"use client";

import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useDebugStore } from "@/stores/debug-store";
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
// Debug overlay — shows auth state on-screen for mobile debugging
// Enable by adding ?authDebug=1 to the URL, or set NEXT_PUBLIC_AUTH_DEBUG=1
// ============================================================================

function AuthDebugOverlay() {
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const session = useAuthStore((state) => state.session);
  const sessionExport = useAuthStore((state) => state.sessionExport);
  const publicKey = useAuthStore((state) => state.publicKey);
  const isRestoringSession = useAuthStore((state) => state.isRestoringSession);
  const [logs, setLogs] = useState<string[]>([]);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const entry = [
      `[${new Date().toLocaleTimeString()}]`,
      `hyd:${hasHydrated}`,
      `sess:${session ? "✓" : "✗"}`,
      `exp:${sessionExport ? sessionExport.length + "ch" : "✗"}`,
      `pk:${publicKey ? publicKey.substring(0, 8) : "✗"}`,
      `restoring:${isRestoringSession}`,
    ].join(" ");

    setLogs((prev: string[]) => [entry, ...prev].slice(0, 20));
  }, [hasHydrated, session, sessionExport, publicKey, isRestoringSession]);

  // Also check localStorage directly — re-check on every state change
  useEffect(() => {
    try {
      const stored = localStorage.getItem("auth-store");
      const parsed = stored ? JSON.parse(stored) : null;
      const entry = `[ls] ${stored ? `${stored.length}ch, exp:${parsed?.state?.sessionExport ? parsed.state.sessionExport.length + "ch" : "null"}, pk:${parsed?.state?.publicKey?.substring(0, 8) || "null"}` : "EMPTY"}`;
      setLogs((prev: string[]) => [entry, ...prev].slice(0, 20));
    } catch (e) {
      setLogs((prev: string[]) => [`[ls] ERROR: ${e}`, ...prev].slice(0, 20));
    }
  }, [hasHydrated, session, sessionExport, publicKey, isRestoringSession]);

  if (!visible) {
    return (
      <button
        onClick={() => setVisible(true)}
        style={{
          position: "fixed", bottom: 4, right: 4, zIndex: 99999,
          background: "#333", color: "#0f0", border: "none",
          borderRadius: 4, padding: "2px 6px", fontSize: 10, opacity: 0.7,
        }}
      >
        🔍
      </button>
    );
  }

  return (
    <div
      style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 99999,
        background: "rgba(0,0,0,0.9)", color: "#0f0",
        fontFamily: "monospace", fontSize: 10, padding: 8,
        maxHeight: "40vh", overflowY: "auto",
        borderTop: "1px solid #0f0",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontWeight: "bold" }}>Auth Debug</span>
        <button onClick={() => setVisible(false)} style={{ color: "#f00", background: "none", border: "none", cursor: "pointer" }}>✕</button>
      </div>
      {logs.map((log: string, i: number) => (
        <div key={i} style={{ opacity: i === 0 ? 1 : 0.7 }}>{log}</div>
      ))}
    </div>
  );
}

// ============================================================================
// Provider — mirrors pubky-app's RouteGuardProvider session restoration logic
// ============================================================================

export function AuthProvider({ children }: { children: ReactNode }) {
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const session = useAuthStore((state) => state.session);
  const sessionExport = useAuthStore((state) => state.sessionExport);
  const publicKey = useAuthStore((state) => state.publicKey);
  const isRestoringSession = useAuthStore((state) => state.isRestoringSession);

  // Debug overlay: show when debug mode is enabled in sidebar
  const debugEnabled = useDebugStore((state) => state.enabled);

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
      <>
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
            <p className="text-muted-foreground">
              {isRestoringSession ? "Restoring session..." : "Loading..."}
            </p>
          </div>
        </div>
        {debugEnabled && <AuthDebugOverlay />}
      </>
    );
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
      {debugEnabled && <AuthDebugOverlay />}
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
