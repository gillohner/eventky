/**
 * Event ICS Endpoint
 * 
 * Returns a single event in iCalendar format for calendar subscription.
 * 
 * GET /api/ics/event/[authorId]/[eventId]
 * 
 * Query params:
 * - instance: ISO date string for a specific recurring event instance
 * 
 * Response:
 * - Content-Type: text/calendar
 * - Cache-Control: max-age=300 (5 minutes)
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchEventFromNexus } from "@/lib/nexus/events";
import { generateEventICS } from "@/lib/ics";

// Cache duration in seconds (5 minutes)
const CACHE_TTL = 300;

interface RouteParams {
    params: Promise<{
        authorId: string;
        eventId: string;
    }>;
}

export async function GET(
    request: NextRequest,
    { params }: RouteParams
): Promise<NextResponse> {
    const { authorId, eventId } = await params;

    // Validate parameters
    if (!authorId || !eventId) {
        return NextResponse.json(
            { error: "Missing authorId or eventId" },
            { status: 400 }
        );
    }

    try {
        // Fetch event from Nexus
        const event = await fetchEventFromNexus(authorId, eventId);

        if (!event) {
            return NextResponse.json(
                { error: "Event not found" },
                { status: 404 }
            );
        }

        // Generate ICS
        const result = generateEventICS(event);

        if (!result.success || !result.value) {
            return NextResponse.json(
                { error: result.error || "Failed to generate ICS" },
                { status: 500 }
            );
        }

        // Return ICS with proper headers
        return new NextResponse(result.value, {
            status: 200,
            headers: {
                "Content-Type": "text/calendar; charset=utf-8",
                "Content-Disposition": `attachment; filename="${eventId}.ics"`,
                "Cache-Control": `public, max-age=${CACHE_TTL}, s-maxage=${CACHE_TTL}`,
            },
        });
    } catch (error) {
        console.error("Error generating event ICS:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
