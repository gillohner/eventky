"use client";

import { format, parseISO } from "date-fns";
import { Calendar, MapPin, Clock } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { CalendarAgendaViewProps } from "@/types";

/**
 * Agenda view - chronological list of events
 * Mobile-first design, default view on small screens
 */
export function CalendarAgendaView({
    events,
    className,
}: CalendarAgendaViewProps) {
    // Group events by date
    const eventsByDate = events.reduce((acc, event) => {
        const date = format(parseISO(event.dtstart), "yyyy-MM-dd");
        if (!acc[date]) {
            acc[date] = [];
        }
        acc[date].push(event);
        return acc;
    }, {} as Record<string, typeof events>);

    // Sort dates
    const sortedDates = Object.keys(eventsByDate).sort();

    if (events.length === 0) {
        return (
            <div className={cn("flex h-[400px] items-center justify-center", className)}>
                <div className="text-center text-muted-foreground">
                    <Calendar className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p className="text-sm">No events in this period</p>
                </div>
            </div>
        );
    }

    return (
        <ScrollArea className={cn("h-[600px]", className)}>
            <div className="space-y-6 pr-4">
                {sortedDates.map((date) => {
                    const dateEvents = eventsByDate[date];
                    const dateObj = parseISO(date);

                    return (
                        <div key={date}>
                            {/* Date header */}
                            <div className="sticky top-0 z-10 bg-background pb-2">
                                <h3 className="text-lg font-semibold">
                                    {format(dateObj, "EEEE, MMMM d, yyyy")}
                                </h3>
                                <Separator className="mt-2" />
                            </div>

                            {/* Events for this date */}
                            <div className="space-y-3 mt-3">
                                {dateEvents.map((event) => {
                                    const eventUrl = `/event/${event.authorId}/${event.eventId}`;

                                    return (
                                        <Link key={event.id} href={eventUrl}>
                                            <Card className="hover:shadow-md transition-shadow">
                                                <CardContent className="p-4">
                                                    <div className="flex gap-3">
                                                        {/* Color indicator */}
                                                        <div
                                                            className="w-1 rounded-full"
                                                            style={{ backgroundColor: event.color || "#6b7280" }}
                                                        />

                                                        {/* Event details */}
                                                        <div className="flex-1 min-w-0">
                                                            {/* Time */}
                                                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                                                                <Clock className="h-4 w-4" />
                                                                <span>
                                                                    {format(parseISO(event.dtstart), "h:mm a")}
                                                                    {event.dtend && (
                                                                        <>
                                                                            {" - "}
                                                                            {format(parseISO(event.dtend), "h:mm a")}
                                                                        </>
                                                                    )}
                                                                </span>
                                                            </div>

                                                            {/* Title */}
                                                            <h4 className="font-medium truncate mb-2">
                                                                {event.summary}
                                                            </h4>

                                                            {/* Location */}
                                                            {event.location && (
                                                                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                                                                    <MapPin className="h-4 w-4" />
                                                                    <span className="truncate">{event.location}</span>
                                                                </div>
                                                            )}

                                                            {/* Calendar badge */}
                                                            {event.calendarName && (
                                                                <Badge
                                                                    variant="secondary"
                                                                    className="text-xs"
                                                                    style={{
                                                                        borderLeft: `3px solid ${event.color || "#6b7280"}`,
                                                                    }}
                                                                >
                                                                    {event.calendarName}
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
                        </div>
                    );
                })}
            </div>
        </ScrollArea>
    );
}
