import { Pubky, Address } from "@synonymdev/pubky";
import { PubkyAppEvent, eventUriBuilder } from "pubky-app-specs";

/**
 * Fetch an event from Pubky homeserver
 */
export async function getEvent(
  authorId: string,
  eventId: string
): Promise<PubkyAppEvent | null> {
  try {
    const pubky = new Pubky();
    const url = eventUriBuilder(authorId, eventId);
    const data = await pubky.publicStorage.getJson(url as Address);

    if (!data || typeof data !== "object") {
      return null;
    }

    // Convert to PubkyAppEvent class to validate and sanitize
    return PubkyAppEvent.fromJson(data);
  } catch (error) {
    console.error("Error fetching event:", error);
    return null;
  }
}

/**
 * Fetch attendees for an event (placeholder for future implementation)
 */
export async function getAttendees(
  authorId: string,
  eventId: string
): Promise<unknown[]> {
  // TODO: Implement when attendee fetching is needed
  console.log("getAttendees not yet implemented", { authorId, eventId });
  return [];
}

/**
 * Create or update RSVP status (placeholder for future implementation)
 */
export async function createAttendee(
  session: unknown,
  eventUri: string,
  partstat: string
): Promise<boolean> {
  // TODO: Implement when RSVP functionality is needed
  console.log("createAttendee not yet implemented", { eventUri, partstat });
  return false;
}
