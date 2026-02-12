"use client";

import { format, isSameMonth, isToday, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { parseIsoInTimezone, parseIsoDateTime, getLocalTimezone } from "@/lib/datetime";
import type { CalendarMonthViewProps } from "@/types";

/**
 * Month grid view - traditional calendar layout
 * Shows events in day cells, optimized for desktop
 */
export function CalendarMonthView({
    events,
    currentDate,
    className,
}: CalendarMonthViewProps) {
    // Get month boundaries
    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    // Get calendar grid (includes padding days from prev/next month)
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    // Group events by date - use event timezone for accurate day grouping
    const localTimezone = getLocalTimezone();
    const eventsByDate = events.reduce((acc, event) => {
        // Parse in event timezone (or local if not specified) to get correct day
        const eventDate = event.dtstartTzid
            ? parseIsoInTimezone(event.dtstart, event.dtstartTzid)
            : parseIsoDateTime(event.dtstart);

        // Format in local timezone for calendar display
        const dateKey = format(eventDate, "yyyy-MM-dd");

        if (!acc[dateKey]) {
            acc[dateKey] = [];
        }
        acc[dateKey].push(event);
        return acc;
    }, {} as Record<string, typeof events>);

    return (
        <div className={cn("", className)}>
            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-px bg-border rounded-t-lg overflow-hidden">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                    <div
                        key={day}
                        className="bg-muted py-2 text-center text-sm font-medium text-muted-foreground"
                    >
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-px bg-border rounded-b-lg overflow-hidden border border-t-0">
                {calendarDays.map((day) => {
                    const dateKey = format(day, "yyyy-MM-dd");
                    const dayEvents = eventsByDate[dateKey] || [];
                    const isCurrentMonth = isSameMonth(day, currentDate);
                    const isTodayCell = isToday(day);

                    return (
                        <div
                            key={dateKey}
                            className={cn(
                                "bg-card min-h-[120px] p-2",
                                !isCurrentMonth && "bg-muted/30 text-muted-foreground"
                            )}
                        >
                            {/* Day number */}
                            <div className="flex justify-between items-start mb-1">
                                <span
                                    className={cn(
                                        "text-sm font-medium",
                                        isTodayCell && "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center"
                                    )}
                                >
                                    {format(day, "d")}
                                </span>
                            </div>

                            {/* Events */}
                            <div className="space-y-1">
                                {dayEvents.slice(0, 3).map((event) => {
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
                                                className="text-xs px-2 py-1 rounded truncate cursor-pointer hover:shadow-sm transition-shadow"
                                                style={{
                                                    backgroundColor: event.color ? `${event.color}20` : "#6b728020",
                                                    ...borderStyle,
                                                }}
                                            >
                                                {event.summary}
                                            </div>
                                        </Link>
                                    );
                                })}

                                {/* More indicator */}
                                {dayEvents.length > 3 && (
                                    <div className="text-xs text-muted-foreground px-2">
                                        +{dayEvents.length - 3} more
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
