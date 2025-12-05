/**
 * Nexus API - Event operations
 * Functions for fetching event data from the Pubky Nexus API
 */

import { nexusClient, getErrorMessage } from "./client";

/**
 * Response structure from Nexus API for a single event
 * Matches EventView from pubky-nexus
 */
export interface NexusEventResponse {
  details: {
    id: string;
    uri: string;
    author: string;
    indexed_at: number;
    uid: string;
    dtstamp: number;
    dtstart: string;
    summary: string;
    dtend?: string;
    duration?: string;
    dtstart_tzid?: string;
    dtend_tzid?: string;
    rrule?: string;
    rdate?: string[];
    exdate?: string[];
    description?: string;
    status?: string;
    location?: string;
    geo?: string;
    url?: string;
    sequence?: number;
    last_modified?: number;
    created?: number;
    recurrence_id?: number;
    image_uri?: string;
    styled_description?: string | { fmttype: string; value: string };
    x_pubky_calendar_uris?: string[];
    x_pubky_rsvp_access?: string;
  };
  tags: Array<{
    label: string;
    taggers: string[];
    taggers_count: number;
    relationship: boolean;
  }>;
  attendees: Array<{
    id: string;
    indexed_at: number;
    author: string;
    uri: string;
    partstat: string;
    x_pubky_event_uri: string;
    created_at: number;
    last_modified?: number;
    recurrence_id?: number;
  }>;
}

/**
 * Response structure from Nexus API for event stream
 */
export interface NexusEventStreamResponse {
  id: string;
  uri: string;
  author: string;
  indexed_at: number;
  uid: string;
  dtstamp: number;
  dtstart: string;
  summary: string;
  dtend?: string;
  duration?: string;
  dtstart_tzid?: string;
  dtend_tzid?: string;
  rrule?: string;
  rdate?: string[];
  exdate?: string[];
  description?: string;
  status?: string;
  location?: string;
  geo?: string;
  url?: string;
  sequence?: number;
  last_modified?: number;
  created?: number;
  recurrence_id?: number;
  image_uri?: string;
  styled_description?: string | { fmttype: string; value: string };
  x_pubky_calendar_uris?: string[];
  x_pubky_rsvp_access?: string;
}

/**
 * Fetch a single event from Nexus API by author and event ID
 */
export async function fetchEventFromNexus(
  authorId: string,
  eventId: string,
  viewerId?: string,
  limitTags?: number,
  limitTaggers?: number,
  limitAttendees?: number
): Promise<NexusEventResponse | null> {
  try {
    const params = new URLSearchParams();
    if (viewerId) params.append("viewer_id", viewerId);
    if (limitTags) params.append("limit_tags", limitTags.toString());
    if (limitTaggers) params.append("limit_taggers", limitTaggers.toString());
    if (limitAttendees) params.append("limit_attendees", limitAttendees.toString());

    const url = `/v0/event/${authorId}/${eventId}${params.toString() ? `?${params.toString()}` : ""
      }`;

    const response = await nexusClient.get<NexusEventResponse>(url);
    return response.data || null;
  } catch (error) {
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
  calendar?: string;
  status?: string;
  start_date?: number;
  end_date?: number;
}): Promise<NexusEventStreamResponse[]> {
  try {
    const response = await nexusClient.get<NexusEventStreamResponse[]>(
      "/v0/stream/events",
      { params }
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
