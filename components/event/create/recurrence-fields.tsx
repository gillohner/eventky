"use client";

import { Control, UseFormSetValue, useWatch } from "react-hook-form";
import type { EventFormData } from "@/types/event";
import { FormSection } from "@/components/ui/form-section";
import { useEffect, useCallback, useMemo } from "react";
import { dateToISOString } from "@/lib/pubky/event-utils";
import { calculateNextOccurrences } from "@/lib/pubky/rrule-utils";
import { useEventFormStore } from "@/stores/event-form-store";
import { ComprehensiveRuleBuilder, type RuleBuilderState } from "./recurrence/comprehensive-rule-builder";
import { OccurrencePreview } from "./recurrence/occurrence-preview";

interface RecurrenceFieldsProps {
    control: Control<EventFormData>;
    setValue: UseFormSetValue<EventFormData>;
}

export function RecurrenceFields({
    control,
    setValue,
}: RecurrenceFieldsProps) {
    const dtstart = useWatch({ control, name: "dtstart" });
    const dtstart_tzid = useWatch({ control, name: "dtstart_tzid" });

    // Use store for recurrence state
    const {
        recurrenceState,
        setRecurrenceState,
        addRdate: addRdateToStore,
        removeRdate,
        toggleExclusion,
        clearExclusions,
    } = useEventFormStore();

    const {
        enabled,
        frequency,
        interval,
        count,
        until,
        selectedWeekdays,
        monthlyMode,
        bymonthday,
        bysetpos,
        rdates,
        excludedOccurrences,
    } = recurrenceState;

    // Convert store state to builder state
    const builderState: RuleBuilderState = {
        enabled,
        frequency,
        interval,
        count,
        until,
        selectedWeekdays,
        monthlyMode,
        bymonthday,
        bysetpos,
    };

    // Build RRULE string from state
    const buildRRule = useCallback((): string => {
        if (!enabled) return "";

        let rrule = `FREQ=${frequency}`;

        if (interval > 1) {
            rrule += `;INTERVAL=${interval}`;
        }

        if (count) {
            rrule += `;COUNT=${count}`;
        }

        if (until) {
            rrule += `;UNTIL=${until}`;
        }

        // Weekly: BYDAY
        if (frequency === "WEEKLY" && selectedWeekdays.length > 0) {
            rrule += `;BYDAY=${selectedWeekdays.join(",")}`;
        }

        // Monthly: different modes
        if (frequency === "MONTHLY") {
            if (monthlyMode === "dayofmonth" && bymonthday.length > 0) {
                rrule += `;BYMONTHDAY=${bymonthday.join(",")}`;
            } else if (monthlyMode === "dayofweek") {
                if (selectedWeekdays.length > 0) {
                    rrule += `;BYDAY=${selectedWeekdays.join(",")}`;
                }
                if (bysetpos.length > 0) {
                    rrule += `;BYSETPOS=${bysetpos.join(",")}`;
                }
            }
        }

        return rrule;
    }, [enabled, frequency, interval, count, until, selectedWeekdays, monthlyMode, bymonthday, bysetpos]);

    // Calculate occurrences based on RRULE (this already includes rdates merged in)
    const occurrences = useMemo(() => {
        if (!enabled || !dtstart) return [];

        const rrule = buildRRule();
        if (!rrule) return [];

        return calculateNextOccurrences({
            rrule,
            dtstart,
            rdate: rdates,
            exdate: [], // Don't filter out excluded dates here - we need to show them greyed out
            maxCount: count || 104
        });
    }, [enabled, dtstart, buildRRule, rdates, count]);

    // Update form fields when recurrence state changes
    useEffect(() => {
        if (enabled) {
            const newRRule = buildRRule();
            setValue("rrule", newRRule || undefined);

            // Update EXDATE array from excluded occurrences
            const exdateArray = Array.from(excludedOccurrences);
            setValue("exdate", exdateArray.length > 0 ? exdateArray : undefined);
        } else {
            setValue("rrule", undefined);
            setValue("exdate", undefined);
        }
    }, [enabled, buildRRule, excludedOccurrences, setValue]);

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

    // Combine all dates - occurrences already includes rdates, so we just need to mark which are from rdate
    const allDates = useMemo(() => {
        const rdateSet = new Set(rdates.filter(d => d));

        return occurrences.map(date => ({
            date,
            type: rdateSet.has(date) ? 'additional' as const : 'standard' as const
        }));
    }, [occurrences, rdates]);

    // Calculate statistics
    // Calculate statistics
    const stats = useMemo(() => {
        const rdateSet = new Set(rdates.filter(d => d));
        const standardCount = occurrences.filter(date => !rdateSet.has(date)).length;
        const additionalCount = rdates.filter(d => d).length;
        const excludedCount = excludedOccurrences.size;
        // Total active = all occurrences minus excluded ones
        const totalActive = occurrences.filter(date => !excludedOccurrences.has(date)).length;
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
            description="Configure event repetition with advanced patterns"
        >
            <ComprehensiveRuleBuilder
                state={builderState}
                onChange={(newState) => setRecurrenceState(newState)}
            />

            {enabled && (
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
            )}
        </FormSection>
    );
}
