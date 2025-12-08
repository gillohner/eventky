/**
 * Shared datetime formatting utilities
 * Centralizes all date/time formatting logic to avoid duplication
 */

/**
 * Parse ISO datetime string to Date object
 * Handles both ISO strings with and without timezone info
 */
export function parseIsoDateTime(isoString: string, _timezone?: string): Date {
    // If the string has no timezone info, treat it as the specified timezone
    if (!isoString.includes("Z") && !isoString.includes("+") && !isoString.includes("-", 10)) {
        // Parse manually to avoid timezone conversion issues
        const match = isoString.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
        if (match) {
            const [, year, month, day, hours, minutes, seconds] = match;
            return new Date(
                parseInt(year),
                parseInt(month) - 1,
                parseInt(day),
                parseInt(hours),
                parseInt(minutes),
                parseInt(seconds)
            );
        }
    }
    return new Date(isoString);
}

/**
 * Convert a Date object to ISO string (YYYY-MM-DDTHH:MM:SS)
 * WITHOUT timezone conversion - extracts local components
 */
export function dateToISOString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

export interface FormattedDateTime {
    date: string;
    time: string;
    weekday?: string;
}

/**
 * Format datetime for display with timezone support
 */
export function formatDateTime(
    isoString: string,
    displayTimezone: string,
    sourceTimezone?: string,
    options?: {
        includeYear?: boolean;
        includeWeekday?: boolean;
        compact?: boolean;
    }
): FormattedDateTime {
    const { includeYear = true, includeWeekday = true, compact = false } = options || {};

    try {
        const date = parseIsoDateTime(isoString, sourceTimezone);

        const dateFormatter = new Intl.DateTimeFormat("en-US", {
            timeZone: displayTimezone,
            weekday: includeWeekday ? (compact ? "short" : "long") : undefined,
            month: compact ? "short" : "long",
            day: "numeric",
            year: includeYear ? "numeric" : undefined,
        });

        const timeFormatter = new Intl.DateTimeFormat("en-US", {
            timeZone: displayTimezone,
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        });

        return {
            date: dateFormatter.format(date),
            time: timeFormatter.format(date),
        };
    } catch {
        return {
            date: isoString.split("T")[0] || isoString,
            time: isoString.split("T")[1]?.slice(0, 5) || "",
        };
    }
}

/**
 * Format occurrence date for display (compact format)
 */
export function formatOccurrenceDate(
    isoDate: string,
    timezone?: string,
    options?: { includeTime?: boolean }
): string {
    const { includeTime = true } = options || {};

    try {
        const date = parseIsoDateTime(isoDate, timezone);
        const formatOptions: Intl.DateTimeFormatOptions = {
            timeZone: timezone || undefined,
            weekday: "short",
            month: "short",
            day: "numeric",
        };

        if (includeTime) {
            formatOptions.hour = "numeric";
            formatOptions.minute = "2-digit";
            formatOptions.hour12 = true;
        }

        return new Intl.DateTimeFormat("en-US", formatOptions).format(date);
    } catch {
        return isoDate;
    }
}

/**
 * Format a full datetime string for display in a specific timezone
 * Returns a string like "Dec 1, 2025, 10:00:00 AM MST"
 */
export function formatDateInTimezone(
    isoDate: string,
    timezone: string,
    locale: string = 'en-US'
): string {
    const date = parseIsoDateTime(isoDate, timezone);

    return new Intl.DateTimeFormat(locale, {
        timeZone: timezone,
        dateStyle: 'medium',
        timeStyle: 'long',
    }).format(date);
}

/**
 * Get the browser's local timezone
 */
export function getLocalTimezone(): string {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
        return "UTC";
    }
}

/**
 * Get short timezone display name (e.g., "EST", "PST")
 */
export function getShortTimezone(timezone: string): string {
    try {
        const formatter = new Intl.DateTimeFormat("en-US", {
            timeZone: timezone,
            timeZoneName: "short",
        });
        const parts = formatter.formatToParts(new Date());
        return parts.find((p) => p.type === "timeZoneName")?.value || timezone;
    } catch {
        return timezone;
    }
}

/**
 * Get long timezone display name (e.g., "Eastern Standard Time")
 */
export function getLongTimezone(timezone: string): string {
    try {
        const formatter = new Intl.DateTimeFormat("en-US", {
            timeZone: timezone,
            timeZoneName: "long",
        });
        const parts = formatter.formatToParts(new Date());
        return parts.find((p) => p.type === "timeZoneName")?.value || timezone;
    } catch {
        return timezone;
    }
}

/**
 * Check if two dates are on the same day
 */
export function isSameDay(
    date1: string,
    date2: string,
    timezone1?: string,
    timezone2?: string
): boolean {
    const d1 = parseIsoDateTime(date1, timezone1);
    const d2 = parseIsoDateTime(date2, timezone2);
    return d1.toDateString() === d2.toDateString();
}
