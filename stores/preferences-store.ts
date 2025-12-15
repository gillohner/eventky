/**
 * User Preferences Store
 * 
 * Manages user preferences like time format (12h/24h)
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type TimeFormat = "12h" | "24h";

interface PreferencesState {
    timeFormat: TimeFormat;
    setTimeFormat: (format: TimeFormat) => void;
    toggleTimeFormat: () => void;
}

export const usePreferencesStore = create<PreferencesState>()(
    persist(
        (set) => ({
            timeFormat: "12h",
            setTimeFormat: (format) => set({ timeFormat: format }),
            toggleTimeFormat: () =>
                set((state) => ({
                    timeFormat: state.timeFormat === "12h" ? "24h" : "12h",
                })),
        }),
        {
            name: "eventky-preferences",
        }
    )
);
