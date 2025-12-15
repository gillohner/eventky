"use client";

import { useMemo } from "react";
import { useCalendarsStream } from "@/hooks/use-calendar-hooks";
import { useEventsStream } from "@/hooks/use-event-hooks";
import { useDebugView } from "@/hooks";
import { DevJsonView } from "@/components/dev-json-view";
import { DebugViewToggle } from "@/components/ui/debug-view-toggle";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import Link from "next/link";
import { getPubkyImageUrl } from "@/lib/pubky/utils";
import Image from "next/image";

export default function CalendarsPage() {
    const { data: calendars, isLoading: calendarsLoading } = useCalendarsStream({ limit: 100 });
    const { data: events, isLoading: eventsLoading } = useEventsStream({ limit: 1000 });
    const { debugEnabled, showRawData, toggleRawData } = useDebugView();

    // Group calendars by author for stats
    const calendarsByAuthor = useMemo(() => {
        if (!calendars) return new Map();
        const map = new Map<string, typeof calendars>();
        calendars.forEach((cal) => {
            if (!map.has(cal.author)) {
                map.set(cal.author, []);
            }
            map.get(cal.author)!.push(cal);
        });
        return map;
    }, [calendars]);

    // Calculate event counts per calendar
    const eventCountByCalendar = useMemo(() => {
        if (!events) return new Map();
        const counts = new Map<string, number>();
        events.forEach((event) => {
            const calendarUris = event.x_pubky_calendar_uris || [];
            calendarUris.forEach((uri) => {
                const match = uri.match(/calendars\/([^/]+)$/);
                const calendarId = match?.[1];
                if (calendarId) {
                    counts.set(calendarId, (counts.get(calendarId) || 0) + 1);
                }
            });
        });
        return counts;
    }, [events]);

    const isLoading = calendarsLoading || eventsLoading;

    return (
        <div className="container max-w-7xl mx-auto py-8 px-4 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold mb-2">All Calendars</h1>
                    <p className="text-muted-foreground">
                        {calendars ? `${calendars.length} calendars` : "Loading calendars..."}
                        {" • "}
                        {events ? `${events.length} events` : "Loading events..."}
                        {" • "}
                        {calendarsByAuthor.size > 0 && `${calendarsByAuthor.size} authors`}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button asChild>
                        <Link href="/calendar/create">
                            <Calendar className="h-4 w-4 mr-2" />
                            Create Calendar
                        </Link>
                    </Button>
                    <DebugViewToggle
                        debugEnabled={debugEnabled}
                        showRawData={showRawData}
                        onToggle={toggleRawData}
                    />
                </div>
            </div>

            {showRawData ? (
                <div className="space-y-4">
                    <DevJsonView
                        data={{ calendars, events }}
                        title="Calendars & Events Data"
                        isLoading={isLoading}
                    />
                </div>
            ) : (
                <>
                    {/* Calendars Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {calendars?.map((calendar) => {
                            const eventCount = eventCountByCalendar.get(calendar.id) || 0;
                            const imageUrl = calendar.image_uri ? getPubkyImageUrl(calendar.image_uri, "main") : null;
                            const authorCalendars = calendarsByAuthor.get(calendar.author) || [];

                            return (
                                <Link key={calendar.id} href={`/calendar/${calendar.author}/${calendar.id}`}>
                                    <Card className="group hover:shadow-lg hover:border-primary/50 transition-all h-full overflow-hidden py-0">
                                        <CardContent className="p-0">
                                            {/* Calendar Image/Color Banner */}
                                            <div className="relative h-32 bg-muted">
                                                {imageUrl ? (
                                                    <Image
                                                        src={imageUrl}
                                                        alt={calendar.name}
                                                        fill
                                                        className="object-cover"
                                                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                                        unoptimized
                                                    />
                                                ) : (
                                                    <div
                                                        className="w-full h-full"
                                                        style={{
                                                            background: calendar.color
                                                                ? `linear-gradient(135deg, ${calendar.color}40, ${calendar.color}80)`
                                                                : "linear-gradient(135deg, #3b82f640, #3b82f680)",
                                                        }}
                                                    />
                                                )}
                                                {/* Color indicator */}
                                                <div className="absolute top-2 right-2">
                                                    <div
                                                        className="h-6 w-6 rounded-full border-2 border-white shadow-lg"
                                                        style={{ backgroundColor: calendar.color || "#3b82f6" }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Content */}
                                            <div className="p-4 space-y-3">
                                                {/* Title */}
                                                <h3 className="font-semibold text-lg group-hover:text-primary transition-colors line-clamp-2">
                                                    {calendar.name}
                                                </h3>

                                                {/* Description */}
                                                {calendar.description && (
                                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                                        {calendar.description}
                                                    </p>
                                                )}

                                                {/* Stats */}
                                                <div className="flex flex-wrap items-center gap-2 text-sm">
                                                    <Badge variant="secondary" className="gap-1">
                                                        <Calendar className="h-3 w-3" />
                                                        {eventCount} {eventCount === 1 ? "event" : "events"}
                                                    </Badge>
                                                    {authorCalendars.length > 1 && (
                                                        <Badge variant="outline" className="gap-1">
                                                            {authorCalendars.length} by author
                                                        </Badge>
                                                    )}
                                                    {calendar.timezone && (
                                                        <Badge variant="outline" className="text-xs">
                                                            {calendar.timezone}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            );
                        })}
                    </div>

                    {/* Empty State */}
                    {!isLoading && (!calendars || calendars.length === 0) && (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                                <h3 className="text-lg font-semibold mb-2">No calendars found</h3>
                                <p className="text-muted-foreground mb-4">
                                    Get started by creating your first calendar
                                </p>
                                <Button asChild>
                                    <Link href="/calendar/create">
                                        Create Calendar
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {/* Loading State */}
                    {isLoading && (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <p className="text-muted-foreground">Loading calendars and events...</p>
                            </CardContent>
                        </Card>
                    )}
                </>
            )}
        </div>
    );
}
