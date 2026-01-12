"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { X } from "lucide-react";
import { DateRangeFilter } from "@/components/event/stream/filters/date-range-filter";
import { AdvancedFilters } from "@/components/event/stream/filters/advanced-filters";
import { TagsFilter } from "@/components/event/stream/filters/tags-filter";

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
}

export function EventStreamFilters({ filters, onFiltersChange }: EventStreamFiltersProps) {
    const activeFilterCount = Object.keys(filters).filter((key) => {
        const value = filters[key as keyof EventStreamFilterValues];
        return value !== undefined && value !== "" && !(Array.isArray(value) && value.length === 0);
    }).length;

    const handleClearFilters = () => {
        onFiltersChange({});
    };

    return (
        <Card>
            <CardContent className="p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
                    {/* Filter Buttons - Desktop: right side, Mobile: top */}
                    <div className="flex items-center gap-2 lg:order-2 justify-end lg:shrink-0">
                        <DateRangeFilter
                            startDate={filters.start_date}
                            endDate={filters.end_date}
                            onChange={(start_date, end_date) =>
                                onFiltersChange({ ...filters, start_date, end_date })
                            }
                        />

                        <AdvancedFilters
                            author={filters.author}
                            status={filters.status}
                            onChange={({ author, status }) =>
                                onFiltersChange({ ...filters, author, status })
                            }
                        />

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleClearFilters}
                            disabled={activeFilterCount === 0}
                            className="gap-2"
                        >
                            <X className="h-4 w-4" />
                            <span className="hidden sm:inline">Clear</span>
                        </Button>
                    </div>

                    {/* Tags Filter - Desktop: left side, Mobile: bottom */}
                    <div className="flex-1 lg:order-1">
                        <TagsFilter
                            tags={filters.tags}
                            onChange={(tags) => onFiltersChange({ ...filters, tags })}
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
