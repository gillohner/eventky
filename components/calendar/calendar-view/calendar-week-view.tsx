"use client";

import { format, startOfWeek, endOfWeek, eachDayOfInterval, parseISO, isSameDay } from "date-fns";
import Link from "next/link";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { CalendarWeekViewProps } from "@/types";

/**
 * Week view - column-based layout showing events by day
 * Simplified version without hourly time slots
 */
export function CalendarWeekView({
    events,
    currentDate,
    className,
}: CalendarWeekViewProps) {
    // Get week boundaries
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

    // Group events by day
    const eventsByDay = weekDays.map((day) => {
        const dayEvents = events.filter((event) =>
            isSameDay(parseISO(event.dtstart), day)
        );
        return { day, events: dayEvents };
    });

    return (
        <div className={cn("", className)}>
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-px bg-border rounded-t-lg overflow-hidden">
                {eventsByDay.map(({ day }) => (
                    <div
                        key={day.toISOString()}
                        className="bg-muted py-3 text-center"
                    >
                        <div className="text-xs text-muted-foreground uppercase">
                            {format(day, "EEE")}
                        </div>
                        <div className="text-lg font-semibold mt-1">
                            {format(day, "d")}
                        </div>
                    </div>
                ))}
            </div>

            {/* Event columns */}
            <ScrollArea className="h-[500px]">
                <div className="grid grid-cols-7 gap-px bg-border border border-t-0 rounded-b-lg overflow-hidden">
                    {eventsByDay.map(({ day, events: dayEvents }) => (
                        <div
                            key={day.toISOString()}
                            className="bg-card p-2 min-h-[400px]"
                        >
                            <div className="space-y-2">
                                {dayEvents.map((event) => {
                                    const instanceParam = event.occurrenceDate
                                        ? `?instance=${encodeURIComponent(event.occurrenceDate)}`
                                        : "";
                                    const eventUrl = `/event/${event.authorId}/${event.eventId}${instanceParam}`;
                                    const borderStyle =
                                        event.calendars.length > 1
                                            ? {
                                                borderLeft: `3px solid transparent`,
                                                borderImage: `linear-gradient(to bottom, ${event.calendars
                                                    .map((c) => c.color)
                                                    .join(", ")}) 1`,
                                            }
                                            : {
                                                borderLeft: `3px solid ${event.color || "#6b7280"}`,
                                            };

                                    return (
                                        <Link key={event.id} href={eventUrl}>
                                            <div
                                                className="text-xs p-2 rounded hover:shadow-sm transition-shadow"
                                                style={{
                                                    backgroundColor: event.color ? `${event.color}20` : "#6b728020",
                                                    ...borderStyle,
                                                }}
                                            >
                                                {/* Time */}
                                                <div className="font-medium mb-1">
                                                    {format(parseISO(event.dtstart), "h:mm a")}
                                                </div>

                                                {/* Title */}
                                                <div className="font-medium mb-1 line-clamp-2">
                                                    {event.summary}
                                                </div>

                                                {/* Location */}
                                                {event.location && (
                                                    <div className="text-muted-foreground truncate">
                                                        📍 {event.location}
                                                    </div>
                                                )}
                                            </div>
                                        </Link>
                                    );
                                })}

                                {dayEvents.length === 0 && (
                                    <div className="text-xs text-muted-foreground text-center py-4">
                                        No events
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
}
