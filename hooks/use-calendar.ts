/**
 * React Query hooks for calendar operations
 * Provides unified data fetching with TanStack Query caching
 */

import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import {
    fetchCalendarFromNexus,
    fetchCalendarsStream,
    type NexusCalendarResponse,
    type NexusCalendarStreamResponse,
} from "@/lib/nexus";

/**
 * Hook to fetch a single calendar from Nexus
 * 
 * Features:
 * - Automatic caching with TanStack Query
 * - Optimistic updates support (TODO: implement mutations)
 * - Configurable stale time and cache time
 * 
 * @param authorId - Author's Pubky ID
 * @param calendarId - Calendar ID
 * @param viewerId - Optional viewer ID for relationship context
 * @param limitTags - Optional limit for tags (default: 5)
 * @param limitTaggers - Optional limit for taggers per tag (default: 3)
 */
export function useCalendar(
    authorId: string,
    calendarId: string,
    options?: {
        viewerId?: string;
        limitTags?: number;
        limitTaggers?: number;
        queryOptions?: Omit<
            UseQueryOptions<NexusCalendarResponse | null, Error>,
            "queryKey" | "queryFn"
        >;
    }
) {
    return useQuery({
        queryKey: [
            "nexus",
            "calendar",
            authorId,
            calendarId,
            options?.viewerId,
            options?.limitTags,
            options?.limitTaggers,
        ],
        queryFn: () =>
            fetchCalendarFromNexus(
                authorId,
                calendarId,
                options?.viewerId,
                options?.limitTags,
                options?.limitTaggers
            ),
        staleTime: 5 * 60 * 1000, // 5 minutes - calendars don't change often
        gcTime: 15 * 60 * 1000, // 15 minutes cache time
        retry: 2,
        ...options?.queryOptions,
    });
}

/**
 * Hook to fetch calendars stream from Nexus
 * 
 * Features:
 * - Paginated results support
 * - Admin filtering support
 * - Automatic refetching on window focus
 * 
 * @param params - Stream parameters (limit, skip, admin)
 */
export function useCalendarsStream(
    params?: {
        limit?: number;
        skip?: number;
        admin?: string;
    },
    options?: Omit<
        UseQueryOptions<NexusCalendarStreamResponse[], Error>,
        "queryKey" | "queryFn"
    >
) {
    return useQuery({
        queryKey: ["nexus", "calendars", "stream", params],
        queryFn: () => fetchCalendarsStream(params),
        staleTime: 2 * 60 * 1000, // 2 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes cache time
        retry: 2,
        ...options,
    });
}
