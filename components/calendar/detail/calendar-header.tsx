"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { getPubkyImageUrl } from "@/lib/pubky/utils";
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
import { Edit, Calendar as CalendarIcon, Trash2, Users } from "lucide-react";
import Link from "next/link";

interface CalendarHeaderProps {
    /** Calendar name/title */
    name: string;
    /** Calendar author public key */
    authorId: string;
    /** Optional author display name */
    authorName?: string;
    /** Optional author avatar URL */
    authorAvatar?: string;
    /** Calendar image URI */
    imageUri?: string;
    /** Calendar color (hex) */
    color?: string;
    /** Calendar timezone */
    timezone?: string;
    /** Number of events in calendar */
    eventCount?: number;
    /** Number of admins */
    adminCount?: number;
    /** Whether current user is the owner */
    isOwner?: boolean;
    /** Calendar ID for edit link */
    calendarId?: string;
    /** Handler for delete action */
    onDelete?: () => void;
    /** Whether delete is in progress */
    isDeleting?: boolean;
    /** Additional CSS classes */
    className?: string;
}

/**
 * Calendar header component with hero image/color, title, and metadata
 * Shows event count and admin badges
 */
export function CalendarHeader({
    name,
    authorId,
    authorName,
    authorAvatar,
    imageUri,
    color = "#3b82f6",
    timezone,
    eventCount = 0,
    adminCount = 0,
    isOwner,
    calendarId,
    onDelete,
    isDeleting,
    className,
}: CalendarHeaderProps) {
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    // Generate a fallback gradient based on calendar color or author ID
    const fallbackGradient = color
        ? `linear-gradient(135deg, ${color}40, ${color}80)`
        : `linear-gradient(135deg, hsl(${hashCode(authorId) % 360}, 70%, 60%), hsl(${(hashCode(authorId) + 60) % 360}, 70%, 40%))`;

    const authorInitials = authorName
        ? authorName.slice(0, 2).toUpperCase()
        : authorId.slice(0, 2).toUpperCase();

    // Get the proper image URL from Nexus gateway
    const heroImageUrl = imageUri ? getPubkyImageUrl(imageUri, "main") : undefined;

    return (
        <div className={cn("rounded-xl overflow-hidden border bg-card", className)}>
            {/* Hero Image/Color Banner */}
            <div
                className="h-32 sm:h-48 w-full bg-cover bg-center relative"
                style={{
                    backgroundImage: heroImageUrl ? `url(${heroImageUrl})` : fallbackGradient,
                    backgroundColor: !heroImageUrl && color ? color : undefined,
                }}
            >
                {/* Overlay for text readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                {/* Color indicator in top-right */}
                <div className="absolute top-3 right-3">
                    <div
                        className="h-8 w-8 rounded-full border-2 border-white shadow-lg"
                        style={{ backgroundColor: color }}
                        title={`Calendar color: ${color}`}
                    />
                </div>

                {/* Edit and Delete Buttons (overlay) */}
                {isOwner && calendarId && (
                    <div className="absolute bottom-3 right-3 flex gap-2">
                        <Button asChild size="sm" variant="secondary">
                            <Link href={`/calendar/${authorId}/${calendarId}/edit`}>
                                <Edit className="h-4 w-4 mr-1" />
                                Edit
                            </Link>
                        </Button>
                        {onDelete && (
                            <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => setShowDeleteDialog(true)}
                                disabled={isDeleting}
                            >
                                <Trash2 className="h-4 w-4 mr-1" />
                                {isDeleting ? "Deleting..." : "Delete"}
                            </Button>
                        )}
                    </div>
                )}
            </div>

            {/* Content Section */}
            <div className="p-4 sm:p-6 space-y-4">
                {/* Title */}
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                    {name}
                </h1>

                {/* Author Info */}
                <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border-2 border-background">
                        <AvatarImage src={authorAvatar} alt={authorName || authorId} />
                        <AvatarFallback className="text-xs font-medium">
                            {authorInitials}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="font-medium">
                            {authorName || truncateId(authorId)}
                        </p>
                        <p className="text-xs text-muted-foreground">Calendar Owner</p>
                    </div>
                </div>

                {/* Metadata Badges */}
                <div className="flex flex-wrap items-center gap-2">
                    {/* Event Count */}
                    <Badge variant="secondary" className="gap-1.5">
                        <CalendarIcon className="h-3.5 w-3.5" />
                        {eventCount} {eventCount === 1 ? "event" : "events"}
                    </Badge>

                    {/* Admin Count */}
                    {adminCount > 0 && (
                        <Badge variant="secondary" className="gap-1.5">
                            <Users className="h-3.5 w-3.5" />
                            {adminCount} {adminCount === 1 ? "admin" : "admins"}
                        </Badge>
                    )}

                    {/* Timezone */}
                    {timezone && (
                        <Badge variant="outline" className="gap-1.5">
                            {timezone}
                        </Badge>
                    )}
                </div>
            </div>

            {/* Delete Confirmation Dialog */}
            <Sheet open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <SheetContent>
                    <SheetHeader>
                        <SheetTitle>Delete Calendar</SheetTitle>
                        <SheetDescription>
                            Are you sure you want to delete &quot;{name}&quot;? This action
                            cannot be undone.
                        </SheetDescription>
                    </SheetHeader>
                    <SheetFooter className="mt-6">
                        <Button
                            variant="outline"
                            onClick={() => setShowDeleteDialog(false)}
                            disabled={isDeleting}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                onDelete?.();
                                setShowDeleteDialog(false);
                            }}
                            disabled={isDeleting}
                        >
                            {isDeleting ? "Deleting..." : "Delete Calendar"}
                        </Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>
        </div>
    );
}

// Helper: Simple string hash function
function hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
    }
    return Math.abs(hash);
}

function truncateId(id: string): string {
    if (id.length <= 12) return id;
    return `${id.slice(0, 6)}...${id.slice(-4)}`;
}
