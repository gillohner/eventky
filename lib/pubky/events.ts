import { Pubky, Address, Session } from "@synonymdev/pubky";
import { PubkyAppEvent, eventUriBuilder } from "pubky-app-specs";
import { config } from "@/lib/config";

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
 * Create or update an event on Pubky Homeserver
 */
export async function saveEvent(
  session: Session,
  event: PubkyAppEvent,
  eventId: string,
  userId: string
): Promise<boolean> {
  try {
    // Validate session
    console.log("Session object:", session);
    console.log("Session.storage:", session?.storage);
    console.log("Session.info:", session?.info);
    
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
      eventJson,
    });

    // Save to Pubky storage using session
    const result = await session.storage.putJson(eventPath, eventJson);

    console.log("Event saved successfully, result:", result);

    // Verify the save by reading it back
    try {
      const verification = await session.storage.getJson(eventPath);
      console.log("Verification read:", verification);
    } catch (verifyError) {
      console.error("Failed to verify event save:", verifyError);
    }

    return true;
  } catch (error) {
    console.error("Error saving event:", error);
    throw error;
  }
}
