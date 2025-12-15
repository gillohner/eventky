"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { CalendarClock } from "lucide-react";
import { format } from "date-fns";

interface DateRangeFilterProps {
    startDate?: number;
    endDate?: number;
    onChange: (startDate?: number, endDate?: number) => void;
}

export function DateRangeFilter({ startDate, endDate, onChange }: DateRangeFilterProps) {
    const [isOpen, setIsOpen] = useState(false);

    const displayText = (() => {
        if (startDate && !endDate) {
            const date = new Date(startDate / 1000);
            return `From ${format(date, "MMM d")}`;
        }
        if (!startDate && endDate) {
            const date = new Date(endDate / 1000);
            return `Until ${format(date, "MMM d")}`;
        }
        if (startDate && endDate) {
            const start = new Date(startDate / 1000);
            const end = new Date(endDate / 1000);
            return `${format(start, "MMM d")} - ${format(end, "MMM d")}`;
        }
        return "Upcoming";
    })();

    const hasActiveFilter = startDate || endDate;

    // Convert from microseconds to milliseconds for Date objects
    const startDateValue = startDate ? new Date(startDate / 1000) : undefined;
    const endDateValue = endDate ? new Date(endDate / 1000) : undefined;

    const handleClear = () => {
        onChange(undefined, undefined);
    };

    const handleShowUpcoming = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        onChange(today.getTime() * 1000, undefined);
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant={hasActiveFilter ? "default" : "outline"}
                    size="sm"
                    className="gap-2"
                >
                    <CalendarClock className="h-4 w-4" />
                    <span className="hidden sm:inline">{displayText}</span>
                    <span className="sm:hidden">Date</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm">Date Range</h4>
                        {hasActiveFilter && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleClear}
                                className="h-auto py-1 px-2 text-xs"
                            >
                                Clear
                            </Button>
                        )}
                    </div>

                    <div className="space-y-3">
                        <div className="space-y-2">
                            <Label htmlFor="start-date" className="text-xs text-muted-foreground">
                                Start Date
                            </Label>
                            <DateTimePicker
                                value={startDateValue}
                                onChange={(date) => {
                                    // Convert from milliseconds to microseconds
                                    const timestamp = date ? date.getTime() * 1000 : undefined;
                                    onChange(timestamp, endDate);
                                }}
                                hideTime
                                clearable
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="end-date" className="text-xs text-muted-foreground">
                                End Date (optional)
                            </Label>
                            <DateTimePicker
                                value={endDateValue}
                                onChange={(date) => {
                                    // Convert from milliseconds to microseconds
                                    const timestamp = date ? date.getTime() * 1000 : undefined;
                                    onChange(startDate, timestamp);
                                }}
                                hideTime
                                clearable
                                min={startDateValue}
                            />
                        </div>
                    </div>

                    <Separator />

                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleShowUpcoming}
                            className="flex-1"
                        >
                            Upcoming Only
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleClear}
                            className="flex-1"
                        >
                            All Events
                        </Button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
