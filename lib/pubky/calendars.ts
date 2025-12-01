import { Session } from "@synonymdev/pubky";
import { PubkySpecsBuilder } from "pubky-app-specs";
import type { CalendarFormData } from "@/types/calendar";

/**
 * Save calendar to Pubky
 */
export async function saveCalendar(
    session: Session,
    userId: string,
    calendarData: CalendarFormData
): Promise<{ success: boolean; error?: string; path?: string }> {
    try {
        // Create calendar using WASM builder
        const builder = new PubkySpecsBuilder(userId);
        const calendarResult = builder.createCalendar(
            calendarData.name,
            calendarData.timezone,
            calendarData.color || null,
            calendarData.image_uri || null,
            calendarData.description || null,
            calendarData.url || null,
            calendarData.x_pubky_admins || null
        );

        // Extract path from URI (remove "pubky://{userId}" prefix)
        const path = calendarResult.meta.url.replace(`pubky://${userId}`, "") as `/pub/${string}`;

        // Store calendar JSON
        await session.storage.putJson(path, calendarResult.calendar);

        return {
            success: true,
            path,
        };
    } catch (error) {
        console.error("Failed to save calendar:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to save calendar",
        };
    }
}

/**
 * Get calendar from Pubky
 */
export async function getCalendar(
    session: Session,
    calendarId: string
): Promise<CalendarFormData | null> {
    try {
        const path = `/pub/eventky.app/calendars/${calendarId}` as `/pub/${string}`;

        const calendarData = await session.storage.getJson(path);
        return calendarData as CalendarFormData;
    } catch (error) {
        console.error("Failed to fetch calendar:", error);
        return null;
    }
}
