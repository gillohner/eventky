/**
 * ICS Generator - Convert Nexus events/calendars to iCalendar format
 * 
 * Uses the 'ics' library to generate valid iCalendar (.ics) files
 * for calendar subscription (webcal://) and direct downloads.
 */

import { createEvents, type EventAttributes, type DateArray, type GeoCoordinates } from "ics";
import type { NexusEventResponse, NexusEventStreamItem, NexusCalendarResponse } from "@/types/nexus";

// =============================================================================
// Types
// =============================================================================

export interface ICSGeneratorResult {
    success: boolean;
    value?: string;
    error?: string;
}

export interface CalendarMetadata {
    name: string;
    description?: string;
    timezone?: string;
}

// =============================================================================
// Date Parsing Utilities
// =============================================================================

/**
 * Parse an ISO datetime string to a DateArray for ICS
 * Format: [year, month, day, hour, minute] (month is 1-indexed)
 */
function parseDateToArray(dateStr: string): DateArray {
    const date = new Date(dateStr);
    return [
        date.getUTCFullYear(),
        date.getUTCMonth() + 1, // ICS uses 1-indexed months
        date.getUTCDate(),
        date.getUTCHours(),
        date.getUTCMinutes(),
    ];
}

/**
 * Parse an ISO datetime string to a local DateArray (for events with timezone)
 * This extracts the local time components without UTC conversion
 */
function parseDateToLocalArray(dateStr: string): DateArray {
    // Parse ISO string and extract local components
    // Format could be: 2026-01-15T09:00:00 or 2026-01-15T09:00:00Z or 2026-01-15T09:00:00-05:00
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (match) {
        return [
            parseInt(match[1]),
            parseInt(match[2]),
            parseInt(match[3]),
            parseInt(match[4]),
            parseInt(match[5]),
        ];
    }
    // Fallback to UTC parsing
    return parseDateToArray(dateStr);
}

/**
 * Parse geo coordinates string "lat;lon" to GeoCoordinates
 */
function parseGeo(geoStr: string): GeoCoordinates | undefined {
    const parts = geoStr.split(";");
    if (parts.length === 2) {
        const lat = parseFloat(parts[0]);
        const lon = parseFloat(parts[1]);
        if (!isNaN(lat) && !isNaN(lon)) {
            return { lat, lon };
        }
    }
    return undefined;
}

/**
 * Parse duration string (ISO 8601 format like PT1H30M) to ICS duration object
 */
function parseDuration(durationStr: string): { hours?: number; minutes?: number; days?: number } | undefined {
    // Parse ISO 8601 duration: PT1H30M, P1D, PT2H, etc.
    const match = durationStr.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/);
    if (!match) return undefined;

    const result: { hours?: number; minutes?: number; days?: number } = {};
    if (match[1]) result.days = parseInt(match[1]);
    if (match[2]) result.hours = parseInt(match[2]);
    if (match[3]) result.minutes = parseInt(match[3]);
    // Seconds are ignored for ICS duration

    return Object.keys(result).length > 0 ? result : undefined;
}

/**
 * Parse RRULE string to ICS recurrenceRule format
 * Input: "FREQ=WEEKLY;BYDAY=MO,WE,FR;COUNT=10"
 * Output: "FREQ=WEEKLY;BYDAY=MO,WE,FR;COUNT=10" (pass through, ICS library handles it)
 */
function parseRRule(rruleStr: string): string {
    // The ics library accepts RRULE in string format
    // Just ensure it doesn't have the "RRULE:" prefix
    return rruleStr.replace(/^RRULE:/i, "");
}

// =============================================================================
// Event Conversion
// =============================================================================

/**
 * Convert a Nexus event to ICS EventAttributes
 */
export function eventToICSAttributes(
    event: NexusEventResponse | NexusEventStreamItem,
    calendarName?: string
): EventAttributes {
    // Handle both NexusEventResponse (has details) and NexusEventStreamItem (flat)
    const details = "details" in event ? event.details : event;

    // Build UID - use the URI or construct from author/id
    const uid = details.uid || `${details.id}@eventky`;

    // Parse start date
    const start = details.dtstart_tzid
        ? parseDateToLocalArray(details.dtstart)
        : parseDateToArray(details.dtstart);

    // Calculate end or duration (required by ics library)
    let end: DateArray | undefined;
    let endInputType: "local" | "utc" | undefined;
    let endOutputType: "local" | "utc" | undefined;
    let duration: { hours?: number; minutes?: number; days?: number } | undefined;

    if (details.dtend) {
        end = details.dtend_tzid
            ? parseDateToLocalArray(details.dtend)
            : parseDateToArray(details.dtend);
        endInputType = details.dtend_tzid ? "local" : "utc";
        endOutputType = details.dtend_tzid ? "local" : "utc";
    } else if (details.duration) {
        duration = parseDuration(details.duration);
    } else {
        // Default to 1 hour duration if neither end nor duration specified
        duration = { hours: 1 };
    }

    // Build event attributes - must include either end or duration
    const attrs: EventAttributes = end
        ? {
            uid,
            title: details.summary,
            start,
            startInputType: details.dtstart_tzid ? "local" : "utc",
            startOutputType: details.dtstart_tzid ? "local" : "utc",
            end,
            endInputType,
            endOutputType,
        }
        : {
            uid,
            title: details.summary,
            start,
            startInputType: details.dtstart_tzid ? "local" : "utc",
            startOutputType: details.dtstart_tzid ? "local" : "utc",
            duration: duration!,
        };

    // Add optional fields
    if (details.description) {
        // Strip HTML if styled_description is used
        attrs.description = details.description;
    }

    if (details.location) {
        attrs.location = details.location;
    }

    if (details.geo) {
        attrs.geo = parseGeo(details.geo);
    }

    if (details.url) {
        attrs.url = details.url;
    }

    if (details.status) {
        // Map status to ICS values: TENTATIVE, CONFIRMED, CANCELLED
        const statusMap: Record<string, "TENTATIVE" | "CONFIRMED" | "CANCELLED"> = {
            tentative: "TENTATIVE",
            confirmed: "CONFIRMED",
            cancelled: "CANCELLED",
        };
        attrs.status = statusMap[details.status.toLowerCase()] || "CONFIRMED";
    }

    // Recurrence rules
    if (details.rrule) {
        attrs.recurrenceRule = parseRRule(details.rrule);
    }

    // RDATE - additional dates for recurring events
    // Note: ics library doesn't directly support RDATE, but we include them in exclusionDates handling
    // For now, RDATE support is limited

    // EXDATE - excluded dates
    if (details.exdate && details.exdate.length > 0) {
        attrs.exclusionDates = details.exdate.map(date => parseDateToArray(date));
    }

    // Sequence for updates
    if (details.sequence !== undefined) {
        attrs.sequence = details.sequence;
    }

    // Created and last modified timestamps
    if (details.created) {
        // Created is in microseconds, convert to Date array
        attrs.created = parseDateToArray(new Date(details.created / 1000).toISOString());
    }

    if (details.last_modified) {
        attrs.lastModified = parseDateToArray(new Date(details.last_modified / 1000).toISOString());
    }

    // Add calendar name to categories if provided
    if (calendarName) {
        attrs.categories = [calendarName];
    }

    // Product identifier
    attrs.productId = "eventky/ics";

    // Add organizer info using author ID
    // Note: We don't include email for privacy
    attrs.organizer = {
        name: `pubky:${details.author}`,
    };

    return attrs;
}

/**
 * Generate ICS for a single event
 */
export function generateEventICS(
    event: NexusEventResponse | NexusEventStreamItem,
    calendarName?: string
): ICSGeneratorResult {
    const attrs = eventToICSAttributes(event, calendarName);

    const result = createEvents([attrs]);

    if (result.error) {
        return {
            success: false,
            error: result.error.message || "Failed to generate ICS",
        };
    }

    return {
        success: true,
        value: result.value,
    };
}

/**
 * Generate ICS for multiple events (calendar feed)
 */
export function generateCalendarICS(
    events: Array<NexusEventResponse | NexusEventStreamItem>,
    metadata?: CalendarMetadata
): ICSGeneratorResult {
    if (events.length === 0) {
        // Return empty calendar
        const emptyCalendar = [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//eventky//ics//EN",
            `X-WR-CALNAME:${metadata?.name || "Eventky Calendar"}`,
            metadata?.description ? `X-WR-CALDESC:${metadata.description}` : "",
            metadata?.timezone ? `X-WR-TIMEZONE:${metadata.timezone}` : "",
            "END:VCALENDAR",
        ].filter(Boolean).join("\r\n");

        return {
            success: true,
            value: emptyCalendar,
        };
    }

    const eventAttrs = events.map(event => eventToICSAttributes(event, metadata?.name));

    const result = createEvents(eventAttrs);

    if (result.error) {
        return {
            success: false,
            error: result.error.message || "Failed to generate ICS",
        };
    }

    // Add calendar metadata to the ICS output
    let icsContent = result.value || "";

    if (metadata) {
        // Insert calendar metadata after VERSION line
        const metadataLines = [
            metadata.name ? `X-WR-CALNAME:${metadata.name}` : "",
            metadata.description ? `X-WR-CALDESC:${metadata.description}` : "",
            metadata.timezone ? `X-WR-TIMEZONE:${metadata.timezone}` : "",
        ].filter(Boolean).join("\r\n");

        if (metadataLines) {
            icsContent = icsContent.replace(
                /VERSION:2\.0\r\n/,
                `VERSION:2.0\r\n${metadataLines}\r\n`
            );
        }
    }

    return {
        success: true,
        value: icsContent,
    };
}

/**
 * Generate a Google Calendar URL for an event
 */
export function generateGoogleCalendarUrl(event: NexusEventResponse | NexusEventStreamItem): string {
    const details = "details" in event ? event.details : event;

    const params = new URLSearchParams();
    params.set("action", "TEMPLATE");
    params.set("text", details.summary);

    // Format dates for Google Calendar: YYYYMMDDTHHMMSSZ
    const formatGoogleDate = (dateStr: string): string => {
        const date = new Date(dateStr);
        return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    };

    const startDate = formatGoogleDate(details.dtstart);
    let endDate: string;

    if (details.dtend) {
        endDate = formatGoogleDate(details.dtend);
    } else if (details.duration) {
        // Parse duration and calculate end
        const start = new Date(details.dtstart);
        const duration = parseDuration(details.duration);
        if (duration) {
            if (duration.days) start.setDate(start.getDate() + duration.days);
            if (duration.hours) start.setHours(start.getHours() + duration.hours);
            if (duration.minutes) start.setMinutes(start.getMinutes() + duration.minutes);
        }
        endDate = formatGoogleDate(start.toISOString());
    } else {
        // Default to 1 hour
        const start = new Date(details.dtstart);
        start.setHours(start.getHours() + 1);
        endDate = formatGoogleDate(start.toISOString());
    }

    params.set("dates", `${startDate}/${endDate}`);

    if (details.description) {
        params.set("details", details.description);
    }

    if (details.location) {
        params.set("location", details.location);
    }

    // Add recurrence if present
    if (details.rrule) {
        params.set("recur", `RRULE:${details.rrule}`);
    }

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generate an Outlook.com calendar URL for an event
 */
export function generateOutlookCalendarUrl(event: NexusEventResponse | NexusEventStreamItem): string {
    const details = "details" in event ? event.details : event;

    const params = new URLSearchParams();
    params.set("path", "/calendar/action/compose");
    params.set("rru", "addevent");
    params.set("subject", details.summary);

    // Format dates for Outlook: ISO 8601
    params.set("startdt", details.dtstart);

    if (details.dtend) {
        params.set("enddt", details.dtend);
    }

    if (details.description) {
        params.set("body", details.description);
    }

    if (details.location) {
        params.set("location", details.location);
    }

    return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}
