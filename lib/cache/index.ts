/**
 * Cache Module
 *
 * Production-grade caching layer for Eventky
 *
 * Exports:
 * - Query key factories
 * - Cache utilities
 * - Sync utilities
 * - Pending writes management
 */

// Query keys and conversion utilities
export { queryKeys, pubkyEventToNexusFormat, pubkyCalendarToNexusFormat } from "./utils";

// Sync utilities - version comparison, merge logic
export {
    SYNC_CONFIG,
    extractEventVersion,
    extractCalendarVersion,
    compareVersions,
    isNexusVersionCurrent,
    getSyncStatusFromMeta,
    calculateSyncDelay,
    createLocalSyncMeta,
    createNexusSyncMeta,
    mergeEventData,
    mergeCalendarData,
    decideDataSource,
    isNetworkError,
    isNotFoundError,
} from "./sync";

// Pending writes management
export {
    buildRsvpKey,
    buildTagKey,
    buildResourceKey,
    setPendingRsvp,
    getPendingRsvp,
    clearPendingRsvp,
    hasPendingRsvp,
    setPendingTag,
    getPendingTag,
    getPendingTagsForEvent,
    clearPendingTag,
    setPendingEvent,
    getPendingEvent,
    clearPendingEvent,
    isEventSynced,
    setPendingCalendar,
    getPendingCalendar,
    clearPendingCalendar,
    isCalendarSynced,
    getPendingWriteCount,
    clearAllPendingWrites,
    clearStalePendingWrites,
} from "./pending-writes";

