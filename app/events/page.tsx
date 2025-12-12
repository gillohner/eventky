"use client";

import { useEventsStream } from "@/hooks/use-event-hooks";
import { useDebugView } from "@/hooks";
import { DevJsonView } from "@/components/dev-json-view";
import { DebugViewToggle } from "@/components/ui/debug-view-toggle";
import { CalendarView } from "@/components/calendar/calendar-view";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function EventsPage() {
    const { data: events, isLoading, error } = useEventsStream({ limit: 100 });
    const { debugEnabled, showRawData, toggleRawData } = useDebugView();

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
                    <CalendarView events={events || []} />
                )
            )}
        </div>
    );
}
