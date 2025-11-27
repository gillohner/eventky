import { EventPageLayout } from "@/components/event/view/event-page-layout";
import { use } from "react";

interface EventPageProps {
  params: Promise<{
    authorId: string;
    eventId: string;
  }>;
}

export default function EventPage({ params }: EventPageProps) {
  const { authorId, eventId } = use(params);

  return <EventPageLayout authorId={authorId} eventId={eventId} />;
}
