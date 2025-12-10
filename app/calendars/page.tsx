"use client";

import { useCalendarsStream } from "@/hooks/use-calendar-hooks";
import { DevJsonView } from "@/components/dev-json-view";
import Link from "next/link";

export default function CalendarsPage() {
    const { data: calendars, isLoading, error } = useCalendarsStream({ limit: 50 });

    return (
        <div className="space-y-4">
            {/* Debug links - remove later */}
            {calendars && calendars.length > 0 && (
                <div className="p-2 text-xs space-y-1">
                    <p className="text-muted-foreground">Debug links:</p>
                    {calendars.slice(0, 10).map((calendar) => (
                        <div key={calendar.id}>
                            <Link
                                href={`/calendar/${calendar.author}/${calendar.id}`}
                                className="text-primary hover:underline"
                            >
                                {calendar.name || calendar.id}
                            </Link>
                        </div>
                    ))}
                </div>
            )}
            <DevJsonView
                data={calendars}
                title="Calendars Stream"
                isLoading={isLoading}
                error={error as Error}
            />
        </div>
    );
}
