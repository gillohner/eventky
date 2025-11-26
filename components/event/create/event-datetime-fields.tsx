"use client";

import { Control, useWatch, UseFormSetValue, FieldErrors } from "react-hook-form";
import { EventFormData } from "@/stores/event-form-store";
import { EventDateTimePicker } from "./event-datetime-picker";
import { EventTimezoneSelector } from "./event-timezone-selector";
import { EventDurationInput } from "./event-duration-input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";

interface EventDateTimeFieldsProps {
    control: Control<EventFormData>;
    errors: FieldErrors<EventFormData>;
    setValue: UseFormSetValue<EventFormData>;
}

export function EventDateTimeFields({
    control,
    errors,
    setValue,
}: EventDateTimeFieldsProps) {
    // Watch dtstart to use as minDate for dtend
    const dtstart = useWatch({ control, name: "dtstart" });

    // Track which mode: end time or duration
    const [endTimeMode, setEndTimeMode] = useState<"endtime" | "duration">("endtime");

    const handleModeChange = (mode: string) => {
        setEndTimeMode(mode as "endtime" | "duration");

        // Clear the other field when switching modes
        if (mode === "endtime") {
            setValue("duration", undefined);
        } else {
            setValue("dtend", undefined);
            setValue("dtend_tzid", undefined);
        }
    };

    return (
        <Card>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <h3 className="text-lg font-semibold">Date & Time</h3>
                    <p className="text-sm text-muted-foreground">
                        Set when your event starts and ends
                    </p>
                </div>

                {/* Start Date/Time */}
                <div className="space-y-2">
                    <Label>Start Date & Time *</Label>
                    <div className="flex flex-wrap gap-2">
                        <EventDateTimePicker
                            control={control}
                            name="dtstart"
                            label=""
                            error={errors.dtstart}
                        />
                        <EventTimezoneSelector
                            control={control}
                            name="dtstart_tzid"
                            label=""
                            error={errors.dtstart_tzid}
                        />
                    </div>
                    {errors.dtstart && (
                        <p className="text-sm text-destructive">{errors.dtstart.message}</p>
                    )}
                </div>

                {/* End Time or Duration Toggle */}
                <div className="space-y-4">
                    <Label>End Time</Label>
                    <Tabs value={endTimeMode} onValueChange={handleModeChange}>
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="endtime">Specific End Time</TabsTrigger>
                            <TabsTrigger value="duration">Duration</TabsTrigger>
                        </TabsList>

                        <TabsContent value="endtime" className="space-y-2 mt-4">
                            <div className="flex flex-wrap gap-2">
                                <EventDateTimePicker
                                    control={control}
                                    name="dtend"
                                    label=""
                                    error={errors.dtend}
                                    minDate={dtstart || undefined}
                                />
                                <EventTimezoneSelector
                                    control={control}
                                    name="dtend_tzid"
                                    label=""
                                    error={errors.dtend_tzid}
                                />
                            </div>
                            {errors.dtend && (
                                <p className="text-sm text-destructive">{errors.dtend.message}</p>
                            )}
                        </TabsContent>

                        <TabsContent value="duration" className="mt-4">
                            <EventDurationInput
                                control={control}
                                error={errors.duration}
                            />
                        </TabsContent>
                    </Tabs>
                </div>
            </CardContent>
        </Card>
    );
}
