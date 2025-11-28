"use client";

import { Control, Controller } from "react-hook-form";
import type { EventFormData } from "@/types/event";
import { FormSection } from "@/components/ui/form-section";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/ui/rich-text-editor";

interface EventBasicInfoFieldsProps {
    control: Control<EventFormData>;
    titleError?: { message?: string };
}

export function EventBasicInfoFields({
    control,
    titleError,
}: EventBasicInfoFieldsProps) {
    return (
        <FormSection>
            {/* Title Field */}
            <div className="space-y-2">
                <Label htmlFor="summary">Event Title*</Label>
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
                {titleError && (
                    <p className="text-sm text-destructive">{titleError.message}</p>
                )}
            </div>

            {/* Description Field */}
            <Controller
                name="styled_description"
                control={control}
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
                    </div>
                )}
            />
        </FormSection>
    );
}
