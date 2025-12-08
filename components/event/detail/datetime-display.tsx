"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar, Globe, ArrowRight } from "lucide-react";
import {
    parseIsoDateTime,
    formatDateTime,
    getLocalTimezone,
    getShortTimezone,
    getLongTimezone,
    parseDuration,
    formatDuration,
    formatDurationMs,
} from "@/lib/datetime";

interface DateTimeDisplayProps {
    /** Start datetime in ISO format (YYYY-MM-DDTHH:MM:SS) */
    dtstart: string;
    /** End datetime in ISO format */
    dtend?: string;
    /** Duration string (ISO 8601 duration, e.g., PT1H30M) */
    duration?: string;
    /** Start timezone (IANA format, e.g., America/New_York) */
    dtstartTzid?: string;
    /** End timezone (IANA format) */
    dtendTzid?: string;
    /** Whether to show timezone toggle */
    showTimezoneToggle?: boolean;
    /** Additional CSS classes */
    className?: string;
}

type TimezoneMode = "local" | "event";

/**
 * Display event date and time with timezone toggle
 * Allows switching between local timezone and event's original timezone
 */
export function DateTimeDisplay({
    dtstart,
    dtend,
    duration,
    dtstartTzid,
    dtendTzid,
    showTimezoneToggle = true,
    className,
}: DateTimeDisplayProps) {
    const [timezoneMode, setTimezoneMode] = useState<TimezoneMode>("local");

    const localTimezone = useMemo(() => {
        return getLocalTimezone();
    }, []);

    const displayTimezone = timezoneMode === "local" ? localTimezone : (dtstartTzid || localTimezone);

    // Calculate end time from duration if dtend not provided
    const calculatedDtend = useMemo(() => {
        if (dtend) return dtend;
        if (!duration) return undefined;

        try {
            const startDate = parseIsoDateTime(dtstart, dtstartTzid);
            const durationMs = parseDuration(duration);
            const endDate = new Date(startDate.getTime() + durationMs);
            return endDate.toISOString();
        } catch {
            return undefined;
        }
    }, [dtstart, dtend, duration, dtstartTzid]);

    const formattedStart = useMemo(() => {
        return formatDateTime(dtstart, displayTimezone, dtstartTzid);
    }, [dtstart, displayTimezone, dtstartTzid]);

    const formattedEnd = useMemo(() => {
        if (!calculatedDtend) return null;
        return formatDateTime(calculatedDtend, displayTimezone, dtendTzid || dtstartTzid);
    }, [calculatedDtend, displayTimezone, dtendTzid, dtstartTzid]);

    const isSameDay = useMemo(() => {
        if (!calculatedDtend) return true;
        const startDate = parseIsoDateTime(dtstart, dtstartTzid);
        const endDate = parseIsoDateTime(calculatedDtend, dtendTzid || dtstartTzid);
        return startDate.toDateString() === endDate.toDateString();
    }, [dtstart, calculatedDtend, dtstartTzid, dtendTzid]);

    const durationDisplay = useMemo(() => {
        if (duration) return formatDuration(duration);
        if (calculatedDtend) {
            const startDate = parseIsoDateTime(dtstart, dtstartTzid);
            const endDate = parseIsoDateTime(calculatedDtend, dtendTzid || dtstartTzid);
            const diffMs = endDate.getTime() - startDate.getTime();
            return formatDurationMs(diffMs);
        }
        return null;
    }, [dtstart, calculatedDtend, duration, dtstartTzid, dtendTzid]);

    const hasEventTimezone = Boolean(dtstartTzid && dtstartTzid !== localTimezone);

    return (
        <Card className={cn("", className)}>
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Clock className="h-5 w-5 text-muted-foreground" />
                        Date & Time
                    </CardTitle>
                    {showTimezoneToggle && hasEventTimezone && (
                        <TimezoneToggle
                            mode={timezoneMode}
                            onModeChange={setTimezoneMode}
                            localTimezone={localTimezone}
                            eventTimezone={dtstartTzid!}
                        />
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Start Date/Time */}
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-primary" />
                        <span className="font-medium">{formattedStart.date}</span>
                    </div>
                    <div className="flex items-center gap-2 pl-6">
                        <span className="text-lg font-semibold">{formattedStart.time}</span>
                        {formattedEnd && (
                            <>
                                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                {isSameDay ? (
                                    <span className="text-lg font-semibold">{formattedEnd.time}</span>
                                ) : (
                                    <span className="text-lg font-semibold">
                                        {formattedEnd.date} {formattedEnd.time}
                                    </span>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Timezone Info */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Globe className="h-4 w-4" />
                    <span>{getLongTimezone(displayTimezone)}</span>
                    {timezoneMode === "event" && dtstartTzid !== localTimezone && (
                        <Badge variant="outline" className="text-xs ml-2">
                            Event timezone
                        </Badge>
                    )}
                </div>

                {/* Duration */}
                {durationDisplay && (
                    <div className="flex items-center gap-2 pt-2 border-t">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Duration: {durationDisplay}</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

/**
 * Timezone toggle button component
 */
interface TimezoneToggleProps {
    mode: TimezoneMode;
    onModeChange: (mode: TimezoneMode) => void;
    localTimezone: string;
    eventTimezone: string;
    className?: string;
}

export function TimezoneToggle({
    mode,
    onModeChange,
    localTimezone,
    eventTimezone,
    className,
}: TimezoneToggleProps) {
    return (
        <div className={cn("flex items-center gap-1 rounded-lg border p-1", className)}>
            <Button
                variant={mode === "local" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => onModeChange("local")}
            >
                {getShortTimezone(localTimezone)}
            </Button>
            <Button
                variant={mode === "event" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => onModeChange("event")}
            >
                {getShortTimezone(eventTimezone)}
            </Button>
        </div>
    );
}
