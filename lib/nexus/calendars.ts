/**
 * Nexus API - Calendar operations
 * Functions for fetching calendar data from the Pubky Nexus API
 */

import { nexusClient, getErrorMessage, isAxiosError } from "./client";

/**
 * Response structure from Nexus API for a single calendar
 * Matches CalendarView from pubky-nexus
 */
export interface NexusCalendarResponse {
    details: {
        id: string;
        uri: string;
        author: string;
        indexed_at: number;
        name: string;
        timezone: string;
        color?: string;
        description?: string;
        url?: string;
        image_uri?: string;
        x_pubky_admins?: string[];
        created?: number;
        sequence?: number;        // Versioning: incremented on each edit
        last_modified?: number;   // Versioning: timestamp of last modification
    };
    tags: Array<{
        label: string;
        taggers: string[];
        taggers_count: number;
        relationship: boolean;
    }>;
}

/**
 * Response structure from Nexus API for calendar stream
 */
export interface NexusCalendarStreamResponse {
    id: string;
    uri: string;
    author: string;
    indexed_at: number;
    name: string;
    timezone: string;
    color?: string;
    description?: string;
    url?: string;
    image_uri?: string;
    x_pubky_admins?: string[];
    created?: number;
    sequence?: number;        // Versioning: incremented on each edit
    last_modified?: number;   // Versioning: timestamp of last modification
}

/**
 * Fetch a single calendar from Nexus API by author and calendar ID
 */
export async function fetchCalendarFromNexus(
    authorId: string,
    calendarId: string,
    viewerId?: string,
    limitTags?: number,
    limitTaggers?: number
): Promise<NexusCalendarResponse | null> {
    try {
        const params = new URLSearchParams();
        if (viewerId) params.append("viewer_id", viewerId);
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
