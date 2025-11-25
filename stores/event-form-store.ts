import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Form data structure matching the form layer (not WASM layer)
 * Uses JavaScript-native types (Date, string) instead of bigint
 */
export interface EventFormData {
    // Required fields
    summary: string;
    dtstart: Date | null;

    // Optional fields
    dtend?: Date | null;
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
            // Zustand persist will handle JSON serialization, Date objects will be strings
            partialize: (state) => ({
                formData: state.formData
                    ? {
                        ...state.formData,
                        dtstart: state.formData.dtstart?.toISOString() || null,
                        dtend: state.formData.dtend?.toISOString() || null,
                    }
                    : null,
                eventId: state.eventId,
            }),
            merge: (persistedState: any, currentState) => ({
                ...currentState,
                ...(persistedState || {}),
                formData: persistedState?.formData
                    ? {
                        ...persistedState.formData,
                        dtstart: persistedState.formData.dtstart
                            ? new Date(persistedState.formData.dtstart)
                            : null,
                        dtend: persistedState.formData.dtend
                            ? new Date(persistedState.formData.dtend)
                            : null,
                    }
                    : null,
            }),
        }
    )
);
