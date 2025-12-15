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
    /** Start generating occurrences from this date */
    from?: Date;
    /** Stop generating occurrences after this date */
    until?: Date;
}

/**
 * Calculate next N occurrences based on RRULE, RDATE, and EXDATE
 * Fully respects RFC 5545 recurrence rules including:
 * - RRULE: Recurrence pattern
 * - RDATE: Additional one-off dates
 * - EXDATE: Excluded dates (exceptions)
 */
export function calculateNextOccurrences(options: RecurrenceOptions): string[] {
    const { rrule, dtstart: startDate, rdate, exdate, maxCount: limit = 10, from, until } = options;

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

        // Add the start date if not excluded and within the date range
        const startDateIncluded = !excludedDates.has(normalizeDateTime(startDate));
        const startDateInRange = (!from || startDateObj >= from) && (!until || startDateObj <= until);
        if (startDateIncluded && startDateInRange) {
            occurrences.push(startDate);
        }

        // Generate RRULE-based occurrences if we have a rule
        if (rrule) {
            const rules = parseRRule(rrule);
            if (rules.freq) {
                // If COUNT is specified and start date is included, we need COUNT-1 more occurrences
                // If start date is excluded, we need COUNT occurrences
                const adjustedCount = rules.count
                    ? (startDateIncluded ? rules.count - 1 : rules.count)
                    : undefined;

                const rruleOccurrences = generateRRuleOccurrences(
                    startDateObj,
                    startDate,
                    { ...rules, count: adjustedCount },
                    excludedDates,
                    limit + exdateArray.length, // Generate extra to account for exclusions
                    from,
                    until
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
    maxCount: number,
    from?: Date,
    until?: Date
): string[] {
    const occurrences: string[] = [];
    let currentDate = startDateObj;
    let generatedCount = 0;
    const maxIterations = rules.count || maxCount;

    // Handle MONTHLY with BYSETPOS and BYDAY (e.g., last Thursday of month)
    if (rules.freq === "MONTHLY" && rules.bysetpos && rules.byday) {
        return generateMonthlyBySetPos(startDateObj, startDateStr, rules, excludedDates, maxIterations, from, until);
    }

    // Handle MONTHLY with BYMONTHDAY (e.g., 21st of each month)
    if (rules.freq === "MONTHLY" && rules.bymonthday) {
        return generateMonthlyByMonthDay(startDateObj, startDateStr, rules, excludedDates, maxIterations, from, until);
    }

    // For WEEKLY with BYDAY, we need special handling
    if (rules.freq === "WEEKLY" && rules.byday && rules.byday.length > 0) {
        const weekdayMap: Record<string, number> = {
            'SU': 0, 'MO': 1, 'TU': 2, 'WE': 3, 'TH': 4, 'FR': 5, 'SA': 6
        };
        const targetWeekdays = rules.byday.map(day => weekdayMap[day]).sort((a, b) => a - b);

        let searchDate = new Date(currentDate);
        let iterations = 0;

        while (generatedCount < maxIterations && iterations < 1000) {
            // Stop if we've passed the until date or before from date
            if (until && searchDate > until) {
                break;
            }
            if (from && searchDate < from) {
                searchDate = addDays(searchDate, 1);
                iterations++;
                continue;
            }

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

        // Stop if we've passed the until date or before from date
        if (until && currentDate > until) {
            break;
        }
        if (from && currentDate < from) {
            iterations++;
            continue;
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

/**
 * Generate monthly occurrences by month day (e.g., 21st of each month)
 */
function generateMonthlyByMonthDay(
    startDateObj: Date,
    startDateStr: string,
    rules: ParsedRRule,
    excludedDates: Set<string>,
    maxCount: number,
    from?: Date,
    until?: Date
): string[] {
    const occurrences: string[] = [];
    let generatedCount = 0;

    // Start from the month of the start date
    let currentMonth = new Date(startDateObj.getFullYear(), startDateObj.getMonth(), 1);
    let iterations = 0;

    while (generatedCount < maxCount && iterations < 1000) {
        // Stop if we've passed the until date
        if (until && currentMonth > until) {
            break;
        }

        for (const day of rules.bymonthday!) {
            const targetDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);

            if (day > 0) {
                // Positive day (e.g., 21)
                targetDate.setDate(day);
            } else {
                // Negative day (e.g., -1 for last day of month)
                const lastDay = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).getDate();
                targetDate.setDate(lastDay + day + 1);
            }

            // Copy time from start date
            targetDate.setHours(startDateObj.getHours());
            targetDate.setMinutes(startDateObj.getMinutes());
            targetDate.setSeconds(startDateObj.getSeconds());

            // Ensure the day is valid for this month and >= start date
            if (targetDate.getMonth() === currentMonth.getMonth() && targetDate >= startDateObj) {
                // Check if within from/until range
                const inRange = (!from || targetDate >= from) && (!until || targetDate <= until);
                if (!inRange) {
                    continue;
                }

                const isoString = format(targetDate, "yyyy-MM-dd'T'HH:mm:ss");

                // Skip if it's the start date (already added in main function) or excluded
                if (isoString !== startDateStr && !excludedDates.has(normalizeDateTime(isoString))) {
                    occurrences.push(isoString);
                    generatedCount++;
                    if (generatedCount >= maxCount) break;
                }
            }
        }

        currentMonth = addMonths(currentMonth, rules.interval || 1);
        iterations++;
    }

    return occurrences.sort((a, b) => a.localeCompare(b));
}

/**
 * Generate monthly occurrences by set position (e.g., last Thursday of month)
 */
function generateMonthlyBySetPos(
    startDateObj: Date,
    startDateStr: string,
    rules: ParsedRRule,
    excludedDates: Set<string>,
    maxCount: number,
    from?: Date,
    until?: Date
): string[] {
    const occurrences: string[] = [];
    let generatedCount = 0;

    // Start from the month of the start date
    let currentMonth = new Date(startDateObj.getFullYear(), startDateObj.getMonth(), 1);
    let iterations = 0;

    const weekdayMap: Record<string, number> = {
        'SU': 0, 'MO': 1, 'TU': 2, 'WE': 3, 'TH': 4, 'FR': 5, 'SA': 6
    };

    while (generatedCount < maxCount && iterations < 1000) {
        // Stop if we've passed the until date
        if (until && currentMonth > until) {
            break;
        }

        // Find all matching weekdays in this month
        const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
        const matchingDays: Date[] = [];

        for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
            const dayOfWeek = d.getDay();
            for (const byday of rules.byday!) {
                const targetWeekday = weekdayMap[byday.replace(/^[+-]?\d+/, '')];
                if (dayOfWeek === targetWeekday) {
                    const matchDate = new Date(d);
                    // Set time from start date
                    matchDate.setHours(startDateObj.getHours());
                    matchDate.setMinutes(startDateObj.getMinutes());
                    matchDate.setSeconds(startDateObj.getSeconds());
                    matchingDays.push(matchDate);
                }
            }
        }

        // Apply BYSETPOS
        for (const pos of rules.bysetpos!) {
            let targetDate: Date | undefined;
            if (pos > 0) {
                // Positive position (e.g., 1 for first, 2 for second)
                targetDate = matchingDays[pos - 1];
            } else {
                // Negative position (e.g., -1 for last, -2 for second-to-last)
                targetDate = matchingDays[matchingDays.length + pos];
            }

            if (targetDate && targetDate >= startDateObj) {
                // Check if within from/until range
                const inRange = (!from || targetDate >= from) && (!until || targetDate <= until);
                if (!inRange) {
                    continue;
                }

                const isoString = format(targetDate, "yyyy-MM-dd'T'HH:mm:ss");

                // Skip if it's the start date (already added in main function) or excluded
                if (isoString !== startDateStr && !excludedDates.has(normalizeDateTime(isoString))) {
                    occurrences.push(isoString);
                    generatedCount++;
                    if (generatedCount >= maxCount) break;
                }
            }
        }

        currentMonth = addMonths(currentMonth, rules.interval || 1);
        iterations++;
        if (generatedCount >= maxCount) break;
    }

    return occurrences.sort((a, b) => a.localeCompare(b));
}

interface ParsedRRule {
    freq?: string;
    interval?: number;
    count?: number;
    until?: string;
    byday?: string[];
    bymonthday?: number[];
    bymonth?: number[];
    bysetpos?: number[];
    wkst?: string;
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
            case "UNTIL":
                rules.until = value;
                break;
            case "BYDAY":
                rules.byday = value.split(",");
                break;
            case "BYMONTHDAY":
                rules.bymonthday = value.split(",").map(d => parseInt(d));
                break;
            case "BYMONTH":
                rules.bymonth = value.split(",").map(m => parseInt(m));
                break;
            case "BYSETPOS":
                rules.bysetpos = value.split(",").map(p => parseInt(p));
                break;
            case "WKST":
                rules.wkst = value;
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
