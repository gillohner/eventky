"use client";

import { use } from "react";
import { useSearchParams } from "next/navigation";
import { useEvent } from "@/hooks/use-event-optimistic";
import { useAuth } from "@/components/providers/auth-provider";
import { EventDetailLayout } from "@/components/event/detail";
import { SyncBadge } from "@/components/ui/sync-status-indicator";
import { DevJsonView } from "@/components/dev-json-view";
import { Button } from "@/components/ui/button";
import { Bug } from "lucide-react";
import { useState } from "react";
import { addTagToEvent, removeTagFromEvent } from "@/lib/pubky/tags";
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

  const { data: event, isLoading, error, syncStatus, isOptimistic } = useEvent(authorId, eventId);
  const { auth } = useAuth();
  const [showDevView, setShowDevView] = useState(false);

  const currentUserId = auth?.publicKey;
  const isLoggedIn = Boolean(auth?.publicKey);

  // TODO: Implement RSVP mutation
  const handleRsvp = async (status: string) => {
    console.log("RSVP:", status, instanceDate);
    // Will implement with pubky client
  };

  // Tag mutations
  const handleAddTag = async (label: string) => {
    if (!auth?.session || !currentUserId) {
      toast.error("Please sign in to add tags");
      return;
    }

    try {
      await addTagToEvent(
        auth.session,
        currentUserId,
        authorId,
        eventId,
        label
      );
      toast.success(`Tag "${label}" added`);
      // TODO: Invalidate queries to refresh tag data
    } catch (error) {
      console.error("Failed to add tag:", error);
      toast.error("Failed to add tag");
    }
  };

  const handleRemoveTag = async (label: string) => {
    if (!auth?.session || !currentUserId) {
      toast.error("Please sign in to remove tags");
      return;
    }

    try {
      await removeTagFromEvent(
        auth.session,
        currentUserId,
        authorId,
        eventId,
        label
      );
      toast.success(`Tag "${label}" removed`);
      // TODO: Invalidate queries to refresh tag data
    } catch (error) {
      console.error("Failed to remove tag:", error);
      toast.error("Failed to remove tag");
    }
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
        onAddTag={handleAddTag}
        onRemoveTag={handleRemoveTag}
      />
    </div>
  );
}
