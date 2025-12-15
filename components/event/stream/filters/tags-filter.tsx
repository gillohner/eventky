"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tag, X } from "lucide-react";

interface TagsFilterProps {
    tags?: string[];
    onChange: (tags: string[]) => void;
}

export function TagsFilter({ tags = [], onChange }: TagsFilterProps) {
    const [tagInput, setTagInput] = useState("");

    const handleAddTag = () => {
        if (!tagInput.trim()) return;
        if (tags.length >= 5) return; // Max 5 tags
        if (tags.includes(tagInput.trim())) return; // No duplicates

        onChange([...tags, tagInput.trim()]);
        setTagInput("");
    };

    const handleRemoveTag = (tag: string) => {
        onChange(tags.filter((t) => t !== tag));
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2 min-w-0">
                <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
                <Input
                    placeholder="Add tags to filter..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddTag();
                        }
                    }}
                    disabled={tags.length >= 5}
                    className="h-9"
                />
                <Button
                    onClick={handleAddTag}
                    disabled={!tagInput.trim() || tags.length >= 5}
                    size="sm"
                    variant="secondary"
                >
                    Add
                </Button>
            </div>

            {/* Active Tags Display */}
            {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                        <Badge
                            key={tag}
                            variant="secondary"
                            className="gap-1 pl-2 pr-1"
                        >
                            {tag}
                            <button
                                onClick={() => handleRemoveTag(tag)}
                                className="hover:text-destructive ml-1"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    ))}
                    {tags.length >= 5 && (
                        <span className="text-xs text-muted-foreground self-center">
                            Maximum reached
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}
