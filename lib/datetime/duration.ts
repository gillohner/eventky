/**
 * Duration parsing and formatting utilities
 * Handles ISO 8601 duration strings (e.g., PT1H30M)
 */

/**
 * Parse ISO 8601 duration to milliseconds
 */
export function parseDuration(duration: string): number {
    const match = duration.match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;

    const days = parseInt(match[1] || "0");
    const hours = parseInt(match[2] || "0");
    const minutes = parseInt(match[3] || "0");
    const seconds = parseInt(match[4] || "0");

    return (days * 24 * 60 * 60 + hours * 60 * 60 + minutes * 60 + seconds) * 1000;
}

/**
 * Format ISO 8601 duration string for display
 */
export function formatDuration(duration: string): string {
    const ms = parseDuration(duration);
    return formatDurationMs(ms);
}

/**
 * Format milliseconds duration for display
 */
export function formatDurationMs(ms: number): string {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

    if (hours === 0) return `${minutes} min`;
    if (minutes === 0) return hours === 1 ? "1 hour" : `${hours} hours`;
    return `${hours}h ${minutes}m`;
}

/**
 * Calculate duration between two dates in milliseconds
 */
export function calculateDuration(startDate: Date, endDate: Date): number {
    return endDate.getTime() - startDate.getTime();
}

/**
 * Convert duration to ISO 8601 format
 */
export function durationToISO(hours: number, minutes: number): string {
    if (hours === 0 && minutes === 0) return "";

    let iso = "PT";
    if (hours > 0) iso += `${hours}H`;
    if (minutes > 0) iso += `${minutes}M`;
    return iso;
}

/**
 * Parse duration to components
 */
export function parseDurationComponents(duration: string): {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
} {
    const match = duration.match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);

    return {
        days: parseInt(match?.[1] || "0"),
        hours: parseInt(match?.[2] || "0"),
        minutes: parseInt(match?.[3] || "0"),
        seconds: parseInt(match?.[4] || "0"),
    };
}
