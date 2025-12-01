import { Pubky, Address, Session } from "@synonymdev/pubky";
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
 * Create or update an event on Pubky Homeserver
 */
export async function saveEvent(
  session: Session,
  event: PubkyAppEvent,
  eventId: string,
  userId: string
): Promise<boolean> {
  try {
    // Use eventUriBuilder to construct the full URI, then extract the path
    const eventUri = eventUriBuilder(userId, eventId);
    // Convert pubky://userId/path to /path
    const eventPath = eventUri.replace(`pubky://${userId}`, "") as `/pub/${string}`;

    // Convert event to JSON for storage
    const eventJson = event.toJson();

    // Save to Pubky storage using session
    await session.storage.putJson(eventPath, eventJson);

    return true;
  } catch (error) {
    console.error("Error saving event:", error);
    throw error;
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
