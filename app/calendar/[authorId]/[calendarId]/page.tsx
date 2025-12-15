"use client";

import { use, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQueries } from "@tanstack/react-query";
import { parse_uri } from "pubky-app-specs";
import { useCalendar } from "@/hooks/use-calendar-hooks";
import { useDeleteCalendar } from "@/hooks/use-calendar-mutations";
import { useAddCalendarTagMutation, useRemoveCalendarTagMutation } from "@/hooks/use-calendar-tag-mutation";
import { useAuth } from "@/components/providers/auth-provider";
import { useDebugView } from "@/hooks";
import { CalendarDetailLayout } from "@/components/calendar/detail";
import { SyncBadge } from "@/components/ui/sync-status-indicator";
import { DevJsonView } from "@/components/dev-json-view";
import { DebugViewToggle } from "@/components/ui/debug-view-toggle";
import { Button } from "@/components/ui/button";
import { calendarUriBuilder } from "pubky-app-specs";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { fetchEventFromNexus } from "@/lib/nexus";
import { queryKeys } from "@/lib/cache";
import type { NexusEventResponse } from "@/lib/nexus/events";

interface CalendarPageProps {
    params: Promise<{
        authorId: string;
        calendarId: string;
    }>;
}

export default function CalendarPage({ params }: CalendarPageProps) {
    const { authorId, calendarId } = use(params);
    const router = useRouter();
    const { auth } = useAuth();
    const { debugEnabled, showRawData, toggleRawData } = useDebugView();

    // Fetch calendar data
    const {
        data: calendar,
        isLoading,
        error,
        syncStatus,
        isOptimistic
    } = useCalendar(authorId, calendarId);

    // Build calendar URI
    const calendarUri = calendar?.details.uri || calendarUriBuilder(authorId, calendarId);

    // Parse event URIs to get author and event IDs
    const eventQueries = useMemo(() => {
        const events = calendar?.events;
        if (!events || events.length === 0) return [];

        return events
            .map((uri) => {
                try {
                    const parsed = parse_uri(uri);
                    return {
                        authorId: parsed.user_id,
                        eventId: parsed.resource_id || "",
                    };
                } catch (error) {
                    console.error("Failed to parse event URI:", uri, error);
                    return null;
                }
            })
            .filter((item): item is { authorId: string; eventId: string } =>
                item !== null && item.eventId !== ""
            );
    }, [calendar?.events]);

    // Fetch all events in parallel using useQueries
    const eventResults = useQueries({
        queries: eventQueries.map(({ authorId: evAuthorId, eventId: evEventId }) => ({
            queryKey: queryKeys.events.detail(evAuthorId, evEventId, {}),
            queryFn: () => fetchEventFromNexus(evAuthorId, evEventId),
            staleTime: 5 * 60 * 1000, // 5 minutes
            enabled: Boolean(calendar),
        })),
    });

    // Combine results
    const events = useMemo(() => {
        return eventResults
            .map((result) => result.data)
            .filter((event): event is NexusEventResponse => event !== null && event !== undefined);
    }, [eventResults]);

    const isEventsLoading = eventResults.some((result) => result.isLoading);

    // Delete mutation hook
    const { mutate: deleteCalendar, isPending: isDeleting } = useDeleteCalendar({
        onSuccess: () => {
            router.push("/calendars");
        },
    });

    // Tag mutation hooks
    const { mutate: addTag } = useAddCalendarTagMutation();
    const { mutate: removeTag } = useRemoveCalendarTagMutation();

    const currentUserId = auth?.publicKey;
    const isLoggedIn = Boolean(auth?.publicKey);
    const isOwner = currentUserId === authorId;
    const isAuthor = calendar?.details.x_pubky_authors?.includes(currentUserId || "") ?? false;
    const canManage = isOwner || isAuthor;

    // Delete handler
    const handleDelete = () => {
        if (!currentUserId) {
            toast.error("Please sign in to delete calendars");
            return;
        }

        deleteCalendar({
            calendarId: calendarId,
        });
    };

    // Tag handlers
    const handleAddTag = (label: string) => {
        if (!currentUserId) {
            toast.error("Please sign in to add tags");
            return;
        }

        addTag({
            calendarAuthorId: authorId,
            calendarId: calendarId,
            label: label,
        });
    };

    const handleRemoveTag = (label: string) => {
        if (!currentUserId) {
            toast.error("Please sign in to remove tags");
            return;
        }

        removeTag({
            calendarAuthorId: authorId,
            calendarId: calendarId,
            label: label,
        });
    };

    return (
        <div className="container mx-auto py-8 px-4 max-w-6xl">
            {/* Top Bar - Add Event, Sync Status & Dev Toggle */}
            <div className="flex items-center justify-between mb-4">
                {/* Add Event Button */}
                <div>
                    {canManage && (
                        <Button
                            variant="default"
                            onClick={() => router.push(`/event/create?calendar=${encodeURIComponent(calendarUri)}`)}
                            className="gap-2"
                        >
                            <Plus className="h-4 w-4" />
                            Add Event
                        </Button>
                    )}
                </div>

                {/* Right Side - Sync & Debug */}
                <div className="flex items-center gap-2">
                    {isOptimistic && <SyncBadge status={syncStatus} />}
                    <DebugViewToggle
                        debugEnabled={debugEnabled}
                        showRawData={showRawData}
                        onToggle={toggleRawData}
                    />
                </div>
            </div>

            {/* Toggle between UI and Raw Data */}
            {showRawData ? (
                <DevJsonView
                    data={calendar}
                    title={`Calendar: ${authorId}/${calendarId}`}
                    isLoading={isLoading}
                    error={error ? (error as Error) : undefined}
                />
            ) : (
                <CalendarDetailLayout
                    calendar={calendar ?? null}
                    events={events}
                    isLoading={isLoading}
                    isEventsLoading={isEventsLoading}
                    error={error as Error | null}
                    currentUserId={currentUserId || undefined}
                    isLoggedIn={isLoggedIn}
                    onDelete={isOwner ? handleDelete : undefined}
                    isDeleting={isDeleting}
                    onAddTag={handleAddTag}
                    onRemoveTag={handleRemoveTag}
                />
            )}
        </div>
    );
}
