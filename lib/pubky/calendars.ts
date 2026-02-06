import { Pubky, Address, Session } from "@synonymdev/pubky";
import { PubkyAppCalendar, calendarUriBuilder } from "@eventky/pubky-app-specs";
import { config } from "@/lib/config";
import { isNotFoundError } from "./session-utils";

/**
 * Fetch a calendar from Pubky homeserver
 */
export async function getCalendar(
    authorId: string,
    calendarId: string
): Promise<PubkyAppCalendar | null> {
    try {
        const pubky = config.env === "testnet" ? Pubky.testnet() : new Pubky();
        const url = calendarUriBuilder(authorId, calendarId);
        const data = await pubky.publicStorage.getJson(url as Address);

        if (!data || typeof data !== "object") {
            return null;
        }

        // Convert to PubkyAppCalendar class to validate and sanitize
        return PubkyAppCalendar.fromJson(data);
    } catch (error) {
        console.error("Error fetching calendar:", error);
        return null;
    }
}

/**
 * Create or update a calendar on Pubky Homeserver
 * Requires an authenticated Session
 */
export async function saveCalendar(
    session: Session,
    calendar: PubkyAppCalendar,
    calendarId: string,
    userId: string
): Promise<boolean> {
    try {
        if (!session || !session.storage) {
            throw new Error("Invalid session: No storage available. Please sign in again.");
        }

        // Use calendarUriBuilder to construct the full URI, then extract the path
        const calendarUri = calendarUriBuilder(userId, calendarId);
        // Convert pubky://userId/path to /path
        const calendarPath = calendarUri.replace(`pubky://${userId}`, "") as `/pub/${string}`;

        // Convert calendar to JSON for storage
        const calendarJson = calendar.toJson();

        // Save to Pubky storage using session
        await session.storage.putJson(calendarPath, calendarJson);

        return true;
    } catch (error) {
        console.error("Error saving calendar:", error);
        throw error;
    }
}

/**
 * Delete a calendar from Pubky Homeserver
 * Requires an authenticated Session
 * Returns true if deleted or already doesn't exist (graceful handling)
 */
export async function deleteCalendar(
    session: Session,
    calendarId: string,
    userId: string
): Promise<boolean> {
    if (!session || !session.storage) {
        throw new Error("Invalid session: No storage available. Please sign in again.");
    }

    const calendarUri = calendarUriBuilder(userId, calendarId);
    const calendarPath = calendarUri.replace(`pubky://${userId}`, "") as `/pub/${string}`;

    try {
        // Delete from Pubky storage using session
        await session.storage.delete(calendarPath);
        return true;
    } catch (error) {
        // If file doesn't exist, consider delete successful (idempotent)
        if (isNotFoundError(error)) {
            console.log("Calendar already deleted or doesn't exist:", calendarId);
            return true;
        }
        console.error("Error deleting calendar:", error);
        throw error;
    }
}
