/**
 * Debug Mode Store
 * 
 * Zustand store for global debug mode state
 * Controls visibility of raw data views across the application
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface DebugStore {
    /** Whether debug mode is globally enabled */
    enabled: boolean;
    /** Enable debug mode */
    enable: () => void;
    /** Disable debug mode */
    disable: () => void;
    /** Toggle debug mode */
    toggle: () => void;
}

/**
 * Global debug mode store
 * Persists state to localStorage
 */
export const useDebugStore = create<DebugStore>()(
    persist(
        (set) => ({
            enabled: false,
            enable: () => set({ enabled: true }),
            disable: () => set({ enabled: false }),
            toggle: () => set((state) => ({ enabled: !state.enabled })),
        }),
        {
            name: "eventky-debug-mode",
        }
    )
);
