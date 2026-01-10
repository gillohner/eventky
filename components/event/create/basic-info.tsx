"use client";

import { Control, Controller } from "react-hook-form";
import type { EventFormData } from "@/types/event";
import { FormSection } from "@/components/ui/form-section";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { getValidEventStatuses } from "@/lib/pubky/validation";
import { getUnicodeLength } from "@/lib/utils/unicode-length";
import { CharacterCounter } from "@/components/ui/character-counter";

interface BasicInfoFieldsProps {
    control: Control<EventFormData>;
    titleError?: { message?: string };
    urlError?: { message?: string };
    titleValue?: string;
    urlValue?: string;
    descriptionValue?: { content: string; format: string; };
}

export function BasicInfoFields({
    control,
    titleError,
    urlError,
    titleValue = "",
    urlValue = "",
    descriptionValue,
}: BasicInfoFieldsProps) {
    return (
        <FormSection>
            {/* Title Field */}
            <div className="space-y-2">
                <Label htmlFor="summary">Title*</Label>
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
                            placeholder="Give your event a name"
                            aria-invalid={!!titleError}
                            className={titleError ? "border-destructive" : ""}
                        />
                    )}
                />
                <CharacterCounter
                    current={getUnicodeLength(titleValue)}
                    max={500}
                />
                {titleError && (
                    <p className="text-sm text-destructive">{titleError.message}</p>
                )}
            </div>

            {/* Description Field */}
            <Controller
                name="styled_description"
                control={control}
                rules={{
                    validate: (value) => {
                        if (!value?.content) return true;
                        // Strip HTML tags and count text length
                        const textLength = value.content.replace(/<[^>]*>/g, '').length;
                        return textLength <= 10000 || "Description must not exceed 10,000 characters";
                    },
                }}
                render={({ field }) => (
                    <div className="space-y-2">
                        <Label>Description</Label>
                        <p className="text-sm text-muted-foreground">
                            Add details about your event
                        </p>

                        <RichTextEditor
                            value={field.value?.content || ""}
                            onChange={(html) => {
                                field.onChange(
                                    html
                                        ? {
                                            content: html,
                                            format: "text/html",
                                        }
                                        : undefined
                                );
                            }}
                            placeholder="Describe your event..."
                        />
                        <CharacterCounter
                            current={getUnicodeLength(
                                (descriptionValue?.content || "").replace(/<[^>]*>/g, "")
                            )}
                            max={10000}
                            className="mt-1"
                        />
                    </div>
                )}
            />

            {/* URL Field */}
            <div className="space-y-2">
                <Label htmlFor="url">Website</Label>
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
                            placeholder="https://example.com/event"
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
                        Link to event page or registration
                    </p>
                    {urlValue && getUnicodeLength(urlValue) > 1800 && (
                        <CharacterCounter
                            current={getUnicodeLength(urlValue)}
                            max={2048}
                            warning
                        />
                    )}
                </div>
            </div>

            {/* Status Field */}
            <div className="space-y-2">
                <Label htmlFor="status">Event Status</Label>
                <Controller
                    name="status"
                    control={control}
                    defaultValue="CONFIRMED"
                    render={({ field }) => (
                        <Select
                            value={field.value || "CONFIRMED"}
                            onValueChange={field.onChange}
                        >
                            <SelectTrigger id="status">
                                <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                                {getValidEventStatuses().map((status) => (
                                    <SelectItem key={status} value={status}>
                                        {status.charAt(0) + status.slice(1).toLowerCase()}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                />
                <p className="text-sm text-muted-foreground">
                    Current status of the event
                </p>
            </div>
        </FormSection>
    );
}
