"use client";

import { useCalendarsStream } from "@/hooks/use-calendar-hooks";
import { useDebugView } from "@/hooks";
import { DevJsonView } from "@/components/dev-json-view";
import { DebugViewToggle } from "@/components/ui/debug-view-toggle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function CalendarsPage() {
    const { data: calendars, isLoading, error } = useCalendarsStream({ limit: 50 });
    const { debugEnabled, showRawData, toggleRawData } = useDebugView();

    return (
        <div className="container py-8 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Calendars</h1>
                    <p className="text-muted-foreground">
                        Browse and manage calendars
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
                    {calendars && calendars.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm">Quick Links</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-1">
                                {calendars.slice(0, 10).map((calendar) => (
                                    <div key={calendar.id}>
                                        <Link
                                            href={`/calendar/${calendar.author}/${calendar.id}`}
                                            className="text-sm text-primary hover:underline"
                                        >
                                            {calendar.name || calendar.id}
                                        </Link>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}
                    <DevJsonView
                        data={calendars}
                        title="Calendars Stream Data"
                        isLoading={isLoading}
                        error={error ? (error as Error) : undefined}
                    />
                </div>
            ) : (
                <Card>
                    <CardContent className="py-12 text-center">
                        {isLoading ? (
                            <p className="text-muted-foreground">Loading calendars...</p>
                        ) : calendars && calendars.length > 0 ? (
                            <div className="space-y-2">
                                {calendars.map((calendar) => (
                                    <Link
                                        key={calendar.id}
                                        href={`/calendar/${calendar.author}/${calendar.id}`}
                                        className="block p-4 rounded-lg border hover:bg-accent transition-colors"
                                    >
                                        <h3 className="font-semibold">{calendar.name || calendar.id}</h3>
                                        {calendar.description && (
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {calendar.description}
                                            </p>
                                        )}
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <p className="text-muted-foreground">No calendars found</p>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
