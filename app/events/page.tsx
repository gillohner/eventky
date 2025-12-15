"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useEventsStream } from "@/hooks/use-event-hooks";
import { useCalendarsStream } from "@/hooks/use-calendar-hooks";
import { useDebugView } from "@/hooks";
import { DevJsonView } from "@/components/dev-json-view";
import { DebugViewToggle } from "@/components/ui/debug-view-toggle";
import { CalendarView } from "@/components/calendar/calendar-view";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EventStreamFilters, type EventStreamFilterValues } from "@/components/event/stream/event-stream-filters";
import Link from "next/link";
import type { CalendarFilterOption } from "@/types/calendar-view";

export default function EventsPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    // Initialize filters from URL search params, defaulting to upcoming events (from today)
    const [filters, setFilters] = useState<EventStreamFilterValues>(() => {
        const tags = searchParams.get("tags");
        const status = searchParams.get("status");
        const author = searchParams.get("author");
        const timezone = searchParams.get("timezone");
        const start_date = searchParams.get("start_date");
        const end_date = searchParams.get("end_date");

        // Set default to today at midnight (start of day)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const defaultStartDate = today.getTime() * 1000; // Convert to microseconds

        return {
            tags: tags ? tags.split(",") : undefined,
            status: status || undefined,
            author: author || undefined,
            timezone: timezone || undefined,
            // Default to upcoming events from today onwards, no end date
            start_date: start_date ? parseInt(start_date) : defaultStartDate,
            end_date: end_date ? parseInt(end_date) : undefined,
        };
    });

    const { data: events, isLoading, error } = useEventsStream({
        limit: 100,
        ...filters
    });

    // Fetch all calendars for color mapping
    const { data: calendarsData } = useCalendarsStream({ limit: 100 });

    const { debugEnabled, showRawData, toggleRawData } = useDebugView();

    // Transform calendars to CalendarFilterOption format
    // Only show calendars that are actually referenced in the visible events
    const calendars = useMemo<CalendarFilterOption[] | undefined>(() => {
        if (!calendarsData || !events) return undefined;

        // Get unique calendar URIs from visible events
        const calendarUrisInEvents = new Set<string>();
        events.forEach((event) => {
            event.x_pubky_calendar_uris?.forEach((uri) => {
                calendarUrisInEvents.add(uri);
            });
        });

        // Extract calendar IDs from URIs
        const calendarIdsInEvents = new Set<string>();
        calendarUrisInEvents.forEach((uri) => {
            const match = uri.match(/calendars\/([^/]+)$/);
            if (match) {
                calendarIdsInEvents.add(match[1]);
            }
        });

        // Filter calendars to only those referenced by visible events
        return calendarsData
            .filter((cal) => calendarIdsInEvents.has(cal.id))
            .map((cal) => ({
                id: cal.id,
                name: cal.name,
                color: cal.color || "#3b82f6", // Default to blue if no color
            }));
    }, [calendarsData, events]);

    // Update URL when filters change
    useEffect(() => {
        const params = new URLSearchParams();

        if (filters.tags && filters.tags.length > 0) {
            params.set("tags", filters.tags.join(","));
        }
        if (filters.status) {
            params.set("status", filters.status);
        }
        if (filters.author) {
            params.set("author", filters.author);
        }
        if (filters.timezone) {
            params.set("timezone", filters.timezone);
        }
        if (filters.start_date) {
            params.set("start_date", filters.start_date.toString());
        }
        if (filters.end_date) {
            params.set("end_date", filters.end_date.toString());
        }

        const queryString = params.toString();
        const newUrl = queryString ? `${pathname}?${queryString}` : pathname;

        // Only update if the URL actually changed
        if (newUrl !== `${pathname}${window.location.search}`) {
            router.replace(newUrl, { scroll: false });
        }
    }, [filters, pathname, router]);

    if (error) {
        return (
            <div className="container max-w-7xl mx-auto py-8 px-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-destructive">Error Loading Events</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>{(error as Error).message}</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container max-w-7xl mx-auto py-8 px-4 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Events</h1>
                    <p className="text-muted-foreground">
                        View and manage all events across calendars
                    </p>
                </div>
                <DebugViewToggle
                    debugEnabled={debugEnabled}
                    showRawData={showRawData}
                    onToggle={toggleRawData}
                />
            </div>

            {/* Filter Component */}
            <EventStreamFilters
                filters={filters}
                onFiltersChange={setFilters}
            />

            {showRawData ? (
                <div className="space-y-4">
                    {/* Debug quick links */}
                    {events && events.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm">Quick Links</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-1">
                                {events.slice(0, 10).map((event) => (
                                    <div key={event.id}>
                                        <Link
                                            href={`/event/${event.author}/${event.id}`}
                                            className="text-sm text-primary hover:underline"
                                        >
                                            {event.summary || event.id}
                                        </Link>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}
                    <DevJsonView
                        data={events}
                        title="Events Stream Data"
                        isLoading={isLoading}
                        error={error ? (error as Error) : undefined}
                    />
                </div>
            ) : (
                isLoading ? (
                    <Card>
                        <CardContent className="py-12 text-center text-muted-foreground">
                            Loading events...
                        </CardContent>
                    </Card>
                ) : (
                    <CalendarView
                        events={events || []}
                        calendars={calendars}
                    />
                )
            )}
        </div>
    );
}
