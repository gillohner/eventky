"use client";

import { useCalendarsStream } from "@/hooks/use-calendar-optimistic";
import { DevJsonView } from "@/components/dev-json-view";

export default function CalendarsPage() {
    const { data: calendars, isLoading, error } = useCalendarsStream({ limit: 50 });

    return (
        <DevJsonView
            data={calendars}
            title="Calendars Stream"
            isLoading={isLoading}
            error={error as Error}
        />
    );
}
