import { Session } from "@synonymdev/pubky";
import { PubkySpecsBuilder, eventUriBuilder } from "pubky-app-specs";

/**
 * Create a tag on an event
 * Tags are stored at /pub/pubky.app/tags/<tag_id>
 * where tag_id is derived from hash of uri:label
 */
export async function addTagToEvent(
  session: Session,
  userId: string,
  eventAuthorId: string,
  eventId: string,
  label: string
): Promise<boolean> {
  try {
    if (!session || !session.storage) {
      throw new Error("Invalid session: No storage available. Please sign in again.");
    }

    // Build the event URI that we're tagging
    const eventUri = eventUriBuilder(eventAuthorId, eventId);

    // Use PubkySpecsBuilder to create the tag with proper ID hashing
    const builder = new PubkySpecsBuilder(userId);
    const tagResult = builder.createTag(eventUri, label);

    // Get the tag path from the meta
    const tagPath = tagResult.meta.path as `/pub/${string}`;
    const tagJson = tagResult.tag.toJson();

    console.log("Creating tag:", {
      userId,
      eventUri,
      label,
      tagPath,
      tagJson,
    });

    // Save the tag to Pubky storage
    await session.storage.putJson(tagPath, tagJson);

    console.log("Tag created successfully");
    return true;
  } catch (error) {
    console.error("Error creating tag:", error);
    throw error;
  }
}

/**
 * Remove a tag from an event
 */
export async function removeTagFromEvent(
  session: Session,
  userId: string,
  eventAuthorId: string,
  eventId: string,
  label: string
): Promise<boolean> {
  try {
    if (!session || !session.storage) {
      throw new Error("Invalid session: No storage available. Please sign in again.");
    }

    // Build the event URI that we're untagging
    const eventUri = eventUriBuilder(eventAuthorId, eventId);

    // Use PubkySpecsBuilder to get the correct tag ID (same hash as creation)
    const builder = new PubkySpecsBuilder(userId);
    const tagResult = builder.createTag(eventUri, label);

    // Get the tag path from the meta
    const tagPath = tagResult.meta.path as `/pub/${string}`;

    console.log("Removing tag:", {
      userId,
      eventUri,
      label,
      tagPath,
    });

    // Delete the tag from Pubky storage
    await session.storage.delete(tagPath);

    console.log("Tag removed successfully");
    return true;
  } catch (error) {
    console.error("Error removing tag:", error);
    throw error;
  }
}
