import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Form data structure matching the form layer (not WASM layer)
 * Stores datetime as ISO strings to avoid timezone conversion issues
 * Format: YYYY-MM-DDTHH:MM:SS (no timezone, represents local time)
 */
export interface EventFormData {
    // Required fields
    summary: string;
    dtstart: string | null;

    // Optional fields
    dtend?: string | null;
    duration?: string;
    dtstart_tzid?: string;
    dtend_tzid?: string;
    description?: string;
    status?: string;
    categories?: string[];
    location?: string;
    geo?: string;
    image_uri?: string;
    url?: string;
    rrule?: string;
    rdate?: string[];
    exdate?: string[];
    styled_description?: {
        content: string;
        format: string;
        attachments?: string[];
    };
    x_pubky_calendar_uris?: string[];
    x_pubky_rsvp_access?: string;
}

interface EventFormStore {
    formData: EventFormData | null;
    eventId: string | null; // Track which event is being edited
    setFormData: (data: EventFormData, eventId?: string) => void;
    clearFormData: () => void;
}

export const useEventFormStore = create<EventFormStore>()(
    persist(
        (set) => ({
            formData: null,
            eventId: null,
            setFormData: (data, eventId) => set({ formData: data, eventId: eventId || null }),
            clearFormData: () => set({ formData: null, eventId: null }),
        }),
        {
            name: "event-form-storage",
            // Store dates as ISO strings directly - no Date object conversion
            partialize: (state) => ({
                formData: state.formData,
                eventId: state.eventId,
            }),
            merge: (persistedState: any, currentState) => ({
                ...currentState,
                ...(persistedState || {}),
                formData: persistedState?.formData || null,
            }),
        }
    )
);
