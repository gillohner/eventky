/**
 * React Query hooks for event operations with optimistic caching
 *
 * Production-grade features:
 * - Optimistic updates: Instant UI after create/edit
 * - Smart cache merging: Local data + Nexus data
 * - Version-aware: Uses sequence/last_modified for freshness
 * - Background sync: Polls Nexus until indexed
 * - Stale-while-revalidate: Shows cached data while fetching
 *
 * Architecture:
 * 1. Check optimistic cache for local writes
 * 2. Merge with TanStack Query cache (Nexus data)
 * 3. Return best available data immediately
 * 4. Background: Continue polling Nexus for updates
 */

import { useQuery, useQueryClient, UseQueryOptions } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";
import {
    fetchEventFromNexus,
    fetchEventsStream,
    type NexusEventResponse,
    type NexusEventStreamResponse,
} from "@/lib/nexus";
import {
    useOptimisticCache,
    mergeEventData,
    compareEventVersions,
    type SyncStatus,
} from "@/stores/optimistic-cache-store";
import {
    queryKeys,
    decideEventDataSource,
    SYNC_CONFIG,
    calculateSyncDelay,
    isNotFoundError,
} from "@/lib/cache";

/**
 * Options for useEvent hook
 */
export interface UseEventOptions {
    viewerId?: string;
    limitTags?: number;
    limitTaggers?: number;
    limitAttendees?: number;
    /**
     * Enable optimistic caching (default: true)
     * When true, local writes are shown immediately before Nexus indexes
     */
    enableOptimistic?: boolean;
    /**
     * Enable background sync polling (default: true)
     * When true, polls Nexus until local data is confirmed indexed
     */
    enableBackgroundSync?: boolean;
    queryOptions?: Omit<
        UseQueryOptions<NexusEventResponse | null, Error>,
        "queryKey" | "queryFn"
    >;
}

/**
 * Extended return type with sync status
 */
export interface UseEventResult {
    data: NexusEventResponse | null | undefined;
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

/**
 * Hook to fetch a single event with optimistic caching
 *
 * This hook provides instant UI updates after create/edit operations
 * by merging local cache data with Nexus API responses.
 *
 * @example
 * ```tsx
 * const { data, isLoading, syncStatus, isOptimistic } = useEvent(authorId, eventId);
 *
 * // Show sync indicator when data is optimistic
 * {isOptimistic && <SyncingBadge status={syncStatus} />}
 * ```
 */
export function useEvent(
    authorId: string,
    eventId: string,
    options?: UseEventOptions
): UseEventResult {
    const queryClient = useQueryClient();
    const enableOptimistic = options?.enableOptimistic ?? true;
    const enableBackgroundSync = options?.enableBackgroundSync ?? true;

    // Access optimistic cache store
    const getEvent = useOptimisticCache((state) => state.getEvent);
    const setEvent = useOptimisticCache((state) => state.setEvent);
    const markEventSynced = useOptimisticCache((state) => state.markEventSynced);
    const markEventSyncAttempt = useOptimisticCache((state) => state.markEventSyncAttempt);
    const getSyncStatus = useOptimisticCache((state) => state.getSyncStatus);

    // Get local cached data
    const localCached = enableOptimistic ? getEvent(authorId, eventId) : undefined;
    const localSynced = localCached?.meta.synced ?? true;

    // Build query key using factory
    const queryKey = queryKeys.events.detail(authorId, eventId, {
        viewerId: options?.viewerId,
        limitTags: options?.limitTags,
        limitTaggers: options?.limitTaggers,
        limitAttendees: options?.limitAttendees,
    });

    // TanStack Query for Nexus data
    const query = useQuery({
        queryKey,
        queryFn: async () => {
            const nexusData = await fetchEventFromNexus(
                authorId,
                eventId,
                options?.viewerId,
                options?.limitTags,
                options?.limitTaggers,
                options?.limitAttendees
            );

            // If we got data from Nexus, update optimistic cache
            if (nexusData && enableOptimistic) {
                const localData = getEvent(authorId, eventId);

                if (localData && !localData.meta.synced) {
                    // Check if Nexus has caught up with our local version
                    const comparison = compareEventVersions(localData.data, nexusData);

                    if (comparison <= 0) {
                        // Nexus has same or newer version - mark as synced
                        markEventSynced(authorId, eventId);
                    } else {
                        // Local is still newer - mark sync attempt
                        markEventSyncAttempt(authorId, eventId);
                    }
                }

                // Store Nexus data in cache
                setEvent(authorId, eventId, nexusData, "nexus");
            }

            return nexusData;
        },
        // Shorter stale time when we have unsynced local data
        staleTime: localSynced
            ? 2 * 60 * 1000 // 2 minutes for synced data
            : SYNC_CONFIG.OPTIMISTIC_STALE_TIME, // 30 seconds for unsynced
        gcTime: 10 * 60 * 1000, // 10 minutes cache time
        retry: (failureCount, error) => {
            // Don't retry 404s - event doesn't exist in Nexus yet
            if (isNotFoundError(error)) {
                return false;
            }
            return failureCount < 2;
        },
        // Return local cache as placeholder while fetching
        placeholderData: localCached?.data,
        ...options?.queryOptions,
    });

    // Background sync polling for unsynced local data
    const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const syncAttemptRef = useRef(0);

    useEffect(() => {
        if (!enableBackgroundSync || !localCached || localCached.meta.synced) {
            // Clear any existing interval
            if (syncIntervalRef.current) {
                clearInterval(syncIntervalRef.current);
                syncIntervalRef.current = null;
            }
            syncAttemptRef.current = 0;
            return;
        }

        // Start background polling
        const pollNexus = async () => {
            syncAttemptRef.current++;

            if (syncAttemptRef.current > SYNC_CONFIG.MAX_SYNC_ATTEMPTS) {
                // Give up after max attempts
                if (syncIntervalRef.current) {
                    clearInterval(syncIntervalRef.current);
                    syncIntervalRef.current = null;
                }
                return;
            }

            // Invalidate query to trigger refetch
            await queryClient.invalidateQueries({ queryKey });
        };

        // Start polling with exponential backoff
        const startPolling = () => {
            const delay = calculateSyncDelay(syncAttemptRef.current);
            syncIntervalRef.current = setTimeout(() => {
                pollNexus();
                // Continue polling if not synced
                if (!localCached.meta.synced) {
                    startPolling();
                }
            }, delay);
        };

        // Initial delay before first poll
        setTimeout(startPolling, SYNC_CONFIG.INITIAL_SYNC_DELAY);

        return () => {
            if (syncIntervalRef.current) {
                clearTimeout(syncIntervalRef.current);
                syncIntervalRef.current = null;
            }
        };
    }, [
        enableBackgroundSync,
        localCached?.meta.synced,
        localCached,
        queryClient,
        queryKey,
    ]);

    // Merge local and Nexus data
    const mergedData = enableOptimistic
        ? mergeEventData(localCached, query.data ?? undefined)
        : query.data;

    // Determine data source
    const decision = decideEventDataSource(
        localCached?.data,
        query.data ?? undefined,
        localSynced
    );

    // Force refetch function
    const refetch = useCallback(async () => {
        await queryClient.invalidateQueries({ queryKey });
    }, [queryClient, queryKey]);

    return {
        data: mergedData ?? null,
        isLoading: query.isLoading && !localCached,
        isFetching: query.isFetching,
        error: query.error,
        syncStatus: getSyncStatus(authorId, eventId, "event"),
        isOptimistic: decision.source === "local" || decision.source === "merged",
        refetch,
    };
}

/**
 * Options for useEventsStream hook
 */
export interface UseEventsStreamOptions {
    limit?: number;
    skip?: number;
    calendar?: string;
    status?: string;
    start_date?: number;
    end_date?: number;
}

/**
 * Hook to fetch events stream from Nexus
 *
 * Features:
 * - Paginated results support
 * - Calendar, status, and date range filtering
 * - Automatic refetching on window focus
 *
 * @param params - Stream parameters (limit, skip, calendar, status, dates)
 */
export function useEventsStream(
    params?: UseEventsStreamOptions,
    options?: Omit<
        UseQueryOptions<NexusEventStreamResponse[], Error>,
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

/**
 * Hook to prefetch an event
 *
 * Use this to prefetch events on hover or when they're likely to be viewed
 */
export function usePrefetchEvent() {
    const queryClient = useQueryClient();

    return useCallback(
        (authorId: string, eventId: string, options?: UseEventOptions) => {
            const queryKey = queryKeys.events.detail(authorId, eventId, {
                viewerId: options?.viewerId,
                limitTags: options?.limitTags,
                limitTaggers: options?.limitTaggers,
                limitAttendees: options?.limitAttendees,
            });

            queryClient.prefetchQuery({
                queryKey,
                queryFn: () =>
                    fetchEventFromNexus(
                        authorId,
                        eventId,
                        options?.viewerId,
                        options?.limitTags,
                        options?.limitTaggers,
                        options?.limitAttendees
                    ),
                staleTime: 2 * 60 * 1000,
            });
        },
        [queryClient]
    );
}

/**
 * Hook to invalidate event queries
 *
 * Use after mutations to ensure fresh data
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
