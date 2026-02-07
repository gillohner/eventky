/**
 * Event ICS Endpoint
 *
 * Returns a single event as an iCalendar file.
 * Supports both one-off and recurring events with full RRULE/RDATE/EXDATE.
 *
 * GET /api/ics/event/[authorId]/[eventId]
 *
 * Response:
 * - Content-Type: text/calendar; charset=utf-8
 * - Cache-Control: public, max-age=300
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchEventFromNexus } from "@/lib/nexus/events";
import { generateEventICS } from "@/lib/ics";

const CACHE_TTL = 300;

interface RouteParams {
    params: Promise<{
        authorId: string;
        eventId: string;
    }>;
}

export async function GET(
    _request: NextRequest,
    { params }: RouteParams
): Promise<NextResponse> {
    const { authorId, eventId } = await params;

    if (!authorId || !eventId) {
        return NextResponse.json(
            { error: "Missing authorId or eventId" },
            { status: 400 }
        );
    }

    try {
        const event = await fetchEventFromNexus(authorId, eventId);

        if (!event) {
            return NextResponse.json(
                { error: "Event not found" },
                { status: 404 }
            );
        }

        const result = generateEventICS(event);

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
