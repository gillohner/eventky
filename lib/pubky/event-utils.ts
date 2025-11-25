/**
 * Conversion utilities between form data and WASM types
 */

import { EventFormData } from "@/stores/event-form-store";
import { PubkyAppEvent, generateEventId } from "pubky-app-specs";

/**
 * Convert EventFormData (UI layer) to PubkyAppEvent data object (WASM layer)
 * Returns null if validation fails (caller should handle error messaging)
 */
export function formDataToEventData(
    data: EventFormData,
    mode: "create" | "edit",
    existingEvent?: PubkyAppEvent
): any | null {
    // Validation - return null instead of throwing
    if (!data.dtstart) {
        return null;
    }

    const dtstart = BigInt(data.dtstart.getTime() * 1000); // milliseconds to microseconds
    const dtstamp = BigInt(Date.now() * 1000);

    // Generate UID for new events
    const uid =
        mode === "edit" && existingEvent?.uid
            ? existingEvent.uid
            : `event-${Date.now()}`;

    return {
        uid,
        dtstamp,
        dtstart,
        summary: data.summary,
        dtend: data.dtend ? BigInt(data.dtend.getTime() * 1000) : null,
        duration: data.duration || null,
        dtstart_tzid: data.dtstart_tzid || null,
        dtend_tzid: data.dtend_tzid || null,
        description: data.description || null,
        status: data.status || null,
        categories: data.categories || null,
        location: data.location || null,
        geo: data.geo || null,
        image_uri: data.image_uri || null,
        url: data.url || null,
        sequence: mode === "edit" ? (existingEvent?.sequence || 0) + 1 : 0,
        last_modified: dtstamp,
        created: mode === "edit" ? existingEvent?.created : dtstamp,
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
 * Convert PubkyAppEvent (WASM layer) to EventFormData (UI layer)
 */
export function eventToFormData(event: PubkyAppEvent): EventFormData {
    return {
        summary: event.summary,
        dtstart: new Date(Number(event.dtstart) / 1000), // microseconds to milliseconds
        dtend: event.dtend ? new Date(Number(event.dtend) / 1000) : undefined,
        duration: event.duration || undefined,
        dtstart_tzid: event.dtstart_tzid || undefined,
        dtend_tzid: event.dtend_tzid || undefined,
        description: event.description || undefined,
        status: event.status || undefined,
        categories: event.categories || undefined,
        location: event.location || undefined,
        geo: event.geo || undefined,
        image_uri: event.image_uri || undefined,
        url: event.url || undefined,
        rrule: event.rrule || undefined,
        rdate: event.rdate || undefined,
        exdate: event.exdate || undefined,
        styled_description: event.styled_description || undefined,
        x_pubky_calendar_uris: event.x_pubky_calendar_uris || undefined,
        x_pubky_rsvp_access: event.x_pubky_rsvp_access || undefined,
    };
}

/**
 * Generate event ID (delegates to WASM)
 */
export { generateEventId };
