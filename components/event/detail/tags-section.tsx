"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Tag,
    Plus,
    X,
    Users,
    ChevronDown,
    ChevronUp,
    Loader2,
    Info,
} from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { getPendingTagsForEvent } from "@/hooks/use-tag-mutation";

interface EventTag {
    label: string;
    taggers: string[];
    taggers_count: number;
    relationship: boolean; // Whether current user tagged it
}

interface TagsSectionProps {
    /** Tags on the event */
    tags: EventTag[];
    /** Whether user is logged in */
    isLoggedIn?: boolean;
    /** Current user's public key (for pending writes) */
    currentUserId?: string;
    /** Event author ID (for pending writes) */
    eventAuthorId?: string;
    /** Event ID (for pending writes) */
    eventId?: string;
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
 * Display and manage event tags
 * Tags apply to the event series (not specific instances)
 */
export function TagsSection({
    tags,
    isLoggedIn = false,
    currentUserId,
    eventAuthorId,
    eventId,
    onAddTag,
    onRemoveTag,
    isTagLoading = false,
    className,
}: TagsSectionProps) {
    const [showInput, setShowInput] = useState(false);
    const [newTag, setNewTag] = useState("");
    const [expanded, setExpanded] = useState(false);

    // Get pending tag writes that haven't been indexed by Nexus yet
    const pendingTags = useMemo(() => {
        if (!eventAuthorId || !eventId || !currentUserId) return [];
        return getPendingTagsForEvent(eventAuthorId, eventId, currentUserId);
    }, [eventAuthorId, eventId, currentUserId]);

    // Merge Nexus tags with pending writes and determine if user tagged each
    const mergedTags = useMemo(() => {
        const tagMap = new Map<string, EventTag & { userTagged: boolean }>();

        for (const tag of tags) {
            // Check if current user is in taggers array OR relationship is true
            const userTagged = currentUserId
                ? (tag.taggers.includes(currentUserId) || tag.relationship)
                : false;
            tagMap.set(tag.label.toLowerCase(), { ...tag, userTagged });
        }

        // Apply pending writes
        for (const pending of pendingTags) {
            const label = pending.label.toLowerCase();
            const existing = tagMap.get(label);

            if (pending.action === 'add') {
                if (existing) {
                    // Tag exists - ensure current user is marked
                    if (!existing.taggers.includes(currentUserId!)) {
                        existing.taggers = [...existing.taggers, currentUserId!];
                        existing.taggers_count = existing.taggers.length;
                    }
                    existing.userTagged = true;
                } else {
                    // New tag from pending write
                    tagMap.set(label, {
                        label: pending.label,
                        taggers: [currentUserId!],
                        taggers_count: 1,
                        relationship: true,
                        userTagged: true,
                    });
                }
            } else if (pending.action === 'remove') {
                if (existing) {
                    // Remove current user from taggers
                    const newTaggers = existing.taggers.filter(t => t !== currentUserId);
                    if (newTaggers.length === 0) {
                        tagMap.delete(label);
                    } else {
                        existing.taggers = newTaggers;
                        existing.taggers_count = newTaggers.length;
                        existing.userTagged = false;
                    }
                }
            }
        }

        return Array.from(tagMap.values());
    }, [tags, pendingTags, currentUserId]);

    // Sort tags by count (most popular first)
    const sortedTags = [...mergedTags].sort((a, b) => b.taggers_count - a.taggers_count);

    // Increased display limit from 8 to 20
    const displayTags = expanded ? sortedTags : sortedTags.slice(0, 20);

    const handleAddTag = () => {
        const trimmed = newTag.trim().toLowerCase();
        if (trimmed && onAddTag) {
            onAddTag(trimmed);
            setNewTag("");
            setShowInput(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleAddTag();
        } else if (e.key === "Escape") {
            setShowInput(false);
            setNewTag("");
        }
    };

    return (
        <Card className={cn("", className)}>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Tag className="h-5 w-5 text-muted-foreground" />
                        Tags
                        {mergedTags.length > 0 && (
                            <Badge variant="secondary" className="ml-1">
                                {mergedTags.length}
                            </Badge>
                        )}
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Tags apply to the entire event series, not individual instances.</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </CardTitle>

                    {/* Add Tag Button */}
                    {isLoggedIn && !showInput && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowInput(true)}
                            disabled={isTagLoading}
                        >
                            <Plus className="h-4 w-4 mr-1" />
                            Add Tag
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Tag Input */}
                {showInput && (
                    <div className="flex items-center gap-2">
                        <Input
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Enter tag..."
                            className="flex-1"
                            autoFocus
                            disabled={isTagLoading}
                        />
                        <Button
                            size="sm"
                            onClick={handleAddTag}
                            disabled={!newTag.trim() || isTagLoading}
                        >
                            {isTagLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                "Add"
                            )}
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setShowInput(false);
                                setNewTag("");
                            }}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                )}

                {/* Tags Display */}
                {mergedTags.length > 0 ? (
                    <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                            {displayTags.map((tag) => (
                                <TagBadge
                                    key={tag.label}
                                    tag={tag}
                                    isUserTag={tag.userTagged}
                                    onRemove={
                                        tag.userTagged && onRemoveTag
                                            ? () => onRemoveTag(tag.label)
                                            : undefined
                                    }
                                    onAdd={
                                        !tag.userTagged && isLoggedIn && onAddTag
                                            ? () => onAddTag(tag.label)
                                            : undefined
                                    }
                                />
                            ))}
                        </div>

                        {/* Show more/less toggle */}
                        {sortedTags.length > 20 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setExpanded(!expanded)}
                            >
                                {expanded ? (
                                    <>
                                        <ChevronUp className="h-4 w-4 mr-1" />
                                        Show less
                                    </>
                                ) : (
                                    <>
                                        <ChevronDown className="h-4 w-4 mr-1" />
                                        Show all {sortedTags.length} tags
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="text-sm text-muted-foreground text-center py-4">
                        No tags yet.{" "}
                        {isLoggedIn ? "Be the first to add one!" : "Sign in to add tags."}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

/**
 * Individual tag badge with interactions
 * User's tags are highlighted in orange
 */
function TagBadge({
    tag,
    isUserTag,
    onRemove,
    onAdd,
}: {
    tag: EventTag & { userTagged?: boolean };
    isUserTag: boolean;
    onRemove?: () => void;
    onAdd?: () => void;
}) {
    const [showTooltip, setShowTooltip] = useState(false);

    return (
        <div
            className="relative"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
        >
            <Badge
                variant="secondary"
                className={cn(
                    "text-sm flex items-center gap-1.5 cursor-pointer transition-colors",
                    // Orange highlight for tags the user has added
                    isUserTag && "bg-orange-500 text-white hover:bg-orange-600",
                    !isUserTag && onAdd && "hover:bg-primary hover:text-primary-foreground",
                    isUserTag && onRemove && "pr-1"
                )}
                onClick={() => {
                    if (isUserTag && onRemove) {
                        onRemove();
                    } else if (!isUserTag && onAdd) {
                        onAdd();
                    }
                }}
            >
                {tag.label}
                {tag.taggers_count > 1 && (
                    <span className="flex items-center gap-0.5 text-xs opacity-70">
                        <Users className="h-3 w-3" />
                        {tag.taggers_count}
                    </span>
                )}
                {isUserTag && onRemove && (
                    <X className="h-3 w-3 ml-0.5 hover:text-red-200" />
                )}
            </Badge>

            {/* Tooltip */}
            {showTooltip && tag.taggers_count > 0 && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-lg border z-10 whitespace-nowrap">
                    {tag.taggers_count} {tag.taggers_count === 1 ? "person" : "people"} tagged this
                </div>
            )}
        </div>
    );
}
