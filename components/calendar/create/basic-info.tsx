"use client";

import { Control, Controller, FieldError } from "react-hook-form";
import type { CalendarFormData } from "@/types/calendar";
import { FormSection } from "@/components/ui/form-section";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getUnicodeLength } from "@/lib/utils/unicode-length";
import { CharacterCounter } from "@/components/ui/character-counter";

interface BasicInfoFieldsProps {
    control: Control<CalendarFormData>;
    nameError?: FieldError;
    urlError?: FieldError;
    nameValue?: string;
    descriptionValue?: string;
    urlValue?: string;
}

export function BasicInfoFields({
    control,
    nameError,
    urlError,
    nameValue = "",
    descriptionValue = "",
    urlValue = "",
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
                        pattern: {
                            value: /\S/,
                            message: "Calendar name cannot be only whitespace",
                        },
                        minLength: {
                            value: 1,
                            message: "Calendar name must be at least 1 character",
                        },
                        maxLength: {
                            value: 100,
                            message: "Calendar name must not exceed 100 characters",
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
                <CharacterCounter
                    current={getUnicodeLength(nameValue)}
                    max={100}
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
                <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-muted-foreground">
                        Link to calendar webpage or information
                    </p>
                    {urlValue && getUnicodeLength(urlValue || "") > 1800 && (
                        <CharacterCounter
                            current={getUnicodeLength(urlValue || "")}
                            max={2048}
                            warning
                        />
                    )}
                </div>
            </div>

            {/* Description Field */}
            <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Controller
                    name="description"
                    control={control}
                    rules={{
                        maxLength: {
                            value: 10000,
                            message: "Description must not exceed 10,000 characters",
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
                <CharacterCounter
                    current={getUnicodeLength(descriptionValue)}
                    max={10000}
                />
            </div>
        </FormSection>
    );
}
