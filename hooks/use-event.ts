/**
 * React Query hooks for event operations
 * Provides unified data fetching with TanStack Query caching
 */

import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import {
  fetchEventFromNexus,
  fetchEventsStream,
  type NexusEventResponse,
  type NexusEventStreamResponse,
} from "@/lib/nexus";

/**
 * Hook to fetch a single event from Nexus
 * 
 * Features:
 * - Automatic caching with TanStack Query
 * - Includes tags and attendees
 * - Optimistic updates support (TODO: implement mutations)
 * - Configurable stale time and cache time
 * 
 * @param authorId - Author's Pubky ID
 * @param eventId - Event ID
 * @param viewerId - Optional viewer ID for relationship context
 * @param limitTags - Optional limit for tags (default: 5)
 * @param limitTaggers - Optional limit for taggers per tag (default: 3)
 * @param limitAttendees - Optional limit for attendees (default: 100)
 */
export function useEvent(
  authorId: string,
  eventId: string,
  options?: {
    viewerId?: string;
    limitTags?: number;
    limitTaggers?: number;
    limitAttendees?: number;
    queryOptions?: Omit<
      UseQueryOptions<NexusEventResponse | null, Error>,
      "queryKey" | "queryFn"
    >;
  }
) {
  return useQuery({
    queryKey: [
      "nexus",
      "event",
      authorId,
      eventId,
      options?.viewerId,
      options?.limitTags,
      options?.limitTaggers,
      options?.limitAttendees,
    ],
    queryFn: () =>
      fetchEventFromNexus(
        authorId,
        eventId,
        options?.viewerId,
        options?.limitTags,
        options?.limitTaggers,
        options?.limitAttendees
      ),
    staleTime: 2 * 60 * 1000, // 2 minutes - events are indexed quickly
    gcTime: 10 * 60 * 1000, // 10 minutes cache time
    retry: 2,
    ...options?.queryOptions,
  });
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
  params?: {
    limit?: number;
    skip?: number;
    calendar?: string;
    status?: string;
    start_date?: number;
    end_date?: number;
  },
  options?: Omit<
    UseQueryOptions<NexusEventStreamResponse[], Error>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: ["nexus", "events", "stream", params],
    queryFn: () => fetchEventsStream(params),
    staleTime: 1 * 60 * 1000, // 1 minute - stream updates frequently
    gcTime: 5 * 60 * 1000, // 5 minutes cache time
    retry: 2,
    ...options,
  });
}
