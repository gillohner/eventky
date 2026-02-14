/**
 * Event Hooks with Optimistic Caching
 *
 * TanStack Query-based hooks for event operations with:
 * - Optimistic updates: Instant UI after create/edit
 * - Smart merging: Local data + Nexus data with version comparison
 * - Background sync: Polls Nexus until changes are indexed
 * - localStorage persistence: Survives page refresh
 *
 * Architecture:
 * 1. On fetch: Check pending writes, merge with Nexus response
 * 2. Return best available data with sync metadata
 * 3. Background: Continue polling Nexus until synced
 * 4. All state managed via TanStack Query (no Zustand)
 */

import { useQuery, useQueryClient, UseQueryOptions } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";
import { fetchEventFromNexus, fetchEventsStream } from "@/lib/nexus";
import {
    queryKeys,
    mergeEventData,
    getSyncStatusFromMeta,
    calculateSyncDelay,
    isNotFoundError,
    SYNC_CONFIG,
    decideDataSource,
    getPendingEvent,
} from "@/lib/cache";
import type {
    CachedEvent,
    SyncStatus,
    NexusEventStreamItem,
} from "@/types/nexus";

// =============================================================================
// Types
// =============================================================================

export interface UseEventOptions {
    limitTags?: number;
    limitTaggers?: number;
    limitAttendees?: number;
    /** Enable background sync polling (default: true) */
    enableBackgroundSync?: boolean;
    queryOptions?: Omit<
        UseQueryOptions<CachedEvent | null, Error>,
        "queryKey" | "queryFn"
    >;
}

export interface UseEventResult {
    data: CachedEvent | null | undefined;
    isLoading: boolean;
    isFetching: boolean;
    error: Error | null;
    /** Current sync status with Nexus */
    syncStatus: SyncStatus;
    /** Whether data is from local optimistic cache */
    isOptimistic: boolean;
    /** Force refetch from Nexus */
    refetch: () => Promise<void>;
}

// =============================================================================
// useEvent Hook
// =============================================================================

/**
 * Fetch a single event with optimistic caching
 *
 * @example
 * ```tsx
 * const { data, syncStatus, isOptimistic } = useEvent(authorId, eventId);
 *
 * {isOptimistic && <SyncBadge status={syncStatus} />}
 * ```
 */
export function useEvent(
    authorId: string,
    eventId: string,
    options?: UseEventOptions
): UseEventResult {
    const queryClient = useQueryClient();
    const enableBackgroundSync = options?.enableBackgroundSync ?? true;

    // Build query key
    const queryKey = queryKeys.events.detail(authorId, eventId, {
        limitTags: options?.limitTags,
        limitTaggers: options?.limitTaggers,
        limitAttendees: options?.limitAttendees,
    });

    // Get existing cached data for comparison
    const existingData = queryClient.getQueryData<CachedEvent>(queryKey);

    // Main query
    const query = useQuery({
        queryKey,
        queryFn: async (): Promise<CachedEvent | null> => {
            // Fetch from Nexus
            const nexusData = await fetchEventFromNexus(
                authorId,
                eventId,
                options?.limitTags,
                options?.limitTaggers,
                options?.limitAttendees
            );

            // Get current cached data and pending writes
            const currentCached = queryClient.getQueryData<CachedEvent>(queryKey);

            // Merge with pending writes and existing cache
            return mergeEventData(currentCached ?? undefined, nexusData, authorId, eventId);
        },
        // Shorter stale time when we have unsynced local data
        staleTime: existingData?._syncMeta?.source === "local" && !existingData._syncMeta.syncedAt
            ? SYNC_CONFIG.OPTIMISTIC_STALE_TIME
            : SYNC_CONFIG.NORMAL_STALE_TIME,
        gcTime: SYNC_CONFIG.GC_TIME,
        retry: (failureCount, error) => {
            // Don't retry 404s - event doesn't exist in Nexus yet
            if (isNotFoundError(error)) {
                return false;
            }
            return failureCount < 2;
        },
        ...options?.queryOptions,
    });

    // Background sync polling for unsynced local data
    const syncIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const syncAttemptRef = useRef(0);

    // Extract sync state to stable values for useEffect dependency
    const syncSource = query.data?._syncMeta?.source;
    const syncedAt = query.data?._syncMeta?.syncedAt;
    const needsSync = syncSource === "local" && !syncedAt;

    useEffect(() => {
        if (!enableBackgroundSync || !needsSync) {
            // Clear any existing timeout
            if (syncIntervalRef.current) {
                clearTimeout(syncIntervalRef.current);
                syncIntervalRef.current = null;
            }
            syncAttemptRef.current = 0;
            return;
        }

        // Check if we have a pending write
        const pendingWrite = getPendingEvent(authorId, eventId);
        if (!pendingWrite) {
            // No pending write, no need to poll
            return;
        }

        const pollNexus = async () => {
            syncAttemptRef.current++;

            if (syncAttemptRef.current > SYNC_CONFIG.MAX_SYNC_ATTEMPTS) {
                // Give up after max attempts
                if (syncIntervalRef.current) {
                    clearTimeout(syncIntervalRef.current);
                    syncIntervalRef.current = null;
                }
                return;
            }

            // Invalidate query to trigger refetch
            await queryClient.invalidateQueries({ queryKey });
        };

        // Start polling with exponential backoff
        const scheduleNextPoll = () => {
            const delay = calculateSyncDelay(syncAttemptRef.current);
            syncIntervalRef.current = setTimeout(() => {
                pollNexus().then(() => {
                    // Check if still needs sync after poll
                    const currentData = queryClient.getQueryData<CachedEvent>(queryKey);
                    const stillNeedsSync = currentData?._syncMeta?.source === "local" && !currentData._syncMeta.syncedAt;
                    if (stillNeedsSync) {
                        scheduleNextPoll();
                    }
                });
            }, delay);
        };

        // Initial delay before first poll
        setTimeout(scheduleNextPoll, SYNC_CONFIG.INITIAL_SYNC_DELAY);

        return () => {
            if (syncIntervalRef.current) {
                clearTimeout(syncIntervalRef.current);
                syncIntervalRef.current = null;
            }
        };
    }, [
        enableBackgroundSync,
        needsSync,
        authorId,
        eventId,
        queryClient,
        queryKey,
    ]);

    // Determine sync status and data source
    const decision = decideDataSource(query.data);
    const syncStatus = getSyncStatusFromMeta(query.data?._syncMeta);

    // Force refetch function
    const refetch = useCallback(async () => {
        await queryClient.invalidateQueries({ queryKey });
    }, [queryClient, queryKey]);

    return {
        data: query.data,
        isLoading: query.isLoading,
        isFetching: query.isFetching,
        error: query.error,
        syncStatus,
        isOptimistic: decision.source === "local",
        refetch,
    };
}

// =============================================================================
// useEventsStream Hook
// =============================================================================

export interface UseEventsStreamOptions {
    limit?: number;
    skip?: number;
    status?: string;
    start_date?: number;
    end_date?: number;
    authors?: string[];
    tags?: string[];
}

/**
 * Fetch events stream from Nexus
 */
export function useEventsStream(
    params?: UseEventsStreamOptions,
    options?: Omit<
        UseQueryOptions<NexusEventStreamItem[], Error>,
        "queryKey" | "queryFn"
    >
) {
    const queryKey = queryKeys.events.stream(params as Record<string, unknown> | undefined);

    return useQuery({
        queryKey,
        queryFn: () => fetchEventsStream(params),
        staleTime: 1 * 60 * 1000, // 1 minute - stream updates frequently
        gcTime: 5 * 60 * 1000, // 5 minutes cache time
        retry: 2,
        ...options,
    });
}

// =============================================================================
// Utility Hooks
// =============================================================================

/**
 * Prefetch an event (use on hover)
 */
export function usePrefetchEvent() {
    const queryClient = useQueryClient();

    return useCallback(
        (authorId: string, eventId: string, options?: UseEventOptions) => {
            const queryKey = queryKeys.events.detail(authorId, eventId, {
                limitTags: options?.limitTags,
                limitTaggers: options?.limitTaggers,
                limitAttendees: options?.limitAttendees,
            });

            queryClient.prefetchQuery({
                queryKey,
                queryFn: async () => {
                    const nexusData = await fetchEventFromNexus(
                        authorId,
                        eventId,
                        options?.limitTags,
                        options?.limitTaggers,
                        options?.limitAttendees
                    );
                    return mergeEventData(undefined, nexusData, authorId, eventId);
                },
                staleTime: SYNC_CONFIG.NORMAL_STALE_TIME,
            });
        },
        [queryClient]
    );
}

/**
 * Invalidate event queries
 */
export function useInvalidateEvents() {
    const queryClient = useQueryClient();

    return useCallback(
        async (authorId?: string, eventId?: string) => {
            if (authorId && eventId) {
                // Invalidate specific event
                await queryClient.invalidateQueries({
                    queryKey: ["nexus", "event", authorId, eventId],
                });
            }
            // Always invalidate event lists/streams
            await queryClient.invalidateQueries({
                queryKey: queryKeys.events.all,
            });
        },
        [queryClient]
    );
}

/**
 * Set optimistic event data directly in cache
 * Used by mutation hooks after successful writes
 */
export function useSetEventCache() {
    const queryClient = useQueryClient();

    return useCallback(
        (authorId: string, eventId: string, data: CachedEvent) => {
            // Update all variants of the event query
            const queryKey = queryKeys.events.detail(authorId, eventId, {});

            queryClient.setQueryData(queryKey, data);

            // Also set without options for simpler lookups
            queryClient.setQueryData(
                ["nexus", "event", authorId, eventId],
                data
            );
        },
        [queryClient]
    );
}
