"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useCalendarsStream } from "@/hooks/use-calendar-hooks";
import { useEventsStream } from "@/hooks/use-event-hooks";
import { useDebugView } from "@/hooks";
import { DevJsonView } from "@/components/dev-json-view";
import { DebugViewToggle } from "@/components/ui/debug-view-toggle";
import { CalendarStreamFilters, type CalendarStreamFilterValues } from "@/components/calendar/stream/calendar-stream-filters";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Tag } from "lucide-react";
import Link from "next/link";
import { getPubkyImageUrl } from "@/lib/pubky/utils";
import Image from "next/image";
import { fetchCalendarViewsBatch } from "@/lib/nexus/calendars";

export default function CalendarsPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    // Initialize filters from URL search params
    const [filters, setFilters] = useState<CalendarStreamFilterValues>(() => {
        const search = searchParams.get("search");
        const author = searchParams.get("author");
        const tags = searchParams.get("tags");

        return {
            search: search || undefined,
            author: author || undefined,
            tags: tags ? tags.split(",") : undefined,
        };
    });

    const { data: calendars, isLoading: calendarsLoading } = useCalendarsStream({ limit: 100 });
    const { data: events, isLoading: eventsLoading } = useEventsStream({ limit: 1000 });
    const { debugEnabled, showRawData, toggleRawData } = useDebugView();

    // Fetch calendar views with tags for all calendars
    const { data: calendarViews } = useQuery({
        queryKey: ['calendar-views', calendars?.map(c => c.id).join(',')],
        queryFn: async () => {
            if (!calendars || calendars.length === 0) return new Map();
            return fetchCalendarViewsBatch(
                calendars.map(c => ({ author: c.author, id: c.id })),
                20, // limitTags
                5   // limitTaggers
            );
        },
        enabled: !!calendars && calendars.length > 0,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    // Filter calendars based on search and author
    const filteredCalendars = useMemo(() => {
        if (!calendars) return calendars;

        return calendars.filter((calendar) => {
            // Author filter
            if (filters.author && calendar.author !== filters.author) {
                return false;
            }

            // Search filter (name or description)
            if (filters.search) {
                const searchLower = filters.search.toLowerCase();
                const matchesName = calendar.name.toLowerCase().includes(searchLower);
                const matchesDescription = calendar.description?.toLowerCase().includes(searchLower) || false;
                if (!matchesName && !matchesDescription) {
                    return false;
                }
            }

            // Tags filter - calendar must have at least one matching tag
            if (filters.tags && filters.tags.length > 0 && calendarViews) {
                const viewKey = `${calendar.author}/${calendar.id}`;
                const view = calendarViews.get(viewKey);
                if (!view || !view.tags || view.tags.length === 0) {
                    return false;
                }
                const calendarTagLabels = view.tags.map((t: { label: string }) => t.label);
                const hasMatchingTag = filters.tags.some(filterTag =>
                    calendarTagLabels.includes(filterTag)
                );
                if (!hasMatchingTag) {
                    return false;
                }
            }

            return true;
        });
    }, [calendars, filters, calendarViews]);

    // Group calendars by author for stats
    const calendarsByAuthor = useMemo(() => {
        if (!filteredCalendars) return new Map();
        const map = new Map<string, typeof filteredCalendars>();
        filteredCalendars.forEach((cal) => {
            if (!map.has(cal.author)) {
                map.set(cal.author, []);
            }
            map.get(cal.author)!.push(cal);
        });
        return map;
    }, [filteredCalendars]);

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

    // Extract popular tags from all calendar views
    const popularTags = useMemo(() => {
        if (!calendarViews || !filteredCalendars) return [];
        const tagCounts = new Map<string, number>();

        filteredCalendars.forEach((calendar) => {
            const viewKey = `${calendar.author}/${calendar.id}`;
            const view = calendarViews.get(viewKey);
            if (view?.tags) {
                view.tags.forEach((tag: { label: string }) => {
                    tagCounts.set(tag.label, (tagCounts.get(tag.label) || 0) + 1);
                });
            }
        });

        // Convert to array and sort by count
        return Array.from(tagCounts.entries())
            .map(([label, count]) => ({ label, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 20); // Top 20 tags
    }, [calendarViews, filteredCalendars]);

    const isLoading = calendarsLoading || eventsLoading;

    // Update URL when filters change
    useEffect(() => {
        const params = new URLSearchParams();

        if (filters.search) {
            params.set("search", filters.search);
        }
        if (filters.author) {
            params.set("author", filters.author);
        }
        if (filters.tags && filters.tags.length > 0) {
            params.set("tags", filters.tags.join(","));
        }

        const queryString = params.toString();
        const newUrl = queryString ? `${pathname}?${queryString}` : pathname;

        // Only update if the URL actually changed
        if (newUrl !== `${pathname}${window.location.search}`) {
            router.replace(newUrl, { scroll: false });
        }
    }, [filters, pathname, router]);

    return (
        <div className="container max-w-7xl mx-auto py-8 px-4 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold mb-2">All Calendars</h1>
                    <p className="text-muted-foreground">
                        {filteredCalendars ? `${filteredCalendars.length} calendar${filteredCalendars.length !== 1 ? 's' : ''}` : "Loading calendars..."}
                        {filteredCalendars && calendars && filteredCalendars.length < calendars.length && (
                            <span className="text-xs"> (filtered from {calendars.length})</span>
                        )}
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

            {/* Filter Component */}
            <CalendarStreamFilters
                filters={filters}
                onFiltersChange={setFilters}
                popularTags={popularTags}
            />

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
                        {filteredCalendars?.map((calendar) => {
                            const eventCount = eventCountByCalendar.get(calendar.id) || 0;
                            const imageUrl = calendar.image_uri ? getPubkyImageUrl(calendar.image_uri, "main") : null;
                            const authorCalendars = calendarsByAuthor.get(calendar.author) || [];
                            const viewKey = `${calendar.author}/${calendar.id}`;
                            const calendarTags = calendarViews?.get(viewKey)?.tags || [];

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

                                                {/* Tags */}
                                                {calendarTags.length > 0 && (
                                                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                                        <Tag className="h-3 w-3 text-muted-foreground" />
                                                        {calendarTags.slice(0, 5).map((tag: { label: string }, idx: number) => (
                                                            <Badge
                                                                key={idx}
                                                                variant="outline"
                                                                className="text-xs px-1.5 py-0 h-5"
                                                            >
                                                                {tag.label}
                                                            </Badge>
                                                        ))}
                                                        {calendarTags.length > 5 && (
                                                            <span className="text-xs text-muted-foreground">
                                                                +{calendarTags.length - 5}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            );
                        })}
                    </div>

                    {/* Empty State */}
                    {!isLoading && (!filteredCalendars || filteredCalendars.length === 0) && (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                                {filters.search || filters.author || (filters.tags && filters.tags.length > 0) ? (
                                    <>
                                        <h3 className="text-lg font-semibold mb-2">No calendars match your filters</h3>
                                        <p className="text-muted-foreground mb-4">
                                            Try adjusting or clearing your filters
                                        </p>
                                        <Button variant="outline" onClick={() => setFilters({})}>
                                            Clear Filters
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <h3 className="text-lg font-semibold mb-2">No calendars found</h3>
                                        <p className="text-muted-foreground mb-4">
                                            Get started by creating your first calendar
                                        </p>
                                        <Button asChild>
                                            <Link href="/calendar/create">
                                                Create Calendar
                                            </Link>
                                        </Button>
                                    </>
                                )}
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
