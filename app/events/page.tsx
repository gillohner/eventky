"use client";

import { useEventsStream } from "@/hooks/use-event-optimistic";
import { DevJsonView } from "@/components/dev-json-view";
import Link from "next/link";

export default function EventsPage() {
    const { data: events, isLoading, error } = useEventsStream({ limit: 50 });

    return (
        <div className="space-y-4">
            {/* Debug links - remove later */}
            {events && events.length > 0 && (
                <div className="p-2 text-xs space-y-1">
                    <p className="text-muted-foreground">Debug links:</p>
                    {events.slice(0, 10).map((event) => (
                        <div key={event.id}>
                            <Link
                                href={`/event/${event.author}/${event.id}`}
                                className="text-primary hover:underline"
                            >
                                {event.summary || event.id}
                            </Link>
                        </div>
                    ))}
                </div>
            )}
            <DevJsonView
                data={events}
                title="Events Stream"
                isLoading={isLoading}
                error={error as Error}
            />
        </div>
    );
}
