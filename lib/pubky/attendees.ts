/**
 * Pubky Homeserver - Attendee/RSVP operations
 *
 * Functions for managing RSVP/attendance records on Pubky Homeserver
 * Uses PubkySpecsBuilder from pubky-app-specs to create properly hashed IDs
 */

import { Session } from "@synonymdev/pubky";
import { PubkySpecsBuilder, eventUriBuilder } from "@eventky/pubky-app-specs";
import { isNotFoundError } from "./session-utils";

/**
 * Result from saving an attendee
 */
export interface SaveAttendeeResult {
    attendeeId: string;
    authorId: string;
    eventUri: string;
    partstat: string;
}

/**
 * Create or update an RSVP for an event
 * Requires an authenticated Session
 *
 * @param session - Authenticated Pubky session
 * @param eventAuthorId - Author ID of the event
 * @param eventId - Event ID to RSVP to
 * @param userId - Current user's public key (attendee)
 * @param partstat - Participation status: ACCEPTED, DECLINED, TENTATIVE, NEEDS-ACTION
 * @param recurrenceId - Optional: For recurring events, the specific instance datetime (ISO 8601)
 * @returns SaveAttendeeResult with the created attendee details
 */
export async function saveAttendee(
    session: Session,
    eventAuthorId: string,
    eventId: string,
    userId: string,
    partstat: string,
    recurrenceId?: string
): Promise<SaveAttendeeResult> {
    if (!session || !session.storage) {
        throw new Error("Invalid session: No storage available. Please sign in again.");
    }

    // Validate partstat
    const validStatuses = ["ACCEPTED", "DECLINED", "TENTATIVE", "NEEDS-ACTION"];
    const normalizedPartstat = partstat.toUpperCase();
    if (!validStatuses.includes(normalizedPartstat)) {
        throw new Error(`Invalid participation status: ${partstat}. Must be one of: ${validStatuses.join(", ")}`);
    }

    // Build the event URI that this RSVP is for
    const eventUri = eventUriBuilder(eventAuthorId, eventId);

    // Use PubkySpecsBuilder to create the attendee with proper ID hashing
    const builder = new PubkySpecsBuilder(userId);
    const attendeeResult = builder.createAttendee(normalizedPartstat, eventUri, recurrenceId || null);

    // Get the attendee path and ID from the meta
    const attendeePath = attendeeResult.meta.path as `/pub/${string}`;
    const attendeeId = attendeeResult.meta.id;
    const attendeeJson = attendeeResult.attendee.toJson();

    console.log("Saving attendee RSVP:", {
        attendeeId,
        userId,
        attendeePath,
        eventUri,
        partstat: normalizedPartstat,
        recurrenceId,
    });

    // Save to Pubky storage using session
    await session.storage.putJson(attendeePath, attendeeJson);

    console.log("Attendee RSVP saved successfully");

    return {
        attendeeId,
        authorId: userId,
        eventUri,
        partstat: normalizedPartstat,
    };
}

/**
 * Delete an RSVP for an event
 * Requires an authenticated Session
 * Succeeds silently if RSVP doesn't exist (graceful handling)
 *
 * @param session - Authenticated Pubky session
 * @param eventAuthorId - Author ID of the event
 * @param eventId - Event ID
 * @param userId - Current user's public key (attendee)
 */
export async function deleteAttendee(
    session: Session,
    eventAuthorId: string,
    eventId: string,
    userId: string
): Promise<void> {
    if (!session || !session.storage) {
        throw new Error("Invalid session: No storage available. Please sign in again.");
    }

    // Build the event URI to generate the same attendee ID
    const eventUri = eventUriBuilder(eventAuthorId, eventId);

    // Use PubkySpecsBuilder to get the correct attendee ID (same hash as creation)
    const builder = new PubkySpecsBuilder(userId);
    const attendeeResult = builder.createAttendee("NEEDS-ACTION", eventUri);

    // Get the attendee path from the meta
    const attendeePath = attendeeResult.meta.path as `/pub/${string}`;

    console.log("Deleting attendee RSVP:", {
        attendeeId: attendeeResult.meta.id,
        userId,
        attendeePath,
        eventUri,
    });

    try {
        // Delete from Pubky storage using session
        await session.storage.delete(attendeePath);
        console.log("Attendee RSVP deleted successfully");
    } catch (error) {
        // If RSVP doesn't exist, consider delete successful (idempotent)
        if (isNotFoundError(error)) {
            console.log("Attendee RSVP already deleted or doesn't exist");
            return;
        }
        throw error;
    }
}

/**
 * Get the attendee ID for a given event (for looking up existing RSVPs)
 * This is deterministic based on the event URI
 */
export function getAttendeeIdForEvent(
    userId: string,
    eventAuthorId: string,
    eventId: string
): string {
    const eventUri = eventUriBuilder(eventAuthorId, eventId);
    const builder = new PubkySpecsBuilder(userId);
    const attendeeResult = builder.createAttendee("NEEDS-ACTION", eventUri);
    return attendeeResult.meta.id;
}
