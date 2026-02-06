"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserSearch } from "@/components/ui/user-search";
import { useUsersByIds, type SelectedUser } from "@/hooks/use-user-search";
import { X, CalendarClock, Calendar, Clock, User } from "lucide-react";
import { DateRangeFilter } from "@/components/event/stream/filters/date-range-filter";
import { TagsFilter } from "@/components/event/stream/filters/tags-filter";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from "date-fns";
import { getValidEventStatuses } from "@eventky/pubky-app-specs";

const EVENT_STATUSES = getValidEventStatuses().map((status) => ({
    value: status,
    label: status.charAt(0) + status.slice(1).toLowerCase(),
}));

export interface EventStreamFilterValues {
    preset?: "upcoming" | "this-week" | "this-month" | "past" | "all" | "custom";
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
    const currentPreset = filters.preset || "upcoming";

    // Lookup author user data
    const authorIds = filters.author ? [filters.author] : [];
    const { data: authorUsers } = useUsersByIds(authorIds);

    const selectedAuthors: SelectedUser[] = authorUsers?.map((user) => ({
        id: user.id,
        name: user.name,
        image: user.image,
    })) || [];

    // Check if filters are at default state (upcoming with no other filters)
    const isDefaultState =
        currentPreset === "upcoming" &&
        !filters.tags?.length &&
        !filters.status &&
        !filters.author;

    const handlePresetChange = (preset: NonNullable<EventStreamFilterValues["preset"]>) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayMicros = today.getTime() * 1000;

        let newFilters: EventStreamFilterValues = {
            preset,
            tags: filters.tags,
            status: filters.status,
            author: filters.author,
        };

        switch (preset) {
            case "upcoming": {
                // Today to 1 year ahead
                const oneYear = new Date(today);
                oneYear.setFullYear(oneYear.getFullYear() + 1);
                newFilters.start_date = todayMicros;
                newFilters.end_date = oneYear.getTime() * 1000;
                break;
            }
            case "this-week": {
                // Current week (Monday to Sunday)
                const weekStart = startOfWeek(today, { weekStartsOn: 1 });
                const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
                newFilters.start_date = weekStart.getTime() * 1000;
                newFilters.end_date = weekEnd.getTime() * 1000;
                break;
            }
            case "this-month": {
                // Current month
                const monthStart = startOfMonth(today);
                const monthEnd = endOfMonth(today);
                newFilters.start_date = monthStart.getTime() * 1000;
                newFilters.end_date = monthEnd.getTime() * 1000;
                break;
            }
            case "past": {
                // Past events (10 years back to yesterday)
                const yesterday = subDays(today, 1);
                yesterday.setHours(23, 59, 59, 999);
                const tenYearsAgo = new Date(today);
                tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
                newFilters.start_date = tenYearsAgo.getTime() * 1000;
                newFilters.end_date = yesterday.getTime() * 1000;
                break;
            }
            case "all": {
                // All events (no date restrictions)
                newFilters.start_date = undefined;
                newFilters.end_date = undefined;
                break;
            }
            case "custom":
                // Keep existing dates or clear them
                newFilters.start_date = filters.start_date;
                newFilters.end_date = filters.end_date;
                break;
        }

        onFiltersChange(newFilters);
    };

    const handleToggleTag = (tag: string) => {
        const currentTags = filters.tags || [];
        const newTags = currentTags.includes(tag)
            ? currentTags.filter((t) => t !== tag)
            : [...currentTags, tag];
        onFiltersChange({ ...filters, tags: newTags.length > 0 ? newTags : undefined });
    };

    const handleResetToUpcoming = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const oneYear = new Date(today);
        oneYear.setFullYear(oneYear.getFullYear() + 1);

        onFiltersChange({
            preset: "upcoming",
            start_date: today.getTime() * 1000,
            end_date: oneYear.getTime() * 1000,
        });
    };

    // Get display label for current filter state
    const getFilterLabel = () => {
        if (currentPreset === "all") {
            return "Showing all events (past & upcoming)";
        }
        if (currentPreset === "custom") {
            if (filters.start_date && filters.end_date) {
                const start = new Date(filters.start_date / 1000);
                const end = new Date(filters.end_date / 1000);
                return `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`;
            } else if (filters.start_date) {
                return `From ${format(new Date(filters.start_date / 1000), "MMM d, yyyy")}`;
            } else if (filters.end_date) {
                return `Until ${format(new Date(filters.end_date / 1000), "MMM d, yyyy")}`;
            }
            return "Custom date range";
        }

        switch (currentPreset) {
            case "upcoming":
                return "Upcoming events";
            case "this-week":
                return "This week";
            case "this-month":
                return "This month";
            case "past":
                return "Past events";
            default:
                return "Upcoming events";
        }
    };

    return (
        <Card>
            <CardContent className="p-4 space-y-4">
                {/* Top Row: Preset Buttons on left, Author/Status on right */}
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                    {/* Left side: Preset Buttons and Badge */}
                    <div className="flex-1 space-y-4">
                        {/* Preset Buttons */}
                        <div className="flex flex-wrap gap-2">
                            <Button
                                variant={currentPreset === "upcoming" ? "default" : "outline"}
                                size="sm"
                                onClick={() => handlePresetChange("upcoming")}
                                className="gap-1.5"
                            >
                                <Clock className="h-3.5 w-3.5" />
                                Upcoming
                            </Button>
                            <Button
                                variant={currentPreset === "this-week" ? "default" : "outline"}
                                size="sm"
                                onClick={() => handlePresetChange("this-week")}
                                className="gap-1.5"
                            >
                                <Calendar className="h-3.5 w-3.5" />
                                This Week
                            </Button>
                            <Button
                                variant={currentPreset === "this-month" ? "default" : "outline"}
                                size="sm"
                                onClick={() => handlePresetChange("this-month")}
                                className="gap-1.5"
                            >
                                <Calendar className="h-3.5 w-3.5" />
                                This Month
                            </Button>
                            <Button
                                variant={currentPreset === "past" ? "default" : "outline"}
                                size="sm"
                                onClick={() => handlePresetChange("past")}
                                className="gap-1.5"
                            >
                                Past
                            </Button>
                            <Button
                                variant={currentPreset === "all" ? "default" : "outline"}
                                size="sm"
                                onClick={() => handlePresetChange("all")}
                                className="gap-1.5"
                            >
                                All
                            </Button>
                            <Button
                                variant={currentPreset === "custom" ? "default" : "outline"}
                                size="sm"
                                onClick={() => handlePresetChange("custom")}
                                className="gap-1.5"
                            >
                                <CalendarClock className="h-3.5 w-3.5" />
                                Custom...
                            </Button>
                        </div>

                        {/* Active Filter Badge and Actions */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="secondary" className="gap-1.5">
                                <CalendarClock className="h-3 w-3" />
                                {getFilterLabel()}
                            </Badge>

                            {!isDefaultState && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleResetToUpcoming}
                                    className="gap-2 h-7 text-xs"
                                >
                                    <X className="h-3.5 w-3.5" />
                                    Reset to Upcoming
                                </Button>
                            )}
                        </div>

                        {/* Custom Date Range (only shown when custom preset selected) */}
                        {currentPreset === "custom" && (
                            <div>
                                <DateRangeFilter
                                    startDate={filters.start_date}
                                    endDate={filters.end_date}
                                    onChange={(start_date, end_date) =>
                                        onFiltersChange({ ...filters, start_date, end_date, preset: "custom" })
                                    }
                                />
                            </div>
                        )}
                    </div>

                    {/* Right side: Author and Status Filters - Stacked */}
                    <div className="flex flex-col gap-3 lg:w-80">
                        {/* Author Filter */}
                        <div className="space-y-2">
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
                        <div className="space-y-2">
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
