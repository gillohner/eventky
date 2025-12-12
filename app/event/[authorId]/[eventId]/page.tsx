"use client";

import { use } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useEvent } from "@/hooks/use-event-hooks";
import { useRsvpMutation } from "@/hooks/use-rsvp-mutation";
import { useAddTagMutation, useRemoveTagMutation } from "@/hooks/use-tag-mutation";
import { useDeleteEvent } from "@/hooks/use-event-mutations";
import { useAuth } from "@/components/providers/auth-provider";
import { useDebugView } from "@/hooks";
import { EventDetailLayout } from "@/components/event/detail";
import { SyncBadge } from "@/components/ui/sync-status-indicator";
import { DevJsonView } from "@/components/dev-json-view";
import { DebugViewToggle } from "@/components/ui/debug-view-toggle";
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
  const router = useRouter();
  const instanceDate = searchParams.get("instance") || undefined;

  const { data: event, isLoading, error, syncStatus, isOptimistic } = useEvent(authorId, eventId, {
    limitTags: 50,
    limitAttendees: 100,
  });
  const { auth } = useAuth();
  const { debugEnabled, showRawData, toggleRawData } = useDebugView();

  // RSVP mutation hook
  const { mutate: rsvp, isPending: isRsvpLoading } = useRsvpMutation();

  // Tag mutation hooks
  const { mutate: addTag } = useAddTagMutation();
  const { mutate: removeTag } = useRemoveTagMutation();

  // Delete mutation hook
  const { mutate: deleteEvent, isPending: isDeleting } = useDeleteEvent({
    onSuccess: () => {
      router.push("/events");
    },
  });

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

  // Delete handler
  const handleDelete = () => {
    if (!currentUserId) {
      toast.error("Please sign in to delete events");
      return;
    }

    deleteEvent({
      eventId: eventId,
    });
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      {/* Sync Status & Debug Toggle */}
      <div className="flex items-center justify-end gap-2 mb-4">
        {isOptimistic && <SyncBadge status={syncStatus} />}
        <DebugViewToggle
          debugEnabled={debugEnabled}
          showRawData={showRawData}
          onToggle={toggleRawData}
        />
      </div>

      {/* Toggle between UI and Raw Data */}
      {showRawData ? (
        <DevJsonView
          data={event}
          title={`Event: ${authorId}/${eventId}`}
          isLoading={isLoading}
          error={error ? (error as Error) : undefined}
        />
      ) : (
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
          onDelete={handleDelete}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
}
