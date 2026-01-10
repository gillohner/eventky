"use client";

import { Control, Controller, FieldError, useWatch } from "react-hook-form";
import type { EventFormData } from "@/types/event";
import { FormSection } from "@/components/ui/form-section";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { validateGeoCoordinates } from "@/lib/pubky/validation";
import { getUnicodeLength } from "@/lib/utils/unicode-length";
import { CharacterCounter } from "@/components/ui/character-counter";

interface LocationFieldsProps {
    control: Control<EventFormData>;
    locationError?: FieldError;
    geoError?: FieldError;
}

export function LocationFields({
    control,
    locationError,
    geoError,
}: LocationFieldsProps) {
    const locationValue = useWatch({ control, name: "location" }) || "";
    return (
        <FormSection
            title="Location"
            description="Where is your event taking place?"
        >
            {/* Location Text Field */}
            <div className="space-y-2">
                <Label htmlFor="location">Location Name</Label>
                <Controller
                    name="location"
                    control={control}
                    rules={{
                        maxLength: {
                            value: 1000,
                            message: "Location must not exceed 1000 characters",
                        },
                    }}
                    render={({ field }) => (
                        <Input
                            {...field}
                            value={field.value || ""}
                            id="location"
                            type="text"
                            placeholder="Conference Center, Building A"
                            aria-invalid={!!locationError}
                            className={locationError ? "border-destructive" : ""}
                        />
                    )}
                />
                <CharacterCounter
                    current={getUnicodeLength(locationValue)}
                    max={1000}
                />
                {locationError && (
                    <p className="text-sm text-destructive">{locationError.message}</p>
                )}
                <p className="text-sm text-muted-foreground">
                    The venue or place name
                </p>
            </div>

            {/* Geographic Coordinates Field */}
            <div className="space-y-2">
                <Label htmlFor="geo">Coordinates (optional)</Label>
                <Controller
                    name="geo"
                    control={control}
                    rules={{
                        validate: (value) => {
                            if (!value) return true;
                            return validateGeoCoordinates(value) || "Invalid coordinates format. Use: latitude;longitude (e.g., 47.3769;8.5417)";
                        },
                    }}
                    render={({ field }) => (
                        <Input
                            {...field}
                            value={field.value || ""}
                            id="geo"
                            type="text"
                            placeholder="47.3769;8.5417"
                            aria-invalid={!!geoError}
                            className={geoError ? "border-destructive" : ""}
                        />
                    )}
                />
                {geoError && (
                    <p className="text-sm text-destructive">{geoError.message}</p>
                )}
                <p className="text-sm text-muted-foreground">
                    Format: latitude;longitude (e.g., Zurich: 47.3769;8.5417)
                </p>
            </div>
        </FormSection>
    );
}
