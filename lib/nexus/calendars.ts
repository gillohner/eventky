/**
 * Nexus API - Calendar operations
 * Functions for fetching calendar data from the Pubky Nexus API
 */

import { nexusClient, getErrorMessage, isAxiosError } from "./client";
import type {
    NexusCalendarResponse,
    NexusCalendarStreamItem,
} from "@/types/nexus";

// Re-export types for convenience
export type { NexusCalendarResponse, NexusCalendarStreamItem };

/**
 * Fetch a single calendar from Nexus API by author and calendar ID
 */
export async function fetchCalendarFromNexus(
    authorId: string,
    calendarId: string,
    limitTags?: number,
    limitTaggers?: number
): Promise<NexusCalendarResponse | null> {
    try {
        const params = new URLSearchParams();
        if (limitTags) params.append("limit_tags", limitTags.toString());
        if (limitTaggers) params.append("limit_taggers", limitTaggers.toString());

        const url = `/v0/calendar/${authorId}/${calendarId}${params.toString() ? `?${params.toString()}` : ""
            }`;

        const response = await nexusClient.get<NexusCalendarResponse>(url);
        return response.data || null;
    } catch (error) {
        // Return null for 404 errors - calendar may not be indexed yet
        // The optimistic cache will handle showing local data while waiting
        if (isAxiosError(error) && error.response?.status === 404) {
            return null;
        }
        // Log and throw for other errors
        console.error("Error fetching calendar from Nexus:", {
            authorId,
            calendarId,
            error: getErrorMessage(error),
        });
        throw new Error(`Failed to fetch calendar: ${getErrorMessage(error)}`);
    }
}

/**
 * Fetch calendars stream from Nexus API
 */
export async function fetchCalendarsStream(params?: {
    limit?: number;
    skip?: number;
    admin?: string;
}): Promise<NexusCalendarStreamResponse[]> {
    try {
        const response = await nexusClient.get<NexusCalendarStreamResponse[]>(
            "/v0/stream/calendars",
            { params }
        );
        return response.data;
    } catch (error) {
        console.error("Error fetching calendars stream from Nexus:", {
            params,
            error: getErrorMessage(error),
        });
        throw new Error(`Failed to fetch calendars stream: ${getErrorMessage(error)}`);
    }
}

/**
 * Fetch multiple calendar views with tags in parallel
 * Useful for getting tag information for calendars in a stream
 */
export async function fetchCalendarViewsBatch(
    calendars: Array<{ author: string; id: string }>,
    limitTags?: number,
    limitTaggers?: number
): Promise<Map<string, NexusCalendarResponse>> {
    try {
        // Fetch all calendars in parallel
        const promises = calendars.map(({ author, id }) =>
            fetchCalendarFromNexus(author, id, limitTags, limitTaggers)
                .then(data => ({ key: `${author}/${id}`, data }))
                .catch(error => {
                    console.warn(`Failed to fetch calendar ${author}/${id}:`, error);
                    return { key: `${author}/${id}`, data: null };
                })
        );

        const results = await Promise.all(promises);

        // Convert to map, filtering out nulls
        const map = new Map<string, NexusCalendarResponse>();
        results.forEach(({ key, data }) => {
            if (data) {
                map.set(key, data);
            }
        });

        return map;
    } catch (error) {
        console.error("Error batch fetching calendar views:", error);
        throw new Error(`Failed to batch fetch calendars: ${getErrorMessage(error)}`);
    }
}
