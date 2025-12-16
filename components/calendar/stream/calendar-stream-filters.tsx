"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { UserSearch } from "@/components/ui/user-search";
import { useUsersByIds, type SelectedUser } from "@/hooks/use-user-search";
import { X, Search, User, Tag } from "lucide-react";

export interface CalendarStreamFilterValues {
    search?: string;
    author?: string;
    tags?: string[];
}

interface CalendarStreamFiltersProps {
    filters: CalendarStreamFilterValues;
    onFiltersChange: (filters: CalendarStreamFilterValues) => void;
    popularTags?: Array<{ label: string; count: number }>;
}

export function CalendarStreamFilters({ filters, onFiltersChange, popularTags = [] }: CalendarStreamFiltersProps) {
    const [localSearch, setLocalSearch] = useState(filters.search || "");
    const [tagInput, setTagInput] = useState("");

    const authorIds = filters.author ? [filters.author] : [];
    const { data: authorUsers } = useUsersByIds(authorIds);

    const selectedAuthors: SelectedUser[] = authorUsers?.map((user) => ({
        id: user.id,
        name: user.name,
        image: user.image,
    })) || [];

    const activeFilterCount = [filters.search, filters.author, filters.tags].filter((v) => {
        if (Array.isArray(v)) return v.length > 0;
        return v !== undefined && v !== "";
    }).length;

    const handleClearFilters = () => {
        setLocalSearch("");
        setTagInput("");
        onFiltersChange({});
    };

    const handleSearchChange = (value: string) => {
        setLocalSearch(value);
    };

    const handleSearchSubmit = () => {
        onFiltersChange({ ...filters, search: localSearch || undefined });
    };

    const handleAuthorChange = (users: SelectedUser[]) => {
        onFiltersChange({ ...filters, author: users.length > 0 ? users[0].id : undefined });
    };

    const handleAddTag = (tag: string) => {
        if (!tag.trim()) return;
        const tags = filters.tags || [];
        if (tags.length >= 5) return;
        if (tags.includes(tag.trim())) return;

        onFiltersChange({ ...filters, tags: [...tags, tag.trim()] });
        setTagInput("");
    };

    const handleRemoveTag = (tag: string) => {
        onFiltersChange({
            ...filters,
            tags: (filters.tags || []).filter((t) => t !== tag)
        });
    };

    const handleToggleTag = (tag: string) => {
        const tags = filters.tags || [];
        if (tags.includes(tag)) {
            handleRemoveTag(tag);
        } else {
            handleAddTag(tag);
        }
    };

    return (
        <Card>
            <CardContent className="p-4 space-y-4">
                {/* Header with clear button */}
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">Filter Calendars</h3>
                    {activeFilterCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleClearFilters}
                            className="gap-2 h-8"
                        >
                            <X className="h-3.5 w-3.5" />
                            Clear {activeFilterCount > 1 ? `(${activeFilterCount})` : ''}
                        </Button>
                    )}
                </div>

                {/* Tags Section - Main Focus */}
                <div className="space-y-3">
                    <Label className="text-sm font-medium flex items-center gap-2">
                        <Tag className="h-4 w-4" />
                        Tags
                    </Label>

                    {/* Tag Input */}
                    <div className="flex items-center gap-2">
                        <Input
                            placeholder="Add tag to filter..."
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleAddTag(tagInput);
                                }
                            }}
                            disabled={(filters.tags?.length || 0) >= 5}
                            className="flex-1"
                        />
                        <Button
                            onClick={() => handleAddTag(tagInput)}
                            disabled={!tagInput.trim() || (filters.tags?.length || 0) >= 5}
                            size="sm"
                        >
                            Add
                        </Button>
                    </div>

                    {/* Selected Tags */}
                    {filters.tags && filters.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {filters.tags.map((tag) => (
                                <Badge
                                    key={tag}
                                    variant="secondary"
                                    className="gap-1 text-sm px-2.5 py-1"
                                >
                                    {tag}
                                    <button
                                        onClick={() => handleRemoveTag(tag)}
                                        className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                    )}

                    {/* Popular Tags */}
                    {popularTags.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-xs text-muted-foreground">Popular tags:</p>
                            <div className="flex flex-wrap gap-2">
                                {popularTags.slice(0, 15).map(({ label, count }) => {
                                    const isSelected = filters.tags?.includes(label);
                                    return (
                                        <Badge
                                            key={label}
                                            variant={isSelected ? "default" : "outline"}
                                            className="cursor-pointer hover:bg-primary/90 transition-colors"
                                            onClick={() => handleToggleTag(label)}
                                        >
                                            {label} ({count})
                                        </Badge>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Search */}
                <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                        <Search className="h-4 w-4" />
                        Search
                    </Label>
                    <Input
                        type="text"
                        placeholder="Search by name or description..."
                        value={localSearch}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                handleSearchSubmit();
                            }
                        }}
                        onBlur={handleSearchSubmit}
                    />
                </div>

                {/* Author Filter */}
                <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Calendar Author
                    </Label>
                    <UserSearch
                        selectedUsers={selectedAuthors}
                        onSelectionChange={handleAuthorChange}
                        maxSelections={1}
                        label=""
                        placeholder="Search by name or ID..."
                        description=""
                    />
                </div>
            </CardContent>
        </Card>
    );
}
