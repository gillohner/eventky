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
    /** Number of authors (users who can add events) */
    authorCount?: number;
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
 * Uses OG image aspect ratio (1200x630) with overlay content on desktop,
 * stacked layout on mobile. Shows event count and author badges.
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
    authorCount = 0,
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
            {/* Mobile Layout: Stacked image above content */}
            <div className="md:hidden">
                {/* Image Banner */}
                <div
                    className="w-full bg-cover bg-center relative"
                    style={{
                        aspectRatio: HEADER_BANNER.aspectRatio,
                        backgroundImage: heroImageUrl ? `url(${heroImageUrl})` : fallbackGradient,
                        backgroundColor: !heroImageUrl && color ? color : undefined,
                    }}
                >
                    {/* Top Row: Color indicator and Actions */}
                    <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
                        <div
                            className="h-8 w-8 rounded-full border-2 border-white shadow-lg shrink-0"
                            style={{ backgroundColor: color }}
                            title={`Calendar color: ${color}`}
                        />
                        {isOwner && calendarId && (
                            <div className="flex gap-2 shrink-0">
                                <Button asChild size="sm" variant="secondary">
                                    <Link href={`/calendar/${authorId}/${calendarId}/edit`}>
                                        <Edit className="h-4 w-4" />
                                        <span className="sr-only">Edit</span>
                                    </Link>
                                </Button>
                                {onDelete && (
                                    <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => setShowDeleteDialog(true)}
                                        disabled={isDeleting}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        <span className="sr-only">{isDeleting ? "Deleting..." : "Delete"}</span>
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Content Section (below image on mobile) */}
                <div className="p-4 space-y-3">
                    <h1 className="text-2xl font-bold tracking-tight">{name}</h1>
                    <div className="flex items-center gap-3">
                        <a
                            href={getPubkyProfileUrl(authorId)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 group"
                        >
                            <Avatar className="h-10 w-10 border-2 border-background">
                                <AvatarImage src={authorAvatar} alt={authorName || authorId} />
                                <AvatarFallback className="text-xs font-medium">
                                    {authorInitials}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-medium group-hover:underline">
                                    {authorName || truncateId(authorId)}
                                </p>
                                <p className="text-xs text-muted-foreground">Calendar Owner</p>
                            </div>
                        </a>
                    </div>
                    {/* Metadata Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="gap-1.5">
                            <CalendarIcon className="h-3.5 w-3.5" />
                            {eventCount} {eventCount === 1 ? "event" : "events"}
                        </Badge>
                        {authorCount > 0 && (
                            <Badge variant="secondary" className="gap-1.5">
                                <Users className="h-3.5 w-3.5" />
                                {authorCount} {authorCount === 1 ? "author" : "authors"}
                            </Badge>
                        )}
                        {timezone && (
                            <Badge variant="outline" className="gap-1.5">
                                {timezone}
                            </Badge>
                        )}
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
                    backgroundColor: !heroImageUrl && color ? color : undefined,
                }}
            >
                {/* Bottom gradient overlay for text readability */}
                <div
                    className="absolute inset-0"
                    style={{ background: HEADER_GRADIENT.overlay }}
                />

                {/* Top Row: Color indicator and Actions */}
                <div className="absolute top-4 left-4 right-4 flex items-start justify-between gap-2">
                    <div
                        className="h-8 w-8 rounded-full border-2 border-white shadow-lg"
                        style={{ backgroundColor: color }}
                        title={`Calendar color: ${color}`}
                    />
                    {isOwner && calendarId && (
                        <div className="flex gap-2 shrink-0">
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

                {/* Bottom Content Overlay */}
                <div className="absolute bottom-0 inset-x-0 p-6 space-y-3">
                    <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-md">
                        {name}
                    </h1>
                    <div className="flex items-center gap-3">
                        <a
                            href={getPubkyProfileUrl(authorId)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 group"
                        >
                            <Avatar className="h-10 w-10 border-2 border-white/50">
                                <AvatarImage src={authorAvatar} alt={authorName || authorId} />
                                <AvatarFallback className="text-xs font-medium">
                                    {authorInitials}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-medium text-white group-hover:underline">
                                    {authorName || truncateId(authorId)}
                                </p>
                                <p className="text-xs text-white/70">Calendar Owner</p>
                            </div>
                        </a>
                    </div>
                    {/* Metadata Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="gap-1.5">
                            <CalendarIcon className="h-3.5 w-3.5" />
                            {eventCount} {eventCount === 1 ? "event" : "events"}
                        </Badge>
                        {authorCount > 0 && (
                            <Badge variant="secondary" className="gap-1.5">
                                <Users className="h-3.5 w-3.5" />
                                {authorCount} {authorCount === 1 ? "author" : "authors"}
                            </Badge>
                        )}
                        {timezone && (
                            <Badge variant="outline" className="gap-1.5 bg-white/10 text-white border-white/30">
                                {timezone}
                            </Badge>
                        )}
                    </div>
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
