/**
 * Sync Utilities
 *
 * Functions for comparing versions, merging data, and managing sync state
 * between local optimistic updates and Nexus indexed data.
 */

import type {
    NexusEventResponse,
    NexusCalendarResponse,
    CachedEvent,
    CachedCalendar,
    VersionInfo,
    SyncStatus,
    SyncMetadata,
    DataSourceDecision,
} from "@/types/nexus";
import {
    getPendingEvent,
    getPendingCalendar,
    clearPendingEvent,
    clearPendingCalendar,
} from "./pending-writes";

// =============================================================================
// Configuration
// =============================================================================

export const SYNC_CONFIG = {
    /** Initial delay before first sync check (ms) */
    INITIAL_SYNC_DELAY: 1000,
    /** Base interval between sync checks (ms) */
    SYNC_INTERVAL: 3000,
    /** Maximum number of sync attempts before giving up */
    MAX_SYNC_ATTEMPTS: 20,
    /** Maximum time to wait for sync (ms) - 60 seconds */
    MAX_SYNC_TIME: 60_000,
    /** Stale time for optimistic data (ms) - 30 seconds */
    OPTIMISTIC_STALE_TIME: 30_000,
    /** Normal stale time for synced data (ms) - 2 minutes */
    NORMAL_STALE_TIME: 2 * 60 * 1000,
    /** Cache garbage collection time (ms) - 10 minutes */
    GC_TIME: 10 * 60 * 1000,
} as const;

// =============================================================================
// Version Extraction
// =============================================================================

/**
 * Extract version info from event response
 */
export function extractEventVersion(event: NexusEventResponse): VersionInfo {
    return {
        sequence: event.details.sequence ?? 0,
        lastModified: event.details.last_modified ?? 0,
        indexedAt: event.details.indexed_at ?? 0,
    };
}

/**
 * Extract version info from calendar response
 */
export function extractCalendarVersion(calendar: NexusCalendarResponse): VersionInfo {
    return {
        sequence: calendar.details.sequence ?? 0,
        lastModified: calendar.details.last_modified ?? 0,
        indexedAt: calendar.details.indexed_at ?? 0,
    };
}

// =============================================================================
// Version Comparison
// =============================================================================

/**
 * Compare two versions
 * Returns: positive if a is newer, negative if b is newer, 0 if equal
 */
export function compareVersions(a: VersionInfo, b: VersionInfo): number {
    // First compare by sequence (RFC 5545 standard)
    if (a.sequence !== b.sequence) {
        return a.sequence - b.sequence;
    }

    // Then by last_modified timestamp
    if (a.lastModified !== b.lastModified) {
        return a.lastModified - b.lastModified;
    }

    // Finally by indexed_at (Nexus processing time)
    return a.indexedAt - b.indexedAt;
}

/**
 * Check if Nexus data is current with or newer than local
 */
export function isNexusVersionCurrent(local: VersionInfo, nexus: VersionInfo): boolean {
    return compareVersions(nexus, local) >= 0;
}

// =============================================================================
// Sync Status
// =============================================================================

/**
 * Determine sync status based on metadata
 */
export function getSyncStatusFromMeta(meta?: SyncMetadata): SyncStatus {
    if (!meta) return "synced";
    if (meta.syncedAt) return "synced";
    if ((meta.syncAttempts ?? 0) > SYNC_CONFIG.MAX_SYNC_ATTEMPTS) return "error";
    if ((meta.syncAttempts ?? 0) > 0) return "syncing";
    return "pending";
}

/**
 * Calculate sync delay with exponential backoff
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

// =============================================================================
// Data Merging
// =============================================================================

/**
 * Create sync metadata for a local write
 */
export function createLocalSyncMeta(sequence: number): SyncMetadata {
    return {
        source: "local",
        localWrittenAt: Date.now(),
        localSequence: sequence,
        syncAttempts: 0,
    };
}

/**
 * Create sync metadata for nexus data
 */
export function createNexusSyncMeta(): SyncMetadata {
    return {
        source: "nexus",
        syncedAt: Date.now(),
    };
}

/**
 * Merge local cache with Nexus response for events
 *
 * Strategy:
 * - If local is newer (higher sequence), keep local details but merge social data
 * - If Nexus is current, use Nexus data
 * - Social data (tags, attendees) always from Nexus (it's authoritative)
 */
export function mergeEventData(
    local: CachedEvent | undefined,
    nexus: NexusEventResponse | null | undefined,
    authorId: string,
    eventId: string
): CachedEvent | null {
    // Check pending writes first
    const pendingWrite = getPendingEvent(authorId, eventId);

    // No data available
    if (!local && !nexus && !pendingWrite) {
        return null;
    }

    // Only Nexus data available, no pending write
    if (!local && !pendingWrite) {
        return nexus ? { ...nexus, _syncMeta: createNexusSyncMeta() } : null;
    }

    // Only local/pending data available (Nexus hasn't indexed yet)
    if (!nexus) {
        const data = pendingWrite?.data ?? local;
        if (!data) return null;
        return {
            ...data,
            _syncMeta: {
                source: "local",
                localWrittenAt: pendingWrite?.timestamp ?? local?._syncMeta?.localWrittenAt,
                localSequence: pendingWrite?.sequence ?? local?._syncMeta?.localSequence,
                syncAttempts: (local?._syncMeta?.syncAttempts ?? 0) + 1,
                lastSyncCheck: Date.now(),
            },
        };
    }

    // Both available - compare versions
    const pendingSequence = pendingWrite?.sequence ?? local?._syncMeta?.localSequence ?? 0;
    const nexusSequence = nexus.details.sequence ?? 0;

    if (nexusSequence >= pendingSequence) {
        // Nexus has caught up - clear pending write and use Nexus data
        if (pendingWrite) {
            clearPendingEvent(authorId, eventId);
        }
        return { ...nexus, _syncMeta: createNexusSyncMeta() };
    }

    // Local is still newer - return local details with Nexus social data
    const localData = pendingWrite?.data ?? local;
    if (!localData) {
        return { ...nexus, _syncMeta: createNexusSyncMeta() };
    }

    return {
        details: localData.details,
        tags: nexus.tags, // Social data from Nexus
        attendees: nexus.attendees, // Social data from Nexus
        _syncMeta: {
            source: "local",
            localWrittenAt: pendingWrite?.timestamp ?? local?._syncMeta?.localWrittenAt,
            localSequence: pendingSequence,
            syncAttempts: (local?._syncMeta?.syncAttempts ?? 0) + 1,
            lastSyncCheck: Date.now(),
        },
    };
}

/**
 * Merge local cache with Nexus response for calendars
 */
export function mergeCalendarData(
    local: CachedCalendar | undefined,
    nexus: NexusCalendarResponse | null | undefined,
    authorId: string,
    calendarId: string
): CachedCalendar | null {
    // Check pending writes first
    const pendingWrite = getPendingCalendar(authorId, calendarId);

    // No data available
    if (!local && !nexus && !pendingWrite) {
        return null;
    }

    // Only Nexus data available
    if (!local && !pendingWrite) {
        return nexus ? { ...nexus, _syncMeta: createNexusSyncMeta() } : null;
    }

    // Only local/pending data available
    if (!nexus) {
        const data = pendingWrite?.data ?? local;
        if (!data) return null;
        return {
            ...data,
            _syncMeta: {
                source: "local",
                localWrittenAt: pendingWrite?.timestamp ?? local?._syncMeta?.localWrittenAt,
                localSequence: pendingWrite?.sequence ?? local?._syncMeta?.localSequence,
                syncAttempts: (local?._syncMeta?.syncAttempts ?? 0) + 1,
                lastSyncCheck: Date.now(),
            },
        };
    }

    // Both available - compare versions
    const pendingSequence = pendingWrite?.sequence ?? local?._syncMeta?.localSequence ?? 0;
    const nexusSequence = nexus.details.sequence ?? 0;

    if (nexusSequence >= pendingSequence) {
        // Nexus has caught up
        if (pendingWrite) {
            clearPendingCalendar(authorId, calendarId);
        }
        return { ...nexus, _syncMeta: createNexusSyncMeta() };
    }

    // Local is still newer
    const localData = pendingWrite?.data ?? local;
    if (!localData) {
        return { ...nexus, _syncMeta: createNexusSyncMeta() };
    }

    return {
        details: localData.details,
        tags: nexus.tags,
        events: nexus.events,
        _syncMeta: {
            source: "local",
            localWrittenAt: pendingWrite?.timestamp ?? local?._syncMeta?.localWrittenAt,
            localSequence: pendingSequence,
            syncAttempts: (local?._syncMeta?.syncAttempts ?? 0) + 1,
            lastSyncCheck: Date.now(),
        },
    };
}

/**
 * Decide which data source to use
 */
export function decideDataSource<T extends { _syncMeta?: SyncMetadata }>(
    data: T | null | undefined
): DataSourceDecision<T | null> {
    if (!data) {
        return {
            source: "nexus",
            data: null,
            isStale: true,
            needsRefresh: true,
        };
    }

    const meta = data._syncMeta;
    if (!meta || meta.source === "nexus") {
        return {
            source: "nexus",
            data,
            isStale: false,
            needsRefresh: false,
        };
    }

    // Local data
    const isSynced = !!meta.syncedAt;
    return {
        source: isSynced ? "nexus" : "local",
        data,
        isStale: false,
        needsRefresh: !isSynced,
    };
}

// =============================================================================
// Error Helpers
// =============================================================================

/**
 * Type guard for network errors
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
