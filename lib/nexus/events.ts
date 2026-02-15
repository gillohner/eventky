/**
 * Nexus API - Event operations
 * Functions for fetching event data from the Pubky Nexus API
 */

import { nexusClient, getErrorMessage, isAxiosError } from "./client";
import type {
  NexusEventResponse,
  NexusEventStreamItem,
} from "@/types/nexus";

// Re-export types for convenience
export type { NexusEventResponse, NexusEventStreamItem };

/**
 * Fetch a single event from Nexus API by author and event ID
 */
export async function fetchEventFromNexus(
  authorId: string,
  eventId: string,
  limitTags?: number,
  limitTaggers?: number,
  limitAttendees?: number
): Promise<NexusEventResponse | null> {
  try {
    const params = new URLSearchParams();
    if (limitTags) params.append("limit_tags", limitTags.toString());
    if (limitTaggers) params.append("limit_taggers", limitTaggers.toString());
    if (limitAttendees) params.append("limit_attendees", limitAttendees.toString());

    const url = `/v0/event/${authorId}/${eventId}${params.toString() ? `?${params.toString()}` : ""
      }`;

    const response = await nexusClient.get<NexusEventResponse>(url);
    return response.data || null;
  } catch (error) {
    // Return null for 404 errors - event may not be indexed yet
    // The optimistic cache will handle showing local data while waiting
    if (isAxiosError(error) && error.response?.status === 404) {
      return null;
    }
    // Log and throw for other errors
    console.error("Error fetching event from Nexus:", {
      authorId,
      eventId,
      error: getErrorMessage(error),
    });
    throw new Error(`Failed to fetch event: ${getErrorMessage(error)}`);
  }
}

/**
 * Fetch events stream from Nexus API
 */
export async function fetchEventsStream(params?: {
  limit?: number;
  skip?: number;
  status?: string;
  start_date?: number;
  end_date?: number;
  authors?: string[];
  tags?: string[];
}): Promise<NexusEventStreamItem[]> {
  try {
    // Convert arrays to comma-separated strings for API
    const apiParams: Record<string, unknown> = { ...params };
    if (params?.tags && params.tags.length > 0) {
      apiParams.tags = params.tags.join(',');
    } else {
      delete apiParams.tags;
    }
    if (params?.authors && params.authors.length > 0) {
      apiParams.authors = params.authors.join(',');
    } else {
      delete apiParams.authors;
    }

    const response = await nexusClient.get<NexusEventStreamItem[]>(
      "/v0/stream/events",
      { params: apiParams }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching events stream from Nexus:", {
      params,
      error: getErrorMessage(error),
    });
    throw new Error(`Failed to fetch events stream: ${getErrorMessage(error)}`);
  }
}
