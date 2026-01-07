/**
 * Event-related types
 */

/**
 * RFC 9073 VLOCATION - Structured location component
 * Represents a physical location for an event
 */
export interface EventLocation {
    /** Unique identifier for this location within the event */
    uid: string;
    /** Human-readable location name */
    name?: string;
    /** RFC 4589 location type (venue, parking, restaurant, airport, hotel, etc.) */
    location_type?: string;
    /** Additional description of the location */
    description?: string;
    /** RFC 5870 geo URI format: "geo:lat,lon" or "geo:lat,lon;u=uncertainty" */
    geo?: string;
    /** RFC 9073 STRUCTURED-DATA URI reference (e.g., OpenStreetMap URL) */
    structured_data_uri?: string;
}

/**
 * RFC 7986 CONFERENCE - Virtual meeting/conference property
 * Represents a virtual conference or meeting link
 */
export interface EventConference {
    /** Conference URI (any valid scheme: https, tel, sip, etc.) */
    uri: string;
    /** RFC 7986 FEATURE values: AUDIO, VIDEO, CHAT, PHONE, SCREEN, MODERATOR, FEED */
    features?: string[];
    /** Human-readable label for this conference link */
    label?: string;
}

/**
 * RFC 4589 Location Types
 * Common location types from the IANA Location Types Registry
 */
export const LOCATION_TYPES = [
    // Building/facility types
    'venue',
    'parking',
    'restaurant',
    'bar',
    'hotel',
    'motel',
    'resort',
    'convention-center',
    'stadium',
    'arena',
    'theater',
    'cinema',
    'museum',
    'library',
    'school',
    'university',
    'hospital',
    'church',
    'mosque',
    'synagogue',
    'temple',
    // Transportation
    'airport',
    'train-station',
    'bus-station',
    'subway-station',
    'port',
    'ferry-terminal',
    // Outdoor/recreation
    'park',
    'beach',
    'campground',
    'golf-course',
    'ski-resort',
    'marina',
    // Commercial
    'office',
    'shop',
    'mall',
    'market',
    'bank',
    // Residential
    'residence',
    'apartment',
    'house',
    // Other
    'warehouse',
    'industrial',
    'government',
    'embassy',
    'military',
    'prison',
    'cemetery',
    'other',
] as const;

export type LocationType = typeof LOCATION_TYPES[number];

/**
 * RFC 7986 Conference Features
 */
export const CONFERENCE_FEATURES = [
    'AUDIO',     // Audio conferencing
    'VIDEO',     // Video conferencing
    'CHAT',      // Text chat/messaging
    'PHONE',     // Phone dial-in
    'SCREEN',    // Screen sharing
    'MODERATOR', // Moderator controls available
    'FEED',      // Broadcast/streaming feed
] as const;

export type ConferenceFeature = typeof CONFERENCE_FEATURES[number];

/**
 * RFC 5545 Event Status Values
 */
export const EVENT_STATUSES = [
    'CONFIRMED',  // Event is confirmed
    'TENTATIVE',  // Event is tentative
    'CANCELLED',  // Event is cancelled
] as const;

export type EventStatus = typeof EVENT_STATUSES[number];

/**
 * RFC 5545 RSVP/Participation Status Values
 */
export const RSVP_STATUSES = [
    'NEEDS-ACTION', // User has not responded
    'ACCEPTED',     // User accepted
    'DECLINED',     // User declined
    'TENTATIVE',    // User tentatively accepted
] as const;

export type RsvpStatus = typeof RSVP_STATUSES[number];

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
    /** RFC 9073 structured locations (replaces legacy location/geo) */
    locations?: EventLocation[];
    /** RFC 7986 virtual conferences */
    conferences?: EventConference[];
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

