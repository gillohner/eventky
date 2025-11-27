"use client";

import { createContext, useContext, useEffect, ReactNode } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { AuthContextType } from "@/types/auth";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const authStore = useAuthStore();
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const isRestoringSession = useAuthStore((state) => state.isRestoringSession);

  // Hydrate auth state from localStorage on mount (only once)
  useEffect(() => {
    authStore.hydrate();
  }, []); // Empty deps - only run once on mount

  // Show loading state during hydration or session restoration
  if (!isHydrated || isRestoringSession) {
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

  const contextValue: AuthContextType = {
    auth: {
      isAuthenticated: authStore.isAuthenticated,
      publicKey: authStore.publicKey,
      keypair: authStore.keypair,
      session: authStore.session,
    },
    signin: authStore.signin,
    signinWithSession: authStore.signinWithSession,
    logout: authStore.logout,
    isAuthenticated: authStore.isAuthenticated,
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
