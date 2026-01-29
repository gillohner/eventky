/**
 * Event-related types
 */

/**
 * Styled description format for rich text
 */
export interface StyledDescription {
    content: string;
    format: string;
}

/**
 * Location type matching pubky-app-specs LocationType
 */
export type LocationType = "PHYSICAL" | "ONLINE";

/**
 * Location data structure matching pubky-app-specs Location
 * RFC 9073 VLOCATION compliant
 */
export interface EventLocation {
    /** Human-readable location name (required) */
    name: string;
    /** Additional details or instructions */
    description?: string;
    /** PHYSICAL or ONLINE */
    location_type: LocationType;
    /** URI reference - OSM URL for physical, meeting URL for online */
    structured_data?: string;
}

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
    image_uri?: string;
    url?: string;
    rrule?: string;
    rdate?: string[];
    exdate?: string[];
    styled_description?: StyledDescription;
    /** RFC 9073 structured locations - max 5 locations */
    locations?: EventLocation[];
    x_pubky_calendar_uris?: string[];
    x_pubky_rsvp_access?: string;
}

