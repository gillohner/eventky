/**
 * Nexus API Types
 *
 * Unified type definitions for Nexus API responses and caching.
 * These types align with pubky-nexus API responses.
 */

// =============================================================================
// Core Nexus Response Types
// =============================================================================

/**
 * Tag information included in event/calendar responses
 */
export interface NexusTag {
    label: string;
    taggers: string[];
    taggers_count: number;
    relationship: boolean;
}

/**
 * Attendee information from Nexus
 */
export interface NexusAttendee {
    id: string;
    indexed_at: number;
    author: string;
    uri: string;
    partstat: string;
    x_pubky_event_uri: string;
    created_at: number;
    last_modified?: number;
    recurrence_id?: string;
}

/**
 * Event details from Nexus API
 */
export interface NexusEventDetails {
    id: string;
    uri: string;
    author: string;
    indexed_at: number;
    uid: string;
    dtstamp: number;
    dtstart: string;
    summary: string;
    dtend?: string;
    duration?: string;
    dtstart_tzid?: string;
    dtend_tzid?: string;
    rrule?: string;
    rdate?: string[];
    exdate?: string[];
    description?: string;
    status?: string;
    location?: string;
    geo?: string;
    url?: string;
    sequence?: number;
    last_modified?: number;
    created?: number;
    recurrence_id?: number;
    image_uri?: string;
    styled_description?: string | { fmttype: string; value: string };
    x_pubky_calendar_uris?: string[];
    x_pubky_rsvp_access?: string;
}

/**
 * Full event response from Nexus API (EventView)
 */
export interface NexusEventResponse {
    details: NexusEventDetails;
    tags: NexusTag[];
    attendees: NexusAttendee[];
}

/**
 * Event stream item (lighter weight, no tags/attendees)
 */
export interface NexusEventStreamItem {
    id: string;
    uri: string;
    author: string;
    indexed_at: number;
    uid: string;
    dtstamp: number;
    dtstart: string;
    summary: string;
    dtend?: string;
    duration?: string;
    dtstart_tzid?: string;
    dtend_tzid?: string;
    rrule?: string;
    rdate?: string[];
    exdate?: string[];
    description?: string;
    status?: string;
    location?: string;
    geo?: string;
    url?: string;
    sequence?: number;
    last_modified?: number;
    created?: number;
    recurrence_id?: number;
    image_uri?: string;
    styled_description?: string | { fmttype: string; value: string };
    x_pubky_calendar_uris?: string[];
    x_pubky_rsvp_access?: string;
}

/**
 * Calendar details from Nexus API
 */
export interface NexusCalendarDetails {
    id: string;
    uri: string;
    author: string;
    indexed_at: number;
    name: string;
    timezone: string;
    color?: string;
    description?: string;
    url?: string;
    image_uri?: string;
    x_pubky_authors?: string[];
    created: number;
    sequence?: number;
    last_modified?: number;
}

/**
 * Full calendar response from Nexus API (CalendarView)
 */
export interface NexusCalendarResponse {
    details: NexusCalendarDetails;
    tags: NexusTag[];
    events: string[]; // Event URIs
}

/**
 * Calendar stream item (lighter weight)
 */
export interface NexusCalendarStreamItem {
    id: string;
    uri: string;
    author: string;
    indexed_at: number;
    name: string;
    timezone: string;
    color?: string;
    description?: string;
    url?: string;
    image_uri?: string;
    x_pubky_admins?: string[];
    created?: number;
    sequence?: number;
    last_modified?: number;
}

// =============================================================================
// User Types
// =============================================================================

/**
 * User search result
 */
export interface NexusUserSearchResult {
    id: string;
    name: string;
    bio?: string;
    image?: string;
    status?: string;
}

/**
 * User details from Nexus
 */
export interface NexusUserDetails {
    id: string;
    name?: string;
    bio?: string;
    image?: string;
    links?: Array<{ title: string; url: string }>;
    status?: string;
    indexed_at?: number;
}

// =============================================================================
// Sync Metadata Types (for optimistic caching)
// =============================================================================

/**
 * Sync status states
 */
export type SyncStatus = "pending" | "syncing" | "synced" | "stale" | "error";

/**
 * Metadata attached to cached data for sync tracking
 * Stored alongside the data in TanStack Query cache
 */
export interface SyncMetadata {
    /** Source of data: 'local' = user created/edited, 'nexus' = from API */
    source: "local" | "nexus";
    /** When local data was written (for local source) */
    localWrittenAt?: number;
    /** Sequence number at time of local write (for version comparison) */
    localSequence?: number;
    /** Whether Nexus has confirmed indexing this version */
    syncedAt?: number;
    /** Number of times we've checked Nexus for this item */
    syncAttempts?: number;
    /** Last time we checked Nexus for updates */
    lastSyncCheck?: number;
}

/**
 * Cached event with sync metadata
 */
export interface CachedEvent extends NexusEventResponse {
    _syncMeta?: SyncMetadata;
}

/**
 * Cached calendar with sync metadata
 */
export interface CachedCalendar extends NexusCalendarResponse {
    _syncMeta?: SyncMetadata;
}

// =============================================================================
// Version Comparison Types
// =============================================================================

/**
 * Version info extracted from Nexus responses for comparison
 */
export interface VersionInfo {
    sequence: number;
    lastModified: number;
    indexedAt: number;
}

/**
 * Data source decision result
 */
export type DataSourceType = "local" | "nexus" | "merged";

export interface DataSourceDecision<T> {
    source: DataSourceType;
    data: T;
    isStale: boolean;
    needsRefresh: boolean;
}

// =============================================================================
// API Parameters
// =============================================================================

/**
 * Parameters for fetching a single event
 */
export interface FetchEventParams {
    authorId: string;
    eventId: string;
    limitTags?: number;
    limitTaggers?: number;
    limitAttendees?: number;
}

/**
 * Parameters for event stream
 */
export interface EventStreamParams {
    limit?: number;
    skip?: number;
    calendar?: string;
    status?: string;
    start_date?: number;
    end_date?: number;
    author?: string;
    timezone?: string;
    rsvp_access?: string;
    tags?: string[];
}

/**
 * Parameters for fetching a single calendar
 */
export interface FetchCalendarParams {
    authorId: string;
    calendarId: string;
    limitTags?: number;
    limitTaggers?: number;
}

/**
 * Parameters for calendar stream
 */
export interface CalendarStreamParams {
    limit?: number;
    skip?: number;
    owner?: string;
    admin?: string;
}

// =============================================================================
// Pending Write Types
// =============================================================================

/**
 * Pending RSVP write
 */
export interface PendingRsvp {
    partstat: string;
    timestamp: number;
    recurrenceId?: string;
}

/**
 * Pending tag write
 */
export interface PendingTag {
    label: string;
    timestamp: number;
    action: "add" | "remove";
}

/**
 * Pending event write (for create/edit)
 */
export interface PendingEventWrite {
    data: NexusEventResponse;
    timestamp: number;
    sequence: number;
}

/**
 * Pending calendar write (for create/edit)
 */
export interface PendingCalendarWrite {
    data: NexusCalendarResponse;
    timestamp: number;
    sequence: number;
}
