"use client";

import { useState } from "react";
import { useEventsStream } from "@/hooks/use-event-hooks";
import { DevJsonView } from "@/components/dev-json-view";
import { CalendarView } from "@/components/calendar/calendar-view";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function EventsPage() {
    const { data: events, isLoading, error } = useEventsStream({ limit: 100 });
    const [viewType, setViewType] = useState<"calendar" | "debug">("calendar");

    if (error) {
        return (
            <div className="container py-8">
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
        <div className="container py-8 space-y-6">
            <div>
                <h1 className="text-3xl font-bold mb-2">Events</h1>
                <p className="text-muted-foreground">
                    View and manage all events across calendars
                </p>
            </div>

            <Tabs value={viewType} onValueChange={(v) => setViewType(v as "calendar" | "debug")}>
                <TabsList>
                    <TabsTrigger value="calendar">Calendar View</TabsTrigger>
                    <TabsTrigger value="debug">Debug View</TabsTrigger>
                </TabsList>

                <TabsContent value="calendar" className="mt-6">
                    {isLoading ? (
                        <Card>
                            <CardContent className="py-12 text-center text-muted-foreground">
                                Loading events...
                            </CardContent>
                        </Card>
                    ) : (
                        <CalendarView events={events || []} />
                    )}
                </TabsContent>

                <TabsContent value="debug" className="mt-6">
                    {/* Debug links */}
                    {events && events.length > 0 && (
                        <Card className="mb-4">
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
                </TabsContent>
            </Tabs>
        </div>
    );
}
