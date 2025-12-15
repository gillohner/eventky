import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { EventFormData } from "@/types/event";
import type { RecurrenceState, Weekday } from "@/types/recurrence";

// Re-export for backward compatibility
export type { EventFormData };

/**
 * Default recurrence state
 */
const DEFAULT_RECURRENCE_STATE: RecurrenceState = {
    enabled: false,
    frequency: "WEEKLY",
    interval: 1,
    count: undefined,
    until: undefined,
    selectedWeekdays: [],
    monthlyMode: "none",
    bymonthday: [],
    bysetpos: [],
    rdates: [],
    excludedOccurrences: new Set(),
};

interface EventFormStore {
    formData: EventFormData | null;
    eventId: string | null;
    recurrenceState: RecurrenceState;

    // Form data actions
    setFormData: (data: EventFormData, eventId?: string) => void;
    clearFormData: () => void;

    // Recurrence actions
    setRecurrenceState: (state: Partial<RecurrenceState>) => void;
    addRdate: (date: string) => void;
    removeRdate: (date: string) => void;
    toggleExclusion: (date: string) => void;
    clearExclusions: () => void;
    resetRecurrence: () => void;
    initializeRecurrenceFromEvent: (eventData: EventFormData) => void;
}

export const useEventFormStore = create<EventFormStore>()(
    persist(
        (set) => ({
            formData: null,
            eventId: null,
            recurrenceState: DEFAULT_RECURRENCE_STATE,

            // Form data actions
            setFormData: (data, eventId) => set({ formData: data, eventId: eventId || null }),
            clearFormData: () => set({
                formData: null,
                eventId: null,
                recurrenceState: DEFAULT_RECURRENCE_STATE,
            }),

            // Recurrence actions
            setRecurrenceState: (updates) => set((state) => ({
                recurrenceState: { ...state.recurrenceState, ...updates },
            })),

            addRdate: (date) => set((state) => ({
                recurrenceState: {
                    ...state.recurrenceState,
                    rdates: [...state.recurrenceState.rdates, date],
                },
            })),

            removeRdate: (date) => set((state) => ({
                recurrenceState: {
                    ...state.recurrenceState,
                    rdates: state.recurrenceState.rdates.filter(d => d !== date),
                },
            })),

            toggleExclusion: (date) => set((state) => {
                const newExcluded = new Set(state.recurrenceState.excludedOccurrences);
                if (newExcluded.has(date)) {
                    newExcluded.delete(date);
                } else {
                    newExcluded.add(date);
                }
                return {
                    recurrenceState: { ...state.recurrenceState, excludedOccurrences: newExcluded },
                };
            }),

            clearExclusions: () => set((state) => ({
                recurrenceState: { ...state.recurrenceState, excludedOccurrences: new Set() },
            })),

            resetRecurrence: () => set({
                recurrenceState: DEFAULT_RECURRENCE_STATE,
            }),

            initializeRecurrenceFromEvent: (eventData) => set(() => {
                // If no rrule, set to default disabled state
                if (!eventData.rrule) {
                    return { recurrenceState: DEFAULT_RECURRENCE_STATE };
                }

                // Parse the RRULE string
                const rrule = eventData.rrule;
                const parts = rrule.split(";");
                const parsed: Record<string, string> = {};
                
                for (const part of parts) {
                    const [key, value] = part.split("=");
                    parsed[key] = value;
                }

                const frequency = parsed.FREQ as "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY" | undefined;
                const interval = parsed.INTERVAL ? parseInt(parsed.INTERVAL) : 1;
                const count = parsed.COUNT ? parseInt(parsed.COUNT) : undefined;
                const until = parsed.UNTIL;
                const byday = parsed.BYDAY ? parsed.BYDAY.split(",") as Weekday[] : [];
                const bymonthday = parsed.BYMONTHDAY 
                    ? parsed.BYMONTHDAY.split(",").map(d => parseInt(d)) 
                    : [];
                const bysetpos = parsed.BYSETPOS 
                    ? parsed.BYSETPOS.split(",").map(p => parseInt(p)) 
                    : [];

                // Determine monthly mode
                let monthlyMode: "dayofmonth" | "dayofweek" | "none" = "none";
                if (frequency === "MONTHLY") {
                    if (bymonthday.length > 0) {
                        monthlyMode = "dayofmonth";
                    } else if (byday.length > 0 && bysetpos.length > 0) {
                        monthlyMode = "dayofweek";
                    }
                }

                return {
                    recurrenceState: {
                        enabled: true,
                        frequency: frequency || "WEEKLY",
                        interval,
                        count,
                        until,
                        selectedWeekdays: byday,
                        monthlyMode,
                        bymonthday,
                        bysetpos,
                        rdates: eventData.rdate || [],
                        excludedOccurrences: new Set(eventData.exdate || []),
                    },
                };
            }),
        }),
        {
            name: "event-form-storage",
            partialize: (state) => ({
                formData: state.formData,
                eventId: state.eventId,
                // Persist recurrence state but convert Set to Array
                recurrenceState: {
                    ...state.recurrenceState,
                    excludedOccurrences: Array.from(state.recurrenceState.excludedOccurrences),
                },
            }),
            merge: (persistedState: unknown, currentState) => {
                const baseState = {
                    ...currentState,
                    ...(persistedState && typeof persistedState === 'object' ? persistedState : {}),
                };

                // Restore formData
                if (persistedState && typeof persistedState === 'object' && 'formData' in persistedState) {
                    baseState.formData = persistedState.formData as EventFormData | null;
                }

                // Restore recurrenceState and convert Array back to Set
                if (persistedState && typeof persistedState === 'object' && 'recurrenceState' in persistedState) {
                    const persistedRecurrence = persistedState.recurrenceState as Omit<RecurrenceState, 'excludedOccurrences'> & { excludedOccurrences: string[] };
                    baseState.recurrenceState = {
                        ...persistedRecurrence,
                        excludedOccurrences: new Set(persistedRecurrence.excludedOccurrences || []),
                    };
                }

                return baseState;
            },
        }
    )
);
