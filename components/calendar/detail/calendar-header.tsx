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
                }}
            >
                {/* Color indicator in top-right */}
                <div className="absolute top-4 right-4">
                    <div
                        className="h-8 w-8 rounded-full border-2 border-white shadow-lg"
                        style={{ backgroundColor: color }}
                        title={`Calendar color: ${color}`}
                    />
                </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
                {/* Author + Title Row */}
                <div className="flex items-start gap-4">
                    {/* Author Avatar - Positioned to overlap hero image */}
                    <Avatar className="h-16 w-16 border-4 border-background -mt-12">
                        <AvatarImage src={authorAvatar} alt={authorName || authorId} />
                        <AvatarFallback>{authorInitials}</AvatarFallback>
                    </Avatar>

                    {/* Title & Actions */}
                    <div className="flex-1 min-w-0 pt-2">
                        <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">
                                    {name}
                                </h1>
                                {authorName && (
                                    <p className="text-sm text-muted-foreground mt-1">
                                        by {authorName}
                                    </p>
                                )}
                            </div>

                            {/* Action Buttons */}
                            {isOwner && calendarId && (
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        asChild
                                        className="gap-2"
                                    >
                                        <Link href={`/calendar/${authorId}/${calendarId}/edit`}>
                                            <Edit className="h-4 w-4" />
                                            Edit
                                        </Link>
                                    </Button>
                                    {onDelete && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setShowDeleteDialog(true)}
                                            disabled={isDeleting}
                                            className="gap-2 text-destructive hover:text-destructive"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            Delete
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
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
