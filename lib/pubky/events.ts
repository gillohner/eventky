import { Pubky, Address, Session } from "@synonymdev/pubky";
import { PubkyAppEvent, eventUriBuilder } from "@eventky/pubky-app-specs";
import { config } from "@/lib/config";
import { isNotFoundError } from "./session-utils";

/**
 * Fetch an event from Pubky homeserver
 */
export async function getEvent(
  authorId: string,
  eventId: string
): Promise<PubkyAppEvent | null> {
  try {
    const pubky = config.env === "testnet" ? Pubky.testnet() : new Pubky();
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
 * Delete an event from Pubky Homeserver
 * Requires an authenticated Session
 * Returns true if deleted or already doesn't exist (graceful handling)
 */
export async function deleteEvent(
  session: Session,
  eventId: string,
  userId: string
): Promise<boolean> {
  if (!session || !session.storage) {
    throw new Error("Invalid session: No storage available. Please sign in again.");
  }

  const eventUri = eventUriBuilder(userId, eventId);
  const eventPath = eventUri.replace(`pubky://${userId}`, "") as `/pub/${string}`;

  try {
    // Delete from Pubky storage using session
    await session.storage.delete(eventPath);
    return true;
  } catch (error) {
    // If file doesn't exist, consider delete successful (idempotent)
    if (isNotFoundError(error)) {
      console.log("Event already deleted or doesn't exist:", eventId);
      return true;
    }
    console.error("Error deleting event:", error);
    throw error;
  }
}

/**
 * Create or update an event on Pubky Homeserver
 * Requires an authenticated Session
 */
export async function saveEvent(
  session: Session,
  event: PubkyAppEvent,
  eventId: string,
  userId: string
): Promise<boolean> {
  try {
    if (!session || !session.storage) {
      throw new Error("Invalid session: No storage available. Please sign in again.");
    }

    // Use eventUriBuilder to construct the full URI, then extract the path
    const eventUri = eventUriBuilder(userId, eventId);
    // Convert pubky://userId/path to /path
    const eventPath = eventUri.replace(`pubky://${userId}`, "") as `/pub/${string}`;

    // Convert event to JSON for storage
    const eventJson = event.toJson();

    console.log("Saving event:", {
      eventId,
      userId,
      eventPath,
    });

    // Save to Pubky storage using session
    await session.storage.putJson(eventPath, eventJson);

    console.log("Event saved successfully");

    return true;
  } catch (error) {
    console.error("Error saving event:", error);
    throw error;
  }
}
