"use client";

import { EventTagsSection as BaseTagsSection } from "@/components/event/detail/event-tags-section";
import { getPendingCalendarTags } from "@/hooks/use-calendar-tag-mutation";
import { useMemo } from "react";

interface CalendarTag {
    label: string;
    taggers: string[];
    taggers_count: number;
    relationship: boolean;
}

interface CalendarTagsSectionProps {
    /** Tags on the calendar */
    tags: CalendarTag[];
    /** Whether user is logged in */
    isLoggedIn?: boolean;
    /** Current user's public key */
    currentUserId?: string;
    /** Calendar author ID */
    calendarAuthorId?: string;
    /** Calendar ID */
    calendarId?: string;
    /** Callback to add a tag */
    onAddTag?: (label: string) => void;
    /** Callback to remove a tag */
    onRemoveTag?: (label: string) => void;
    /** Whether tag operation is in progress */
    isTagLoading?: boolean;
    /** Additional CSS classes */
    className?: string;
}

/**
 * Display and manage calendar tags
 * Reuses the event TagsSection component with calendar-specific pending tag handling
 */
export function CalendarTagsSection({
    tags,
    isLoggedIn = false,
    currentUserId,
    calendarAuthorId,
    calendarId,
    onAddTag,
    onRemoveTag,
    isTagLoading = false,
    className,
}: CalendarTagsSectionProps) {
    // Use calendar-specific pending tags
    const pendingTags = useMemo(() => {
        if (!calendarAuthorId || !calendarId || !currentUserId) return [];
        return getPendingCalendarTags(calendarAuthorId, calendarId, currentUserId);
    }, [calendarAuthorId, calendarId, currentUserId]);

    // Pass through to base component with calendar-specific pending tags
    return (
        <BaseTagsSection
            tags={tags}
            isLoggedIn={isLoggedIn}
            currentUserId={currentUserId}
            eventAuthorId={calendarAuthorId}
            eventId={calendarId}
            onAddTag={onAddTag}
            onRemoveTag={onRemoveTag}
            isTagLoading={isTagLoading}
            className={className}
            _pendingTags={pendingTags}
        />
    );
}
