"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Repeat, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import Link from "next/link";
import { calculateNextOccurrences } from "@/lib/pubky/rrule-utils";
import { parseRRuleToLabel, formatOccurrenceDate } from "@/lib/datetime";
import { OccurrenceCard } from "@/components/event/shared";

interface UpcomingOccurrencesProps {
    /** RRULE string */
    rrule: string;
    /** Start datetime in ISO format */
    dtstart: string;
    /** Start timezone */
    dtstartTzid?: string;
    /** Additional dates (RDATE) in ISO format */
    rdate?: string[];
    /** Excluded dates (EXDATE) in ISO format */
    exdate?: string[];
    /** Event author ID */
    authorId: string;
    /** Event ID */
    eventId: string;
    /** Currently selected instance date (if any) */
    selectedInstance?: string;
    /** Maximum number of occurrences to show */
    maxOccurrences?: number;
    /** Additional CSS classes */
    className?: string;
}

/**
 * Display upcoming occurrences for recurring events
 * Each occurrence is clickable to navigate to that instance
 */
export function UpcomingOccurrences({
    rrule,
    dtstart,
    dtstartTzid,
    rdate,
    exdate,
    authorId,
    eventId,
    selectedInstance,
    maxOccurrences = 8,
    className,
}: UpcomingOccurrencesProps) {
    const occurrences = useMemo(() => {
        return calculateNextOccurrences({
            rrule,
            dtstart,
            rdate,
            exdate,
            maxCount: maxOccurrences,
        });
    }, [rrule, dtstart, maxOccurrences, rdate, exdate]);

    const recurrenceLabel = useMemo(() => {
        return parseRRuleToLabel(rrule);
    }, [rrule]);

    // Find index of selected instance
    const selectedIndex = useMemo(() => {
        if (!selectedInstance) return 0;
        return occurrences.findIndex((occ) => occ === selectedInstance);
    }, [occurrences, selectedInstance]);

    // Get previous and next instance links
    const navigation = useMemo(() => {
        const prevIndex = selectedIndex > 0 ? selectedIndex - 1 : null;
        const nextIndex = selectedIndex < occurrences.length - 1 ? selectedIndex + 1 : null;

        return {
            prev: prevIndex !== null ? occurrences[prevIndex] : null,
            next: nextIndex !== null ? occurrences[nextIndex] : null,
        };
    }, [occurrences, selectedIndex]);

    if (occurrences.length <= 1) return null;

    return (
        <Card className={cn("", className)}>
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Repeat className="h-5 w-5 text-muted-foreground" />
                        Recurring Event
                    </CardTitle>
                    <Badge variant="secondary" className="text-xs">
                        {recurrenceLabel}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Instance Navigation */}
                {selectedInstance && (
                    <div className="flex items-center justify-between border rounded-lg p-2">
                        <Link
                            href={
                                navigation.prev
                                    ? `/event/${authorId}/${eventId}?instance=${encodeURIComponent(navigation.prev)}`
                                    : "#"
                            }
                            className={cn(
                                "flex items-center gap-1 text-sm px-2 py-1 rounded transition-colors",
                                navigation.prev
                                    ? "hover:bg-muted cursor-pointer"
                                    : "text-muted-foreground/50 cursor-not-allowed"
                            )}
                            aria-disabled={!navigation.prev}
                        >
                            <ChevronLeft className="h-4 w-4" />
                            <span className="hidden sm:inline">Previous</span>
                        </Link>

                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">
                                {formatOccurrenceDate(selectedInstance, dtstartTzid)}
                            </span>
                        </div>

                        <Link
                            href={
                                navigation.next
                                    ? `/event/${authorId}/${eventId}?instance=${encodeURIComponent(navigation.next)}`
                                    : "#"
                            }
                            className={cn(
                                "flex items-center gap-1 text-sm px-2 py-1 rounded transition-colors",
                                navigation.next
                                    ? "hover:bg-muted cursor-pointer"
                                    : "text-muted-foreground/50 cursor-not-allowed"
                            )}
                            aria-disabled={!navigation.next}
                        >
                            <span className="hidden sm:inline">Next</span>
                            <ChevronRight className="h-4 w-4" />
                        </Link>
                    </div>
                )}

                {/* Occurrences List */}
                <div>
                    <p className="text-sm text-muted-foreground mb-2">Upcoming instances:</p>
                    <ScrollArea className="w-full whitespace-nowrap">
                        <div className="flex gap-2 pb-2">
                            {occurrences.map((occ, index) => {
                                const isSelected = selectedInstance ? occ === selectedInstance : index === 0;
                                const isPast = new Date(occ) < new Date();

                                return (
                                    <Link
                                        key={occ}
                                        href={`/event/${authorId}/${eventId}?instance=${encodeURIComponent(occ)}`}
                                        className={cn(
                                            "flex flex-col items-center p-2 rounded-lg border min-w-[80px] transition-colors",
                                            isSelected
                                                ? "bg-primary text-primary-foreground border-primary"
                                                : isPast
                                                    ? "bg-muted/50 text-muted-foreground border-muted"
                                                    : "hover:bg-muted border-border"
                                        )}
                                    >
                                        <OccurrenceCard
                                            date={occ}
                                            timezone={dtstartTzid}
                                            compact
                                            isSelected={isSelected}
                                            isPast={isPast}
                                        />
                                    </Link>
                                );
                            })}
                        </div>
                        <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                </div>

                {/* Link to series overview */}
                <div className="pt-2 border-t">
                    <Link
                        href={`/event/${authorId}/${eventId}`}
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                        <Repeat className="h-3 w-3" />
                        View full series info
                    </Link>
                </div>
            </CardContent>
        </Card>
    );
}
