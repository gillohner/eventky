/**
 * Shared datetime formatting utilities
 * Centralizes all date/time formatting logic to avoid duplication
 */

/**
 * Parse ISO datetime string to Date object
 * Handles both ISO strings with and without timezone info
 */
export function parseIsoDateTime(isoString: string): Date {
    // If the string has no timezone info, treat it as local time
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
 * Parse an ISO datetime string (without timezone suffix) as wall-clock time
 * in a specific IANA timezone, returning a Date with the correct UTC instant.
 *
 * Example: parseIsoInTimezone("2024-01-15T18:00:00", "America/New_York")
 * returns a Date whose UTC instant corresponds to 18:00 EST (= 23:00 UTC).
 */
export function parseIsoInTimezone(isoString: string, timezone: string): Date {
    const match = isoString.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
    if (!match) return new Date(isoString);

    const [, yearStr, monthStr, dayStr, hourStr, minStr, secStr] = match;
    const y = parseInt(yearStr), mo = parseInt(monthStr) - 1, d = parseInt(dayStr);
    const h = parseInt(hourStr), mi = parseInt(minStr), s = parseInt(secStr);

    // Treat the components as UTC as a starting guess
    const utcGuess = Date.UTC(y, mo, d, h, mi, s);

    // Find the wall-clock time the target timezone shows at this UTC instant
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false,
    });
    const parts = formatter.formatToParts(new Date(utcGuess));
    const get = (type: Intl.DateTimeFormatPartTypes) =>
        parseInt(parts.find(p => p.type === type)?.value || '0');

    let wallH = get('hour');
    if (wallH === 24) wallH = 0;
    const wallUtc = Date.UTC(get('year'), get('month') - 1, get('day'), wallH, get('minute'), get('second'));

    // offset = how far the timezone's wall clock is from UTC
    // actualUtc = desired wall clock shifted back by that offset
    const offset = wallUtc - utcGuess;
    return new Date(utcGuess - offset);
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
        const date = sourceTimezone
            ? parseIsoInTimezone(isoString, sourceTimezone)
            : parseIsoDateTime(isoString);

        const dateFormatter = new Intl.DateTimeFormat("en-US", {
            timeZone: displayTimezone,
            weekday: includeWeekday ? (compact ? "short" : "long") : undefined,
            month: compact ? "short" : "long",
            day: "numeric",
            year: includeYear ? "numeric" : undefined,
        });

        const timeFormatter = new Intl.DateTimeFormat("en-US", {
            timeZone: displayTimezone,
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
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
        const date = timezone
            ? parseIsoInTimezone(isoDate, timezone)
            : parseIsoDateTime(isoDate);
        const formatOptions: Intl.DateTimeFormatOptions = {
            timeZone: timezone || undefined,
            weekday: "short",
            month: "short",
            day: "numeric",
        };

        if (includeTime) {
            formatOptions.hour = "2-digit";
            formatOptions.minute = "2-digit";
            formatOptions.hour12 = false;
        }

        return new Intl.DateTimeFormat("en-US", formatOptions).format(date);
    } catch {
        return isoDate;
    }
}

/**
 * Format a full datetime string for display in a specific timezone
 * Returns a string like "Dec 1, 2025, 22:00:00 MST"
 */
export function formatDateInTimezone(
    isoDate: string,
    timezone: string,
    sourceTimezone?: string,
    locale: string = 'en-US'
): string {
    const date = (sourceTimezone || timezone)
        ? parseIsoInTimezone(isoDate, sourceTimezone || timezone)
        : parseIsoDateTime(isoDate);

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
    date2: string
): boolean {
    const d1 = parseIsoDateTime(date1);
    const d2 = parseIsoDateTime(date2);
    return d1.toDateString() === d2.toDateString();
}
