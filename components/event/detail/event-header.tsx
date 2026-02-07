"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { HEADER_BANNER, HEADER_GRADIENT } from "@/lib/constants";
import { getPubkyImageUrl, getPubkyProfileUrl } from "@/lib/pubky/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetFooter,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Edit, Calendar, Repeat, Trash2 } from "lucide-react";
import Link from "next/link";

interface EventHeaderProps {
    /** Event summary/title */
    summary: string;
    /** Event author public key */
    authorId: string;
    /** Optional author display name */
    authorName?: string;
    /** Optional author avatar URL */
    authorAvatar?: string;
    /** Event image URI */
    imageUri?: string;
    /** Calendar color for fallback (hex) */
    calendarColor?: string;
    /** Event status */
    status?: string;
    /** Whether event is recurring (has RRULE) */
    isRecurring?: boolean;
    /** Recurrence description (e.g., "Every Monday") */
    recurrenceLabel?: string;
    /** Specific instance date if viewing an instance */
    instanceDate?: string;
    /** Whether current user is the owner */
    isOwner?: boolean;
    /** Event ID for edit link */
    eventId?: string;
    /** Handler for delete action */
    onDelete?: () => void;
    /** Whether delete is in progress */
    isDeleting?: boolean;
    /** Optional calendar URI for calendar link */
    calendarUri?: string;
    /** Additional CSS classes */
    className?: string;
}

/**
 * Event header component with hero image/color, title, and metadata
 * Uses OG image aspect ratio (1200x630) with overlay content on desktop,
 * stacked layout on mobile. Shows recurrence badge and instance indicator.
 */
export function EventHeader({
    summary,
    authorId,
    authorName,
    authorAvatar,
    imageUri,
    calendarColor,
    status,
    isRecurring,
    recurrenceLabel,
    instanceDate,
    isOwner,
    eventId,
    onDelete,
    isDeleting,
    className,
}: EventHeaderProps) {
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    // Generate a fallback gradient based on calendar color or author ID
    const fallbackGradient = calendarColor
        ? `linear-gradient(135deg, ${calendarColor}40, ${calendarColor}80)`
        : `linear-gradient(135deg, hsl(${hashCode(authorId) % 360}, 70%, 60%), hsl(${(hashCode(authorId) + 60) % 360}, 70%, 40%))`;

    const authorInitials = authorName
        ? authorName.slice(0, 2).toUpperCase()
        : authorId.slice(0, 2).toUpperCase();

    const statusVariant = getStatusVariant(status);

    // Get the proper image URL from Nexus gateway
    const heroImageUrl = imageUri ? getPubkyImageUrl(imageUri, "main") : undefined;

    return (
        <div className={cn("rounded-xl overflow-hidden border bg-card", className)}>
            {/* Mobile Layout: Stacked image above content */}
            <div className="md:hidden">
                {/* Image Banner */}
                <div
                    className="aspect-video w-full bg-cover bg-center relative"
                    style={{
                        backgroundImage: heroImageUrl ? `url(${heroImageUrl})` : fallbackGradient,
                        backgroundColor: !heroImageUrl && calendarColor ? calendarColor : undefined,
                    }}
                >
                    {/* Top Row: Status, Recurrence, Actions */}
                    <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
                        <div className="flex flex-wrap gap-2">
                            {status && (
                                <Badge variant={statusVariant} className="text-xs">
                                    {formatStatus(status)}
                                </Badge>
                            )}
                            {isRecurring && (
                                <Badge variant="secondary" className="text-xs flex items-center gap-1">
                                    <Repeat className="h-3 w-3" />
                                    {recurrenceLabel || "Recurring"}
                                </Badge>
                            )}
                        </div>
                        {isOwner && eventId && (
                            <div className="flex gap-2 shrink-0">
                                <Button asChild size="sm" variant="secondary">
                                    <Link href={`/event/${authorId}/${eventId}/edit`}>
                                        <Edit className="h-4 w-4" />
                                        <span className="sr-only">Edit</span>
                                    </Link>
                                </Button>
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => setShowDeleteDialog(true)}
                                    disabled={isDeleting}
                                >
                                    <Trash2 className="h-4 w-4" />
                                    <span className="sr-only">{isDeleting ? "Deleting..." : "Delete"}</span>
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Content Section (below image on mobile) */}
                <div className="p-4 space-y-3">
                    {isRecurring && instanceDate && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>Viewing instance: {formatInstanceDate(instanceDate)}</span>
                        </div>
                    )}
                    <h1 className="text-2xl font-bold tracking-tight">{summary}</h1>
                    <div className="flex items-center gap-3">
                        <a
                            href={getPubkyProfileUrl(authorId)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 group"
                        >
                            <Avatar className="h-10 w-10 border-2 border-background">
                                {authorAvatar && <AvatarImage src={authorAvatar} alt={authorName || authorId} />}
                                <AvatarFallback className="text-xs font-medium">
                                    {authorInitials}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-medium group-hover:underline">
                                    {authorName || truncateId(authorId)}
                                </p>
                                <p className="text-xs text-muted-foreground">Organizer</p>
                            </div>
                        </a>
                    </div>
                </div>
            </div>

            {/* Desktop Layout: Header banner aspect ratio with overlay content */}
            <div
                className={cn(
                    "hidden md:block relative w-full bg-cover bg-center",
                    `aspect-[${HEADER_BANNER.aspectRatio}]`
                )}
                style={{
                    aspectRatio: HEADER_BANNER.aspectRatio,
                    backgroundImage: heroImageUrl ? `url(${heroImageUrl})` : fallbackGradient,
                    backgroundColor: !heroImageUrl && calendarColor ? calendarColor : undefined,
                }}
            >
                {/* Bottom gradient overlay for text readability */}
                <div
                    className="absolute inset-0"
                    style={{ background: HEADER_GRADIENT.overlay }}
                />

                {/* Top Row: Status, Recurrence, Actions */}
                <div className="absolute top-4 left-4 right-4 flex items-start justify-between gap-2">
                    <div className="flex flex-wrap gap-2">
                        {status && (
                            <Badge variant={statusVariant} className="text-xs">
                                {formatStatus(status)}
                            </Badge>
                        )}
                        {isRecurring && (
                            <Badge variant="secondary" className="text-xs flex items-center gap-1">
                                <Repeat className="h-3 w-3" />
                                {recurrenceLabel || "Recurring"}
                            </Badge>
                        )}
                    </div>
                    {isOwner && eventId && (
                        <div className="flex gap-2 shrink-0">
                            <Button asChild size="sm" variant="secondary">
                                <Link href={`/event/${authorId}/${eventId}/edit`}>
                                    <Edit className="h-4 w-4 mr-1" />
                                    Edit
                                </Link>
                            </Button>
                            <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => setShowDeleteDialog(true)}
                                disabled={isDeleting}
                            >
                                <Trash2 className="h-4 w-4 mr-1" />
                                {isDeleting ? "Deleting..." : "Delete"}
                            </Button>
                        </div>
                    )}
                </div>

                {/* Bottom Content Overlay */}
                <div className="absolute bottom-0 inset-x-0 p-6 space-y-3">
                    {isRecurring && instanceDate && (
                        <div className="flex items-center gap-2 text-sm text-white/80">
                            <Calendar className="h-4 w-4" />
                            <span>Viewing instance: {formatInstanceDate(instanceDate)}</span>
                        </div>
                    )}
                    <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-md">
                        {summary}
                    </h1>
                    <div className="flex items-center gap-3">
                        <a
                            href={getPubkyProfileUrl(authorId)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 group"
                        >
                            <Avatar className="h-10 w-10 border-2 border-white/50">
                                {authorAvatar && <AvatarImage src={authorAvatar} alt={authorName || authorId} />}
                                <AvatarFallback className="text-xs font-medium">
                                    {authorInitials}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-medium text-white group-hover:underline">
                                    {authorName || truncateId(authorId)}
                                </p>
                                <p className="text-xs text-white/70">Organizer</p>
                            </div>
                        </a>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Sheet */}
            <Sheet open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <SheetContent>
                    <SheetHeader>
                        <SheetTitle>Delete Event</SheetTitle>
                        <SheetDescription>
                            Are you sure you want to delete &quot;{summary}&quot;? This action cannot be undone.
                        </SheetDescription>
                    </SheetHeader>
                    <SheetFooter className="mt-6">
                        <Button
                            variant="outline"
                            onClick={() => setShowDeleteDialog(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                setShowDeleteDialog(false);
                                onDelete?.();
                            }}
                        >
                            Delete Event
                        </Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>
        </div>
    );
}

// Helper functions

function hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
    }
    return Math.abs(hash);
}

function getStatusVariant(status?: string): "default" | "secondary" | "destructive" | "outline" {
    switch (status?.toUpperCase()) {
        case "CONFIRMED":
            return "default";
        case "TENTATIVE":
            return "secondary";
        case "CANCELLED":
            return "destructive";
        default:
            return "outline";
    }
}

function formatStatus(status: string): string {
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}

function formatInstanceDate(isoDate: string): string {
    try {
        const date = new Date(isoDate);
        return new Intl.DateTimeFormat("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
        }).format(date);
    } catch {
        return isoDate;
    }
}

function truncateId(id: string): string {
    if (id.length <= 12) return id;
    return `${id.slice(0, 6)}...${id.slice(-4)}`;
}
