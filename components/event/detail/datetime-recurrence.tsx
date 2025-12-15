"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
    Clock,
    Calendar,
    Globe,
    ArrowRight,
    Repeat,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import Link from "next/link";
import {
    parseIsoDateTime,
    formatDateTime,
    getLocalTimezone,
    getShortTimezone,
    getLongTimezone,
    parseDuration,
    formatDuration,
    formatDurationMs,
    parseRRuleToLabel,
} from "@/lib/datetime";
import { calculateNextOccurrences } from "@/lib/pubky/rrule-utils";
import { usePreferencesStore } from "@/stores/preferences-store";

interface Attendee {
    author: string;
    partstat: string;
    recurrence_id?: string;
}

interface DateTimeRecurrenceProps {
    /** Start datetime in ISO format */
    dtstart: string;
    /** End datetime in ISO format */
    dtend?: string;
    /** Duration string (ISO 8601) */
    duration?: string;
    /** Start timezone */
    dtstartTzid?: string;
    /** End timezone */
    dtendTzid?: string;
    /** RRULE string for recurring events */
    rrule?: string;
    /** Additional dates (RDATE) */
    rdate?: string[];
    /** Excluded dates (EXDATE) */
    exdate?: string[];
    /** Event author ID */
    authorId: string;
    /** Event ID */
    eventId: string;
    /** Currently selected instance date */
    selectedInstance?: string;
    /** Current user's ID for attendance coloring */
    currentUserId?: string;
    /** Attendees list for showing user's attendance per instance */
    attendees?: Attendee[];
    /** Maximum occurrences to show */
    maxOccurrences?: number;
    /** Additional CSS classes */
    className?: string;
}

type TimezoneMode = "local" | "event";

/**
 * Unified DateTime and Recurrence display
 * Shows date/time info with recurring event occurrences in a single card
 */
export function DateTimeRecurrence({
    dtstart,
    dtend,
    duration,
    dtstartTzid,
    dtendTzid,
    rrule,
    rdate,
    exdate,
    authorId,
    eventId,
    selectedInstance,
    currentUserId,
    attendees = [],
    maxOccurrences = 10,
    className,
}: DateTimeRecurrenceProps) {
    const [timezoneMode, setTimezoneMode] = useState<TimezoneMode>("event");
    const [loadedOccurrences, setLoadedOccurrences] = useState(maxOccurrences);
    const { timeFormat } = usePreferencesStore();

    const isRecurring = Boolean(rrule);
    const localTimezone = getLocalTimezone();
    const displayTimezone = timezoneMode === "local" ? localTimezone : (dtstartTzid || localTimezone);

    // Calculate occurrences for recurring events - generate up to 1 year ahead
    const occurrences = useMemo(() => {
        if (!rrule) return [];
        
        // For recurring events, calculate occurrences for up to 1 year ahead or 500 occurrences
        const maxCount = Math.max(loadedOccurrences, 500);
        const allOccurrences = calculateNextOccurrences({
            rrule,
            dtstart,
            rdate,
            exdate,
            maxCount,
        });

        // Filter to only show occurrences within the next year
        const oneYearFromNow = new Date();
        oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
        
        return allOccurrences.filter((occ) => {
            const occDate = new Date(occ);
            return occDate <= oneYearFromNow;
        }).slice(0, loadedOccurrences);
    }, [rrule, dtstart, rdate, exdate, loadedOccurrences]);

    // Build a map of user's attendance per instance
    const userAttendanceMap = useMemo(() => {
        const map = new Map<string, string>();
        if (!currentUserId) return map;

        for (const att of attendees) {
            if (att.author === currentUserId) {
                const key = att.recurrence_id || "global";
                map.set(key, att.partstat.toUpperCase());
            }
        }
        return map;
    }, [attendees, currentUserId]);

    // Get user's attendance for a specific occurrence
    const getUserAttendance = (occDate: string): string | undefined => {
        // First check for instance-specific attendance
        const instanceStatus = userAttendanceMap.get(occDate);
        if (instanceStatus) return instanceStatus;
        // Fall back to global attendance
        return userAttendanceMap.get("global");
    };

    // Recurrence label
    const recurrenceLabel = useMemo(() => {
        if (!rrule) return null;
        return parseRRuleToLabel(rrule);
    }, [rrule]);

    // Determine the display start date (selected instance or dtstart)
    const displayDtstart = selectedInstance || dtstart;

    // Calculate end time from duration if needed
    const calculatedDtend = useMemo(() => {
        if (dtend && !selectedInstance) return dtend;
        if (!duration) return undefined;
        try {
            const startDate = parseIsoDateTime(displayDtstart, dtstartTzid);
            const durationMs = parseDuration(duration);
            return new Date(startDate.getTime() + durationMs).toISOString();
        } catch {
            return undefined;
        }
    }, [displayDtstart, dtend, duration, dtstartTzid, selectedInstance]);

    // Format times using the display start date (selected instance or dtstart)
    const formattedStart = useMemo(() => {
        return formatDateTime(displayDtstart, displayTimezone, dtstartTzid, { timeFormat });
    }, [displayDtstart, displayTimezone, dtstartTzid, timeFormat]);

    const formattedEnd = useMemo(() => {
        if (!calculatedDtend) return null;
        return formatDateTime(calculatedDtend, displayTimezone, dtendTzid || dtstartTzid, { timeFormat });
    }, [calculatedDtend, displayTimezone, dtendTzid, dtstartTzid, timeFormat]);

    const isSameDay = useMemo(() => {
        if (!calculatedDtend) return true;
        const startDate = parseIsoDateTime(displayDtstart, dtstartTzid);
        const endDate = parseIsoDateTime(calculatedDtend, dtendTzid || dtstartTzid);
        return startDate.toDateString() === endDate.toDateString();
    }, [displayDtstart, calculatedDtend, dtstartTzid, dtendTzid]);

    const durationDisplay = useMemo(() => {
        if (duration) return formatDuration(duration);
        if (calculatedDtend) {
            const startDate = parseIsoDateTime(dtstart, dtstartTzid);
            const endDate = parseIsoDateTime(calculatedDtend, dtendTzid || dtstartTzid);
            return formatDurationMs(endDate.getTime() - startDate.getTime());
        }
        return null;
    }, [dtstart, calculatedDtend, duration, dtstartTzid, dtendTzid]);

    // Only show timezone toggle if event has a timezone AND it's different from local
    const hasEventTimezone = Boolean(dtstartTzid) && dtstartTzid !== localTimezone;

    // Navigation for recurring events
    const selectedIndex = useMemo(() => {
        if (!selectedInstance) return -1;
        return occurrences.findIndex((occ) => occ === selectedInstance);
    }, [occurrences, selectedInstance]);

    // Auto-load more occurrences if selected instance is near the end or not found
    useEffect(() => {
        if (!rrule || !selectedInstance) return;
        
        if (selectedIndex === -1 || selectedIndex >= occurrences.length - 5) {
            // Load more occurrences if we're near the end or instance not found
            setLoadedOccurrences((prev) => Math.min(prev + 50, 500));
        }
    }, [rrule, selectedInstance, selectedIndex, occurrences.length]);

    const navigation = useMemo(() => {
        if (!isRecurring) return { prev: null, next: null };
        const prevIndex = selectedIndex > 0 ? selectedIndex - 1 : null;
        const nextIndex = selectedIndex < occurrences.length - 1 ? selectedIndex + 1 : null;
        return {
            prev: prevIndex !== null ? occurrences[prevIndex] : null,
            next: nextIndex !== null ? occurrences[nextIndex] : null,
        };
    }, [isRecurring, occurrences, selectedIndex]);

    return (
        <Card className={cn("", className)}>
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Clock className="h-5 w-5 text-muted-foreground" />
                        Date & Time
                        {isRecurring && (
                            <Badge variant="secondary" className="ml-2 flex items-center gap-1">
                                <Repeat className="h-3 w-3" />
                                {recurrenceLabel}
                            </Badge>
                        )}
                    </CardTitle>
                    {hasEventTimezone && (
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
                    {timezoneMode === "local" && dtstartTzid !== localTimezone && (
                        <Badge variant="outline" className="text-xs ml-2">
                            Local
                        </Badge>
                    )}
                </div>

                {/* Duration */}
                {durationDisplay && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>Duration: {durationDisplay}</span>
                    </div>
                )}

                {/* Recurring Events - Instance Navigation & Occurrences */}
                {isRecurring && occurrences.length > 1 && (
                    <div className="pt-3 border-t space-y-3">
                        {/* Instance Navigation */}
                        {selectedInstance && (
                            <OccurrenceStatus
                                selectedInstance={selectedInstance}
                                occurrences={occurrences}
                                selectedIndex={selectedIndex}
                                authorId={authorId}
                                eventId={eventId}
                                navigation={navigation}
                            />
                        )}

                        {/* Occurrences List */}
                        <div>
                            <p className="text-sm text-muted-foreground mb-2">Upcoming instances:</p>
                            <ScrollArea className="w-full whitespace-nowrap">
                                <div className="flex gap-2 pb-3">
                                    {occurrences.map((occ, index) => {
                                        const isSelected = selectedInstance ? occ === selectedInstance : index === 0;
                                        const isPast = new Date(occ) < new Date();
                                        const userStatus = getUserAttendance(occ);

                                        return (
                                            <OccurrenceChip
                                                key={occ}
                                                date={occ}
                                                timezone={displayTimezone}
                                                eventTimezone={dtstartTzid}
                                                isSelected={isSelected}
                                                isPast={isPast}
                                                userStatus={userStatus}
                                                href={`/event/${authorId}/${eventId}?instance=${encodeURIComponent(occ)}`}
                                            />
                                        );
                                    })}
                                </div>
                                <ScrollBar orientation="horizontal" />
                            </ScrollArea>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

/**
 * Occurrence chip with attendance coloring
 */
function OccurrenceChip({
    date,
    timezone,
    eventTimezone,
    isSelected,
    isPast,
    userStatus,
    href,
}: {
    date: string;
    timezone: string;
    eventTimezone?: string;
    isSelected: boolean;
    isPast: boolean;
    userStatus?: string;
    href: string;
}) {
    const chipRef = useRef<HTMLAnchorElement>(null);

    // Scroll into view when selected
    useEffect(() => {
        if (isSelected && chipRef.current) {
            chipRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'center'
            });
        }
    }, [isSelected]);

    const formatted = useMemo(() => {
        return formatDateTime(date, timezone, eventTimezone, {
            compact: true,
            includeYear: false,
            includeWeekday: true,
        });
    }, [date, timezone, eventTimezone]);

    // Determine border/background color based on user attendance
    // Using dark-mode-only colors since the app is dark theme only
    const getAttendanceStyles = () => {
        if (isSelected) {
            // Selected always uses primary colors
            return "bg-primary text-primary-foreground border-primary";
        }

        // Past events are much darker
        if (isPast) {
            switch (userStatus) {
                case "ACCEPTED":
                    return "border-green-900/40 bg-green-950/20 text-green-400/60 hover:bg-green-950/30";
                case "TENTATIVE":
                    return "border-orange-900/40 bg-orange-950/20 text-orange-400/60 hover:bg-orange-950/30";
                case "DECLINED":
                    return "border-red-900/40 bg-red-950/20 text-red-400/60 hover:bg-red-950/30";
                default:
                    return "bg-muted/30 text-muted-foreground/50 border-muted/50 opacity-60";
            }
        }

        // Future events with color based on user's attendance status
        switch (userStatus) {
            case "ACCEPTED":
                return "border-green-500 bg-green-950/50 text-green-100 hover:bg-green-900/60";
            case "TENTATIVE":
                return "border-orange-500 bg-orange-950/50 text-orange-100 hover:bg-orange-900/60";
            case "DECLINED":
                return "border-red-500 bg-red-950/50 text-red-100 hover:bg-red-900/60";
            default:
                return "hover:bg-muted border-border";
        }
    };

    return (
        <Link
            ref={chipRef}
            href={href}
            className={cn(
                "flex flex-col items-center p-2 rounded-lg border min-w-[80px] transition-colors",
                getAttendanceStyles()
            )}
        >
            <span className={cn(
                "text-xs font-medium",
                isSelected && "text-primary-foreground",
                isPast && !isSelected && !userStatus && "text-muted-foreground",
                // Ensure text is visible for attendance status colors
                userStatus && !isSelected && "text-inherit"
            )}>
                {formatted.date}
            </span>
            <span className={cn(
                "text-xs",
                isSelected ? "opacity-90" : "opacity-80",
                isPast && !isSelected && !userStatus && "text-muted-foreground",
                // Ensure text is visible for attendance status colors
                userStatus && !isSelected && "text-inherit opacity-80"
            )}>
                {formatted.time}
            </span>
        </Link>
    );
}

/**
 * Occurrence status indicator with navigation
 */
function OccurrenceStatus({
    selectedInstance,
    occurrences,
    selectedIndex,
    authorId,
    eventId,
    navigation,
}: {
    selectedInstance: string;
    occurrences: string[];
    selectedIndex: number;
    authorId: string;
    eventId: string;
    navigation: { prev: string | null; next: string | null };
}) {
    const now = new Date();
    const selectedDate = new Date(selectedInstance);
    const isPast = selectedDate < now;

    // Find next occurrence
    const nextOccurrence = occurrences.find(occ => new Date(occ) > now);
    const isNext = nextOccurrence === selectedInstance;

    // Calculate time until/since occurrence
    const getTimeStatus = () => {
        const diffMs = selectedDate.getTime() - now.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

        if (isPast) {
            const daysSince = Math.abs(diffDays);
            if (daysSince === 0) return "Earlier today";
            if (daysSince === 1) return "Yesterday";
            return `${daysSince} days ago`;
        }

        if (isNext) {
            if (diffDays === 0) {
                if (diffHours === 0) return "Next (in < 1 hour)";
                return `Next (in ${diffHours} hour${diffHours > 1 ? 's' : ''})`;
            }
            if (diffDays === 1) return "Next (tomorrow)";
            return `Next (in ${diffDays} days)`;
        }

        if (diffDays === 0) return "Today";
        if (diffDays === 1) return "Tomorrow";
        return `In ${diffDays} days`;
    };

    return (
        <div className="flex items-center justify-between bg-muted/50 rounded-lg p-2">
            <Link
                href={navigation.prev
                    ? `/event/${authorId}/${eventId}?instance=${encodeURIComponent(navigation.prev)}`
                    : "#"
                }
                className={cn(
                    "flex items-center gap-1 text-sm px-2 py-1 rounded transition-colors",
                    navigation.prev
                        ? "hover:bg-muted cursor-pointer"
                        : "text-muted-foreground/50 cursor-not-allowed pointer-events-none"
                )}
            >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Prev</span>
            </Link>

            <div className="flex flex-col items-center">
                <span className="text-sm font-medium">
                    Instance {selectedIndex + 1} of {occurrences.length}
                </span>
                <Badge
                    variant={isPast ? "outline" : isNext ? "default" : "secondary"}
                    className={cn(
                        "text-xs mt-1",
                        isPast && "opacity-60"
                    )}
                >
                    {getTimeStatus()}
                </Badge>
            </div>

            <Link
                href={navigation.next
                    ? `/event/${authorId}/${eventId}?instance=${encodeURIComponent(navigation.next)}`
                    : "#"
                }
                className={cn(
                    "flex items-center gap-1 text-sm px-2 py-1 rounded transition-colors",
                    navigation.next
                        ? "hover:bg-muted cursor-pointer"
                        : "text-muted-foreground/50 cursor-not-allowed pointer-events-none"
                )}
            >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="h-4 w-4" />
            </Link>
        </div>
    );
}

/**
 * Timezone toggle button component
 */
function TimezoneToggle({
    mode,
    onModeChange,
    localTimezone,
    eventTimezone,
}: {
    mode: TimezoneMode;
    onModeChange: (mode: TimezoneMode) => void;
    localTimezone: string;
    eventTimezone: string;
}) {
    return (
        <div className="flex items-center gap-1 rounded-lg border p-1">
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
