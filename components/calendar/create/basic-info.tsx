"use client";

import { Control, Controller, FieldError } from "react-hook-form";
import type { CalendarFormData } from "@/types/calendar";
import { FormSection } from "@/components/ui/form-section";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface BasicInfoFieldsProps {
    control: Control<CalendarFormData>;
    nameError?: FieldError;
    urlError?: FieldError;
}

export function BasicInfoFields({
    control,
    nameError,
    urlError,
}: BasicInfoFieldsProps) {
    return (
        <FormSection>
            {/* Name Field */}
            <div className="space-y-2">
                <Label htmlFor="name">Calendar Name*</Label>
                <Controller
                    name="name"
                    control={control}
                    rules={{
                        required: "Calendar name is required",
                        minLength: {
                            value: 1,
                            message: "Calendar name must be at least 1 character",
                        },
                        maxLength: {
                            value: 200,
                            message: "Calendar name must not exceed 200 characters",
                        },
                    }}
                    render={({ field }) => (
                        <Input
                            {...field}
                            id="name"
                            type="text"
                            placeholder="My Calendar"
                            aria-invalid={!!nameError}
                            className={nameError ? "border-destructive" : ""}
                        />
                    )}
                />
                {nameError && (
                    <p className="text-sm text-destructive">{nameError.message}</p>
                )}
            </div>

            {/* URL Field */}
            <div className="space-y-2">
                <Label htmlFor="url">Calendar Website</Label>
                <Controller
                    name="url"
                    control={control}
                    rules={{
                        pattern: {
                            value: /^https?:\/\/.+/i,
                            message: "Please enter a valid URL starting with http:// or https://",
                        },
                        maxLength: {
                            value: 2048,
                            message: "URL must not exceed 2048 characters",
                        },
                    }}
                    render={({ field }) => (
                        <Input
                            {...field}
                            value={field.value || ""}
                            id="url"
                            type="url"
                            placeholder="https://example.com/calendar"
                            aria-invalid={!!urlError}
                            className={urlError ? "border-destructive" : ""}
                        />
                    )}
                />
                {urlError && (
                    <p className="text-sm text-destructive">{urlError.message}</p>
                )}
                <p className="text-sm text-muted-foreground">
                    Link to calendar webpage or information
                </p>
            </div>

            {/* Description Field */}
            <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Controller
                    name="description"
                    control={control}
                    rules={{
                        maxLength: {
                            value: 1000,
                            message: "Description must not exceed 1000 characters",
                        },
                    }}
                    render={({ field }) => (
                        <Textarea
                            {...field}
                            value={field.value || ""}
                            id="description"
                            placeholder="Describe your calendar..."
                            rows={4}
                        />
                    )}
                />
                <p className="text-sm text-muted-foreground">
                    Add details about your calendar
                </p>
            </div>
        </FormSection>
    );
}
