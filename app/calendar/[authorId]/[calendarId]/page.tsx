"use client";

import { use } from "react";
import { useCalendar } from "@/hooks/use-calendar";
import { DevJsonView } from "@/components/dev-json-view";

interface CalendarPageProps {
    params: Promise<{
        authorId: string;
        calendarId: string;
    }>;
}

export default function CalendarPage({ params }: CalendarPageProps) {
    const { authorId, calendarId } = use(params);
    const { data: calendar, isLoading, error } = useCalendar(authorId, calendarId);

    return (
        <DevJsonView
            data={calendar}
            title={`Calendar: ${authorId}/${calendarId}`}
            isLoading={isLoading}
            error={error as Error}
        />
    );
}
