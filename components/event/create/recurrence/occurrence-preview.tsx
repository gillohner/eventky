"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { Calendar, XCircle, Check, Plus, Info } from "lucide-react";
import { formatOccurrence } from "@/lib/pubky/rrule-utils";
import { OccurrenceListItem } from "./occurrence-list-item";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import type { OccurrenceDate, OccurrenceStats } from "@/types/recurrence";

interface OccurrencePreviewProps {
    allDates: OccurrenceDate[];
    rdates: string[];
    excludedOccurrences: Set<string>;
    stats: OccurrenceStats;
    timezone?: string;
    onToggleOccurrence: (date: string, isAdditional: boolean) => void;
    onAddRdate: (date: Date) => void;
    onClearExclusions: () => void;
}

export function OccurrencePreview({
    allDates,
    rdates,
    excludedOccurrences,
    stats,
    timezone,
    onToggleOccurrence,
    onAddRdate,
    onClearExclusions,
}: OccurrencePreviewProps) {
    const [popoverOpen, setPopoverOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

    const handleAddDate = () => {
        if (selectedDate) {
            onAddRdate(selectedDate);
            setSelectedDate(undefined);
            setPopoverOpen(false);
        }
    };

    if (allDates.length === 0 && rdates.filter(d => d).length === 0) {
        return null;
    }

    return (
        <div className="space-y-3">
            <div className="space-y-1">
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <Label className="text-sm font-semibold">
                            Event Schedule Preview
                        </Label>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                                <p>Showing upcoming occurrences for preview. The event will continue beyond this list based on your recurrence pattern.</p>
                            </TooltipContent>
                        </Tooltip>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                        <span className="flex items-center gap-1 text-muted-foreground">
                            <div className="w-2 h-2 rounded-full bg-primary" />
                            {stats.standardCount} pattern
                        </span>
                        {stats.additionalCount > 0 && (
                            <span className="flex items-center gap-1 text-muted-foreground">
                                <Plus className="h-3 w-3 text-primary" />
                                {stats.additionalCount} added
                            </span>
                        )}
                        {stats.excludedCount > 0 && (
                            <span className="flex items-center gap-1 text-muted-foreground">
                                <XCircle className="h-3 w-3 text-destructive" />
                                {stats.excludedCount} excluded
                            </span>
                        )}
                        <span className="flex items-center gap-1 font-medium">
                            <Check className="h-3 w-3 text-green-400" />
                            {stats.totalActive} total
                        </span>
                    </div>
                </div>
                <p className="text-xs text-muted-foreground">
                    Click X to exclude dates, or click + to add extra dates to your schedule
                </p>
            </div>

            {/* Add Extra Date Button with Popover - Outside scroll area */}
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                <PopoverTrigger asChild>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full h-9 text-xs border-dashed hover:bg-primary/10 hover:border-primary/50 hover:text-primary"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Extra Date
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3" align="start">
                    <div className="space-y-3">
                        <Label className="text-sm font-medium">Select Date & Time</Label>
                        <DateTimePicker
                            value={selectedDate}
                            onChange={setSelectedDate}
                            use12HourFormat={false}
                            timePicker={{ hour: true, minute: true, second: false }}
                            classNames={{ trigger: "w-full" }}
                        />
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                size="sm"
                                className="flex-1"
                                onClick={handleAddDate}
                                disabled={!selectedDate}
                            >
                                Add
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    setSelectedDate(undefined);
                                    setPopoverOpen(false);
                                }}
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>

            <div className="rounded-lg border bg-card">
                <ScrollArea className="h-64">
                    <div className="p-2 space-y-1">
                        {allDates.map((item, idx) => {
                            const isExcluded = excludedOccurrences.has(item.date);
                            const isAdditional = item.type === 'additional';
                            return (
                                <OccurrenceListItem
                                    key={`${item.type}-${idx}`}
                                    formattedDate={formatOccurrence(item.date, timezone)}
                                    isExcluded={isExcluded}
                                    isAdditional={isAdditional}
                                    onToggle={() => onToggleOccurrence(item.date, isAdditional)}
                                />
                            );
                        })}
                    </div>
                </ScrollArea>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {stats.excludedCount > 0 && (
                    <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/5 border border-destructive/20">
                        <XCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                        <div className="space-y-1 flex-1 min-w-0">
                            <p className="text-xs font-medium text-foreground">
                                {stats.excludedCount} excluded
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Won&apos;t appear in calendar
                            </p>
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs flex-shrink-0 hover:bg-destructive/10"
                            onClick={onClearExclusions}
                        >
                            Clear
                        </Button>
                    </div>
                )}
                {stats.additionalCount > 0 && (
                    <div className="flex items-start gap-2 p-3 rounded-md bg-primary/5 border border-primary/20">
                        <Plus className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <div className="space-y-1 flex-1 min-w-0">
                            <p className="text-xs font-medium text-foreground">
                                {stats.additionalCount} added
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Extra dates in schedule
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
