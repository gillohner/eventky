/**
 * Calendar ICS Endpoint
 *
 * Returns a calendar with all its events as an iCalendar feed.
 * Designed for webcal:// subscription in external calendar apps.
 *
 * GET /api/ics/calendar/[authorId]/[calendarId]
 *
 * Response:
 * - Content-Type: text/calendar; charset=utf-8
 * - Cache-Control: public, max-age=300 (5 minutes for subscription freshness)
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchCalendarFromNexus } from "@/lib/nexus/calendars";
import { fetchEventFromNexus } from "@/lib/nexus/events";
import { generateCalendarICS } from "@/lib/ics";
import type { NexusEventResponse } from "@/types/nexus";

const CACHE_TTL = 300;

interface RouteParams {
    params: Promise<{
        authorId: string;
        calendarId: string;
    }>;
}

/**
 * Parse a pubky event URI to extract authorId and eventId.
 * Format: pubky://AUTHOR_ID/pub/eventky.app/events/EVENT_ID
 */
function parseEventUri(uri: string): { authorId: string; eventId: string } | null {
    const match = uri.match(/^pubky:\/\/([^/]+)\/pub\/eventky\.app\/events\/(.+)$/);
    if (!match) return null;
    return { authorId: match[1], eventId: match[2] };
}

export async function GET(
    _request: NextRequest,
    { params }: RouteParams
): Promise<NextResponse> {
    const { authorId, calendarId } = await params;

    if (!authorId || !calendarId) {
        return NextResponse.json(
            { error: "Missing authorId or calendarId" },
            { status: 400 }
        );
    }

    try {
        const calendar = await fetchCalendarFromNexus(authorId, calendarId);

        if (!calendar) {
            return NextResponse.json(
                { error: "Calendar not found" },
                { status: 404 }
            );
        }

        // Fetch all linked events in parallel
        const events: NexusEventResponse[] = [];

        if (calendar.events && calendar.events.length > 0) {
            const eventPromises = calendar.events.map(async (uri) => {
                const parsed = parseEventUri(uri);
                if (!parsed) return null;

                try {
                    return await fetchEventFromNexus(parsed.authorId, parsed.eventId);
                } catch (error) {
                    console.warn(`Failed to fetch event ${uri}:`, error);
                    return null;
                }
            });

            const results = await Promise.all(eventPromises);
            events.push(...results.filter((e): e is NexusEventResponse => e !== null));
        }

        const result = generateCalendarICS(events, {
            name: calendar.details.name,
            description: calendar.details.description,
            timezone: calendar.details.timezone,
            color: calendar.details.color,
            url: calendar.details.url,
        });

        if (!result.success || !result.value) {
            return NextResponse.json(
                { error: result.error || "Failed to generate ICS" },
                { status: 500 }
            );
        }

        return new NextResponse(result.value, {
            status: 200,
            headers: {
                "Content-Type": "text/calendar; charset=utf-8",
                "Content-Disposition": `attachment; filename="${calendarId}.ics"`,
                "Cache-Control": `public, max-age=${CACHE_TTL}, s-maxage=${CACHE_TTL}`,
            },
        });
    } catch (error) {
        console.error("Error generating calendar ICS:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
