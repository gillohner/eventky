"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { AuthContextType } from "@/types/auth";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const authStore = useAuthStore();
  const isHydrated = useAuthStore((state) => state.isHydrated);

  // Hydrate auth state from localStorage on mount (only once)
  useEffect(() => {
    authStore.hydrate();
  }, []); // Empty deps - only run once on mount

  // Don't render children until hydrated to avoid SSR mismatch
  if (!isHydrated) {
    return null;
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
