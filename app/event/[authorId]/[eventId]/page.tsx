import { EventPageLayout } from "@/components/event/view/event-page-layout";

interface EventPageProps {
  params: {
    authorId: string;
    eventId: string;
  };
}

export default function EventPage({ params }: EventPageProps) {
  const { authorId, eventId } = params;

  return <EventPageLayout authorId={authorId} eventId={eventId} />;
}
