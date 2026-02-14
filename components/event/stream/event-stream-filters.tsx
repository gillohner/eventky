"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserSearch } from "@/components/ui/user-search";
import { useUsersByIds, type SelectedUser } from "@/hooks/use-user-search";
import { X, User } from "lucide-react";
import { DateRangeFilter } from "@/components/event/stream/filters/date-range-filter";
import { TagsFilter } from "@/components/event/stream/filters/tags-filter";
import { getValidEventStatuses } from "@eventky/pubky-app-specs";

const EVENT_STATUSES = getValidEventStatuses().map((status) => ({
    value: status,
    label: status.charAt(0) + status.slice(1).toLowerCase(),
}));

export interface EventStreamFilterValues {
    tags?: string[];
    status?: string;
    author?: string;
    start_date?: number;
    end_date?: number;
}

interface EventStreamFiltersProps {
    filters: EventStreamFilterValues;
    onFiltersChange: (filters: EventStreamFilterValues) => void;
    popularTags?: Array<{ label: string; count: number }>;
}

export function EventStreamFilters({ filters, onFiltersChange, popularTags = [] }: EventStreamFiltersProps) {
    // Lookup author user data
    const authorIds = filters.author ? [filters.author] : [];
    const { data: authorUsers } = useUsersByIds(authorIds);

    const selectedAuthors: SelectedUser[] = authorUsers?.map((user) => ({
        id: user.id,
        name: user.name,
        image: user.image,
    })) || [];

    // Check if any filters are active
    const hasActiveFilters =
        !!filters.tags?.length ||
        !!filters.status ||
        !!filters.author ||
        !!filters.start_date ||
        !!filters.end_date;

    const handleToggleTag = (tag: string) => {
        const currentTags = filters.tags || [];
        const newTags = currentTags.includes(tag)
            ? currentTags.filter((t) => t !== tag)
            : [...currentTags, tag];
        onFiltersChange({ ...filters, tags: newTags.length > 0 ? newTags : undefined });
    };

    const handleClearFilters = () => {
        onFiltersChange({});
    };

    return (
        <Card>
            <CardContent className="p-4 space-y-4">
                {/* Top Row: Author, Status, Date Range on same row */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    {/* Author Filter */}
                    <div className="space-y-2 sm:flex-1">
                        <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <User className="h-3 w-3" />
                            Event Author
                        </Label>
                        <UserSearch
                            selectedUsers={selectedAuthors}
                            onSelectionChange={(users) => onFiltersChange({ ...filters, author: users.length > 0 ? users[0].id : undefined })}
                            maxSelections={1}
                            label=""
                            placeholder="Search by name or user ID..."
                            description=""
                        />
                    </div>

                    {/* Status Filter */}
                    <div className="space-y-2 sm:w-44">
                        <Label className="text-xs text-muted-foreground">Event Status</Label>
                        <Select
                            value={filters.status || "__all__"}
                            onValueChange={(value) =>
                                onFiltersChange({ ...filters, status: value === "__all__" ? undefined : value })
                            }
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="All statuses" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__all__">All statuses</SelectItem>
                                {EVENT_STATUSES.map((s) => (
                                    <SelectItem key={s.value} value={s.value}>
                                        {s.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Date Range Filter + Clear */}
                    <div className="flex items-center gap-2">
                        <DateRangeFilter
                            startDate={filters.start_date}
                            endDate={filters.end_date}
                            onChange={(start_date, end_date) =>
                                onFiltersChange({ ...filters, start_date, end_date })
                            }
                        />

                        {hasActiveFilters && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleClearFilters}
                                className="gap-2 h-7 text-xs"
                            >
                                <X className="h-3.5 w-3.5" />
                                Clear Filters
                            </Button>
                        )}
                    </div>
                </div>

                {/* Tags Filter */}
                <div className="space-y-3">
                    <TagsFilter
                        tags={filters.tags}
                        onChange={(tags) => onFiltersChange({ ...filters, tags: tags.length > 0 ? tags : undefined })}
                    />

                    {/* Popular Tags */}
                    {popularTags.length > 0 && (
                        <div className="mt-3 space-y-2">
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
            </CardContent>
        </Card>
    );
}
