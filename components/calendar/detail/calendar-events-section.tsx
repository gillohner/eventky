"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, Repeat, AlertCircle } from "lucide-react";
import Link from "next/link";
import { calculateNextOccurrences } from "@/lib/pubky/rrule-utils";
import { formatDateTime, parseIsoInTimezone } from "@/lib/datetime";
import type { NexusEventResponse } from "@/lib/nexus/events";

interface CalendarEventsSectionProps {
    /** List of events in the calendar */
    events: NexusEventResponse[];
    /** Calendar timezone */
    calendarTimezone?: string;
    /** Whether events are loading */
    isLoading?: boolean;
    /** Maximum number of occurrences to show per event */
    maxOccurrencesPerEvent?: number;
    /** Maximum total occurrences to show */
    maxTotalOccurrences?: number;
    /** Whether to show past events (default: false, only upcoming) */
    showPastEvents?: boolean;
    /** Additional CSS classes */
    className?: string;
}

interface EventOccurrence {
    eventId: string;
    eventAuthorId: string;
    summary: string;
    date: string;
    isRecurring: boolean;
    instanceDate?: string;
    eventUri: string;
    status?: string;
}

/**
 * Display upcoming events for a calendar in chronological order
 * Expands recurring events to show individual occurrences
 */
export function CalendarEventsSection({
    events,
    calendarTimezone,
    isLoading,
    maxOccurrencesPerEvent = 5,
    maxTotalOccurrences = 20,
    showPastEvents = false,
    className,
}: CalendarEventsSectionProps) {
    // Generate all occurrences and sort chronologically
    const occurrences = useMemo(() => {
        if (!events || events.length === 0) return [];

        const now = new Date();
        const allOccurrences: EventOccurrence[] = [];

        for (const event of events) {
            const { details } = event;

            // For recurring events, generate occurrences
            if (details.rrule) {
                const occurrenceDates = calculateNextOccurrences({
                    rrule: details.rrule,
                    dtstart: details.dtstart,
                    dtstartTzid: details.dtstart_tzid,
                    rdate: details.rdate,
                    exdate: details.exdate,
                    maxCount: maxOccurrencesPerEvent,
                });

                for (const date of occurrenceDates) {
                    const occurrenceDate = new Date(date);
                    // Skip past occurrences unless showPastEvents is true
                    if (!showPastEvents && occurrenceDate < now) continue;

                    allOccurrences.push({
                        eventId: details.id,
                        eventAuthorId: details.author,
                        summary: details.summary,
                        date: date,
                        isRecurring: true,
                        instanceDate: date,
                        eventUri: details.uri,
                        status: details.status,
                    });
                }
            } else {
                // Single occurrence event
                const eventDate = new Date(details.dtstart);
                // Skip past events unless showPastEvents is true
                if (!showPastEvents && eventDate < now) continue;

                allOccurrences.push({
                    eventId: details.id,
                    eventAuthorId: details.author,
                    summary: details.summary,
                    date: details.dtstart,
                    isRecurring: false,
                    eventUri: details.uri,
                    status: details.status,
                });
            }
        }

        // Sort chronologically
        allOccurrences.sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return dateA.getTime() - dateB.getTime();
        });

        // Limit total occurrences
        return allOccurrences.slice(0, maxTotalOccurrences);
    }, [events, maxOccurrencesPerEvent, maxTotalOccurrences, showPastEvents]);

    if (isLoading) {
        return (
            <Card className={cn("", className)}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                        Upcoming Events
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div
                                key={i}
                                className="h-20 bg-muted/50 rounded-lg animate-pulse"
                            />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!events || events.length === 0) {
        return (
            <Card className={cn("", className)}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                        Events
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No Events Yet</h3>
                        <p className="text-sm text-muted-foreground">
                            This calendar doesn&apos;t have any events yet.
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (occurrences.length === 0) {
        return (
            <Card className={cn("", className)}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                        Upcoming Events
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No Upcoming Events</h3>
                        <p className="text-sm text-muted-foreground">
                            All events in this calendar have already passed.
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={cn("", className)}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                    {showPastEvents ? "Events" : "Upcoming Events"} ({occurrences.length})
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {occurrences.map((occurrence, index) => (
                        <EventOccurrenceCard
                            key={`${occurrence.eventId}-${occurrence.date}-${index}`}
                            occurrence={occurrence}
                            timezone={calendarTimezone}
                        />
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

/**
 * Single event occurrence card
 */
function EventOccurrenceCard({
    occurrence,
    timezone,
}: {
    occurrence: EventOccurrence;
    timezone?: string;
}) {
    const formattedDate = useMemo(() => {
        // Use calendar timezone or fallback to local
        const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
        const formatted = formatDateTime(occurrence.date, tz, undefined, {
            includeYear: true,
            includeWeekday: true,
        });

        // Parse the formatted date to extract components
        const dateObj = timezone
            ? parseIsoInTimezone(occurrence.date, timezone)
            : new Date(occurrence.date);
        const month = dateObj.toLocaleString('en-US', { month: 'short', timeZone: tz });
        const day = dateObj.toLocaleString('en-US', { day: 'numeric', timeZone: tz });
        const weekday = dateObj.toLocaleString('en-US', { weekday: 'short', timeZone: tz });

        return {
            ...formatted,
            month,
            day,
            weekday,
        };
    }, [occurrence.date, timezone]);

    // Build link URL with instance parameter if needed
    const eventUrl = occurrence.instanceDate
        ? `/event/${occurrence.eventAuthorId}/${occurrence.eventId}?instance=${encodeURIComponent(occurrence.instanceDate)}`
        : `/event/${occurrence.eventAuthorId}/${occurrence.eventId}`;

    const statusColor = getStatusColor(occurrence.status);
    const isPastEvent = new Date(occurrence.date) < new Date();

    return (
        <Link
            href={eventUrl}
            className={cn(
                "block p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isPastEvent && "opacity-60"
            )}
        >
            <div className="flex items-start gap-3">
                {/* Date Column */}
                <div className="flex flex-col items-center justify-center bg-primary/10 rounded-lg p-3 min-w-[80px]">
                    <span className="text-xs font-medium text-primary uppercase">
                        {formattedDate.month}
                    </span>
                    <span className="text-2xl font-bold text-primary">
                        {formattedDate.day}
                    </span>
                    <span className="text-xs text-muted-foreground">
                        {formattedDate.weekday}
                    </span>
                </div>

                {/* Event Details */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-base line-clamp-2">
                            {occurrence.summary}
                        </h3>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                            {isPastEvent && (
                                <Badge variant="outline" className="text-xs">
                                    Past
                                </Badge>
                            )}
                            {occurrence.isRecurring && (
                                <Badge variant="secondary" className="gap-1">
                                    <Repeat className="h-3 w-3" />
                                </Badge>
                            )}
                            {occurrence.status && occurrence.status !== "CONFIRMED" && (
                                <Badge
                                    variant="outline"
                                    className={cn("text-xs", statusColor)}
                                >
                                    {occurrence.status}
                                </Badge>
                            )}
                        </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                        {formattedDate.time}
                    </p>
                </div>
            </div>
        </Link>
    );
}

// Helper functions

function getStatusColor(status?: string): string {
    switch (status) {
        case "CANCELLED":
            return "text-destructive";
        case "TENTATIVE":
            return "text-warning";
        default:
            return "";
    }
}
