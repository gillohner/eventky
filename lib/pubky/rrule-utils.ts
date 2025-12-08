/**
 * RRULE calculation utilities
 * Generates occurrence dates based on RFC 5545 recurrence rules
 */

import { addDays, addWeeks, addMonths, addYears, format } from "date-fns";
import { isoStringToDate } from "./event-utils";

export interface RecurrenceOptions {
    /** RRULE string */
    rrule: string;
    /** Start date in ISO format */
    dtstart: string;
    /** Additional dates (RDATE) */
    rdate?: string[];
    /** Excluded dates (EXDATE) */
    exdate?: string[];
    /** Maximum number of occurrences to return */
    maxCount?: number;
}

/**
 * Calculate next N occurrences based on RRULE, RDATE, and EXDATE
 * Fully respects RFC 5545 recurrence rules including:
 * - RRULE: Recurrence pattern
 * - RDATE: Additional one-off dates
 * - EXDATE: Excluded dates (exceptions)
 */
export function calculateNextOccurrences(options: RecurrenceOptions): string[] {
    const { rrule, dtstart: startDate, rdate, exdate, maxCount: limit = 10 } = options;

    if (!startDate) return [];

    // Handle null/undefined arrays - default to empty arrays
    const rdateArray = rdate ?? [];
    const exdateArray = exdate ?? [];

    // Create a Set of excluded dates for fast lookup (normalize to date string for comparison)
    const excludedDates = new Set(
        exdateArray.filter(Boolean).map((d) => normalizeDateTime(d))
    );

    try {
        const startDateObj = isoStringToDate(startDate);
        const occurrences: string[] = [];

        // Add the start date if not excluded
        if (!excludedDates.has(normalizeDateTime(startDate))) {
            occurrences.push(startDate);
        }

        // Generate RRULE-based occurrences if we have a rule
        if (rrule) {
            const rules = parseRRule(rrule);
            if (rules.freq) {
                const rruleOccurrences = generateRRuleOccurrences(
                    startDateObj,
                    startDate,
                    rules,
                    excludedDates,
                    limit + exdateArray.length // Generate extra to account for exclusions
                );
                // Merge, avoiding duplicates
                for (const occ of rruleOccurrences) {
                    if (!occurrences.includes(occ)) {
                        occurrences.push(occ);
                    }
                }
            }
        }

        // Add RDATE entries (additional one-off dates) if not excluded
        for (const additionalDate of rdateArray) {
            if (additionalDate && !excludedDates.has(normalizeDateTime(additionalDate))) {
                if (!occurrences.includes(additionalDate)) {
                    occurrences.push(additionalDate);
                }
            }
        }

        // Sort all occurrences chronologically
        occurrences.sort((a, b) => {
            const dateA = isoStringToDate(a);
            const dateB = isoStringToDate(b);
            return dateA.getTime() - dateB.getTime();
        });

        // Return only up to maxCount
        return occurrences.slice(0, limit);
    } catch (error) {
        console.error("Error calculating occurrences:", error);
        return [startDate];
    }
}

/**
 * Normalize datetime string for comparison (removes milliseconds variations)
 */
function normalizeDateTime(dateStr: string): string {
    // Normalize to YYYY-MM-DDTHH:MM:SS format
    return dateStr.slice(0, 19);
}

/**
 * Generate occurrences based on RRULE
 */
function generateRRuleOccurrences(
    startDateObj: Date,
    startDateStr: string,
    rules: ParsedRRule,
    excludedDates: Set<string>,
    maxCount: number
): string[] {
    const occurrences: string[] = [];
    let currentDate = startDateObj;
    let generatedCount = 0;
    const maxIterations = rules.count || maxCount;

    // For WEEKLY with BYDAY, we need special handling
    if (rules.freq === "WEEKLY" && rules.byday && rules.byday.length > 0) {
        const weekdayMap: Record<string, number> = {
            'SU': 0, 'MO': 1, 'TU': 2, 'WE': 3, 'TH': 4, 'FR': 5, 'SA': 6
        };
        const targetWeekdays = rules.byday.map(day => weekdayMap[day]).sort((a, b) => a - b);

        let searchDate = new Date(currentDate);
        let iterations = 0;

        while (generatedCount < maxIterations && iterations < 1000) {
            const currentWeekday = searchDate.getDay();

            if (targetWeekdays.includes(currentWeekday)) {
                const isoString = format(searchDate, "yyyy-MM-dd'T'HH:mm:ss");
                // Don't add if it's the start date or excluded
                if (isoString !== startDateStr && !excludedDates.has(normalizeDateTime(isoString))) {
                    occurrences.push(isoString);
                    generatedCount++;
                }
            }

            searchDate = addDays(searchDate, 1);

            if (currentWeekday === 6 && rules.interval && rules.interval > 1) {
                searchDate = addWeeks(searchDate, rules.interval - 1);
            }
            iterations++;
        }

        return occurrences;
    }

    // Standard handling for other frequencies
    let iterations = 0;
    while (generatedCount < maxIterations && iterations < 100) {
        switch (rules.freq) {
            case "DAILY":
                currentDate = addDays(currentDate, rules.interval || 1);
                break;
            case "WEEKLY":
                currentDate = addWeeks(currentDate, rules.interval || 1);
                break;
            case "MONTHLY":
                currentDate = addMonths(currentDate, rules.interval || 1);
                break;
            case "YEARLY":
                currentDate = addYears(currentDate, rules.interval || 1);
                break;
            default:
                return occurrences;
        }

        const isoString = format(currentDate, "yyyy-MM-dd'T'HH:mm:ss");

        // Only add if not excluded
        if (!excludedDates.has(normalizeDateTime(isoString))) {
            occurrences.push(isoString);
            generatedCount++;
        }
        iterations++;
    }

    return occurrences;
}

interface ParsedRRule {
    freq?: string;
    interval?: number;
    count?: number;
    byday?: string[];
    until?: string;
}

/**
 * Parse RRULE string into structured object
 */
function parseRRule(rrule: string): ParsedRRule {
    const rules: ParsedRRule = {};

    const parts = rrule.split(";");
    for (const part of parts) {
        const [key, value] = part.split("=");
        switch (key) {
            case "FREQ":
                rules.freq = value;
                break;
            case "INTERVAL":
                rules.interval = parseInt(value);
                break;
            case "COUNT":
                rules.count = parseInt(value);
                break;
            case "BYDAY":
                rules.byday = value.split(",");
                break;
            case "UNTIL":
                rules.until = value;
                break;
        }
    }

    return rules;
}

/**
 * Format occurrence date for display
 */
export function formatOccurrence(isoDate: string, timezone?: string): string {
    try {
        const date = isoStringToDate(isoDate);
        return new Intl.DateTimeFormat("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
            timeZone: timezone,
        }).format(date);
    } catch {
        return isoDate;
    }
}
