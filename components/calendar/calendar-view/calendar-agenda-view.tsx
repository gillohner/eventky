"use client";

import { format } from "date-fns";
import { Calendar, Users, Repeat, Plus } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { getPubkyImageUrl } from "@/lib/pubky/utils";
import { parseIsoInTimezone, parseIsoDateTime, getLocalTimezone, formatDateTime } from "@/lib/datetime";

import type { CalendarAgendaViewProps } from "@/types";

/**
 * Agenda view - chronological list of events
 * Mobile-first design, default view on small screens
 */
export function CalendarAgendaView({
    events,
    onLoadMore,
    canLoadMore,
    className,
}: CalendarAgendaViewProps) {


    // Group events by date - use event timezone for accurate day grouping
    const localTimezone = getLocalTimezone();
    const eventsByDate = events.reduce((acc, event) => {
        // Parse in event timezone (or local if not specified)
        const eventDate = event.dtstartTzid
            ? parseIsoInTimezone(event.dtstart, event.dtstartTzid)
            : parseIsoDateTime(event.dtstart);

        const dateKey = format(eventDate, "yyyy-MM-dd");

        if (!acc[dateKey]) {
            acc[dateKey] = [];
        }
        acc[dateKey].push(event);
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
            <div className="space-y-6 pr-4 pb-4">
                {sortedDates.map((date) => {
                    const dateEvents = eventsByDate[date];
                    const dateObj = parseIsoDateTime(date);

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
                            <div className="grid grid-cols-1 md:grid-cols-1 gap-3 mt-3">
                                {dateEvents.map((event) => {
                                    // For recurring events, use the occurrence date as instance parameter
                                    const instanceParam = event.occurrenceDate
                                        ? `?instance=${encodeURIComponent(event.occurrenceDate)}`
                                        : "";
                                    const eventUrl = `/event/${event.authorId}/${event.eventId}${instanceParam}`;
                                    const imageUrl = event.image ? getPubkyImageUrl(event.image, "main") : null;

                                    // Check if event is in the past - use event timezone for accurate comparison
                                    const eventDate = event.dtstartTzid
                                        ? parseIsoInTimezone(event.dtstart, event.dtstartTzid)
                                        : parseIsoDateTime(event.dtstart);
                                    const isPastEvent = eventDate < new Date();

                                    return (
                                        <Link key={event.id} href={eventUrl}>
                                            <Card className={cn(
                                                "group hover:shadow-lg hover:border-primary/50 transition-all overflow-hidden py-0",
                                                isPastEvent && "opacity-60"
                                            )}>
                                                <CardContent className="p-0">
                                                    <div className="flex flex-col sm:flex-row gap-0">
                                                        {/* Event Image - Top on mobile, Left on desktop */}
                                                        <div className="relative w-full sm:w-40 h-32 sm:h-32 flex-shrink-0 bg-muted">
                                                            {imageUrl ? (
                                                                <Image
                                                                    src={imageUrl}
                                                                    alt={event.summary}
                                                                    fill
                                                                    className="object-cover"
                                                                    sizes="(max-width: 640px) 100vw, 160px"
                                                                    unoptimized
                                                                />
                                                            ) : (
                                                                <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                                                                    <Calendar className="h-8 w-8 text-primary/40" />
                                                                </div>
                                                            )}
                                                            {/* Time overlay - display in local timezone */}
                                                            <div className="absolute bottom-0 left-0 right-0 bg-black/70 backdrop-blur-sm px-2 py-1">
                                                                <div className="text-xs font-medium text-white text-center">
                                                                    {formatDateTime(
                                                                        event.dtstart,
                                                                        localTimezone,
                                                                        event.dtstartTzid,
                                                                        { includeYear: false, includeWeekday: false, compact: true }
                                                                    ).time}
                                                                </div>
                                                            </div>
                                                            {/* Recurring indicator */}
                                                            {event.rrule && (
                                                                <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm rounded-full p-1.5">
                                                                    <Repeat className="h-3.5 w-3.5 text-white" />
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Event Content */}
                                                        <div className="flex-1 p-3 min-w-0">
                                                            {/* Title */}
                                                            <div className="flex items-start gap-2 mb-2">
                                                                <h4 className="font-semibold group-hover:text-primary transition-colors line-clamp-2 flex-1">
                                                                    {event.summary}
                                                                </h4>
                                                                {isPastEvent && (
                                                                    <Badge variant="outline" className="text-xs shrink-0">
                                                                        Past
                                                                    </Badge>
                                                                )}
                                                            </div>

                                                            {/* Meta Info Row */}
                                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                                                                {/* TODO: Location will be added here when implementing Location component */}

                                                                {/* Attendee count */}
                                                                {event.attendeeCount !== undefined && event.attendeeCount > 0 && (
                                                                    <div className="flex items-center gap-1">
                                                                        <Users className="h-3.5 w-3.5 flex-shrink-0" />
                                                                        <span>{event.attendeeCount}</span>
                                                                    </div>
                                                                )}

                                                                {/* Calendar badges - compact */}
                                                                {event.calendars.length > 0 && (
                                                                    <div className="flex items-center gap-1 ml-auto">
                                                                        {event.calendars.slice(0, 2).map((calendar) => (
                                                                            <div
                                                                                key={calendar.id}
                                                                                className="h-4 w-4 rounded-sm border border-border flex-shrink-0"
                                                                                style={{ backgroundColor: calendar.color }}
                                                                                title={calendar.name}
                                                                            />
                                                                        ))}
                                                                        {event.calendars.length > 2 && (
                                                                            <span className="text-xs">+{event.calendars.length - 2}</span>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
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

                {/* Load More Button */}
                {canLoadMore && onLoadMore && (
                    <div className="pt-4">
                        <Button
                            variant="outline"
                            size="lg"
                            onClick={onLoadMore}
                            className="w-full"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Load next year of events
                        </Button>
                    </div>
                )}
            </div>
        </ScrollArea>
    );
}
