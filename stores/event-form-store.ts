import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { EventFormData } from "@/types/event";
import type { RecurrenceState, RecurrencePreset, Weekday } from "@/types/recurrence";

// Re-export for backward compatibility
export type { EventFormData };

/**
 * Default recurrence state
 */
const DEFAULT_RECURRENCE_STATE: RecurrenceState = {
    preset: "none",
    frequency: "WEEKLY",
    interval: 1,
    count: undefined,
    selectedWeekdays: [],
    rdates: [],
    excludedOccurrences: new Set(),
    customRrule: undefined,
};

interface EventFormStore {
    formData: EventFormData | null;
    eventId: string | null;
    recurrenceState: RecurrenceState;

    // Form data actions
    setFormData: (data: EventFormData, eventId?: string) => void;
    clearFormData: () => void;

    // Recurrence actions
    setPreset: (preset: RecurrencePreset) => void;
    setInterval: (interval: number) => void;
    setCount: (count: number | undefined) => void;
    toggleWeekday: (day: Weekday) => void;
    addRdate: (date: string) => void;
    removeRdate: (date: string) => void;
    toggleExclusion: (date: string) => void;
    clearExclusions: () => void;
    resetRecurrence: () => void;
    setCustomRrule: (rrule: string) => void;
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
            setPreset: (preset) => set((state) => {
                const newState: Partial<RecurrenceState> = { preset };

                // Set defaults based on preset
                switch (preset) {
                    case "daily":
                        newState.frequency = "DAILY";
                        newState.interval = 1;
                        newState.count = undefined;
                        break;
                    case "weekly":
                        newState.frequency = "WEEKLY";
                        newState.interval = 1;
                        newState.count = undefined;
                        break;
                    case "monthly":
                        newState.frequency = "MONTHLY";
                        newState.interval = 1;
                        newState.count = undefined;
                        break;
                    case "yearly":
                        newState.frequency = "YEARLY";
                        newState.interval = 1;
                        newState.count = undefined;
                        break;
                    case "none":
                        newState.excludedOccurrences = new Set();
                        newState.count = undefined;
                        break;
                }

                return {
                    recurrenceState: { ...state.recurrenceState, ...newState },
                };
            }),

            setInterval: (interval) => set((state) => ({
                recurrenceState: { ...state.recurrenceState, interval },
            })),

            setCount: (count) => set((state) => ({
                recurrenceState: { ...state.recurrenceState, count },
            })),

            toggleWeekday: (day) => set((state) => {
                const selectedWeekdays = state.recurrenceState.selectedWeekdays.includes(day)
                    ? state.recurrenceState.selectedWeekdays.filter(d => d !== day)
                    : [...state.recurrenceState.selectedWeekdays, day];

                return {
                    recurrenceState: { ...state.recurrenceState, selectedWeekdays },
                };
            }),

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

            setCustomRrule: (rrule) => set((state) => ({
                recurrenceState: { ...state.recurrenceState, customRrule: rrule },
            })),
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
                    const persistedRecurrence = persistedState.recurrenceState as any;
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
