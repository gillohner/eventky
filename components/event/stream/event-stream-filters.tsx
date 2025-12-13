"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserSearch } from "@/components/ui/user-search";
import { useUsersByIds, type SelectedUser } from "@/hooks/use-user-search";
import { X, Filter, ChevronDown, ChevronUp, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getValidEventStatuses } from "pubky-app-specs";

export interface EventStreamFilterValues {
    tags?: string[];
    status?: string;
    author?: string;
    timezone?: string;
    start_date?: number;
    end_date?: number;
}

interface EventStreamFiltersProps {
    filters: EventStreamFilterValues;
    onFiltersChange: (filters: EventStreamFilterValues) => void;
}

// Get event statuses from pubky-app-specs
const EVENT_STATUSES = getValidEventStatuses().map((status) => ({
    value: status,
    label: status.charAt(0) + status.slice(1).toLowerCase(), // Capitalize first letter
}));

export function EventStreamFilters({ filters, onFiltersChange }: EventStreamFiltersProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [tagInput, setTagInput] = useState("");

    // Fetch author user details if author filter is set
    const authorIds = filters.author ? [filters.author] : [];
    const { data: authorUsers } = useUsersByIds(authorIds);

    const selectedAuthors: SelectedUser[] = useMemo(() => {
        if (authorUsers && authorUsers.length > 0) {
            return authorUsers.map((user) => ({
                id: user.id,
                name: user.name,
                image: user.image,
            }));
        }
        return [];
    }, [authorUsers]);

    const handleAddTag = () => {
        if (!tagInput.trim()) return;
        const tags = filters.tags || [];
        if (tags.length >= 5) return; // Max 5 tags
        if (tags.includes(tagInput.trim())) return; // No duplicates

        onFiltersChange({
            ...filters,
            tags: [...tags, tagInput.trim()],
        });
        setTagInput("");
    };

    const handleRemoveTag = (tag: string) => {
        const tags = filters.tags || [];
        onFiltersChange({
            ...filters,
            tags: tags.filter((t) => t !== tag),
        });
    };

    const handleAuthorChange = (users: SelectedUser[]) => {
        onFiltersChange({
            ...filters,
            author: users.length > 0 ? users[0].id : undefined,
        });
    };

    const handleClearFilters = () => {
        onFiltersChange({});
    };

    const activeFilterCount = Object.keys(filters).filter((key) => {
        const value = filters[key as keyof EventStreamFilterValues];
        return value !== undefined && value !== "" && !(Array.isArray(value) && value.length === 0);
    }).length;

    return (
        <Card>
            <CardContent>
                <div className="space-y-4">
                    {/* Filter Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4" />
                            <h3 className="font-semibold">Filters</h3>
                            {activeFilterCount > 0 && (
                                <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                                    {activeFilterCount}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {activeFilterCount > 0 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleClearFilters}
                                >
                                    Clear all
                                </Button>
                            )}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsExpanded(!isExpanded)}
                            >
                                {isExpanded ? (
                                    <>
                                        <ChevronUp className="h-4 w-4 mr-1" />
                                        Collapse
                                    </>
                                ) : (
                                    <>
                                        <ChevronDown className="h-4 w-4 mr-1" />
                                        Expand
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>

                    {/* Filter Controls - Only show when expanded */}
                    {isExpanded && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                            {/* Tags Filter */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-1.5">
                                    <Label>Tags (max 5)</Label>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Events matching at least one tag will be shown</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </div>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Enter tag name..."
                                        value={tagInput}
                                        onChange={(e) => setTagInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                handleAddTag();
                                            }
                                        }}
                                        disabled={(filters.tags?.length || 0) >= 5}
                                    />
                                    <Button
                                        onClick={handleAddTag}
                                        disabled={!tagInput.trim() || (filters.tags?.length || 0) >= 5}
                                    >
                                        Add
                                    </Button>
                                </div>
                                {filters.tags && filters.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {filters.tags.map((tag) => (
                                            <span
                                                key={tag}
                                                className="inline-flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm"
                                            >
                                                {tag}
                                                <button
                                                    onClick={() => handleRemoveTag(tag)}
                                                    className="hover:text-destructive"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Author Filter */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-1.5 mb-2">
                                    <Label>Event Author</Label>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Filter events created by a specific user</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </div>
                                <UserSearch
                                    selectedUsers={selectedAuthors}
                                    onSelectionChange={handleAuthorChange}
                                    maxSelections={1}
                                    label=""
                                    placeholder="Search by name or user ID..."
                                    description=""
                                />
                            </div>

                            {/* Status Filter */}
                            <div className="space-y-2">
                                <Label>Event Status</Label>
                                <Select
                                    value={filters.status || "__all__"}
                                    onValueChange={(value) =>
                                        onFiltersChange({
                                            ...filters,
                                            status: value === "__all__" ? undefined : value,
                                        })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="All statuses" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__all__">All statuses</SelectItem>
                                        {EVENT_STATUSES.map((status) => (
                                            <SelectItem key={status.value} value={status.value}>
                                                {status.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Timezone Filter */}
                            <div className="space-y-2">
                                <Label>Timezone</Label>
                                <Input
                                    placeholder="e.g., America/New_York, UTC..."
                                    value={filters.timezone || ""}
                                    onChange={(e) =>
                                        onFiltersChange({
                                            ...filters,
                                            timezone: e.target.value || undefined,
                                        })
                                    }
                                />
                                <p className="text-xs text-muted-foreground">
                                    Enter IANA timezone identifier
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
