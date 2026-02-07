"use client";

import { Control, Controller, FieldError } from "react-hook-form";
import type { CalendarFormData } from "@/types/calendar";
import { FormSection } from "@/components/ui/form-section";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { TimezoneSelector } from "@/components/ui/timezone-selector";
import { ImageUpload } from "@/components/ui/image-upload";
import { AuthorSelector } from "@/components/calendar/create/admin-selector";

interface SettingsFieldsProps {
    control: Control<CalendarFormData>;
    timezoneError?: FieldError;
    colorError?: FieldError;
    imageUri?: string;
    onImageChange: (uri: string | undefined) => void;
    /** Current user's ID for excluding from admin selection */
    ownerUserId?: string;
}

export function SettingsFields({
    control,
    timezoneError,
    colorError,
    imageUri,
    onImageChange,
    ownerUserId,
}: SettingsFieldsProps) {
    return (
        <FormSection
            title="Settings"
            description="Configure calendar timezone and appearance"
        >
            {/* Timezone Field */}
            <div className="space-y-2">
                <TimezoneSelector
                    control={control}
                    name="timezone"
                    label="Default Timezone*"
                    error={timezoneError}
                />
                <p className="text-sm text-muted-foreground">
                    Default timezone for events in this calendar
                </p>
            </div>

            {/* Color Field */}
            <div className="space-y-2">
                <Label htmlFor="color">Calendar Color</Label>
                <Controller
                    name="color"
                    control={control}
                    rules={{
                        pattern: {
                            value: /^#[0-9A-F]{6}$/i,
                            message: "Please enter a valid hex color (e.g., #FF5733)",
                        },
                    }}
                    render={({ field }) => (
                        <div className="flex gap-2">
                            <Input
                                {...field}
                                value={field.value || ""}
                                id="color"
                                type="text"
                                placeholder="#FF5733"
                                aria-invalid={!!colorError}
                                className={colorError ? "border-destructive" : ""}
                                maxLength={7}
                            />
                            <Input
                                type="color"
                                value={field.value || "#3b82f6"}
                                onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                className="w-20 h-10 cursor-pointer"
                            />
                        </div>
                    )}
                />
                {colorError && (
                    <p className="text-sm text-destructive">{colorError.message}</p>
                )}
                <p className="text-sm text-muted-foreground">
                    Choose a color to identify this calendar
                </p>
            </div>

            {/* Image Upload */}
            <ImageUpload
                value={imageUri}
                onChange={onImageChange}
                title="Calendar Image"
                description="Upload an image for your calendar (max 5MB)"
            />

            {/* Author Selector */}
            <AuthorSelector control={control} ownerUserId={ownerUserId} />
        </FormSection>
    );
}
