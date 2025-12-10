"use client";

import { cn } from "@/lib/utils";
import { CalendarHeader } from "./calendar-header";
import { CalendarMetadata } from "./calendar-metadata";
import { CalendarEventsSection } from "./calendar-events-section";
import { CalendarTagsSection } from "./calendar-tags-section";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import type { CachedCalendar } from "@/types/nexus";
import type { NexusEventResponse } from "@/lib/nexus/events";

interface CalendarDetailLayoutProps {
    /** Calendar data from Nexus */
    calendar: CachedCalendar | null;
    /** Events for this calendar */
    events?: NexusEventResponse[];
    /** Whether calendar is loading */
    isLoading?: boolean;
    /** Whether events are loading */
    isEventsLoading?: boolean;
    /** Error loading calendar */
    error?: Error | null;
    /** Current user's public key */
    currentUserId?: string;
    /** Whether current user is logged in */
    isLoggedIn?: boolean;
    /** Callback to delete the calendar */
    onDelete?: () => void;
    /** Whether delete is in progress */
    isDeleting?: boolean;
    /** Callback to add a tag */
    onAddTag?: (label: string) => void;
    /** Callback to remove a tag */
    onRemoveTag?: (label: string) => void;
    /** Additional CSS classes */
    className?: string;
}

/**
 * Main calendar detail page layout
 * Composes all detail components with proper grid layout
 */
export function CalendarDetailLayout({
    calendar,
    events = [],
    isLoading,
    isEventsLoading,
    error,
    currentUserId,
    onDelete,
    isDeleting,
    onAddTag,
    onRemoveTag,
    className,
}: CalendarDetailLayoutProps) {
    // Loading state
    if (isLoading) {
        return <CalendarDetailSkeleton />;
    }

    // Error state
    if (error) {
        return (
            <Card className={cn("", className)}>
                <CardContent className="flex flex-col items-center justify-center py-12">
                    <AlertCircle className="h-12 w-12 text-destructive mb-4" />
                    <h2 className="text-xl font-semibold mb-2">Error Loading Calendar</h2>
                    <p className="text-muted-foreground text-center">
                        {error.message || "Failed to load calendar details"}
                    </p>
                </CardContent>
            </Card>
        );
    }

    // No calendar found
    if (!calendar) {
        return (
            <Card className={cn("", className)}>
                <CardContent className="flex flex-col items-center justify-center py-12">
                    <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                    <h2 className="text-xl font-semibold mb-2">Calendar Not Found</h2>
                    <p className="text-muted-foreground text-center">
                        This calendar may have been deleted or you may not have permission to view it.
                    </p>
                </CardContent>
            </Card>
        );
    }

    const { details } = calendar;
    const isOwner = currentUserId === details.author;
    const eventCount = events.length;
    const adminCount = details.x_pubky_admins?.length || 0;

    return (
        <div className={cn("space-y-6", className)}>
            {/* Header - Full width */}
            <CalendarHeader
                name={details.name}
                authorId={details.author}
                imageUri={details.image_uri}
                color={details.color}
                timezone={details.timezone}
                eventCount={eventCount}
                adminCount={adminCount}
                isOwner={isOwner}
                calendarId={details.id}
                onDelete={onDelete}
                isDeleting={isDeleting}
            />

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Events List */}
                <div className="lg:col-span-2 space-y-6">
                    <CalendarEventsSection
                        events={events}
                        calendarTimezone={details.timezone}
                        isLoading={isEventsLoading}
                        maxOccurrencesPerEvent={5}
                        maxTotalOccurrences={20}
                    />
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                    {/* Tags */}
                    <CalendarTagsSection
                        tags={calendar.tags}
                        isLoggedIn={Boolean(currentUserId)}
                        currentUserId={currentUserId}
                        calendarAuthorId={details.author}
                        calendarId={details.id}
                        onAddTag={onAddTag}
                        onRemoveTag={onRemoveTag}
                    />

                    {/* Metadata */}
                    <CalendarMetadata
                        url={details.url}
                        description={details.description}
                        timezone={details.timezone}
                        calendarUri={details.uri}
                        admins={details.x_pubky_admins}
                        sequence={details.sequence}
                        lastModified={details.last_modified}
                        created={details.created}
                    />
                </div>
            </div>

            {/* Future: Calendar View Section */}
            {/* TODO: Add shadcn calendar component view */}
            {/* <CalendarViewSection events={events} timezone={details.timezone} /> */}
        </div>
    );
}

/**
 * Loading skeleton for calendar detail
 */
function CalendarDetailSkeleton() {
    return (
        <div className="space-y-6">
            {/* Header Skeleton */}
            <Card>
                <div className="h-48 bg-muted animate-pulse" />
                <div className="p-6 space-y-4">
                    <div className="flex items-start gap-4">
                        <Skeleton className="h-16 w-16 rounded-full" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-8 w-64" />
                            <Skeleton className="h-4 w-32" />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Skeleton className="h-6 w-24" />
                        <Skeleton className="h-6 w-24" />
                    </div>
                </div>
            </Card>

            {/* Content Grid Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <Card>
                        <div className="p-6 space-y-3">
                            <Skeleton className="h-20 w-full" />
                            <Skeleton className="h-20 w-full" />
                            <Skeleton className="h-20 w-full" />
                        </div>
                    </Card>
                </div>
                <div>
                    <Card>
                        <div className="p-6 space-y-3">
                            <Skeleton className="h-6 w-32" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-full" />
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
