/**
 * RRULE calculation utilities
 * Generates occurrence dates based on RFC 5545 recurrence rules
 */

import { addDays, addWeeks, addMonths, addYears, format } from "date-fns";
import { isoStringToDate } from "./event-utils";

/**
 * Calculate next N occurrences based on RRULE and start date
 * This is a simplified implementation for common patterns
 */
export function calculateNextOccurrences(
    rrule: string,
    dtstart: string,
    maxCount: number = 10
): string[] {
    if (!rrule || !dtstart) return [];

    try {
        const startDate = isoStringToDate(dtstart);
        const occurrences: string[] = [dtstart]; // First occurrence is the start date

        // Parse RRULE
        const rules = parseRRule(rrule);
        if (!rules.freq) return [dtstart];

        let currentDate = startDate;
        let generatedCount = 1;
        const maxIterations = rules.count || maxCount;

        // For WEEKLY with BYDAY, we need special handling
        if (rules.freq === "WEEKLY" && rules.byday && rules.byday.length > 0) {
            const weekdayMap: Record<string, number> = {
                'SU': 0, 'MO': 1, 'TU': 2, 'WE': 3, 'TH': 4, 'FR': 5, 'SA': 6
            };
            const targetWeekdays = rules.byday.map(day => weekdayMap[day]).sort((a, b) => a - b);
            
            // Start from the beginning of the week containing dtstart
            let searchDate = new Date(currentDate);
            
            while (generatedCount < maxIterations && generatedCount < 1000) {
                const currentWeekday = searchDate.getDay();
                
                // Check if current day matches any target weekday
                if (targetWeekdays.includes(currentWeekday)) {
                    const isoString = format(searchDate, "yyyy-MM-dd'T'HH:mm:ss");
                    // Don't add if it's the start date (already added)
                    if (isoString !== dtstart) {
                        occurrences.push(isoString);
                        generatedCount++;
                    }
                }
                
                // Move to next day
                searchDate = addDays(searchDate, 1);
                
                // If we've completed a week and interval > 1, skip ahead
                if (currentWeekday === 6 && rules.interval && rules.interval > 1) {
                    searchDate = addWeeks(searchDate, rules.interval - 1);
                }
            }
            
            return occurrences;
        }

        // Standard handling for other frequencies
        while (generatedCount < maxIterations && generatedCount < 100) {
            // Add interval based on frequency
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

            // Format back to ISO string
            const isoString = format(currentDate, "yyyy-MM-dd'T'HH:mm:ss");
            occurrences.push(isoString);
            generatedCount++;
        }

        return occurrences;
    } catch (error) {
        console.error("Error calculating occurrences:", error);
        return [dtstart];
    }
}

/**
 * Parse RRULE string into structured object
 */
function parseRRule(rrule: string): {
    freq?: string;
    interval?: number;
    count?: number;
    byday?: string[];
} {
    const rules: {
        freq?: string;
        interval?: number;
        count?: number;
        byday?: string[];
    } = {};

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
