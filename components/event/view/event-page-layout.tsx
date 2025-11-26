"use client";

import { useEvent } from "@/hooks/use-event";
import { Skeleton } from "@/components/ui/skeleton";

interface EventPageLayoutProps {
  authorId: string;
  eventId: string;
}

// TODO: Actual implementation not just boilerplate skeleton
export function EventPageLayout({ authorId, eventId }: EventPageLayoutProps) {
  const { data: event, isLoading, error } = useEvent(authorId, eventId);

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Event Image Skeleton */}
          <Skeleton className="w-full h-64 rounded-lg" />

          {/* Event Title Skeleton */}
          <Skeleton className="h-10 w-3/4" />

          {/* Event Details Skeleton */}
          <div className="space-y-4">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-6">
            <h2 className="text-lg font-semibold text-red-500 mb-2">Error Loading Event</h2>
            <p className="text-sm text-red-400">
              {error instanceof Error ? error.message : "Failed to load event"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="rounded-lg border border-border bg-card p-6 text-center">
            <h2 className="text-lg font-semibold mb-2">Event Not Found</h2>
            <p className="text-sm text-muted-foreground">
              The event you&apos;re looking for doesn&apos;t exist or has been removed.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Event Header */}
        <div className="space-y-4">
          {event.image_uri && (
            <div className="w-full h-64 rounded-lg overflow-hidden bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={event.image_uri}
                alt={event.summary}
                className="w-full h-64 object-cover rounded-lg"
              />
            </div>
          )}

          <h1 className="text-4xl font-bold tracking-tight">{event.summary}</h1>

          {event.status && (
            <div className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-primary/10 text-primary">
              {event.status}
            </div>
          )}
        </div>

        {/* Event Details */}
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Date & Time</h3>
            <p className="text-base">
              {new Date(Number(event.dtstart) / 1000).toLocaleString()}
              {event.dtend && ` - ${new Date(Number(event.dtend) / 1000).toLocaleString()}`}
            </p>
            {event.dtstart_tzid && (
              <p className="text-sm text-muted-foreground mt-1">{event.dtstart_tzid}</p>
            )}
          </div>

          {event.location && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Location</h3>
              <p className="text-base">{event.location}</p>
              {event.geo && (
                <p className="text-sm text-muted-foreground mt-1">
                  Coordinates: {event.geo}
                </p>
              )}
            </div>
          )}

          {event.description && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Description</h3>
              <p className="text-base whitespace-pre-wrap">{event.description}</p>
            </div>
          )}

          {event.categories && event.categories.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Categories</h3>
              <div className="flex flex-wrap gap-2">
                {event.categories.map((category: string, index: number) => (
                  <span
                    key={index}
                    className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-secondary text-secondary-foreground"
                  >
                    {category}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RSVP Section - Placeholder */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="text-lg font-semibold mb-4">RSVP</h3>
          <p className="text-sm text-muted-foreground">
            RSVP functionality coming soon...
          </p>
        </div>
      </div>
    </div>
  );
}
