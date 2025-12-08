/**
 * React Query hooks for calendar operations with optimistic caching
 *
 * Production-grade features:
 * - Optimistic updates: Instant UI after create/edit
 * - Smart cache merging: Local data + Nexus data
 * - Background sync: Polls Nexus until indexed
 * - Stale-while-revalidate: Shows cached data while fetching
 */

import { useQuery, useQueryClient, UseQueryOptions } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";
import {
    fetchCalendarFromNexus,
    fetchCalendarsStream,
    type NexusCalendarResponse,
    type NexusCalendarStreamResponse,
} from "@/lib/nexus";
import {
    useOptimisticCache,
    mergeCalendarData,
    compareCalendarVersions,
    type SyncStatus,
} from "@/stores/optimistic-cache-store";
import {
    queryKeys,
    SYNC_CONFIG,
    calculateSyncDelay,
    isNotFoundError,
} from "@/lib/cache";

/**
 * Options for useCalendar hook
 */
export interface UseCalendarOptions {
    viewerId?: string;
    limitTags?: number;
    limitTaggers?: number;
    /**
     * Enable optimistic caching (default: true)
     */
    enableOptimistic?: boolean;
    /**
     * Enable background sync polling (default: true)
     */
    enableBackgroundSync?: boolean;
    queryOptions?: Omit<
        UseQueryOptions<NexusCalendarResponse | null, Error>,
        "queryKey" | "queryFn"
    >;
}

/**
 * Extended return type with sync status
 */
export interface UseCalendarResult {
    data: NexusCalendarResponse | null | undefined;
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
 * Hook to fetch a single calendar with optimistic caching
 *
 * @example
 * ```tsx
 * const { data, isLoading, syncStatus, isOptimistic } = useCalendar(authorId, calendarId);
 *
 * // Show sync indicator when data is optimistic
 * {isOptimistic && <SyncingBadge status={syncStatus} />}
 * ```
 */
export function useCalendar(
    authorId: string,
    calendarId: string,
    options?: UseCalendarOptions
): UseCalendarResult {
    const queryClient = useQueryClient();
    const enableOptimistic = options?.enableOptimistic ?? true;
    const enableBackgroundSync = options?.enableBackgroundSync ?? true;

    // Access optimistic cache store
    const getCalendar = useOptimisticCache((state) => state.getCalendar);
    const setCalendar = useOptimisticCache((state) => state.setCalendar);
    const markCalendarSynced = useOptimisticCache((state) => state.markCalendarSynced);
    const markCalendarSyncAttempt = useOptimisticCache((state) => state.markCalendarSyncAttempt);
    const getSyncStatus = useOptimisticCache((state) => state.getSyncStatus);

    // Get local cached data
    const localCached = enableOptimistic ? getCalendar(authorId, calendarId) : undefined;
    const localSynced = localCached?.meta.synced ?? true;

    // Build query key using factory
    const queryKey = queryKeys.calendars.detail(authorId, calendarId, {
        viewerId: options?.viewerId,
        limitTags: options?.limitTags,
        limitTaggers: options?.limitTaggers,
    });

    // TanStack Query for Nexus data
    const query = useQuery({
        queryKey,
        queryFn: async () => {
            const nexusData = await fetchCalendarFromNexus(
                authorId,
                calendarId,
                options?.viewerId,
                options?.limitTags,
                options?.limitTaggers
            );

            // If we got data from Nexus, update optimistic cache
            if (nexusData && enableOptimistic) {
                const localData = getCalendar(authorId, calendarId);

                if (localData && !localData.meta.synced) {
                    // Check if Nexus has caught up with our local version
                    const comparison = compareCalendarVersions(localData.data, nexusData);

                    if (comparison <= 0) {
                        // Nexus has same or newer version - mark as synced
                        markCalendarSynced(authorId, calendarId);
                    } else {
                        // Local is still newer - mark sync attempt (keep polling)
                        markCalendarSyncAttempt(authorId, calendarId);
                    }
                }

                // Only store Nexus data if it's not older than local
                // This prevents reverting to stale data during sync
                const localData2 = getCalendar(authorId, calendarId);
                if (!localData2 || compareCalendarVersions(localData2.data, nexusData) <= 0) {
                    setCalendar(authorId, calendarId, nexusData, "nexus");
                }
            }

            return nexusData;
        },
        // Shorter stale time when we have unsynced local data
        staleTime: localSynced
            ? 5 * 60 * 1000 // 5 minutes for synced data
            : SYNC_CONFIG.OPTIMISTIC_STALE_TIME, // 30 seconds for unsynced
        gcTime: 15 * 60 * 1000, // 15 minutes cache time
        retry: (failureCount, error) => {
            if (isNotFoundError(error)) {
                return false;
            }
            return failureCount < 2;
        },
        placeholderData: localCached?.data,
        ...options?.queryOptions,
    });

    // Background sync polling for unsynced local data
    const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const syncAttemptRef = useRef(0);

    useEffect(() => {
        if (!enableBackgroundSync || !localCached || localCached.meta.synced) {
            if (syncIntervalRef.current) {
                clearInterval(syncIntervalRef.current);
                syncIntervalRef.current = null;
            }
            syncAttemptRef.current = 0;
            return;
        }

        const pollNexus = async () => {
            syncAttemptRef.current++;

            if (syncAttemptRef.current > SYNC_CONFIG.MAX_SYNC_ATTEMPTS) {
                if (syncIntervalRef.current) {
                    clearInterval(syncIntervalRef.current);
                    syncIntervalRef.current = null;
                }
                return;
            }

            await queryClient.invalidateQueries({ queryKey });
        };

        const startPolling = () => {
            const delay = calculateSyncDelay(syncAttemptRef.current);
            syncIntervalRef.current = setTimeout(() => {
                pollNexus();
                if (!localCached.meta.synced) {
                    startPolling();
                }
            }, delay);
        };

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
        ? mergeCalendarData(localCached, query.data ?? undefined)
        : query.data;

    // Determine if data is optimistic (from local cache, not yet confirmed synced)
    const isOptimistic = localCached !== undefined && !localCached.meta.synced;

    // Force refetch function
    const refetch = useCallback(async () => {
        await queryClient.invalidateQueries({ queryKey });
    }, [queryClient, queryKey]);

    return {
        data: mergedData ?? null,
        isLoading: query.isLoading && !localCached,
        isFetching: query.isFetching,
        error: query.error,
        syncStatus: getSyncStatus(authorId, calendarId, "calendar"),
        isOptimistic,
        refetch,
    };
}

/**
 * Options for useCalendarsStream hook
 */
export interface UseCalendarsStreamOptions {
    limit?: number;
    skip?: number;
    admin?: string;
}

/**
 * Hook to fetch calendars stream from Nexus
 */
export function useCalendarsStream(
    params?: UseCalendarsStreamOptions,
    options?: Omit<
        UseQueryOptions<NexusCalendarStreamResponse[], Error>,
        "queryKey" | "queryFn"
    >
) {
    const queryKey = queryKeys.calendars.stream(params as Record<string, unknown> | undefined);

    return useQuery({
        queryKey,
        queryFn: () => fetchCalendarsStream(params),
        staleTime: 2 * 60 * 1000, // 2 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes cache time
        retry: 2,
        ...options,
    });
}

/**
 * Hook to prefetch a calendar
 */
export function usePrefetchCalendar() {
    const queryClient = useQueryClient();

    return useCallback(
        (authorId: string, calendarId: string, options?: UseCalendarOptions) => {
            const queryKey = queryKeys.calendars.detail(authorId, calendarId, {
                viewerId: options?.viewerId,
                limitTags: options?.limitTags,
                limitTaggers: options?.limitTaggers,
            });

            queryClient.prefetchQuery({
                queryKey,
                queryFn: () =>
                    fetchCalendarFromNexus(
                        authorId,
                        calendarId,
                        options?.viewerId,
                        options?.limitTags,
                        options?.limitTaggers
                    ),
                staleTime: 5 * 60 * 1000,
            });
        },
        [queryClient]
    );
}

/**
 * Hook to invalidate calendar queries
 */
export function useInvalidateCalendars() {
    const queryClient = useQueryClient();

    return useCallback(
        async (authorId?: string, calendarId?: string) => {
            if (authorId && calendarId) {
                await queryClient.invalidateQueries({
                    queryKey: ["nexus", "calendar", authorId, calendarId],
                });
            }
            await queryClient.invalidateQueries({
                queryKey: queryKeys.calendars.all,
            });
        },
        [queryClient]
    );
}
