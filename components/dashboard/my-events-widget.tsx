"use client";

import { useMemo } from "react";
import { format, parseISO, isPast, isToday } from "date-fns";
import Link from "next/link";
import { Calendar, MapPin, Clock } from "lucide-react";
import { DashboardWidget } from "./dashboard-widget";
import { useEventsStream } from "@/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { getDisplayLocation } from "@/types/nexus";

interface MyEventsWidgetProps {
    userId?: string;
    maxItems?: number;
}

/**
 * Widget showing events the user is attending (via RSVP)
 * Note: Stream items don't include attendee data, so this widget
 * will show events where user is the author as a placeholder.
 * For full attendee support, we'd need to fetch individual event details.
 */
export function MyEventsWidget({ userId, maxItems = 5 }: MyEventsWidgetProps) {
    const { data: events, isLoading } = useEventsStream({ limit: 100 });

    // Filter events authored by user (stream doesn't include attendees)
    // TODO: Fetch full event details with attendees for proper RSVP filtering
    const myEvents = useMemo(() => {
        if (!events || !userId) return [];

        return events
            .filter((event) => {
                // For now, show events created by user
                // In future, fetch full event details to check attendees
                return event.author === userId;
            })
            .sort((a, b) => {
                // Sort by start time
                return new Date(a.dtstart).getTime() - new Date(b.dtstart).getTime();
            })
            .slice(0, maxItems);
    }, [events, userId, maxItems]);

    if (isLoading) {
        return (
            <DashboardWidget
                title="My Events"
                description="Events you're attending"
                icon={Calendar}
                viewAllHref="/events"
            >
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-20 w-full" />
                    ))}
                </div>
            </DashboardWidget>
        );
    }

    return (
        <DashboardWidget
            title="My Events"
            description="Events you created"
            icon={Calendar}
            viewAllHref="/events"
            isEmpty={myEvents.length === 0}
            emptyMessage="You're not attending any events yet"
            emptyIcon={Calendar}
            emptyAction={{ label: "Browse Events", href: "/events" }}
        >
            <div className="space-y-3">
                {myEvents.map((event) => {
                    const startDate = parseISO(event.dtstart);
                    const isEventPast = isPast(startDate);
                    const isEventToday = isToday(startDate);

                    return (
                        <Link
                            key={event.id}
                            href={`/event/${event.author}/${event.id}`}
                            className="block"
                        >
                            <div className="flex gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                                {/* Date Badge */}
                                <div className="flex flex-col items-center justify-center px-3 py-2 rounded-md bg-primary/10 text-primary flex-shrink-0">
                                    <div className="text-xs font-medium uppercase">
                                        {format(startDate, "MMM")}
                                    </div>
                                    <div className="text-2xl font-bold">
                                        {format(startDate, "d")}
                                    </div>
                                </div>

                                {/* Event Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start gap-2">
                                        <h4 className="font-semibold text-sm line-clamp-1 flex-1">
                                            {event.summary}
                                        </h4>
                                        {isEventToday && (
                                            <Badge variant="default" className="text-xs">Today</Badge>
                                        )}
                                        {isEventPast && !isEventToday && (
                                            <Badge variant="secondary" className="text-xs">Past</Badge>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                                        <div className="flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            <span>{format(startDate, "h:mm a")}</span>
                                        </div>
                                        {getDisplayLocation(event) && (
                                            <div className="flex items-center gap-1">
                                                <MapPin className="h-3 w-3" />
                                                <span className="truncate max-w-[150px]">
                                                    {getDisplayLocation(event)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </DashboardWidget>
    );
}
