"use client";

import { use } from "react";
import { CreateCalendarPageLayout } from "@/components/calendar/create/create-calendar-page-layout";

interface EditCalendarPageProps {
    params: Promise<{
        authorId: string;
        calendarId: string;
    }>;
}

export default function EditCalendarPage({ params }: EditCalendarPageProps) {
    const { authorId, calendarId } = use(params);

    return (
        <CreateCalendarPageLayout
            mode="edit"
            authorId={authorId}
            calendarId={calendarId}
        />
    );
}
