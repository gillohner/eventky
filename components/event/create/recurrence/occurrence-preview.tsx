"use client";

import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { Calendar, XCircle, Check, Plus, X } from "lucide-react";
import { formatOccurrence } from "@/lib/pubky/rrule-utils";
import { OccurrenceListItem } from "./occurrence-list-item";

interface OccurrenceDate {
    date: string;
    type: "standard" | "additional";
}

interface OccurrenceStats {
    standardCount: number;
    additionalCount: number;
    excludedCount: number;
    totalActive: number;
}

interface OccurrencePreviewProps {
    allDates: OccurrenceDate[];
    rdates: string[];
    excludedOccurrences: Set<string>;
    stats: OccurrenceStats;
    timezone?: string;
    onToggleOccurrence: (date: string) => void;
    onAddRdate: () => void;
    onUpdateRdate: (index: number, date: Date | undefined) => void;
    onRemoveRdate: (index: number) => void;
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
    onUpdateRdate,
    onRemoveRdate,
    onClearExclusions,
}: OccurrencePreviewProps) {
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
                            Event Schedule
                        </Label>
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
                            <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
                            {stats.totalActive} total
                        </span>
                    </div>
                </div>
                <p className="text-xs text-muted-foreground">
                    Click X to exclude dates, or click + to add extra dates to your schedule
                </p>
            </div>

            {/* Add Extra Date Button - Outside scroll area */}
            <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full h-9 text-xs border-dashed hover:bg-primary/10 hover:border-primary/50 hover:text-primary"
                onClick={onAddRdate}
            >
                <Plus className="h-4 w-4 mr-2" />
                Add Extra Date
            </Button>

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
                                    onToggle={() => onToggleOccurrence(item.date)}
                                />
                            );
                        })}

                        {/* Additional Date Pickers */}
                        {rdates.map((date, index) => (
                            !date && (
                                <div key={`picker-${index}`} className="px-3 py-2 bg-muted/50 rounded-md border border-border">
                                    <div className="flex gap-2 items-center">
                                        <div className="flex-1">
                                            <DateTimePicker
                                                value={undefined}
                                                onChange={(newDate) => onUpdateRdate(index, newDate)}
                                                use12HourFormat={false}
                                                timePicker={{ hour: true, minute: true, second: false }}
                                                classNames={{ trigger: "w-full" }}
                                            />
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                            onClick={() => onRemoveRdate(index)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )
                        ))}
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
