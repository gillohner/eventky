"use client";

import { use } from "react";
import { useEvent } from "@/hooks/use-event-optimistic";
import { DevJsonView } from "@/components/dev-json-view";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { Edit } from "lucide-react";
import { SyncBadge } from "@/components/ui/sync-status-indicator";

interface EventPageProps {
  params: Promise<{
    authorId: string;
    eventId: string;
  }>;
}

export default function EventPage({ params }: EventPageProps) {
  const { authorId, eventId } = use(params);
  const { data: event, isLoading, error, syncStatus, isOptimistic } = useEvent(authorId, eventId);
  const router = useRouter();
  const { auth } = useAuth();
  const isOwner = auth?.publicKey === authorId;

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-4">
        {isOwner && (
          <Button onClick={() => router.push(`/event/${authorId}/${eventId}/edit`)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Event
          </Button>
        )}
        {isOptimistic && (
          <SyncBadge status={syncStatus} />
        )}
      </div>
      <DevJsonView
        data={event}
        title={`Event: ${authorId}/${eventId}`}
        isLoading={isLoading}
        error={error as Error}
      />
    </div>
  );
}
