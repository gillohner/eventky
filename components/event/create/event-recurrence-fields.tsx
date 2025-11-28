"use client";

import { Control, UseFormSetValue, useWatch } from "react-hook-form";
import { EventFormData } from "@/stores/event-form-store";
import { Card, CardContent } from "@/components/ui/card";
import { useState, useEffect, useCallback, useMemo } from "react";
import { dateToISOString } from "@/lib/pubky/event-utils";
import { calculateNextOccurrences } from "@/lib/pubky/rrule-utils";
import { RecurrencePresetSelector } from "./recurrence/recurrence-preset-selector";
import { RecurrenceSettings } from "./recurrence/recurrence-settings";
import { OccurrencePreview } from "./recurrence/occurrence-preview";

interface EventRecurrenceFieldsProps {
    control: Control<EventFormData>;
    setValue: UseFormSetValue<EventFormData>;
}

export function EventRecurrenceFields({
    control,
    setValue,
}: EventRecurrenceFieldsProps) {
    // Watch dtstart to calculate occurrences
    const dtstart = useWatch({ control, name: "dtstart" });
    const dtstart_tzid = useWatch({ control, name: "dtstart_tzid" });

    const [preset, setPreset] = useState<"none" | "daily" | "weekly" | "monthly" | "yearly">("none");
    const [frequency, setFrequency] = useState<string>("WEEKLY");
    const [interval, setInterval] = useState<number>(1);
    const [count, setCount] = useState<number | undefined>(undefined);
    const [selectedWeekdays, setSelectedWeekdays] = useState<string[]>([]);
    const [rdates, setRdates] = useState<string[]>([]);
    const [excludedOccurrences, setExcludedOccurrences] = useState<Set<string>>(new Set());

    // Build RRULE string
    const buildRRule = useCallback((): string => {
        let rrule = `FREQ=${frequency}`;

        if (interval > 1) {
            rrule += `;INTERVAL=${interval}`;
        }

        if (count) {
            rrule += `;COUNT=${count}`;
        }

        if (frequency === "WEEKLY" && selectedWeekdays.length > 0) {
            rrule += `;BYDAY=${selectedWeekdays.join(",")}`;
        }

        return rrule;
    }, [frequency, interval, count, selectedWeekdays]);

    // Calculate occurrences based on RRULE
    const occurrences = useMemo(() => {
        if (preset === "none" || !dtstart) return [];

        const rrule = buildRRule();
        // Show ~2 years of events in preview when no limit set (104 weeks)
        return calculateNextOccurrences(rrule, dtstart, count || 104);
    }, [preset, dtstart, buildRRule, count]);

    // Update rrule and exdate when dependencies change
    useEffect(() => {
        if (preset !== "none") {
            const newRRule = buildRRule();
            setValue("rrule", newRRule);

            // Update EXDATE array from excluded occurrences
            const exdateArray = Array.from(excludedOccurrences);
            setValue("exdate", exdateArray.length > 0 ? exdateArray : undefined);
        } else {
            setValue("rrule", undefined);
            setValue("exdate", undefined);
        }
    }, [preset, buildRRule, excludedOccurrences, setValue]);

    // Handle preset selection
    const handlePresetChange = (value: string) => {
        const newPreset = value as typeof preset;
        setPreset(newPreset);

        // Set defaults based on preset
        switch (newPreset) {
            case "daily":
                setFrequency("DAILY");
                setInterval(1);
                setCount(undefined);
                break;
            case "weekly":
                setFrequency("WEEKLY");
                setInterval(1);
                setSelectedWeekdays([]);
                setCount(undefined);
                break;
            case "monthly":
                setFrequency("MONTHLY");
                setInterval(1);
                setCount(undefined);
                break;
            case "yearly":
                setFrequency("YEARLY");
                setInterval(1);
                setCount(undefined);
                break;
            case "none":
                setExcludedOccurrences(new Set());
                setCount(undefined);
                break;
        }
    };

    const toggleWeekday = (day: string) => {
        setSelectedWeekdays(prev =>
            prev.includes(day)
                ? prev.filter(d => d !== day)
                : [...prev, day]
        );
    };

    const toggleOccurrence = (occurrence: string, isAdditional: boolean) => {
        if (isAdditional) {
            // For additional dates (from rdate), just remove them completely
            const newRdates = rdates.filter(d => d !== occurrence);
            setRdates(newRdates);
            // Remove from excluded set if it was there
            setExcludedOccurrences(prev => {
                const newSet = new Set(prev);
                newSet.delete(occurrence);
                return newSet;
            });
        } else {
            // For standard occurrences, toggle exclusion
            setExcludedOccurrences(prev => {
                const newSet = new Set(prev);
                if (newSet.has(occurrence)) {
                    newSet.delete(occurrence);
                } else {
                    newSet.add(occurrence);
                }
                return newSet;
            });
        }
    };

    const addRdate = (newDate: Date) => {
        const isoString = dateToISOString(newDate);
        const newRdates = [...rdates, isoString];
        setRdates(newRdates);
        const filtered = newRdates.filter(d => d);
        setValue("rdate", filtered.length > 0 ? filtered : undefined);
    };

    // Combine all dates: standard occurrences + additional dates, sorted
    const allDates = useMemo(() => {
        const combined = [
            ...occurrences.map(date => ({ date, type: 'standard' as const })),
            ...rdates.filter(d => d).map(date => ({ date, type: 'additional' as const }))
        ];
        // Sort by date
        combined.sort((a, b) => a.date.localeCompare(b.date));
        return combined;
    }, [occurrences, rdates]);

    // Calculate statistics
    const stats = useMemo(() => {
        const standardCount = occurrences.length;
        const additionalCount = rdates.filter(d => d).length;
        const excludedCount = excludedOccurrences.size;
        const totalActive = standardCount + additionalCount - excludedCount;
        return { standardCount, additionalCount, excludedCount, totalActive };
    }, [occurrences, rdates, excludedOccurrences]);

    // Update rdate field when rdates change
    useEffect(() => {
        const filtered = rdates.filter(d => d);
        setValue("rdate", filtered.length > 0 ? filtered : undefined);
    }, [rdates, setValue]);

    return (
        <Card>
            <CardContent className="space-y-6">
                <div className="space-y-1">
                    <h3 className="text-lg font-semibold">Recurrence</h3>
                    <p className="text-sm text-muted-foreground">
                        Configure if and how this event repeats
                    </p>
                </div>

                <RecurrencePresetSelector
                    value={preset}
                    onChange={handlePresetChange}
                />

                <RecurrenceSettings
                    preset={preset}
                    frequency={frequency}
                    interval={interval}
                    count={count}
                    selectedWeekdays={selectedWeekdays}
                    onIntervalChange={setInterval}
                    onCountChange={setCount}
                    onWeekdayToggle={toggleWeekday}
                />

                <OccurrencePreview
                    allDates={allDates}
                    rdates={rdates}
                    excludedOccurrences={excludedOccurrences}
                    stats={stats}
                    timezone={dtstart_tzid}
                    onToggleOccurrence={toggleOccurrence}
                    onAddRdate={addRdate}
                    onClearExclusions={() => setExcludedOccurrences(new Set())}
                />
            </CardContent>
        </Card>
    );
}
