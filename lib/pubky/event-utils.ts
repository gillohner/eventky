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
import { PubkyAppEvent } from "pubky-app-specs";
import { NexusEventResponse } from "@/lib/nexus/events";

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
        location: data.location || null,
        geo: data.geo || null,
        image_uri: data.image_uri || null,
        url: data.url || null,
        sequence: mode === "edit" ? (eventDetails?.sequence || 0) + 1 : 0,
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

    return {
        summary: eventDetails.summary,
        dtstart: eventDetails.dtstart, // Keep as ISO string
        dtend: eventDetails.dtend || undefined, // Keep as ISO string
        duration: eventDetails.duration || undefined,
        dtstart_tzid: eventDetails.dtstart_tzid || undefined,
        dtend_tzid: eventDetails.dtend_tzid || undefined,
        description: eventDetails.description || undefined,
        status: eventDetails.status || undefined,
        location: eventDetails.location || undefined,
        geo: eventDetails.geo || undefined,
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

/**
 * Format a datetime string for display in a specific timezone
 * Returns a string like "Dec 1, 2025, 10:00:00 AM MST"
 */
export function formatDateInTimezone(
    isoDate: string,
    timezone: string,
    locale: string = 'en-US'
): string {
    // Parse the ISO string manually to avoid timezone conversion
    const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
    if (!match) {
        throw new Error(`Invalid ISO datetime format: ${isoDate}`);
    }

    const [, year, month, day, hours, minutes, seconds] = match;

    // Create a date object (will be in local timezone)
    const date = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hours),
        parseInt(minutes),
        parseInt(seconds)
    );

    return new Intl.DateTimeFormat(locale, {
        timeZone: timezone,
        dateStyle: 'medium',
        timeStyle: 'long',
    }).format(date);
}

/**
 * Convert an ISO datetime string to a Date object for UI components
 * IMPORTANT: Only use this for components that require Date objects
 * The Date will be in the browser's local timezone
 */
export function isoStringToDate(isoString: string): Date {
    const match = isoString.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
    if (!match) {
        throw new Error(`Invalid ISO datetime format: ${isoString}`);
    }

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
