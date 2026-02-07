"use client";

import { useMemo } from "react";
import { format, parseISO, addDays, startOfDay } from "date-fns";
import Link from "next/link";
import { CalendarDays, TrendingUp } from "lucide-react";
import { DashboardWidget } from "@/components/dashboard/dashboard-widget";
import { useEventsStream } from "@/hooks";
import { Skeleton } from "@/components/ui/skeleton";

interface UpcomingEventsWidgetProps {
    daysAhead?: number;
    maxItems?: number;
}

/**
 * Widget showing upcoming public events (next 7 days by default)
 */
export function UpcomingEventsWidget({ daysAhead = 7, maxItems = 5 }: UpcomingEventsWidgetProps) {
    const now = useMemo(() => new Date(), []);
    const startDate = useMemo(() => startOfDay(now), [now]);
    const endDate = useMemo(() => addDays(startDate, daysAhead), [startDate, daysAhead]);

    const { data: events, isLoading } = useEventsStream({
        limit: 100,
        start_date: Math.floor(startDate.getTime() / 1000) * 1000000, // Convert to microseconds
        end_date: Math.floor(endDate.getTime() / 1000) * 1000000,
    });

    // Filter and sort upcoming events
    const upcomingEvents = useMemo(() => {
        if (!events) return [];

        return events
            .filter((event) => {
                const eventDate = parseISO(event.dtstart);
                return eventDate >= now && eventDate <= endDate;
            })
            .sort((a, b) => {
                return new Date(a.dtstart).getTime() - new Date(b.dtstart).getTime();
            })
            .slice(0, maxItems);
    }, [events, now, endDate, maxItems]);

    if (isLoading) {
        return (
            <DashboardWidget
                title="Upcoming Events"
                description={`Next ${daysAhead} days`}
                icon={TrendingUp}
                viewAllHref="/events"
            >
                <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                    ))}
                </div>
            </DashboardWidget>
        );
    }

    return (
        <DashboardWidget
            title="Upcoming Events"
            description={`Next ${daysAhead} days`}
            icon={TrendingUp}
            viewAllHref="/events"
            isEmpty={upcomingEvents.length === 0}
            emptyMessage={`No public events in the next ${daysAhead} days`}
            emptyIcon={CalendarDays}
            emptyAction={{ label: "Browse All Events", href: "/events" }}
        >
            <div className="space-y-2">
                {upcomingEvents.map((event) => {
                    const startDate = parseISO(event.dtstart);

                    return (
                        <Link
                            key={event.id}
                            href={`/event/${event.author}/${event.id}`}
                            className="block"
                        >
                            <div className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                                {/* Time Badge */}
                                <div className="flex flex-col items-center justify-center px-2 py-1 rounded bg-muted flex-shrink-0 min-w-[60px]">
                                    <div className="text-xs text-muted-foreground">
                                        {format(startDate, "MMM d")}
                                    </div>
                                    <div className="text-sm font-semibold">
                                        {format(startDate, "HH:mm")}
                                    </div>
                                </div>

                                {/* Event Info */}
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-sm line-clamp-1">
                                        {event.summary}
                                    </h4>
                                    {/* TODO: Location will be added here when implementing Location component */}
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </DashboardWidget>
    );
}
