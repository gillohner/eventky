"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import type { RecurrenceFrequency, Weekday } from "@/types/recurrence";

const WEEKDAY_OPTIONS: Array<{ value: Weekday; label: string; short: string }> = [
    { value: "SU", label: "Sunday", short: "S" },
    { value: "MO", label: "Monday", short: "M" },
    { value: "TU", label: "Tuesday", short: "T" },
    { value: "WE", label: "Wednesday", short: "W" },
    { value: "TH", label: "Thursday", short: "T" },
    { value: "FR", label: "Friday", short: "F" },
    { value: "SA", label: "Saturday", short: "S" },
];

const MONTH_DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => i + 1);
const NEGATIVE_MONTH_DAY_OPTIONS = [-1, -2, -3, -4, -5]; // Last, 2nd last, etc.

const POSITION_OPTIONS = [
    { value: 1, label: "First" },
    { value: 2, label: "Second" },
    { value: 3, label: "Third" },
    { value: 4, label: "Fourth" },
    { value: -1, label: "Last" },
    { value: -2, label: "Second to last" },
];

export interface RuleBuilderState {
    enabled: boolean;
    frequency: RecurrenceFrequency;
    interval: number;
    count?: number;

    // For WEEKLY
    selectedWeekdays: Weekday[];

    // For MONTHLY
    monthlyMode: "dayofmonth" | "dayofweek" | "none";
    bymonthday: number[];
    bysetpos: number[];

    // For advanced
    until?: string;
}

interface ComprehensiveRuleBuilderProps {
    state: RuleBuilderState;
    onChange: (state: RuleBuilderState) => void;
}

export function ComprehensiveRuleBuilder({
    state,
    onChange,
}: ComprehensiveRuleBuilderProps) {
    const updateState = (updates: Partial<RuleBuilderState>) => {
        onChange({ ...state, ...updates });
    };

    const toggleEnabled = () => {
        updateState({ enabled: !state.enabled });
    };

    const getFrequencyUnitLabel = (frequency: string, interval: number): string => {
        const isSingular = interval === 1;
        switch (frequency) {
            case 'DAILY': return isSingular ? 'day' : 'days';
            case 'WEEKLY': return isSingular ? 'week' : 'weeks';
            case 'MONTHLY': return isSingular ? 'month' : 'months';
            case 'YEARLY': return isSingular ? 'year' : 'years';
            default: return isSingular ? 'time' : 'times';
        }
    };

    const toggleWeekday = (day: Weekday) => {
        const newWeekdays = state.selectedWeekdays.includes(day)
            ? state.selectedWeekdays.filter(d => d !== day)
            : [...state.selectedWeekdays, day].sort((a, b) => {
                const order = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
                return order.indexOf(a) - order.indexOf(b);
            });
        updateState({ selectedWeekdays: newWeekdays });
    };

    const toggleMonthDay = (day: number) => {
        const newDays = state.bymonthday.includes(day)
            ? state.bymonthday.filter(d => d !== day)
            : [...state.bymonthday, day].sort((a, b) => a - b);
        updateState({ bymonthday: newDays });
    };

    if (!state.enabled) {
        return (
            <div className="flex items-center space-x-2">
                <Checkbox
                    id="enable-recurrence"
                    checked={false}
                    onCheckedChange={toggleEnabled}
                />
                <Label
                    htmlFor="enable-recurrence"
                    className="text-sm font-normal cursor-pointer"
                >
                    Make this a recurring event
                </Label>
            </div>
        );
    }

    const intervalUnitLabel = getFrequencyUnitLabel(state.frequency, state.interval);

    return (
        <div className="space-y-4 p-4 border rounded-md bg-muted/50">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="enable-recurrence"
                        checked={true}
                        onCheckedChange={toggleEnabled}
                    />
                    <Label
                        htmlFor="enable-recurrence"
                        className="text-sm font-medium cursor-pointer"
                    >
                        Recurring event
                    </Label>
                </div>
            </div>

            {/* Frequency Selection */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Frequency</Label>
                    <Select
                        value={state.frequency}
                        onValueChange={(value) => {
                            const newState: Partial<RuleBuilderState> = {
                                frequency: value as RecurrenceFrequency
                            };

                            // Reset mode-specific fields when changing frequency
                            if (value !== "WEEKLY") {
                                newState.selectedWeekdays = [];
                            }
                            if (value !== "MONTHLY") {
                                newState.monthlyMode = "none";
                                newState.bymonthday = [];
                                newState.bysetpos = [];
                            }

                            updateState(newState);
                        }}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="DAILY">Daily</SelectItem>
                            <SelectItem value="WEEKLY">Weekly</SelectItem>
                            <SelectItem value="MONTHLY">Monthly</SelectItem>
                            <SelectItem value="YEARLY">Yearly</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>Repeat every</Label>
                    <div className="flex items-center gap-2">
                        <Input
                            type="number"
                            min="1"
                            max="999"
                            value={state.interval}
                            onChange={(e) => updateState({ interval: parseInt(e.target.value) || 1 })}
                            className="w-20"
                        />
                        <span className="text-sm text-muted-foreground">
                            {intervalUnitLabel}
                        </span>
                    </div>
                </div>
            </div>

            {/* Weekly - Day Selection */}
            {state.frequency === "WEEKLY" && (
                <div className="space-y-2">
                    <Label>Repeat on</Label>
                    <div className="flex gap-2">
                        {WEEKDAY_OPTIONS.map((day) => (
                            <Button
                                key={day.value}
                                type="button"
                                variant={state.selectedWeekdays.includes(day.value) ? "default" : "outline"}
                                size="sm"
                                onClick={() => toggleWeekday(day.value)}
                                className="w-10 h-10 p-0"
                                title={day.label}
                            >
                                {day.short}
                            </Button>
                        ))}
                    </div>
                    {state.selectedWeekdays.length === 0 && (
                        <p className="text-xs text-muted-foreground">
                            No days selected (will use start date&apos;s weekday)
                        </p>
                    )}
                </div>
            )}

            {/* Monthly - Mode Selection */}
            {state.frequency === "MONTHLY" && (
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>Monthly pattern</Label>
                        <Select
                            value={state.monthlyMode}
                            onValueChange={(value) => {
                                const newState: Partial<RuleBuilderState> = {
                                    monthlyMode: value as "dayofmonth" | "dayofweek" | "none"
                                };

                                // Clear fields when changing mode
                                if (value === "dayofmonth") {
                                    newState.bysetpos = [];
                                    newState.selectedWeekdays = [];
                                } else if (value === "dayofweek") {
                                    newState.bymonthday = [];
                                } else {
                                    newState.bymonthday = [];
                                    newState.bysetpos = [];
                                    newState.selectedWeekdays = [];
                                }

                                updateState(newState);
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Same day each month</SelectItem>
                                <SelectItem value="dayofmonth">Specific day(s) of month</SelectItem>
                                <SelectItem value="dayofweek">Specific weekday position</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Day of Month */}
                    {state.monthlyMode === "dayofmonth" && (
                        <div className="space-y-2">
                            <Label>Select days</Label>
                            <div className="grid grid-cols-7 gap-1">
                                {MONTH_DAY_OPTIONS.map((day) => (
                                    <Button
                                        key={day}
                                        type="button"
                                        variant={state.bymonthday.includes(day) ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => toggleMonthDay(day)}
                                        className="h-8 p-0 text-xs"
                                    >
                                        {day}
                                    </Button>
                                ))}
                            </div>
                            <div className="flex flex-wrap gap-1 pt-2">
                                {NEGATIVE_MONTH_DAY_OPTIONS.map((day) => (
                                    <Button
                                        key={day}
                                        type="button"
                                        variant={state.bymonthday.includes(day) ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => toggleMonthDay(day)}
                                        className="h-8 text-xs"
                                    >
                                        {day === -1 ? "Last" : `${-day} before last`}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Day of Week with Position */}
                    {state.monthlyMode === "dayofweek" && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Select weekday(s)</Label>
                                <div className="flex gap-2">
                                    {WEEKDAY_OPTIONS.map((day) => (
                                        <Button
                                            key={day.value}
                                            type="button"
                                            variant={state.selectedWeekdays.includes(day.value) ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => toggleWeekday(day.value)}
                                            className="w-10 h-10 p-0"
                                            title={day.label}
                                        >
                                            {day.short}
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Select position(s)</Label>
                                <div className="flex flex-wrap gap-2">
                                    {POSITION_OPTIONS.map((pos) => (
                                        <Button
                                            key={pos.value}
                                            type="button"
                                            variant={state.bysetpos.includes(pos.value) ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => {
                                                const newPos = state.bysetpos.includes(pos.value)
                                                    ? state.bysetpos.filter(p => p !== pos.value)
                                                    : [...state.bysetpos, pos.value].sort((a, b) => a - b);
                                                updateState({ bysetpos: newPos });
                                            }}
                                        >
                                            {pos.label}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Count/Until */}
            <div className="space-y-2">
                <Label>End condition</Label>
                <div className="flex items-center gap-2">
                    <Checkbox
                        id="has-count"
                        checked={state.count !== undefined}
                        onCheckedChange={(checked) => {
                            updateState({
                                count: checked ? 10 : undefined,
                                until: undefined // Clear until if count is set
                            });
                        }}
                    />
                    <Label htmlFor="has-count" className="font-normal">
                        Limit to
                    </Label>
                    <Input
                        type="number"
                        min="1"
                        max="999"
                        value={state.count || ""}
                        onChange={(e) => updateState({
                            count: parseInt(e.target.value) || undefined,
                            until: undefined
                        })}
                        disabled={state.count === undefined}
                        className="w-20"
                    />
                    <span className="text-sm text-muted-foreground">
                        occurrences
                    </span>
                </div>
                {state.count === undefined && (
                    <p className="text-xs text-muted-foreground">
                        Event will repeat indefinitely
                    </p>
                )}
            </div>
        </div>
    );
}
