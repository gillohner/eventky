"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { UserProfile, ProfileContextType } from "@/types/profile";
import { useAuthStore } from "@/stores/auth-store";

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

const STORAGE_KEY = "pubky_profile";

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState<UserProfile | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Load profile from localStorage on mount
  useEffect(() => {
    try {
      const storedProfile = localStorage.getItem(STORAGE_KEY);
      if (storedProfile) {
        setProfileState(JSON.parse(storedProfile));
      }
    } catch (error) {
      console.error("Error loading profile from localStorage:", error);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // Clear profile when user logs out
  useEffect(() => {
    if (!isAuthenticated) {
      setProfileState(null);
    }
  }, [isAuthenticated]);

  const setProfile = (profile: UserProfile) => {
    setProfileState(profile);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch (error) {
      console.error("Error saving profile to localStorage:", error);
    }
  };

  const clearProfile = () => {
    setProfileState(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error("Error removing profile from localStorage:", error);
    }
  };

  // Don't render children until hydrated to avoid SSR mismatch
  if (!isHydrated) {
    return null;
  }

  return (
    <ProfileContext.Provider value={{ profile, setProfile, clearProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error("useProfile must be used within a ProfileProvider");
  }
  return context;
}
