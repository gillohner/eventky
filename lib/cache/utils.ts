/**
 * Cache Utilities
 *
 * Production-grade utilities for managing optimistic caching with TanStack Query
 *
 * Features:
 * - Convert between Pubky raw data and Nexus response format
 * - Query key factories for consistent cache keys
 * - Cache invalidation helpers
 * - Stale-while-revalidate patterns
 */

import type { PubkyAppEvent, PubkyAppCalendar, StyledDescription } from "pubky-app-specs";
import { eventUriBuilder, calendarUriBuilder } from "pubky-app-specs";
import type { NexusEventResponse } from "@/lib/nexus/events";
import type { NexusCalendarResponse } from "@/lib/nexus/calendars";

/**
 * Convert StyledDescription from WASM to Nexus format
 */
function convertStyledDescription(
    sd: StyledDescription
): string | { fmttype: string; value: string } | undefined {
    // StyledDescription from WASM has fmttype and value properties
    if (typeof sd === "string") {
        return sd;
    }
    if (sd && typeof sd === "object") {
        // Access WASM object properties
        const fmttype = (sd as { fmttype?: string }).fmttype;
        const value = (sd as { value?: string }).value;
        if (fmttype && value) {
            return { fmttype, value };
        }
    }
    return undefined;
}

/**
 * Query Key Factory
 *
 * Centralizes all query keys to ensure consistency across the app
 * Following TanStack Query best practices for hierarchical keys
 */
export const queryKeys = {
    // All queries namespace
    all: ["eventky"] as const,

    // Events namespace
    events: {
        all: ["nexus", "events"] as const,
        lists: () => [...queryKeys.events.all, "list"] as const,
        list: (params?: Record<string, unknown>) =>
            [...queryKeys.events.lists(), params] as const,
        stream: (params?: Record<string, unknown>) =>
            [...queryKeys.events.all, "stream", params] as const,
        details: () => [...queryKeys.events.all, "detail"] as const,
        detail: (
            authorId: string,
            eventId: string,
            options?: {
                limitTags?: number;
                limitTaggers?: number;
                limitAttendees?: number;
            }
        ) =>
            [
                "nexus",
                "event",
                authorId,
                eventId,
                options?.limitTags,
                options?.limitTaggers,
                options?.limitAttendees,
            ] as const,
    },

    // Calendars namespace
    calendars: {
        all: ["nexus", "calendars"] as const,
        lists: () => [...queryKeys.calendars.all, "list"] as const,
        list: (params?: Record<string, unknown>) =>
            [...queryKeys.calendars.lists(), params] as const,
        stream: (params?: Record<string, unknown>) =>
            [...queryKeys.calendars.all, "stream", params] as const,
        details: () => [...queryKeys.calendars.all, "detail"] as const,
        detail: (
            authorId: string,
            calendarId: string,
            options?: {
                limitTags?: number;
                limitTaggers?: number;
            }
        ) =>
            [
                "nexus",
                "calendar",
                authorId,
                calendarId,
                options?.limitTags,
                options?.limitTaggers,
            ] as const,
    },

    // User/Profile namespace
    users: {
        all: ["users"] as const,
        profile: (publicKey: string) => ["profile", publicKey] as const,
    },
} as const;

/**
 * Convert a PubkyAppEvent to NexusEventResponse format
 *
 * Used when creating optimistic cache entries from local writes
 */
export function pubkyEventToNexusFormat(
    event: PubkyAppEvent,
    authorId: string,
    eventId: string
): NexusEventResponse {
    // Get current timestamp for indexed_at (local writes aren't indexed yet)
    const now = Date.now();

    return {
        details: {
            id: eventId,
            uri: eventUriBuilder(authorId, eventId),
            author: authorId,
            indexed_at: now, // Local timestamp, will be updated when Nexus indexes
            uid: event.uid,
            dtstamp: Number(event.dtstamp),
            dtstart: event.dtstart,
            summary: event.summary,
            dtend: event.dtend ?? undefined,
            duration: event.duration ?? undefined,
            dtstart_tzid: event.dtstart_tzid ?? undefined,
            dtend_tzid: event.dtend_tzid ?? undefined,
            rrule: event.rrule ?? undefined,
            rdate: event.rdate ?? undefined,
            exdate: event.exdate ?? undefined,
            description: event.description ?? undefined,
            status: event.status ?? undefined,
            location: event.location ?? undefined,
            geo: event.geo ?? undefined,
            url: event.url ?? undefined,
            sequence: event.sequence ?? 0,
            last_modified: event.last_modified ? Number(event.last_modified) : undefined,
            created: event.created ? Number(event.created) : undefined,
            recurrence_id: undefined, // Not typically set on main event
            image_uri: event.image_uri ?? undefined,
            styled_description: event.styled_description
                ? convertStyledDescription(event.styled_description)
                : undefined,
            x_pubky_calendar_uris: event.x_pubky_calendar_uris ?? undefined,
            x_pubky_rsvp_access: event.x_pubky_rsvp_access ?? undefined,
        },
        // Tags and attendees are empty for local writes (populated by Nexus)
        tags: [],
        attendees: [],
    };
}

/**
 * Convert a PubkyAppCalendar to NexusCalendarResponse format
 */
export function pubkyCalendarToNexusFormat(
    calendar: PubkyAppCalendar,
    authorId: string,
    calendarId: string
): NexusCalendarResponse {
    const now = Date.now();

    return {
        details: {
            id: calendarId,
            uri: calendarUriBuilder(authorId, calendarId),
            author: authorId,
            indexed_at: now,
            name: calendar.name,
            timezone: calendar.timezone,
            color: calendar.color ?? undefined,
            description: calendar.description ?? undefined,
            url: calendar.url ?? undefined,
            image_uri: calendar.image_uri ?? undefined,
            x_pubky_admins: calendar.x_pubky_admins ?? undefined,
            created: calendar.created ? Number(calendar.created) : undefined,
            sequence: calendar.sequence ?? undefined,
            last_modified: calendar.last_modified ? Number(calendar.last_modified) : undefined,
        },
        tags: [],
        events: [], // Empty for local optimistic data - Nexus will populate with linked events
    };
}

/**
 * Extract version info from NexusEventResponse for comparison
 */
export interface EventVersionInfo {
    sequence: number;
    lastModified: number;
    indexedAt: number;
}

export function extractEventVersion(event: NexusEventResponse): EventVersionInfo {
    return {
        sequence: event.details.sequence ?? 0,
        lastModified: event.details.last_modified ?? 0,
        indexedAt: event.details.indexed_at ?? 0,
    };
}

/**
 * Extract version info from NexusCalendarResponse for comparison
 */
export interface CalendarVersionInfo {
    sequence: number;
    lastModified: number;
    indexedAt: number;
}

export function extractCalendarVersion(calendar: NexusCalendarResponse): CalendarVersionInfo {
    return {
        sequence: calendar.details.sequence ?? 0,
        lastModified: calendar.details.last_modified ?? 0,
        indexedAt: calendar.details.indexed_at ?? 0,
    };
}

/**
 * Check if Nexus data represents the same or newer version as local
 */
export function isNexusVersionCurrent(
    local: EventVersionInfo,
    nexus: EventVersionInfo
): boolean {
    // Nexus is current if:
    // 1. Same or higher sequence number
    // 2. AND same or newer last_modified (if sequence is equal)
    if (nexus.sequence > local.sequence) return true;
    if (nexus.sequence < local.sequence) return false;

    // Sequences are equal, check last_modified
    return nexus.lastModified >= local.lastModified;
}

/**
 * Determine if we should use local cache or Nexus data
 */
export type DataSource = "local" | "nexus" | "merged";

export interface DataSourceDecision<T> {
    source: DataSource;
    data: T;
    isStale: boolean;
    needsRefresh: boolean;
}

/**
 * Smart merge decision for event data
 */
export function decideEventDataSource(
    localData: NexusEventResponse | undefined,
    nexusData: NexusEventResponse | undefined,
    localSynced: boolean
): DataSourceDecision<NexusEventResponse | undefined> {
    // No data available
    if (!localData && !nexusData) {
        return {
            source: "nexus",
            data: undefined,
            isStale: true,
            needsRefresh: true,
        };
    }

    // Only Nexus data available
    if (!localData) {
        return {
            source: "nexus",
            data: nexusData,
            isStale: false,
            needsRefresh: false,
        };
    }

    // Only local data available (Nexus hasn't indexed yet)
    if (!nexusData) {
        return {
            source: "local",
            data: localData,
            isStale: false,
            needsRefresh: !localSynced, // Keep trying to fetch from Nexus
        };
    }

    // Both available - compare versions
    const localVersion = extractEventVersion(localData);
    const nexusVersion = extractEventVersion(nexusData);

    if (isNexusVersionCurrent(localVersion, nexusVersion)) {
        // Nexus has caught up or is newer
        return {
            source: "nexus",
            data: nexusData,
            isStale: false,
            needsRefresh: false,
        };
    }

    // Local is newer (Nexus hasn't indexed our changes yet)
    // Return local data but merge in Nexus tags/attendees
    const merged: NexusEventResponse = {
        details: localData.details,
        tags: nexusData.tags, // Use Nexus tags (social data)
        attendees: nexusData.attendees, // Use Nexus attendees (social data)
    };

    return {
        source: "merged",
        data: merged,
        isStale: false,
        needsRefresh: true, // Keep polling Nexus
    };
}

/**
 * Retry configuration for optimistic updates
 */
export const SYNC_CONFIG = {
    /** Initial delay before first sync check (ms) */
    INITIAL_SYNC_DELAY: 1000,
    /** Interval between sync checks (ms) */
    SYNC_INTERVAL: 3000,
    /** Maximum number of sync attempts before giving up */
    MAX_SYNC_ATTEMPTS: 20,
    /** Maximum time to wait for sync (ms) - 60 seconds */
    MAX_SYNC_TIME: 60000,
    /** Stale time for optimistic data (ms) - 30 seconds */
    OPTIMISTIC_STALE_TIME: 30000,
} as const;

/**
 * Calculate next sync check delay with exponential backoff
 */
export function calculateSyncDelay(attempt: number): number {
    // Exponential backoff: 1s, 2s, 4s, 8s, max 15s
    const delay = Math.min(
        SYNC_CONFIG.INITIAL_SYNC_DELAY * Math.pow(2, attempt),
        15000
    );
    // Add jitter (±20%)
    const jitter = delay * 0.2 * (Math.random() - 0.5);
    return delay + jitter;
}

/**
 * Type guard to check if an error is a network error
 */
export function isNetworkError(error: unknown): boolean {
    if (error instanceof Error) {
        return (
            error.message.includes("Network") ||
            error.message.includes("network") ||
            error.message.includes("ECONNREFUSED") ||
            error.message.includes("timeout")
        );
    }
    return false;
}

/**
 * Type guard for 404 errors
 */
export function isNotFoundError(error: unknown): boolean {
    if (error instanceof Error) {
        return (
            error.message.includes("404") ||
            error.message.includes("not found") ||
            error.message.includes("Not Found")
        );
    }
    return false;
}
