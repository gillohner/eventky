"use client";

import { Control, Controller, FieldError } from "react-hook-form";
import { EventFormData } from "@/stores/event-form-store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { validateDuration } from "@/lib/pubky/validation";

interface DurationInputProps {
    control: Control<EventFormData>;
    error?: FieldError;
    disabled?: boolean;
}

export function DurationInput({
    control,
    error,
    disabled,
}: DurationInputProps) {
    return (
        <div className="space-y-2">
            <Label htmlFor="duration">Duration</Label>
            <div className="flex gap-2 items-end">
                <div className="flex-1">
                    <Label htmlFor="duration-hours" className="text-xs text-muted-foreground">
                        Hours
                    </Label>
                    <Controller
                        name="duration"
                        control={control}
                        rules={{
                            validate: (value) => {
                                if (!value) return true;
                                return validateDuration(value) || "Invalid duration format";
                            },
                        }}
                        render={({ field }) => {
                            const { hours, minutes } = parseDuration(field.value || "");

                            return (
                                <Input
                                    id="duration-hours"
                                    type="number"
                                    min="0"
                                    max="999"
                                    value={hours}
                                    onChange={(e) => {
                                        const newHours = parseInt(e.target.value) || 0;
                                        field.onChange(formatDuration(newHours, minutes));
                                    }}
                                    disabled={disabled}
                                    className={cn(error && "border-destructive")}
                                />
                            );
                        }}
                    />
                </div>

                <div className="flex-1">
                    <Label htmlFor="duration-minutes" className="text-xs text-muted-foreground">
                        Minutes
                    </Label>
                    <Controller
                        name="duration"
                        control={control}
                        render={({ field }) => {
                            const { hours, minutes } = parseDuration(field.value || "");

                            return (
                                <Input
                                    id="duration-minutes"
                                    type="number"
                                    min="0"
                                    max="59"
                                    value={minutes}
                                    onChange={(e) => {
                                        const newMinutes = parseInt(e.target.value) || 0;
                                        field.onChange(formatDuration(hours, newMinutes));
                                    }}
                                    disabled={disabled}
                                    className={cn(error && "border-destructive")}
                                />
                            );
                        }}
                    />
                </div>
            </div>
            {error && <p className="text-sm text-destructive">{error.message}</p>}
            <p className="text-xs text-muted-foreground">
                Specify event duration (e.g., 2 hours 30 minutes)
            </p>
        </div>
    );
}

// Parse RFC 5545 duration (PT2H30M) to hours and minutes
function parseDuration(duration: string): { hours: number; minutes: number } {
    if (!duration) return { hours: 0, minutes: 0 };

    const hourMatch = duration.match(/(\d+)H/);
    const minuteMatch = duration.match(/(\d+)M/);

    return {
        hours: hourMatch ? parseInt(hourMatch[1]) : 0,
        minutes: minuteMatch ? parseInt(minuteMatch[1]) : 0,
    };
}

// Format hours and minutes to RFC 5545 duration (PT2H30M)
function formatDuration(hours: number, minutes: number): string {
    if (hours === 0 && minutes === 0) return "";

    let result = "PT";
    if (hours > 0) result += `${hours}H`;
    if (minutes > 0) result += `${minutes}M`;

    return result;
}
