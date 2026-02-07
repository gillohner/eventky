/**
 * Conversion utilities between form data and WASM types
 * 
 * RFC 5545 Compliance:
 * - Dates are stored as ISO 8601 strings (YYYY-MM-DDTHH:MM:SS)
 * - Timezone is stored separately in dtstart_tzid/dtend_tzid fields
 * - The datetime represents the LOCAL time in the specified timezone
 * - NO Date objects used to avoid timezone conversion issues
 */

import { EventFormData } from "@/stores/event-form-store";
import { PubkyAppEvent } from "@eventky/pubky-app-specs";
import { NexusEventResponse } from "@/lib/nexus/events";

/**
 * Normalize format strings between WASM spec values and MIME types.
 * WASM specs use: "plain", "html", "markdown"
 * Form/display uses: "text/plain", "text/html", "text/markdown"
 */
function toMimeFormat(format: string): string {
    switch (format) {
        case "plain": return "text/plain";
        case "html": return "text/html";
        case "markdown": return "text/markdown";
        default: return format; // Already a MIME type or unknown
    }
}

function toWasmFormat(format: string): string {
    switch (format) {
        case "text/plain": return "plain";
        case "text/html": return "html";
        case "text/markdown": return "markdown";
        default: return format; // Already WASM format or unknown
    }
}

/**
 * Recursively parse styled_description that may be double/triple JSON encoded.
 * Handles data from various sources: Nexus (JSON string), WASM (object), 
 * optimistic cache, or localStorage persistence.
 * Returns { content, format } with format as MIME type, or undefined if no valid data.
 */
function parseStyledDescriptionForForm(
    input: unknown
): { content: string; format: string } | undefined {
    if (input === null || input === undefined) {
        return undefined;
    }

    // If it's a string, try JSON parse first
    if (typeof input === "string") {
        const trimmed = input.trim();
        if (!trimmed) return undefined;

        // Try to parse as JSON (Nexus returns styled_description as a JSON string)
        if (trimmed.startsWith("{")) {
            try {
                const parsed = JSON.parse(trimmed);
                return parseStyledDescriptionForForm(parsed);
            } catch {
                // Not valid JSON — treat as plain text content
            }
        }

        // Raw string content — could be HTML or plain text
        const isHtml = trimmed.includes("<") && trimmed.includes(">");
        return {
            content: trimmed,
            format: isHtml ? "text/html" : "text/plain",
        };
    }

    // If it's an object, extract content
    if (typeof input === "object") {
        const obj = input as Record<string, unknown>;

        // Format: { content, format, ... } (WASM StyledDescription or form data)
        if ("content" in obj && obj.content !== undefined) {
            const format = toMimeFormat(String(obj.format || "text/plain"));
            const content = obj.content;

            // If content is a string that might be further JSON-encoded, recurse
            if (typeof content === "string") {
                const trimmed = content.trim();

                // Check if content itself is a JSON-encoded styled_description
                if (trimmed.startsWith("{")) {
                    try {
                        const parsed = JSON.parse(trimmed);
                        if (parsed && typeof parsed === "object" && "content" in parsed) {
                            // It's a double-wrapped styled_description — unwrap it
                            return parseStyledDescriptionForForm(parsed);
                        }
                    } catch {
                        // Not JSON, use the content as-is
                    }
                }

                return { content: trimmed, format };
            }

            // Content is not a string, recurse
            return parseStyledDescriptionForForm(content);
        }

        // Format: { value, fmttype } (alternative Nexus format)
        if ("value" in obj && "fmttype" in obj) {
            return {
                content: String(obj.value || ""),
                format: toMimeFormat(String(obj.fmttype || "text/plain")),
            };
        }
    }

    return undefined;
}

/**
 * Convert EventFormData (UI layer) to PubkyAppEvent data object (WASM layer)
 * Returns null if validation fails (caller should handle error messaging)
 */
export function formDataToEventData(
    data: EventFormData,
    mode: "create" | "edit",
    existingEvent?: PubkyAppEvent | NexusEventResponse
): Record<string, unknown> | null {
    // Validation - return null instead of throwing
    if (!data.dtstart) {
        return null;
    }

    // Extract event details if NexusEventResponse
    const eventDetails = existingEvent && 'details' in existingEvent
        ? existingEvent.details
        : existingEvent;

    // Use ISO strings directly - no Date object conversion
    const dtstart = data.dtstart;
    const dtstamp = BigInt(Date.now() * 1000); // Keep dtstamp as microseconds timestamp

    // Generate UID for new events
    const uid =
        mode === "edit" && eventDetails?.uid
            ? eventDetails.uid
            : `event-${Date.now()}`;

    const newSequence = mode === "edit" ? (eventDetails?.sequence || 0) + 1 : 0;

    return {
        uid,
        dtstamp,
        dtstart, // ISO 8601 string - already in correct format
        summary: data.summary,
        dtend: data.dtend || null, // ISO 8601 string - already in correct format
        duration: data.duration || null,
        dtstart_tzid: data.dtstart_tzid || null,
        dtend_tzid: data.dtend_tzid || null,
        description: data.description || null,
        status: data.status || null,
        image_uri: data.image_uri || null,
        url: data.url || null,
        sequence: newSequence,
        last_modified: dtstamp,
        created: mode === "edit" ? eventDetails?.created : dtstamp,
        rrule: data.rrule || null,
        rdate: data.rdate || null,
        exdate: data.exdate || null,
        recurrence_id: null,
        // Normalize styled_description format for WASM (text/html → html)
        styled_description: data.styled_description
            ? {
                content: data.styled_description.content,
                format: toWasmFormat(data.styled_description.format),
                attachments: null,
            }
            : null,
        // RFC 9073 structured locations
        locations: data.locations && data.locations.length > 0 ? data.locations : null,
        x_pubky_calendar_uris: data.x_pubky_calendar_uris || null,
        x_pubky_rsvp_access: data.x_pubky_rsvp_access || null,
    };
}

/**
 * Convert PubkyAppEvent or NexusEventResponse (WASM/API layer) to EventFormData (UI layer)
 */
export function eventToFormData(event: PubkyAppEvent | NexusEventResponse): EventFormData {
    // Extract event details if NexusEventResponse
    const eventDetails = 'details' in event ? event.details : event;

    // Convert styled_description using robust recursive parser
    // Handles: JSON strings (Nexus), WASM objects, double-encoded data, 
    // localStorage-persisted data, and format string normalization
    const styledDescription = parseStyledDescriptionForForm(
        eventDetails.styled_description
    );

    // Parse locations from serialized JSON string (Nexus format) or array (WASM format)
    let locations: EventFormData['locations'] = undefined;
    if ('locations' in eventDetails && eventDetails.locations) {
        if (typeof eventDetails.locations === 'string') {
            // Nexus API returns serialized JSON string
            try {
                locations = JSON.parse(eventDetails.locations);
            } catch {
                // Invalid JSON, ignore
            }
        } else if (Array.isArray(eventDetails.locations)) {
            // WASM returns array directly - map to our types
            // (WASM Location.location_type is string, we need "PHYSICAL" | "ONLINE")
            locations = eventDetails.locations.map(loc => ({
                name: loc.name,
                location_type: loc.location_type as "PHYSICAL" | "ONLINE",
                description: loc.description,
                structured_data: loc.structured_data,
            }));
        }
    }

    return {
        summary: eventDetails.summary,
        dtstart: eventDetails.dtstart, // Keep as ISO string
        dtend: eventDetails.dtend || undefined, // Keep as ISO string
        duration: eventDetails.duration || undefined,
        dtstart_tzid: eventDetails.dtstart_tzid || undefined,
        dtend_tzid: eventDetails.dtend_tzid || undefined,
        description: eventDetails.description || undefined,
        status: eventDetails.status || undefined,
        image_uri: eventDetails.image_uri || undefined,
        url: eventDetails.url || undefined,
        rrule: eventDetails.rrule || undefined,
        rdate: eventDetails.rdate || undefined,
        exdate: eventDetails.exdate || undefined,
        styled_description: styledDescription,
        locations,
        x_pubky_calendar_uris: eventDetails.x_pubky_calendar_uris || undefined,
        x_pubky_rsvp_access: eventDetails.x_pubky_rsvp_access || undefined,
    };
}

// Re-export datetime utilities for backward compatibility
// Components should gradually migrate to import from @/lib/datetime directly
export {
    parseIsoDateTime as isoStringToDate,
    dateToISOString,
    formatDateInTimezone,
} from "@/lib/datetime";
