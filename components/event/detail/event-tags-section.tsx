"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import { sanitizeTagLabel, validateTagLabel, MAX_TAG_LABEL_LENGTH } from "@/lib/utils/tag-validation";
import { getUnicodeLength } from "@/lib/utils/unicode-length";
import { CharacterCounter } from "@/components/ui/character-counter";
import { useAuthorProfiles, type AuthorProfile } from "@/hooks/use-author-profile";
import { getPubkyAvatarUrl, getPubkyProfileUrl, truncatePublicKey } from "@/lib/pubky/utils";
import { toast } from "sonner";

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
  /** Override pending tags (for calendar support) */
  _pendingTags?: Array<{ label: string; action: "add" | "remove" }>;
  /** Whether the event is recurring (shows tooltip about series vs instances) */
  isRecurring?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Display and manage event tags
 * Tags apply to the event series (not specific instances)
 */
export function EventTagsSection({
  tags,
  isLoggedIn = false,
  currentUserId,
  eventAuthorId,
  eventId,
  onAddTag,
  onRemoveTag,
  isTagLoading = false,
  _pendingTags,
  isRecurring = false,
  className,
}: TagsSectionProps) {
  const [showInput, setShowInput] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [expanded, setExpanded] = useState(false);

  // Get pending tag writes that haven't been indexed by Nexus yet
  const fetchedPendingTags = useMemo(() => {
    if (_pendingTags !== undefined) return _pendingTags;
    if (!eventAuthorId || !eventId || !currentUserId) return [];
    return getPendingTagsForEvent(eventAuthorId, eventId, currentUserId);
  }, [eventAuthorId, eventId, currentUserId, _pendingTags]);

  const pendingTags = _pendingTags !== undefined ? _pendingTags : fetchedPendingTags;

  // Merge Nexus tags with pending writes and determine if user tagged each
  const mergedTags = useMemo(() => {
    const tagMap = new Map<string, EventTag & { userTagged: boolean }>();

    for (const tag of tags) {
      const userTagged = currentUserId
        ? tag.taggers.includes(currentUserId) || tag.relationship
        : false;
      tagMap.set(tag.label.toLowerCase(), { ...tag, userTagged });
    }

    for (const pending of pendingTags) {
      const label = pending.label.toLowerCase();
      const existing = tagMap.get(label);

      if (pending.action === "add") {
        if (existing) {
          if (currentUserId && !existing.taggers.includes(currentUserId)) {
            existing.taggers = [...existing.taggers, currentUserId];
            existing.taggers_count = existing.taggers.length;
          }
          existing.userTagged = true;
        } else if (currentUserId) {
          tagMap.set(label, {
            label: pending.label,
            taggers: [currentUserId],
            taggers_count: 1,
            relationship: true,
            userTagged: true,
          });
        }
      } else if (pending.action === "remove") {
        if (existing && currentUserId) {
          const newTaggers = existing.taggers.filter((t) => t !== currentUserId);
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

  const sortedTags = [...mergedTags].sort((a, b) => b.taggers_count - a.taggers_count);
  const displayTags = expanded ? sortedTags : sortedTags.slice(0, 20);

  // Resolve tagger profiles for avatar/name rendering
  const allTaggerIds = useMemo(() => {
    const ids = new Set<string>();
    mergedTags.forEach((tag) => {
      tag.taggers.forEach((id) => ids.add(id));
    });
    return Array.from(ids);
  }, [mergedTags]);

  const { authors, isLoading: isAuthorsLoading } = useAuthorProfiles(allTaggerIds);

  const handleAddTag = () => {
    if (!newTag.trim()) return;

    const sanitized = sanitizeTagLabel(newTag);
    const validationError = validateTagLabel(sanitized);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    if (onAddTag) {
      onAddTag(sanitized);
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
            {isRecurring && (
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
            )}
          </CardTitle>

          {isLoggedIn && !showInput && (
            <Button variant="ghost" size="sm" onClick={() => setShowInput(true)} disabled={isTagLoading}>
              <Plus className="h-4 w-4 mr-1" />
              Add Tag
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showInput && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter tag..."
                className="flex-1"
                autoFocus
                disabled={isTagLoading}
                maxLength={MAX_TAG_LABEL_LENGTH}
              />
              <Button size="sm" onClick={handleAddTag} disabled={!newTag.trim() || isTagLoading}>
                {isTagLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
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
            <CharacterCounter current={getUnicodeLength(newTag)} max={MAX_TAG_LABEL_LENGTH} />
          </div>
        )}

        {mergedTags.length > 0 ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {displayTags.map((tag) => (
                <TagBadge
                  key={tag.label}
                  tag={tag}
                  isUserTag={tag.userTagged}
                  onRemove={tag.userTagged && onRemoveTag ? () => onRemoveTag(tag.label) : undefined}
                  onAdd={!tag.userTagged && isLoggedIn && onAddTag ? () => onAddTag(tag.label) : undefined}
                  authorsMap={authors}
                  isAuthorsLoading={isAuthorsLoading}
                />
              ))}
            </div>

            {sortedTags.length > 20 && (
              <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)}>
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
            No tags yet. {isLoggedIn ? "Be the first to add one!" : "Sign in to add tags."}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface TagBadgeProps {
  tag: EventTag & { userTagged?: boolean };
  isUserTag: boolean;
  onRemove?: () => void;
  onAdd?: () => void;
  authorsMap: Map<string, AuthorProfile>;
  isAuthorsLoading: boolean;
}

function TagBadge({ tag, isUserTag, onRemove, onAdd, authorsMap, isAuthorsLoading }: TagBadgeProps) {
  const taggerProfiles = useMemo(() => {
    return tag.taggers.map((id) => {
      const profile = authorsMap.get(id);
      return {
        id,
        name: profile?.name ?? truncatePublicKey(id, 4),
        avatarUrl: profile?.avatarUrl ?? getPubkyAvatarUrl(id),
      };
    });
  }, [authorsMap, tag.taggers]);

  const maxVisible = 3;
  const visibleTaggers = taggerProfiles.slice(0, maxVisible);
  const overflowCount = Math.max(0, taggerProfiles.length - maxVisible);

  return (
    <div className="relative">
      <Badge
        variant="secondary"
        className={cn(
          "text-sm flex items-center gap-1.5 cursor-pointer transition-colors pr-1.5",
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
        <span>{tag.label}</span>
        <div className="ml-1 flex items-center gap-1">
          <div className="flex -space-x-2">
            {visibleTaggers.map((tagger) => (
              <Avatar key={tagger.id} className="h-6 w-6 border border-background bg-muted" title={tagger.name}>
                <AvatarImage src={tagger.avatarUrl ?? undefined} alt={tagger.name} />
                <AvatarFallback>{tagger.name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
            ))}
            {isAuthorsLoading && taggerProfiles.length === 0 && (
              <Avatar className="h-6 w-6 border border-background bg-muted">
                <AvatarFallback className="text-[10px]">…</AvatarFallback>
              </Avatar>
            )}
          </div>

          {overflowCount > 0 && (
            <Popover>
              <PopoverTrigger asChild>
                <div
                  className="h-6 w-6 rounded-full bg-muted text-xs font-semibold flex items-center justify-center border border-background cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                >
                  +{overflowCount}
                </div>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64 space-y-2">
                <p className="text-xs text-muted-foreground">Taggers</p>
                <div className="max-h-64 overflow-auto space-y-1">
                  {taggerProfiles.map((tagger) => (
                    <a
                      key={tagger.id}
                      href={getPubkyProfileUrl(tagger.id)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 rounded-md p-1 hover:bg-accent"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Avatar className="h-7 w-7 border border-border bg-muted">
                        <AvatarImage src={tagger.avatarUrl ?? undefined} alt={tagger.name} />
                        <AvatarFallback>{tagger.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-sm font-medium truncate">{tagger.name}</span>
                        <span className="text-xs text-muted-foreground break-all">{tagger.id}</span>
                      </div>
                    </a>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </Badge>
    </div>
  );
}
