/**
 * User Preferences Store
 *
 * Manages user preferences (extensible for future settings)
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface PreferencesState {
    // Placeholder for future preferences
}

export const usePreferencesStore = create<PreferencesState>()(
    persist(
        () => ({
        }),
        {
            name: "eventky-preferences",
        }
    )
);
