/**
 * Optimistic Cache Store
 *
 * Local cache for events and calendars that provides:
 * - Instant UI updates after create/edit (optimistic updates)
 * - Merging with Nexus index data when available
 * - Version-aware cache invalidation using sequence and last_modified
 * - Background sync detection to know when Nexus has caught up
 *
 * Architecture:
 * 1. On create/edit → Write to Pubky Homeserver + store in local cache
 * 2. UI immediately shows local cache data
 * 3. Background: Query Nexus periodically
 * 4. When Nexus data arrives with matching/newer version → merge and clear local
 *
 * Uses pubky-app-specs versioning:
 * - sequence: RFC 5545 modification counter (increments on each edit)
 * - last_modified: Unix microseconds timestamp of last change
 * - CACHE_CACHE_VERSION: Cache schema version for compatibility
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { NexusEventResponse } from "@/lib/nexus/events";
import type { NexusCalendarResponse } from "@/lib/nexus/calendars";

/**
 * Cache schema version - increment when cache structure changes
 * This ensures old cache data is cleared on updates
 */
const CACHE_VERSION = "1.0.0";

/**
 * Cache entry metadata for tracking freshness and sync status
 */
interface CacheMetadata {
    /** When the entry was added to local cache (Unix ms) */
    cachedAt: number;
    /** Cache schema version at time of caching */
    specVersion: string;
    /** Source of data: 'local' = user created/edited, 'nexus' = from API */
    source: "local" | "nexus";
    /** Number of times we've checked Nexus for this item */
    syncAttempts: number;
    /** Whether Nexus has confirmed indexing this version */
    synced: boolean;
    /** Last time we checked Nexus for updates (Unix ms) */
    lastSyncCheck?: number;
}

/**
 * Cached event with metadata
 */
export interface CachedEvent {
    data: NexusEventResponse;
    meta: CacheMetadata;
}

/**
 * Cached calendar with metadata
 */
export interface CachedCalendar {
    data: NexusCalendarResponse;
    meta: CacheMetadata;
}

/**
 * Cache key format: "authorId:resourceId"
 */
type CacheKey = string;

/**
 * Sync status for a resource
 */
export type SyncStatus = "pending" | "syncing" | "synced" | "stale" | "error";

interface OptimisticCacheState {
    /** Cached events by authorId:eventId */
    events: Record<CacheKey, CachedEvent>;
    /** Cached calendars by authorId:calendarId */
    calendars: Record<CacheKey, CachedCalendar>;
    /** Global spec version for cache invalidation */
    specVersion: string;
}

interface OptimisticCacheActions {
    // Event actions
    setEvent: (authorId: string, eventId: string, data: NexusEventResponse, source?: "local" | "nexus") => void;
    getEvent: (authorId: string, eventId: string) => CachedEvent | undefined;
    removeEvent: (authorId: string, eventId: string) => void;
    markEventSynced: (authorId: string, eventId: string) => void;
    markEventSyncAttempt: (authorId: string, eventId: string) => void;

    // Calendar actions
    setCalendar: (authorId: string, calendarId: string, data: NexusCalendarResponse, source?: "local" | "nexus") => void;
    getCalendar: (authorId: string, calendarId: string) => CachedCalendar | undefined;
    removeCalendar: (authorId: string, calendarId: string) => void;
    markCalendarSynced: (authorId: string, calendarId: string) => void;
    markCalendarSyncAttempt: (authorId: string, calendarId: string) => void;

    // Utility actions
    clearAll: () => void;
    clearStaleEntries: (maxAge?: number) => void;
    getSyncStatus: (authorId: string, resourceId: string, type: "event" | "calendar") => SyncStatus;
    getPendingSyncCount: () => number;
}

type OptimisticCacheStore = OptimisticCacheState & OptimisticCacheActions;

/**
 * Create cache key from author and resource ID
 */
export function createCacheKey(authorId: string, resourceId: string): CacheKey {
    return `${authorId}:${resourceId}`;
}

/**
 * Parse cache key back to components
 */
export function parseCacheKey(key: CacheKey): { authorId: string; resourceId: string } {
    const [authorId, resourceId] = key.split(":");
    return { authorId, resourceId };
}

/**
 * Default cache metadata for new entries
 */
function createCacheMetadata(source: "local" | "nexus"): CacheMetadata {
    return {
        cachedAt: Date.now(),
        specVersion: CACHE_VERSION,
        source,
        syncAttempts: 0,
        synced: source === "nexus",
        lastSyncCheck: source === "nexus" ? Date.now() : undefined,
    };
}

/**
 * Check if cached data is stale based on age
 * Default max age: 24 hours for local, 5 minutes for nexus
 */
function isStale(meta: CacheMetadata, maxAge?: number): boolean {
    const defaultMaxAge = meta.source === "local" ? 24 * 60 * 60 * 1000 : 5 * 60 * 1000;
    const age = Date.now() - meta.cachedAt;
    return age > (maxAge ?? defaultMaxAge);
}

/**
 * Compare two event responses to determine which is newer
 * Returns: positive if a is newer, negative if b is newer, 0 if equal
 */
export function compareEventVersions(
    a: NexusEventResponse | undefined,
    b: NexusEventResponse | undefined
): number {
    if (!a && !b) return 0;
    if (!a) return -1;
    if (!b) return 1;

    // First compare by sequence (RFC 5545 standard)
    const seqA = a.details.sequence ?? 0;
    const seqB = b.details.sequence ?? 0;
    if (seqA !== seqB) {
        return seqA - seqB;
    }

    // Then by last_modified timestamp
    const modA = a.details.last_modified ?? 0;
    const modB = b.details.last_modified ?? 0;
    if (modA !== modB) {
        return modA - modB;
    }

    // Finally by indexed_at (Nexus processing time)
    return (a.details.indexed_at ?? 0) - (b.details.indexed_at ?? 0);
}

/**
 * Compare two calendar responses to determine which is newer
 */
export function compareCalendarVersions(
    a: NexusCalendarResponse | undefined,
    b: NexusCalendarResponse | undefined
): number {
    if (!a && !b) return 0;
    if (!a) return -1;
    if (!b) return 1;

    // Calendars don't have sequence, compare by indexed_at
    const indexA = a.details.indexed_at ?? 0;
    const indexB = b.details.indexed_at ?? 0;
    if (indexA !== indexB) {
        return indexA - indexB;
    }

    // Then by created timestamp if available
    const createdA = a.details.created ?? 0;
    const createdB = b.details.created ?? 0;
    return createdA - createdB;
}

/**
 * Merge local cache with Nexus response
 * Returns the most up-to-date data
 */
export function mergeEventData(
    local: CachedEvent | undefined,
    nexus: NexusEventResponse | undefined
): NexusEventResponse | undefined {
    if (!local && !nexus) return undefined;
    if (!local) return nexus;
    if (!nexus) return local.data;

    // If local is unsynced and has same or newer version, prefer local
    if (!local.meta.synced) {
        const comparison = compareEventVersions(local.data, nexus);
        if (comparison >= 0) {
            return local.data;
        }
    }

    // Nexus has newer data, use it
    return nexus;
}

/**
 * Merge local calendar cache with Nexus response
 */
export function mergeCalendarData(
    local: CachedCalendar | undefined,
    nexus: NexusCalendarResponse | undefined
): NexusCalendarResponse | undefined {
    if (!local && !nexus) return undefined;
    if (!local) return nexus;
    if (!nexus) return local.data;

    // If local is unsynced, prefer local until Nexus catches up
    if (!local.meta.synced) {
        const comparison = compareCalendarVersions(local.data, nexus);
        if (comparison >= 0) {
            return local.data;
        }
    }

    return nexus;
}

/**
 * Optimistic Cache Store
 *
 * Provides local caching with smart Nexus synchronization
 */
export const useOptimisticCache = create<OptimisticCacheStore>()(
    persist(
        (set, get) => ({
            // Initial state
            events: {},
            calendars: {},
            specVersion: CACHE_VERSION,

            // Event actions
            setEvent: (authorId, eventId, data, source = "local") => {
                const key = createCacheKey(authorId, eventId);
                const existing = get().events[key];

                // If updating from Nexus, check if it's newer than local
                if (source === "nexus" && existing && !existing.meta.synced) {
                    const comparison = compareEventVersions(existing.data, data);
                    if (comparison > 0) {
                        // Local is newer, just mark sync attempt
                        set((state) => ({
                            events: {
                                ...state.events,
                                [key]: {
                                    ...existing,
                                    meta: {
                                        ...existing.meta,
                                        syncAttempts: existing.meta.syncAttempts + 1,
                                        lastSyncCheck: Date.now(),
                                    },
                                },
                            },
                        }));
                        return;
                    }
                }

                set((state) => ({
                    events: {
                        ...state.events,
                        [key]: {
                            data,
                            meta: createCacheMetadata(source),
                        },
                    },
                }));
            },

            getEvent: (authorId, eventId) => {
                const key = createCacheKey(authorId, eventId);
                return get().events[key];
            },

            removeEvent: (authorId, eventId) => {
                const key = createCacheKey(authorId, eventId);
                set((state) => {
                    const { [key]: _removed, ...rest } = state.events;
                    void _removed; // Intentionally unused - destructuring for removal
                    return { events: rest };
                });
            },

            markEventSynced: (authorId, eventId) => {
                const key = createCacheKey(authorId, eventId);
                const existing = get().events[key];
                if (existing) {
                    set((state) => ({
                        events: {
                            ...state.events,
                            [key]: {
                                ...existing,
                                meta: {
                                    ...existing.meta,
                                    synced: true,
                                    lastSyncCheck: Date.now(),
                                },
                            },
                        },
                    }));
                }
            },

            markEventSyncAttempt: (authorId, eventId) => {
                const key = createCacheKey(authorId, eventId);
                const existing = get().events[key];
                if (existing) {
                    set((state) => ({
                        events: {
                            ...state.events,
                            [key]: {
                                ...existing,
                                meta: {
                                    ...existing.meta,
                                    syncAttempts: existing.meta.syncAttempts + 1,
                                    lastSyncCheck: Date.now(),
                                },
                            },
                        },
                    }));
                }
            },

            // Calendar actions
            setCalendar: (authorId, calendarId, data, source = "local") => {
                const key = createCacheKey(authorId, calendarId);
                const existing = get().calendars[key];

                if (source === "nexus" && existing && !existing.meta.synced) {
                    const comparison = compareCalendarVersions(existing.data, data);
                    if (comparison > 0) {
                        set((state) => ({
                            calendars: {
                                ...state.calendars,
                                [key]: {
                                    ...existing,
                                    meta: {
                                        ...existing.meta,
                                        syncAttempts: existing.meta.syncAttempts + 1,
                                        lastSyncCheck: Date.now(),
                                    },
                                },
                            },
                        }));
                        return;
                    }
                }

                set((state) => ({
                    calendars: {
                        ...state.calendars,
                        [key]: {
                            data,
                            meta: createCacheMetadata(source),
                        },
                    },
                }));
            },

            getCalendar: (authorId, calendarId) => {
                const key = createCacheKey(authorId, calendarId);
                return get().calendars[key];
            },

            removeCalendar: (authorId, calendarId) => {
                const key = createCacheKey(authorId, calendarId);
                set((state) => {
                    const { [key]: _removed, ...rest } = state.calendars;
                    void _removed; // Intentionally unused - destructuring for removal
                    return { calendars: rest };
                });
            },

            markCalendarSynced: (authorId, calendarId) => {
                const key = createCacheKey(authorId, calendarId);
                const existing = get().calendars[key];
                if (existing) {
                    set((state) => ({
                        calendars: {
                            ...state.calendars,
                            [key]: {
                                ...existing,
                                meta: {
                                    ...existing.meta,
                                    synced: true,
                                    lastSyncCheck: Date.now(),
                                },
                            },
                        },
                    }));
                }
            },

            markCalendarSyncAttempt: (authorId, calendarId) => {
                const key = createCacheKey(authorId, calendarId);
                const existing = get().calendars[key];
                if (existing) {
                    set((state) => ({
                        calendars: {
                            ...state.calendars,
                            [key]: {
                                ...existing,
                                meta: {
                                    ...existing.meta,
                                    syncAttempts: existing.meta.syncAttempts + 1,
                                    lastSyncCheck: Date.now(),
                                },
                            },
                        },
                    }));
                }
            },

            // Utility actions
            clearAll: () => {
                set({ events: {}, calendars: {}, specVersion: CACHE_VERSION });
            },

            clearStaleEntries: (maxAge) => {
                const state = get();

                // Clear stale events
                const freshEvents: Record<CacheKey, CachedEvent> = {};
                for (const [key, entry] of Object.entries(state.events)) {
                    if (!isStale(entry.meta, maxAge)) {
                        freshEvents[key] = entry;
                    }
                }

                // Clear stale calendars
                const freshCalendars: Record<CacheKey, CachedCalendar> = {};
                for (const [key, entry] of Object.entries(state.calendars)) {
                    if (!isStale(entry.meta, maxAge)) {
                        freshCalendars[key] = entry;
                    }
                }

                set({ events: freshEvents, calendars: freshCalendars });
            },

            getSyncStatus: (authorId, resourceId, type) => {
                const key = createCacheKey(authorId, resourceId);
                const entry = type === "event"
                    ? get().events[key]
                    : get().calendars[key];

                if (!entry) return "stale";
                if (entry.meta.synced) return "synced";
                if (entry.meta.syncAttempts > 10) return "error";
                if (entry.meta.syncAttempts > 0) return "syncing";
                return "pending";
            },

            getPendingSyncCount: () => {
                const state = get();
                let count = 0;

                for (const entry of Object.values(state.events)) {
                    if (!entry.meta.synced) count++;
                }
                for (const entry of Object.values(state.calendars)) {
                    if (!entry.meta.synced) count++;
                }

                return count;
            },
        }),
        {
            name: "eventky-optimistic-cache",
            version: 1,
            storage: createJSONStorage(() => localStorage),
            // Migrate on spec version change
            migrate: (persistedState) => {
                const state = persistedState as OptimisticCacheState;
                // If spec version changed, clear cache to avoid schema issues
                if (state.specVersion !== CACHE_VERSION) {
                    return {
                        events: {},
                        calendars: {},
                        specVersion: CACHE_VERSION,
                    };
                }
                return state;
            },
            // Don't persist synced items - they can be refetched from Nexus
            partialize: (state) => ({
                events: Object.fromEntries(
                    Object.entries(state.events).filter(([, v]) => !v.meta.synced)
                ),
                calendars: Object.fromEntries(
                    Object.entries(state.calendars).filter(([, v]) => !v.meta.synced)
                ),
                specVersion: state.specVersion,
            }),
        }
    )
);

/**
 * Selector hooks for convenience
 */
export function useEventSyncStatus(authorId: string, eventId: string): SyncStatus {
    return useOptimisticCache((state) => state.getSyncStatus(authorId, eventId, "event"));
}

export function useCalendarSyncStatus(authorId: string, calendarId: string): SyncStatus {
    return useOptimisticCache((state) => state.getSyncStatus(authorId, calendarId, "calendar"));
}

export function usePendingSyncCount(): number {
    return useOptimisticCache((state) => state.getPendingSyncCount());
}
