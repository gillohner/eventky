/**
 * Conversion utilities between form data and WASM types
 * 
 * RFC 5545 Compliance:
 * - Dates are stored as ISO 8601 strings (YYYY-MM-DDTHH:MM:SS)
 * - Timezone is stored separately in dtstart_tzid/dtend_tzid fields
 * - The datetime represents the LOCAL time in the specified timezone
 * - NO Date objects used to avoid timezone conversion issues
 */

import { EventFormData, EventLocation } from "@/types/event";
import { PubkyAppEvent } from "pubky-app-specs";
import { NexusEventResponse, parseLocationsJson } from "@/types/nexus";

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

    // Pass locations and conferences as arrays (WASM expects Vec, not JSON string)
    const locations = data.locations && data.locations.length > 0
        ? data.locations
        : null;

    const conferences = data.conferences && data.conferences.length > 0
        ? data.conferences
        : null;

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
        locations,
        conferences,
        image_uri: data.image_uri || null,
        url: data.url || null,
        sequence: newSequence,
        last_modified: dtstamp,
        created: mode === "edit" ? eventDetails?.created : dtstamp,
        rrule: data.rrule || null,
        rdate: data.rdate || null,
        exdate: data.exdate || null,
        recurrence_id: null,
        styled_description: data.styled_description || null,
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

    // Convert styled_description to the form format
    let styledDescription: EventFormData['styled_description'] = undefined;
    if (eventDetails.styled_description) {
        if (typeof eventDetails.styled_description === 'string') {
            // Plain string format
            styledDescription = {
                content: eventDetails.styled_description,
                format: 'plain',
            };
        } else if ('content' in eventDetails.styled_description) {
            // Already in the correct format (PubkyAppEvent)
            styledDescription = eventDetails.styled_description;
        } else if ('value' in eventDetails.styled_description && 'fmttype' in eventDetails.styled_description) {
            // Nexus API format { fmttype, value }
            styledDescription = {
                content: eventDetails.styled_description.value,
                format: eventDetails.styled_description.fmttype,
            };
        }
    }

    // Parse locations from JSON string (Nexus API format) or via toJson (WASM)
    let locations: EventLocation[] | undefined = undefined;
    if ('details' in event) {
        // NexusEventResponse - locations is a JSON string on details
        const nexusDetails = event.details;
        if (nexusDetails.locations) {
            locations = parseLocationsJson(nexusDetails.locations);
        }
    } else if ('toJson' in event && typeof event.toJson === 'function') {
        // PubkyAppEvent - use toJson() to get the full data including locations
        const eventJson = event.toJson?.();
        if (eventJson?.locations) {
            locations = eventJson.locations;
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
        locations: locations,
        image_uri: eventDetails.image_uri || undefined,
        url: eventDetails.url || undefined,
        rrule: eventDetails.rrule || undefined,
        rdate: eventDetails.rdate || undefined,
        exdate: eventDetails.exdate || undefined,
        styled_description: styledDescription,
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
