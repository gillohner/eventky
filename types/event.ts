/**
 * Event-related types
 */

/**
 * Form data structure matching the form layer (not WASM layer)
 * Stores datetime as ISO strings to avoid timezone conversion issues
 * Format: YYYY-MM-DDTHH:MM:SS (no timezone, represents local time)
 */
export interface EventFormData {
    // Required fields
    summary: string;
    dtstart: string | null;

    // Optional fields
    dtend?: string | null;
    duration?: string;
    dtstart_tzid?: string;
    dtend_tzid?: string;
    description?: string;
    status?: string;
    location?: string;
    geo?: string;
    image_uri?: string;
    url?: string;
    rrule?: string;
    rdate?: string[];
    exdate?: string[];
    styled_description?: {
        content: string;
        format: string;
        attachments?: string[];
    };
    x_pubky_calendar_uris?: string[];
    x_pubky_rsvp_access?: string;
}
