"use client";

import { cn } from "@/lib/utils";
import { useAuthorProfile } from "@/hooks";
import { EventHeader } from "./event-header";
import { DateTimeRecurrence } from "./datetime-recurrence";
import { LocationDisplay } from "./location-display";
import { EventDescription } from "./event-description";
import { EventMetadata } from "./event-metadata";
import { AttendanceSection } from "./attendance-section";
import { TagsSection } from "./tags-section";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import type { NexusEventResponse } from "@/lib/nexus/events";

interface EventDetailLayoutProps {
    /** Event data from Nexus */
    event: NexusEventResponse | null;
    /** Whether event is loading */
    isLoading?: boolean;
    /** Error loading event */
    error?: Error | null;
    /** Current user's public key */
    currentUserId?: string;
    /** Whether current user is logged in */
    isLoggedIn?: boolean;
    /** Selected instance date for recurring events (from query param) */
    instanceDate?: string;
    /** Callback when user RSVPs */
    onRsvp?: (status: string) => void;
    /** Whether RSVP is in progress */
    isRsvpLoading?: boolean;
    /** Callback to add a tag */
    onAddTag?: (label: string) => void;
    /** Callback to remove a tag */
    onRemoveTag?: (label: string) => void;
    /** Whether tag operation is in progress */
    isTagLoading?: boolean;
    /** Callback to delete the event */
    onDelete?: () => void;
    /** Whether delete is in progress */
    isDeleting?: boolean;
    /** Additional CSS classes */
    className?: string;
}

/**
 * Main event detail page layout
 * Composes all detail components with proper grid layout
 */
export function EventDetailLayout({
    event,
    isLoading,
    error,
    currentUserId,
    isLoggedIn,
    instanceDate,
    onRsvp,
    isRsvpLoading,
    onAddTag,
    onRemoveTag,
    isTagLoading,
    onDelete,
    isDeleting,
    className,
}: EventDetailLayoutProps) {
    // Hooks must be called unconditionally (before any early returns)
    // Fetch author profile for display - uses event author if available
    const { author } = useAuthorProfile(event?.details.author);

    // Loading state
    if (isLoading) {
        return <EventDetailSkeleton />;
    }

    // Error state
    if (error) {
        return (
            <Card className={cn("", className)}>
                <CardContent className="flex flex-col items-center justify-center py-12">
                    <AlertCircle className="h-12 w-12 text-destructive mb-4" />
                    <h2 className="text-xl font-semibold mb-2">Error Loading Event</h2>
                    <p className="text-muted-foreground text-center">
                        {error.message || "Failed to load event details"}
                    </p>
                </CardContent>
            </Card>
        );
    }

    // No event found
    if (!event) {
        return (
            <Card className={cn("", className)}>
                <CardContent className="flex flex-col items-center justify-center py-12">
                    <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                    <h2 className="text-xl font-semibold mb-2">Event Not Found</h2>
                    <p className="text-muted-foreground text-center">
                        This event may have been deleted or you may not have permission to view it.
                    </p>
                </CardContent>
            </Card>
        );
    }

    const { details, tags, attendees } = event;
    const isOwner = currentUserId === details.author;
    const isRecurring = Boolean(details.rrule);
    const recurrenceLabel = isRecurring ? parseRRuleLabel(details.rrule!) : undefined;

    // Determine which instance we're showing
    const displayInstanceDate = instanceDate || (isRecurring ? details.dtstart : undefined);

    return (
        <div className={cn("space-y-6", className)}>
            {/* Header - Full width */}
            <EventHeader
                summary={details.summary}
                authorId={details.author}
                authorName={author?.name}
                authorAvatar={author?.avatarUrl ?? undefined}
                imageUri={details.image_uri}
                status={details.status}
                isRecurring={isRecurring}
                recurrenceLabel={recurrenceLabel}
                instanceDate={instanceDate}
                isOwner={isOwner}
                eventId={details.id}
                onDelete={onDelete}
                isDeleting={isDeleting}
                calendarUri={details.x_pubky_calendar_uris?.[0]}
            />

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - DateTime/Recurrence, Description, Location, Details */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Unified Date & Time with Recurrence - Full width for better readability */}
                    <DateTimeRecurrence
                        dtstart={details.dtstart}
                        dtend={details.dtend}
                        duration={details.duration}
                        dtstartTzid={details.dtstart_tzid}
                        dtendTzid={details.dtend_tzid}
                        rrule={details.rrule}
                        rdate={details.rdate}
                        exdate={details.exdate}
                        authorId={details.author}
                        eventId={details.id}
                        selectedInstance={displayInstanceDate}
                        currentUserId={currentUserId}
                        attendees={attendees}
                    />

                    {/* Description */}
                    <EventDescription
                        description={details.description}
                        styledDescription={details.styled_description}
                    />

                    {/* Location */}
                    <LocationDisplay
                        location={details.location}
                        geo={details.geo}
                    />
                </div>

                {/* Right Column - Attendance, Tags */}
                <div className="space-y-6">
                    {/* Attendance */}
                    <AttendanceSection
                        attendees={attendees}
                        currentUserId={currentUserId}
                        canRsvp={isLoggedIn}
                        rsvpAccess={details.x_pubky_rsvp_access}
                        instanceDate={isRecurring ? displayInstanceDate : undefined}
                        eventAuthorId={details.author}
                        eventId={details.id}
                        onRsvp={onRsvp}
                        isRsvpLoading={isRsvpLoading}
                    />

                    {/* Tags */}
                    <TagsSection
                        tags={tags}
                        isLoggedIn={isLoggedIn}
                        currentUserId={currentUserId}
                        eventAuthorId={details.author}
                        eventId={details.id}
                        onAddTag={onAddTag}
                        onRemoveTag={onRemoveTag}
                        isTagLoading={isTagLoading}
                        isRecurring={isRecurring}
                    />


                    {/* Metadata/Details */}
                    <EventMetadata
                        event={event}
                        url={details.url}
                        status={details.status}
                        calendarUris={details.x_pubky_calendar_uris}
                        rsvpAccess={details.x_pubky_rsvp_access}
                        sequence={details.sequence}
                        lastModified={details.last_modified}
                        created={details.created}
                        eventUri={details.uri}
                        authorId={details.author}
                        eventId={details.id}
                    />
                </div>
            </div>
        </div>
    );
}

/**
 * Loading skeleton for event detail
 */
function EventDetailSkeleton() {
    return (
        <div className="space-y-6">
            {/* Header skeleton */}
            <div className="rounded-xl overflow-hidden border bg-card">
                <Skeleton className="h-48 w-full" />
                <div className="p-6 space-y-4">
                    <Skeleton className="h-8 w-3/4" />
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-20" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Grid skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Skeleton className="h-48 w-full rounded-xl" />
                    <Skeleton className="h-32 w-full rounded-xl" />
                    <Skeleton className="h-64 w-full rounded-xl" />
                </div>
                <div className="space-y-6">
                    <Skeleton className="h-48 w-full rounded-xl" />
                    <Skeleton className="h-32 w-full rounded-xl" />
                    <Skeleton className="h-40 w-full rounded-xl" />
                </div>
            </div>
        </div>
    );
}

/**
 * Parse RRULE to simple label
 */
function parseRRuleLabel(rrule: string): string {
    const parts = rrule.split(";").reduce((acc, part) => {
        const [key, value] = part.split("=");
        acc[key] = value;
        return acc;
    }, {} as Record<string, string>);

    const freq = parts["FREQ"];
    const interval = parseInt(parts["INTERVAL"] || "1");

    switch (freq) {
        case "DAILY":
            return interval === 1 ? "Daily" : `Every ${interval} days`;
        case "WEEKLY":
            return interval === 1 ? "Weekly" : `Every ${interval} weeks`;
        case "MONTHLY":
            return interval === 1 ? "Monthly" : `Every ${interval} months`;
        case "YEARLY":
            return interval === 1 ? "Yearly" : `Every ${interval} years`;
        default:
            return "Recurring";
    }
}
