/**
 * ICS (iCalendar) Generator
 *
 * Generates RFC 5545 compliant iCalendar files from Nexus event/calendar data.
 * Handles single events, recurring events (RRULE/RDATE/EXDATE), and full calendar feeds.
 *
 * @see https://datatracker.ietf.org/doc/html/rfc5545
 * @see https://datatracker.ietf.org/doc/html/rfc7986
 */

import type { NexusEventResponse, NexusEventDetails } from "@/types/nexus";

// =============================================================================
// Types
// =============================================================================

export interface ICSResult {
    success: boolean;
    value?: string;
    error?: string;
}

export interface CalendarICSOptions {
    name: string;
    description?: string;
    timezone?: string;
    color?: string;
    url?: string;
}

// =============================================================================
// Constants
// =============================================================================

const PRODID = "-//Eventky//Eventky Calendar//EN";
const CALSCALE = "GREGORIAN";
const LINE_FOLD_LENGTH = 75;

// =============================================================================
// Text Encoding Utilities
// =============================================================================

/**
 * Escape text values per RFC 5545 §3.3.11
 * Backslash, semicolons, commas, and newlines must be escaped.
 */
function escapeText(text: string): string {
    return text
        .replace(/\\/g, "\\\\")
        .replace(/;/g, "\\;")
        .replace(/,/g, "\\,")
        .replace(/\r?\n/g, "\\n");
}

/**
 * Fold content lines at 75 octets per RFC 5545 §3.1
 * Lines longer than 75 octets are broken with CRLF followed by a single space.
 */
function foldLine(line: string): string {
    if (line.length <= LINE_FOLD_LENGTH) return line;

    const parts: string[] = [];
    parts.push(line.slice(0, LINE_FOLD_LENGTH));
    let remaining = line.slice(LINE_FOLD_LENGTH);

    while (remaining.length > 0) {
        // Continuation lines have a leading space that counts toward 75 octets
        parts.push(" " + remaining.slice(0, LINE_FOLD_LENGTH - 1));
        remaining = remaining.slice(LINE_FOLD_LENGTH - 1);
    }

    return parts.join("\r\n");
}

/**
 * Format a property line with folding
 */
function prop(name: string, value: string): string {
    return foldLine(`${name}:${value}`);
}

/**
 * Format a property with parameters
 */
function propWithParams(name: string, params: string, value: string): string {
    return foldLine(`${name};${params}:${value}`);
}

// =============================================================================
// Date/Time Formatting
// =============================================================================

/**
 * Convert an ISO 8601 local datetime string to ICS format (no trailing Z).
 * Input:  "2025-06-15T14:30:00"
 * Output: "20250615T143000"
 */
function toICSDateTime(isoString: string): string {
    return isoString.replace(/[-:]/g, "").replace(/\.\d+$/, "");
}

/**
 * Convert a Unix microsecond timestamp to ICS UTC datetime.
 * Output: "20250615T143000Z"
 */
function toICSTimestampUTC(microseconds: number): string {
    const date = new Date(microseconds / 1000);
    return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

// =============================================================================
// VEVENT Builder
// =============================================================================

/**
 * Build a VEVENT component from event details.
 * Maps all RFC 5545 fields from the Nexus event model.
 */
function buildVEvent(details: NexusEventDetails): string[] {
    const lines: string[] = [];

    lines.push("BEGIN:VEVENT");

    // --- Required properties ---
    lines.push(prop("UID", details.uid));
    lines.push(prop("DTSTAMP", toICSTimestampUTC(details.dtstamp)));
    lines.push(prop("SUMMARY", escapeText(details.summary)));

    // DTSTART with optional TZID
    if (details.dtstart_tzid) {
        lines.push(propWithParams("DTSTART", `TZID=${details.dtstart_tzid}`, toICSDateTime(details.dtstart)));
    } else {
        lines.push(prop("DTSTART", toICSDateTime(details.dtstart)));
    }

    // --- Time & Duration (mutually exclusive per RFC 5545 §3.8.2) ---
    if (details.dtend) {
        if (details.dtend_tzid) {
            lines.push(propWithParams("DTEND", `TZID=${details.dtend_tzid}`, toICSDateTime(details.dtend)));
        } else {
            lines.push(prop("DTEND", toICSDateTime(details.dtend)));
        }
    } else if (details.duration) {
        lines.push(prop("DURATION", details.duration));
    }

    // --- Event details ---
    if (details.description) {
        lines.push(prop("DESCRIPTION", escapeText(details.description)));
    }

    if (details.status) {
        lines.push(prop("STATUS", details.status.toUpperCase()));
    }

    if (details.url) {
        lines.push(prop("URL", details.url));
    }

    // --- Locations (RFC 9073 structured → LOCATION property) ---
    if (details.locations) {
        try {
            const locs = typeof details.locations === "string"
                ? JSON.parse(details.locations)
                : details.locations;

            if (Array.isArray(locs) && locs.length > 0) {
                // Primary location as LOCATION property
                const primary = locs[0];
                const locationParts: string[] = [];
                if (primary.name) locationParts.push(primary.name);
                if (primary.description) locationParts.push(primary.description);
                lines.push(prop("LOCATION", escapeText(locationParts.join(" - "))));

                // Online locations as URL or X-ONLINE-MEETING
                for (const loc of locs) {
                    if (loc.location_type === "ONLINE" && loc.structured_data) {
                        lines.push(prop("X-ONLINE-MEETING", loc.structured_data));
                    }
                }
            }
        } catch {
            // Skip malformed location data
        }
    }

    // --- Image (RFC 7986 §5.10) ---
    if (details.image_uri) {
        lines.push(propWithParams("IMAGE", "VALUE=URI", details.image_uri));
    }

    // --- Change management ---
    if (details.sequence !== undefined) {
        lines.push(prop("SEQUENCE", String(details.sequence)));
    }
    if (details.last_modified) {
        lines.push(prop("LAST-MODIFIED", toICSTimestampUTC(details.last_modified)));
    }
    if (details.created) {
        lines.push(prop("CREATED", toICSTimestampUTC(details.created)));
    }

    // --- Recurrence ---
    if (details.rrule) {
        lines.push(prop("RRULE", details.rrule));
    }

    if (details.rdate && details.rdate.length > 0) {
        // RDATEs with TZID if available
        const rdateValues = details.rdate.map(toICSDateTime);
        if (details.dtstart_tzid) {
            lines.push(propWithParams("RDATE", `TZID=${details.dtstart_tzid}`, rdateValues.join(",")));
        } else {
            lines.push(prop("RDATE", rdateValues.join(",")));
        }
    }

    if (details.exdate && details.exdate.length > 0) {
        const exdateValues = details.exdate.map(toICSDateTime);
        if (details.dtstart_tzid) {
            lines.push(propWithParams("EXDATE", `TZID=${details.dtstart_tzid}`, exdateValues.join(",")));
        } else {
            lines.push(prop("EXDATE", exdateValues.join(",")));
        }
    }

    if (details.recurrence_id !== undefined) {
        // recurrence_id is stored as a number (microseconds) in Nexus
        if (typeof details.recurrence_id === "number") {
            lines.push(prop("RECURRENCE-ID", toICSTimestampUTC(details.recurrence_id)));
        }
    }

    lines.push("END:VEVENT");

    return lines;
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Generate an ICS file for a single event wrapped in a minimal VCALENDAR.
 * Supports single and recurring events with full RFC 5545 field mapping.
 */
export function generateEventICS(event: NexusEventResponse): ICSResult {
    try {
        const { details } = event;

        if (!details.uid || !details.dtstart || !details.summary) {
            return { success: false, error: "Event missing required fields (uid, dtstart, summary)" };
        }

        const lines: string[] = [
            "BEGIN:VCALENDAR",
            prop("VERSION", "2.0"),
            prop("PRODID", PRODID),
            prop("CALSCALE", CALSCALE),
            prop("METHOD", "PUBLISH"),
        ];

        // Set calendar name to event summary so subscription clients
        // display the event name instead of the raw webcal:// URL
        lines.push(prop("X-WR-CALNAME", escapeText(details.summary)));
        lines.push(prop("NAME", escapeText(details.summary)));

        // Add VTIMEZONE reference if timezone is specified
        if (details.dtstart_tzid) {
            lines.push(prop("X-WR-TIMEZONE", details.dtstart_tzid));
        }

        lines.push(...buildVEvent(details));
        lines.push("END:VCALENDAR");

        return { success: true, value: lines.join("\r\n") + "\r\n" };
    } catch (error) {
        return {
            success: false,
            error: `Failed to generate event ICS: ${error instanceof Error ? error.message : String(error)}`,
        };
    }
}

/**
 * Generate an ICS file for a full calendar with all its events.
 * Suitable for webcal:// subscription feeds.
 */
export function generateCalendarICS(
    events: NexusEventResponse[],
    options: CalendarICSOptions
): ICSResult {
    try {
        const lines: string[] = [
            "BEGIN:VCALENDAR",
            prop("VERSION", "2.0"),
            prop("PRODID", PRODID),
            prop("CALSCALE", CALSCALE),
            prop("METHOD", "PUBLISH"),
        ];

        // RFC 7986 calendar properties
        lines.push(prop("X-WR-CALNAME", escapeText(options.name)));

        if (options.description) {
            lines.push(prop("X-WR-CALDESC", escapeText(options.description)));
        }

        if (options.timezone) {
            lines.push(prop("X-WR-TIMEZONE", options.timezone));
        }

        if (options.color) {
            lines.push(prop("COLOR", options.color));
        }

        if (options.url) {
            lines.push(prop("URL", options.url));
        }

        // Add NAME property (RFC 7986 §5.1)
        lines.push(prop("NAME", escapeText(options.name)));

        // Build VEVENT for each event
        for (const event of events) {
            const { details } = event;
            if (!details.uid || !details.dtstart || !details.summary) {
                continue; // Skip events missing required fields
            }
            lines.push(...buildVEvent(details));
        }

        lines.push("END:VCALENDAR");

        return { success: true, value: lines.join("\r\n") + "\r\n" };
    } catch (error) {
        return {
            success: false,
            error: `Failed to generate calendar ICS: ${error instanceof Error ? error.message : String(error)}`,
        };
    }
}
