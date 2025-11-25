"use client";

import { Input } from "@/components/ui/input";
import { Control, Controller, FieldError } from "react-hook-form";
import { EventFormData } from "@/stores/event-form-store";

interface EventTitleFieldProps {
    control: Control<EventFormData>;
    error?: FieldError;
}

export function EventTitleField({ control, error }: EventTitleFieldProps) {
    return (
        <div className="space-y-2">
            <Controller
                name="summary"
                control={control}
                rules={{
                    required: "Event title is required",
                    minLength: {
                        value: 1,
                        message: "Event title must be at least 1 character",
                    },
                    maxLength: {
                        value: 500,
                        message: "Event title must not exceed 500 characters",
                    },
                }}
                render={({ field }) => (
                    <Input
                        {...field}
                        id="summary"
                        type="text"
                        placeholder="Event title*"
                        aria-invalid={!!error}
                        className={error ? "border-destructive" : ""}
                    />
                )}
            />
            {error && <p className="text-sm text-destructive">{error.message}</p>}
        </div>
    );
}
