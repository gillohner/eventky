/**
 * Nexus API - Calendar operations
 * Functions for fetching calendar data from the Pubky Nexus API
 */

import { nexusClient, getErrorMessage, isAxiosError } from "./client";
import type {
    NexusCalendarResponse,
    NexusCalendarStreamItem,
} from "@/types/nexus";

// Re-export types for backwards compatibility
export type { NexusCalendarResponse, NexusCalendarStreamItem };
/** @deprecated Use NexusCalendarStreamItem instead */
export type NexusCalendarStreamResponse = NexusCalendarStreamItem;

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
