"use client";

import { Control, Controller, FieldError } from "react-hook-form";
import { EventFormData } from "@/stores/event-form-store";
import { Label } from "@/components/ui/label";
import { DateTimePicker as UIDateTimePicker } from "@/components/ui/datetime-picker";
import { isoStringToDate, dateToISOString } from "@/lib/pubky/event-utils";

interface EventDateTimePickerProps {
    control: Control<EventFormData>;
    name: "dtstart" | "dtend";
    label: string;
    error?: FieldError;
    minDate?: string; // Now accepts ISO string
    disabled?: boolean;
}

export function EventDateTimePicker({
    control,
    name,
    label,
    error,
    minDate,
    disabled,
}: EventDateTimePickerProps) {
    return (
        <div className="space-y-2">
            {label && <Label htmlFor={name}>{label}</Label>}
            <Controller
                name={name}
                control={control}
                rules={{
                    required: name === "dtstart" ? "Start date and time is required" : false,
                    validate: (value) => {
                        if (name === "dtend" && value && minDate) {
                            if (value < minDate) {
                                return "End time must be after start time";
                            }
                        }
                        return true;
                    },
                }}
                render={({ field }) => (
                    <UIDateTimePicker
                        value={field.value ? isoStringToDate(field.value) : undefined}
                        onChange={(date) => field.onChange(date ? dateToISOString(date) : null)}
                        min={minDate ? isoStringToDate(minDate) : undefined}
                        disabled={disabled}
                        timePicker={{ hour: true, minute: true, second: false }}
                        classNames={{
                            trigger: error ? "border-destructive focus-visible:ring-destructive" : ""
                        }}
                    />
                )}
            />
            {error && (
                <p className="text-sm text-destructive">{error.message}</p>
            )}
        </div>
    );
}