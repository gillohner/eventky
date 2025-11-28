"use client";

import { Control, UseFormSetValue, useWatch } from "react-hook-form";
import type { EventFormData } from "@/types/event";
import { FormSection } from "@/components/ui/form-section";
import { useEffect, useCallback, useMemo } from "react";
import { dateToISOString } from "@/lib/pubky/event-utils";
import { calculateNextOccurrences } from "@/lib/pubky/rrule-utils";
import { useEventFormStore } from "@/stores/event-form-store";
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
    const dtstart = useWatch({ control, name: "dtstart" });
    const dtstart_tzid = useWatch({ control, name: "dtstart_tzid" });

    // Use store for recurrence state
    const {
        recurrenceState,
        setPreset,
        setInterval,
        setCount,
        toggleWeekday,
        addRdate: addRdateToStore,
        removeRdate,
        toggleExclusion,
        clearExclusions,
        setCustomRrule,
    } = useEventFormStore();

    const {
        preset,
        frequency,
        interval,
        count,
        selectedWeekdays,
        rdates,
        excludedOccurrences,
        customRrule,
    } = recurrenceState;

    // Build RRULE string
    const buildRRule = useCallback((): string => {
        // If custom preset, use the custom RRULE directly
        if (preset === "custom") {
            return customRrule || "";
        }

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
    }, [preset, customRrule, frequency, interval, count, selectedWeekdays]);

    // Calculate occurrences based on RRULE
    const occurrences = useMemo(() => {
        if (preset === "none" || !dtstart) return [];

        const rrule = buildRRule();

        // Skip calculation if custom RRULE is empty or invalid
        if (preset === "custom" && !rrule) return [];

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

    // Handle occurrence toggling
    const toggleOccurrence = useCallback((occurrence: string, isAdditional: boolean) => {
        if (isAdditional) {
            // For additional dates (from rdate), just remove them completely
            removeRdate(occurrence);
        } else {
            // For standard occurrences, toggle exclusion
            toggleExclusion(occurrence);
        }
    }, [removeRdate, toggleExclusion]);

    // Handle adding rdate
    const addRdate = useCallback((newDate: Date) => {
        const isoString = dateToISOString(newDate);
        addRdateToStore(isoString);
    }, [addRdateToStore]);

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
        <FormSection
            title="Recurrence"
            description="Configure if and how this event repeats"
        >
            <RecurrencePresetSelector
                value={preset}
                onChange={setPreset}
            />

            <RecurrenceSettings
                preset={preset}
                frequency={frequency}
                interval={interval}
                count={count}
                selectedWeekdays={selectedWeekdays}
                customRrule={customRrule}
                onIntervalChange={setInterval}
                onCountChange={setCount}
                onWeekdayToggle={toggleWeekday}
                onCustomRruleChange={setCustomRrule}
            />

            <OccurrencePreview
                allDates={allDates}
                rdates={rdates}
                excludedOccurrences={excludedOccurrences}
                stats={stats}
                timezone={dtstart_tzid}
                onToggleOccurrence={toggleOccurrence}
                onAddRdate={addRdate}
                onClearExclusions={clearExclusions}
            />
        </FormSection>
    );
}
