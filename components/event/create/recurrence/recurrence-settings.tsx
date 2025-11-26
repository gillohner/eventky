"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";

const FREQUENCY_OPTIONS = [
    { value: "DAILY", label: "Daily" },
    { value: "WEEKLY", label: "Weekly" },
    { value: "MONTHLY", label: "Monthly" },
    { value: "YEARLY", label: "Yearly" },
];

const WEEKDAY_OPTIONS = [
    { value: "MO", label: "Monday" },
    { value: "TU", label: "Tuesday" },
    { value: "WE", label: "Wednesday" },
    { value: "TH", label: "Thursday" },
    { value: "FR", label: "Friday" },
    { value: "SA", label: "Saturday" },
    { value: "SU", label: "Sunday" },
];

interface RecurrenceSettingsProps {
    preset: "none" | "daily" | "weekly" | "monthly" | "custom";
    frequency: string;
    interval: number;
    count: number | undefined;
    selectedWeekdays: string[];
    onFrequencyChange: (frequency: string) => void;
    onIntervalChange: (interval: number) => void;
    onCountChange: (count: number | undefined) => void;
    onWeekdayToggle: (day: string) => void;
}

export function RecurrenceSettings({
    preset,
    frequency,
    interval,
    count,
    selectedWeekdays,
    onFrequencyChange,
    onIntervalChange,
    onCountChange,
    onWeekdayToggle,
}: RecurrenceSettingsProps) {
    if (preset === "none") return null;

    return (
        <>
            {/* Quick settings for presets */}
            {preset !== "custom" && (
                <div className="space-y-4 p-4 border rounded-md bg-muted/50">
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
                                        {day.label.slice(0, 3)}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Number of occurrences */}
                    <div className="space-y-2">
                        <Label>Number of occurrences</Label>
                        <div className="flex items-center gap-2">
                            <Input
                                type="number"
                                min="1"
                                max="999"
                                placeholder="10"
                                value={count || ""}
                                onChange={(e) => onCountChange(e.target.value ? parseInt(e.target.value) : 10)}
                                className="w-24"
                            />
                            <span className="text-sm text-muted-foreground">events</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Frequency Settings */}
            {preset === "custom" && (
                <div className="space-y-4 p-4 border rounded-md bg-muted/50">
                    <div className="space-y-2">
                        <Label>Frequency</Label>
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <Select value={frequency} onValueChange={onFrequencyChange}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select frequency" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {FREQUENCY_OPTIONS.map((opt) => (
                                            <SelectItem key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="w-32">
                                <div className="flex items-center gap-2">
                                    <Label className="text-xs whitespace-nowrap">Every</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        max="999"
                                        value={interval}
                                        onChange={(e) => onIntervalChange(parseInt(e.target.value) || 1)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Weekly - Day Selection */}
                    {frequency === "WEEKLY" && (
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
                                        {day.label.slice(0, 3)}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Ends After */}
                    <div className="space-y-2">
                        <Label>Number of occurrences</Label>
                        <div className="flex items-center gap-2">
                            <Input
                                type="number"
                                min="1"
                                placeholder="10"
                                value={count || ""}
                                onChange={(e) => onCountChange(e.target.value ? parseInt(e.target.value) : 10)}
                                className="w-24"
                            />
                            <span className="text-sm text-muted-foreground">events</span>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
