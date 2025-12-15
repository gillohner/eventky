/**
 * Comprehensive IANA timezone list
 * Shared across event creation, filtering, and calendar management
 */

export interface TimezoneData {
    value: string;
    label: string;
    region: string;
}

/**
 * Comprehensive timezone list organized by region
 * Values are IANA timezone identifiers
 */
export const TIMEZONES: TimezoneData[] = [
    // Global
    { value: "UTC", label: "UTC", region: "Global" },

    // North America
    { value: "America/New_York", label: "Eastern Time", region: "North America" },
    { value: "America/Chicago", label: "Central Time", region: "North America" },
    { value: "America/Denver", label: "Mountain Time", region: "North America" },
    { value: "America/Los_Angeles", label: "Pacific Time", region: "North America" },
    { value: "America/Anchorage", label: "Alaska", region: "North America" },
    { value: "America/Phoenix", label: "Arizona", region: "North America" },
    { value: "America/Toronto", label: "Toronto", region: "North America" },
    { value: "America/Vancouver", label: "Vancouver", region: "North America" },
    { value: "America/Montreal", label: "Montreal", region: "North America" },
    { value: "America/Halifax", label: "Halifax", region: "North America" },
    { value: "America/Winnipeg", label: "Winnipeg", region: "North America" },
    { value: "America/Edmonton", label: "Edmonton", region: "North America" },
    { value: "America/Regina", label: "Regina", region: "North America" },

    // Pacific
    { value: "Pacific/Honolulu", label: "Hawaii", region: "Pacific" },
    { value: "Pacific/Auckland", label: "Auckland", region: "Pacific" },
    { value: "Pacific/Fiji", label: "Fiji", region: "Pacific" },
    { value: "Pacific/Guam", label: "Guam", region: "Pacific" },
    { value: "Pacific/Tahiti", label: "Tahiti", region: "Pacific" },
    { value: "Pacific/Samoa", label: "Samoa", region: "Pacific" },

    // Central America
    { value: "America/Mexico_City", label: "Mexico City", region: "Central America" },
    { value: "America/Cancun", label: "Cancún", region: "Central America" },
    { value: "America/Guatemala", label: "Guatemala", region: "Central America" },
    { value: "America/Panama", label: "Panama", region: "Central America" },
    { value: "America/Costa_Rica", label: "Costa Rica", region: "Central America" },

    // Caribbean
    { value: "America/Havana", label: "Havana", region: "Caribbean" },
    { value: "America/Jamaica", label: "Jamaica", region: "Caribbean" },
    { value: "America/Puerto_Rico", label: "Puerto Rico", region: "Caribbean" },

    // South America
    { value: "America/Sao_Paulo", label: "São Paulo", region: "South America" },
    { value: "America/Buenos_Aires", label: "Buenos Aires", region: "South America" },
    { value: "America/Lima", label: "Lima", region: "South America" },
    { value: "America/Santiago", label: "Santiago", region: "South America" },
    { value: "America/Bogota", label: "Bogotá", region: "South America" },
    { value: "America/Caracas", label: "Caracas", region: "South America" },
    { value: "America/Montevideo", label: "Montevideo", region: "South America" },
    { value: "America/La_Paz", label: "La Paz", region: "South America" },

    // Europe
    { value: "Europe/London", label: "London", region: "Europe" },
    { value: "Europe/Paris", label: "Paris", region: "Europe" },
    { value: "Europe/Berlin", label: "Berlin", region: "Europe" },
    { value: "Europe/Rome", label: "Rome", region: "Europe" },
    { value: "Europe/Madrid", label: "Madrid", region: "Europe" },
    { value: "Europe/Amsterdam", label: "Amsterdam", region: "Europe" },
    { value: "Europe/Brussels", label: "Brussels", region: "Europe" },
    { value: "Europe/Vienna", label: "Vienna", region: "Europe" },
    { value: "Europe/Zurich", label: "Zurich", region: "Europe" },
    { value: "Europe/Athens", label: "Athens", region: "Europe" },
    { value: "Europe/Helsinki", label: "Helsinki", region: "Europe" },
    { value: "Europe/Istanbul", label: "Istanbul", region: "Europe" },
    { value: "Europe/Moscow", label: "Moscow", region: "Europe" },
    { value: "Europe/Warsaw", label: "Warsaw", region: "Europe" },
    { value: "Europe/Prague", label: "Prague", region: "Europe" },
    { value: "Europe/Stockholm", label: "Stockholm", region: "Europe" },
    { value: "Europe/Copenhagen", label: "Copenhagen", region: "Europe" },
    { value: "Europe/Oslo", label: "Oslo", region: "Europe" },
    { value: "Europe/Lisbon", label: "Lisbon", region: "Europe" },
    { value: "Europe/Dublin", label: "Dublin", region: "Europe" },
    { value: "Europe/Bucharest", label: "Bucharest", region: "Europe" },
    { value: "Europe/Budapest", label: "Budapest", region: "Europe" },
    { value: "Europe/Kiev", label: "Kyiv", region: "Europe" },
    { value: "Europe/Sofia", label: "Sofia", region: "Europe" },
    { value: "Europe/Belgrade", label: "Belgrade", region: "Europe" },
    { value: "Europe/Zagreb", label: "Zagreb", region: "Europe" },
    { value: "Europe/Luxembourg", label: "Luxembourg", region: "Europe" },
    { value: "Europe/Monaco", label: "Monaco", region: "Europe" },
    { value: "Europe/Tallinn", label: "Tallinn", region: "Europe" },
    { value: "Europe/Riga", label: "Riga", region: "Europe" },
    { value: "Europe/Vilnius", label: "Vilnius", region: "Europe" },

    // Africa
    { value: "Africa/Cairo", label: "Cairo", region: "Africa" },
    { value: "Africa/Johannesburg", label: "Johannesburg", region: "Africa" },
    { value: "Africa/Lagos", label: "Lagos", region: "Africa" },
    { value: "Africa/Nairobi", label: "Nairobi", region: "Africa" },
    { value: "Africa/Casablanca", label: "Casablanca", region: "Africa" },
    { value: "Africa/Algiers", label: "Algiers", region: "Africa" },
    { value: "Africa/Tunis", label: "Tunis", region: "Africa" },
    { value: "Africa/Accra", label: "Accra", region: "Africa" },
    { value: "Africa/Addis_Ababa", label: "Addis Ababa", region: "Africa" },
    { value: "Africa/Dar_es_Salaam", label: "Dar es Salaam", region: "Africa" },
    { value: "Africa/Kampala", label: "Kampala", region: "Africa" },

    // Middle East
    { value: "Asia/Dubai", label: "Dubai", region: "Middle East" },
    { value: "Asia/Jerusalem", label: "Jerusalem", region: "Middle East" },
    { value: "Asia/Riyadh", label: "Riyadh", region: "Middle East" },
    { value: "Asia/Qatar", label: "Doha", region: "Middle East" },
    { value: "Asia/Kuwait", label: "Kuwait", region: "Middle East" },
    { value: "Asia/Beirut", label: "Beirut", region: "Middle East" },
    { value: "Asia/Baghdad", label: "Baghdad", region: "Middle East" },
    { value: "Asia/Tehran", label: "Tehran", region: "Middle East" },
    { value: "Asia/Amman", label: "Amman", region: "Middle East" },

    // Asia
    { value: "Asia/Kolkata", label: "Mumbai", region: "Asia" },
    { value: "Asia/Bangkok", label: "Bangkok", region: "Asia" },
    { value: "Asia/Singapore", label: "Singapore", region: "Asia" },
    { value: "Asia/Hong_Kong", label: "Hong Kong", region: "Asia" },
    { value: "Asia/Shanghai", label: "Shanghai", region: "Asia" },
    { value: "Asia/Tokyo", label: "Tokyo", region: "Asia" },
    { value: "Asia/Seoul", label: "Seoul", region: "Asia" },
    { value: "Asia/Jakarta", label: "Jakarta", region: "Asia" },
    { value: "Asia/Manila", label: "Manila", region: "Asia" },
    { value: "Asia/Taipei", label: "Taipei", region: "Asia" },
    { value: "Asia/Karachi", label: "Karachi", region: "Asia" },
    { value: "Asia/Dhaka", label: "Dhaka", region: "Asia" },
    { value: "Asia/Kathmandu", label: "Kathmandu", region: "Asia" },
    { value: "Asia/Colombo", label: "Colombo", region: "Asia" },
    { value: "Asia/Yangon", label: "Yangon", region: "Asia" },
    { value: "Asia/Kuala_Lumpur", label: "Kuala Lumpur", region: "Asia" },
    { value: "Asia/Ho_Chi_Minh", label: "Ho Chi Minh City", region: "Asia" },
    { value: "Asia/Phnom_Penh", label: "Phnom Penh", region: "Asia" },
    { value: "Asia/Vientiane", label: "Vientiane", region: "Asia" },
    { value: "Asia/Ulaanbaatar", label: "Ulaanbaatar", region: "Asia" },
    { value: "Asia/Vladivostok", label: "Vladivostok", region: "Asia" },
    { value: "Asia/Yekaterinburg", label: "Yekaterinburg", region: "Asia" },
    { value: "Asia/Novosibirsk", label: "Novosibirsk", region: "Asia" },

    // Australia
    { value: "Australia/Sydney", label: "Sydney", region: "Australia" },
    { value: "Australia/Melbourne", label: "Melbourne", region: "Australia" },
    { value: "Australia/Brisbane", label: "Brisbane", region: "Australia" },
    { value: "Australia/Perth", label: "Perth", region: "Australia" },
    { value: "Australia/Adelaide", label: "Adelaide", region: "Australia" },
    { value: "Australia/Darwin", label: "Darwin", region: "Australia" },
    { value: "Australia/Hobart", label: "Hobart", region: "Australia" },
    { value: "Australia/Canberra", label: "Canberra", region: "Australia" },
];

/**
 * Get all unique regions
 */
export function getTimezoneRegions(): string[] {
    const regions = new Set(TIMEZONES.map(tz => tz.region));
    return Array.from(regions).sort();
}

/**
 * Get timezones for a specific region
 */
export function getTimezonesByRegion(region: string): TimezoneData[] {
    return TIMEZONES.filter(tz => tz.region === region);
}

/**
 * Calculate UTC offset for a timezone
 */
export function getUTCOffset(timezone: string): string {
    try {
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            timeZoneName: 'shortOffset'
        });
        const parts = formatter.formatToParts(now);
        const offset = parts.find(part => part.type === 'timeZoneName')?.value || 'UTC';
        return offset;
    } catch {
        return "UTC";
    }
}

/**
 * Get timezone display text with offset
 */
export function getTimezoneDisplayText(timezone: string): string {
    const tz = TIMEZONES.find(t => t.value === timezone);
    if (!tz) return timezone;

    const offset = getUTCOffset(timezone);
    return `${tz.label} (${offset})`;
}

/**
 * Get user's current timezone
 */
export function getUserTimezone(): string {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
        return "UTC";
    }
}

/**
 * Check if a timezone is in our supported list
 */
export function isSupportedTimezone(timezone: string): boolean {
    return TIMEZONES.some(tz => tz.value === timezone);
}
