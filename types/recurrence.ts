/**
 * Recurrence-related types for event scheduling
 */

/**
 * Recurrence preset patterns
 */
export type RecurrencePreset = "none" | "daily" | "weekly" | "monthly" | "yearly" | "custom";

/**
 * RRULE frequency values (RFC 5545)
 */
export type RecurrenceFrequency = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

/**
 * Weekday codes for BYDAY in RRULE (RFC 5545)
 */
export type Weekday = "SU" | "MO" | "TU" | "WE" | "TH" | "FR" | "SA";

/**
 * State for recurrence configuration
 */
export interface RecurrenceState {
    preset: RecurrencePreset;
    frequency: RecurrenceFrequency;
    interval: number;
    count?: number;
    selectedWeekdays: Weekday[];
    rdates: string[];
    excludedOccurrences: Set<string>;
    customRrule?: string;
}

/**
 * Date with type classification for occurrence lists
 */
export interface OccurrenceDate {
    date: string;
    type: "standard" | "additional";
}

/**
 * Statistics for occurrence preview
 */
export interface OccurrenceStats {
    standardCount: number;
    additionalCount: number;
    excludedCount: number;
    totalActive: number;
}
