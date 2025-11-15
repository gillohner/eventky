import { create } from "zustand";
import { Keypair, Session } from "@synonymdev/pubky";
import { AuthData, SerializableAuthData } from "@/types/auth";

const STORAGE_KEY = "pubky_auth";

const defaultAuthData: AuthData = {
  isAuthenticated: false,
  publicKey: null,
  keypair: null,
  session: null,
};

interface AuthStore extends AuthData {
  isHydrated: boolean;
  signin: (publicKey: string, keypair: Keypair, session: Session) => void;
  signinWithSession: (publicKey: string, session: Session) => void;
  logout: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  ...defaultAuthData,
  isHydrated: false,

  signin: (publicKey, keypair, session) => {
    const authData: AuthData = {
      isAuthenticated: true,
      publicKey,
      keypair,
      session,
    };

    set(authData);

    try {
      const serializableData: SerializableAuthData = {
        isAuthenticated: authData.isAuthenticated,
        publicKey: authData.publicKey,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serializableData));
    } catch (error) {
      console.error("Error saving auth to localStorage:", error);
    }
  },

  signinWithSession: (publicKey, session) => {
    const authData: AuthData = {
      isAuthenticated: true,
      publicKey,
      keypair: null, // QR auth doesn't provide keypair
      session,
    };

    set(authData);

    try {
      const serializableData: SerializableAuthData = {
        isAuthenticated: authData.isAuthenticated,
        publicKey: authData.publicKey,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serializableData));
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
    } catch (error) {
      console.error("Error removing auth from localStorage:", error);
    }
  },

  hydrate: () => {
    // Only hydrate once
    if (get().isHydrated) return;

    try {
      const storedAuth = localStorage.getItem(STORAGE_KEY);
      if (storedAuth) {
        const parsed: SerializableAuthData = JSON.parse(storedAuth);
        set({
          isAuthenticated: parsed.isAuthenticated,
          publicKey: parsed.publicKey,
          keypair: null,
          session: null,
          isHydrated: true,
        });
      } else {
        set({ isHydrated: true });
      }
    } catch (error) {
      console.error("Error loading auth from localStorage:", error);
      set({ isHydrated: true });
    }
  },
}));
