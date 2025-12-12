/**
 * Calendar Hooks with Optimistic Caching
 *
 * TanStack Query-based hooks for calendar operations with:
 * - Optimistic updates: Instant UI after create/edit
 * - Smart merging: Local data + Nexus data with version comparison
 * - Background sync: Polls Nexus until changes are indexed
 * - localStorage persistence: Survives page refresh
 */

import { useQuery, useQueryClient, UseQueryOptions } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";
import { fetchCalendarFromNexus, fetchCalendarsStream } from "@/lib/nexus";
import {
    queryKeys,
    mergeCalendarData,
    getSyncStatusFromMeta,
    calculateSyncDelay,
    isNotFoundError,
    SYNC_CONFIG,
    decideDataSource,
    getPendingCalendar,
} from "@/lib/cache";
import type {
    CachedCalendar,
    SyncStatus,
    NexusCalendarStreamItem,
} from "@/types/nexus";

// =============================================================================
// Types
// =============================================================================

export interface UseCalendarOptions {
    limitTags?: number;
    limitTaggers?: number;
    /** Enable background sync polling (default: true) */
    enableBackgroundSync?: boolean;
    queryOptions?: Omit<
        UseQueryOptions<CachedCalendar | null, Error>,
        "queryKey" | "queryFn"
    >;
}

export interface UseCalendarResult {
    data: CachedCalendar | null | undefined;
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
// useCalendar Hook
// =============================================================================

/**
 * Fetch a single calendar with optimistic caching
 *
 * @example
 * ```tsx
 * const { data, syncStatus, isOptimistic } = useCalendar(authorId, calendarId);
 *
 * {isOptimistic && <SyncBadge status={syncStatus} />}
 * ```
 */
export function useCalendar(
    authorId: string,
    calendarId: string,
    options?: UseCalendarOptions
): UseCalendarResult {
    const queryClient = useQueryClient();
    const enableBackgroundSync = options?.enableBackgroundSync ?? true;

    // Build query key
    const queryKey = queryKeys.calendars.detail(authorId, calendarId, {
        limitTags: options?.limitTags,
        limitTaggers: options?.limitTaggers,
    });

    // Get existing cached data for comparison
    const existingData = queryClient.getQueryData<CachedCalendar>(queryKey);

    // Main query
    const query = useQuery({
        queryKey,
        queryFn: async (): Promise<CachedCalendar | null> => {
            // Fetch from Nexus
            const nexusData = await fetchCalendarFromNexus(
                authorId,
                calendarId,
                options?.limitTags,
                options?.limitTaggers
            );

            // Get current cached data
            const currentCached = queryClient.getQueryData<CachedCalendar>(queryKey);

            // Merge with pending writes and existing cache
            return mergeCalendarData(currentCached ?? undefined, nexusData, authorId, calendarId);
        },
        // Shorter stale time when we have unsynced local data
        staleTime: existingData?._syncMeta?.source === "local" && !existingData._syncMeta.syncedAt
            ? SYNC_CONFIG.OPTIMISTIC_STALE_TIME
            : SYNC_CONFIG.NORMAL_STALE_TIME,
        gcTime: SYNC_CONFIG.GC_TIME,
        retry: (failureCount, error) => {
            // Don't retry 404s
            if (isNotFoundError(error)) {
                return false;
            }
            return failureCount < 2;
        },
        ...options?.queryOptions,
    });

    // Background sync polling
    const syncIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const syncAttemptRef = useRef(0);

    // Extract sync state to stable values for useEffect dependency
    const syncSource = query.data?._syncMeta?.source;
    const syncedAt = query.data?._syncMeta?.syncedAt;
    const needsSync = syncSource === "local" && !syncedAt;

    useEffect(() => {
        if (!enableBackgroundSync || !needsSync) {
            if (syncIntervalRef.current) {
                clearTimeout(syncIntervalRef.current);
                syncIntervalRef.current = null;
            }
            syncAttemptRef.current = 0;
            return;
        }

        // Check if we have a pending write
        const pendingWrite = getPendingCalendar(authorId, calendarId);
        if (!pendingWrite) {
            return;
        }

        const pollNexus = async () => {
            syncAttemptRef.current++;

            if (syncAttemptRef.current > SYNC_CONFIG.MAX_SYNC_ATTEMPTS) {
                if (syncIntervalRef.current) {
                    clearTimeout(syncIntervalRef.current);
                    syncIntervalRef.current = null;
                }
                return;
            }

            await queryClient.invalidateQueries({ queryKey });
        };

        const scheduleNextPoll = () => {
            const delay = calculateSyncDelay(syncAttemptRef.current);
            syncIntervalRef.current = setTimeout(() => {
                pollNexus().then(() => {
                    const currentData = queryClient.getQueryData<CachedCalendar>(queryKey);
                    const stillNeedsSync = currentData?._syncMeta?.source === "local" && !currentData._syncMeta.syncedAt;
                    if (stillNeedsSync) {
                        scheduleNextPoll();
                    }
                });
            }, delay);
        };

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
        calendarId,
        queryClient,
        queryKey,
    ]);

    // Determine sync status and data source
    const decision = decideDataSource(query.data);
    const syncStatus = getSyncStatusFromMeta(query.data?._syncMeta);

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
// useCalendarsStream Hook
// =============================================================================

export interface UseCalendarsStreamOptions {
    limit?: number;
    skip?: number;
    owner?: string;
    admin?: string;
}

/**
 * Fetch calendars stream from Nexus
 */
export function useCalendarsStream(
    params?: UseCalendarsStreamOptions,
    options?: Omit<
        UseQueryOptions<NexusCalendarStreamItem[], Error>,
        "queryKey" | "queryFn"
    >
) {
    const queryKey = queryKeys.calendars.stream(params as Record<string, unknown> | undefined);

    return useQuery({
        queryKey,
        queryFn: () => fetchCalendarsStream(params),
        staleTime: 1 * 60 * 1000,
        gcTime: 5 * 60 * 1000,
        retry: 2,
        ...options,
    });
}

// =============================================================================
// Utility Hooks
// =============================================================================

/**
 * Prefetch a calendar
 */
export function usePrefetchCalendar() {
    const queryClient = useQueryClient();

    return useCallback(
        (authorId: string, calendarId: string, options?: UseCalendarOptions) => {
            const queryKey = queryKeys.calendars.detail(authorId, calendarId, {
                limitTags: options?.limitTags,
                limitTaggers: options?.limitTaggers,
            });

            queryClient.prefetchQuery({
                queryKey,
                queryFn: async () => {
                    const nexusData = await fetchCalendarFromNexus(
                        authorId,
                        calendarId,
                        options?.limitTags,
                        options?.limitTaggers
                    );
                    return mergeCalendarData(undefined, nexusData, authorId, calendarId);
                },
                staleTime: SYNC_CONFIG.NORMAL_STALE_TIME,
            });
        },
        [queryClient]
    );
}

/**
 * Invalidate calendar queries
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

/**
 * Set optimistic calendar data directly in cache
 */
export function useSetCalendarCache() {
    const queryClient = useQueryClient();

    return useCallback(
        (authorId: string, calendarId: string, data: CachedCalendar) => {
            const queryKey = queryKeys.calendars.detail(authorId, calendarId, {});
            queryClient.setQueryData(queryKey, data);
            queryClient.setQueryData(
                ["nexus", "calendar", authorId, calendarId],
                data
            );
        },
        [queryClient]
    );
}
