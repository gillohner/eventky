"use client";

import { use } from "react";
import { useEvent } from "@/hooks/use-event";
import { DevJsonView } from "@/components/dev-json-view";

interface EventPageProps {
  params: Promise<{
    authorId: string;
    eventId: string;
  }>;
}

export default function EventPage({ params }: EventPageProps) {
  const { authorId, eventId } = use(params);
  const { data: event, isLoading, error } = useEvent(authorId, eventId);

  return (
    <DevJsonView
      data={event}
      title={`Event: ${authorId}/${eventId}`}
      isLoading={isLoading}
      error={error as Error}
    />
  );
}
