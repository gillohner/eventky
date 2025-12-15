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
    // Basic recurrence
    enabled: boolean;
    frequency: RecurrenceFrequency;
    interval: number;
    count?: number;
    until?: string;

    // Weekly pattern
    selectedWeekdays: Weekday[];

    // Monthly patterns
    monthlyMode: "dayofmonth" | "dayofweek" | "none";
    bymonthday: number[];  // Day of month (1-31, -1 to -31)
    bysetpos: number[];    // Position in set (1, -1, etc.)

    // Additional/excluded dates
    rdates: string[];
    excludedOccurrences: Set<string>;
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
