"use client";

import { use } from "react";
import { useSearchParams } from "next/navigation";
import { useEvent } from "@/hooks/use-event-hooks";
import { useRsvpMutation } from "@/hooks/use-rsvp-mutation";
import { useAddTagMutation, useRemoveTagMutation } from "@/hooks/use-tag-mutation";
import { useAuth } from "@/components/providers/auth-provider";
import { EventDetailLayout } from "@/components/event/detail";
import { SyncBadge } from "@/components/ui/sync-status-indicator";
import { DevJsonView } from "@/components/dev-json-view";
import { Button } from "@/components/ui/button";
import { Bug } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface EventPageProps {
  params: Promise<{
    authorId: string;
    eventId: string;
  }>;
}

export default function EventPage({ params }: EventPageProps) {
  const { authorId, eventId } = use(params);
  const searchParams = useSearchParams();
  const instanceDate = searchParams.get("instance") || undefined;

  const { data: event, isLoading, error, syncStatus, isOptimistic } = useEvent(authorId, eventId, {
    limitTags: 50,
    limitAttendees: 100,
  });
  const { auth } = useAuth();
  const [showDevView, setShowDevView] = useState(false);

  // RSVP mutation hook
  const { mutate: rsvp, isPending: isRsvpLoading } = useRsvpMutation();

  // Tag mutation hooks
  const { mutate: addTag } = useAddTagMutation();
  const { mutate: removeTag } = useRemoveTagMutation();

  const currentUserId = auth?.publicKey;
  const isLoggedIn = Boolean(auth?.publicKey);

  // Handle RSVP submission
  const handleRsvp = (status: string) => {
    if (!currentUserId) {
      toast.error("Please sign in to RSVP");
      return;
    }

    rsvp({
      eventAuthorId: authorId,
      eventId: eventId,
      partstat: status,
      recurrenceId: instanceDate,
    });
  };

  // Tag handlers
  const handleAddTag = (label: string) => {
    if (!currentUserId) {
      toast.error("Please sign in to add tags");
      return;
    }

    addTag({
      eventAuthorId: authorId,
      eventId: eventId,
      label: label,
    });
  };

  const handleRemoveTag = (label: string) => {
    if (!currentUserId) {
      toast.error("Please sign in to remove tags");
      return;
    }

    removeTag({
      eventAuthorId: authorId,
      eventId: eventId,
      label: label,
    });
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      {/* Sync Status & Dev Toggle */}
      <div className="flex items-center justify-end gap-2 mb-4">
        {isOptimistic && <SyncBadge status={syncStatus} />}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowDevView(!showDevView)}
          className="text-muted-foreground"
        >
          <Bug className="h-4 w-4 mr-1" />
          {showDevView ? "Hide" : "Show"} Raw Data
        </Button>
      </div>

      {/* Dev JSON View (toggleable) */}
      {showDevView && (
        <div className="mb-6">
          <DevJsonView
            data={event}
            title={`Event: ${authorId}/${eventId}`}
            isLoading={isLoading}
            error={error as Error}
          />
        </div>
      )}

      {/* Main Event Detail Layout */}
      <EventDetailLayout
        event={event ?? null}
        isLoading={isLoading}
        error={error as Error | null}
        currentUserId={currentUserId || undefined}
        isLoggedIn={isLoggedIn}
        instanceDate={instanceDate}
        onRsvp={handleRsvp}
        isRsvpLoading={isRsvpLoading}
        onAddTag={handleAddTag}
        onRemoveTag={handleRemoveTag}
      />
    </div>
  );
}
