"use client";

import { Control, Controller, FieldErrors } from "react-hook-form";
import type { EventFormData } from "@/types/event";
import { FormSection } from "@/components/ui/form-section";
import { LocationPicker } from "./location-picker";

interface LocationFieldsProps {
    control: Control<EventFormData>;
    locationsError?: FieldErrors<EventFormData>['locations'];
}

export function LocationFields({
    control,
    locationsError,
}: LocationFieldsProps) {
    return (
        <FormSection
            title="Location"
            description="Where is your event taking place?"
        >
            <Controller
                name="locations"
                control={control}
                render={({ field }) => (
                    <LocationPicker
                        value={field.value || []}
                        onChange={field.onChange}
                    />
                )}
            />
            {locationsError && (
                <p className="text-sm text-destructive">
                    {typeof locationsError === 'string'
                        ? locationsError
                        : locationsError.message || 'Invalid location data'}
                </p>
            )}
        </FormSection>
    );
}
