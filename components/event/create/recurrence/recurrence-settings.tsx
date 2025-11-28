"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { RecurrencePreset, RecurrenceFrequency, Weekday } from "@/types/recurrence";

const WEEKDAY_OPTIONS: Array<{ value: Weekday; label: string }> = [
    { value: "MO", label: "Mon" },
    { value: "TU", label: "Tue" },
    { value: "WE", label: "Wed" },
    { value: "TH", label: "Thu" },
    { value: "FR", label: "Fri" },
    { value: "SA", label: "Sat" },
    { value: "SU", label: "Sun" },
];

interface RecurrenceSettingsProps {
    preset: RecurrencePreset;
    frequency: RecurrenceFrequency;
    interval: number;
    count: number | undefined;
    selectedWeekdays: Weekday[];
    onIntervalChange: (interval: number) => void;
    onCountChange: (count: number | undefined) => void;
    onWeekdayToggle: (day: Weekday) => void;
}

export function RecurrenceSettings({
    preset,
    frequency,
    interval,
    count,
    selectedWeekdays,
    onIntervalChange,
    onCountChange,
    onWeekdayToggle,
}: RecurrenceSettingsProps) {
    if (preset === "none") return null;

    const getFrequencyUnitLabel = (frequency: string, interval: number): string => {
        const isSingular = interval === 1;

        switch (frequency) {
            case 'DAILY':
                return isSingular ? 'day' : 'days';
            case 'WEEKLY':
                return isSingular ? 'week' : 'weeks';
            case 'MONTHLY':
                return isSingular ? 'month' : 'months';
            case 'YEARLY':
                return isSingular ? 'year' : 'years';
            default:
                return isSingular ? 'time' : 'times';
        }
    };

    const intervalUnitLabel = getFrequencyUnitLabel(frequency, interval);

    return (
        <div className="space-y-4 p-4 border rounded-md bg-muted/50">
            {/* Interval Setting */}
            <div className="space-y-2">
                <Label>Repeat every</Label>
                <div className="flex items-center gap-2">
                    <Input
                        type="number"
                        min="1"
                        max="999"
                        value={interval}
                        onChange={(e) => onIntervalChange(parseInt(e.target.value) || 1)}
                        className="w-20"
                    />
                    <span className="text-sm text-muted-foreground">
                        {intervalUnitLabel}
                    </span>
                </div>
            </div>

            {/* Weekly - Day Selection */}
            {preset === "weekly" && (
                <div className="space-y-2">
                    <Label>Repeat on</Label>
                    <div className="flex flex-wrap gap-2">
                        {WEEKDAY_OPTIONS.map((day) => (
                            <Button
                                key={day.value}
                                type="button"
                                variant={selectedWeekdays.includes(day.value) ? "default" : "outline"}
                                size="sm"
                                onClick={() => onWeekdayToggle(day.value)}
                            >
                                {day.label}
                            </Button>
                        ))}
                    </div>
                </div>
            )}

            {/* Number of Occurrences - Optional */}
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <Checkbox
                        id="limit-occurrences"
                        checked={count !== undefined}
                        onCheckedChange={(checked) => onCountChange(checked ? 10 : undefined)}
                    />
                    <Label htmlFor="limit-occurrences" className="cursor-pointer font-normal">
                        Limit number of occurrences
                    </Label>
                </div>
                {count !== undefined && (
                    <div className="flex items-center gap-2 pl-6">
                        <Input
                            type="number"
                            min="1"
                            max="999"
                            value={count}
                            onChange={(e) => onCountChange(parseInt(e.target.value) || 10)}
                            className="w-24"
                        />
                        <span className="text-sm text-muted-foreground">occurrences</span>
                    </div>
                )}
            </div>
        </div>
    );
}
