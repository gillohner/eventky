"use client";

import { useEventsStream } from "@/hooks/use-event-optimistic";
import { DevJsonView } from "@/components/dev-json-view";

export default function EventsPage() {
    const { data: events, isLoading, error } = useEventsStream({ limit: 50 });

    return (
        <DevJsonView
            data={events}
            title="Events Stream"
            isLoading={isLoading}
            error={error as Error}
        />
    );
}
