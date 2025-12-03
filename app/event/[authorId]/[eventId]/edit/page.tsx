"use client";

import { use } from "react";
import { CreateEventPageLayout } from "@/components/event/create/create-event-page-layout";

interface EditEventPageProps {
    params: Promise<{
        authorId: string;
        eventId: string;
    }>;
}

export default function EditEventPage({ params }: EditEventPageProps) {
    const { authorId, eventId } = use(params);

    return (
        <CreateEventPageLayout
            mode="edit"
            authorId={authorId}
            eventId={eventId}
        />
    );
}
