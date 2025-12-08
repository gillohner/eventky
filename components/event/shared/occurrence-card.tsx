"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { formatDateTime, getLocalTimezone } from "@/lib/datetime";

interface OccurrenceCardProps {
    /** ISO datetime string for the occurrence */
    date: string;
    /** Timezone to display in (optional, defaults to local) */
    timezone?: string;
    /** Whether to use compact display */
    compact?: boolean;
    /** Whether this occurrence is selected */
    isSelected?: boolean;
    /** Whether this occurrence is in the past */
    isPast?: boolean;
    /** Whether this occurrence is excluded */
    isExcluded?: boolean;
    /** Whether this is an additional date (RDATE) */
    isAdditional?: boolean;
    /** Additional CSS classes */
    className?: string;
    /** Click handler */
    onClick?: () => void;
}

/**
 * Shared component for displaying occurrence dates
 * Used in both event creation preview and event detail pages
 */
export function OccurrenceCard({
    date,
    timezone,
    compact = false,
    isSelected = false,
    isPast = false,
    isExcluded = false,
    isAdditional = false,
    className,
    onClick,
}: OccurrenceCardProps) {
    const displayTimezone = timezone || getLocalTimezone();

    const formatted = useMemo(() => {
        return formatDateTime(date, displayTimezone, timezone, {
            compact: true,
            includeYear: !compact,
            includeWeekday: true,
        });
    }, [date, displayTimezone, timezone, compact]);

    return (
        <div
            className={cn(
                "flex flex-col items-center text-center",
                compact ? "min-w-[70px]" : "min-w-[80px]",
                onClick && "cursor-pointer",
                isExcluded && "opacity-50 line-through",
                className
            )}
            onClick={onClick}
            role={onClick ? "button" : undefined}
            tabIndex={onClick ? 0 : undefined}
            onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
        >
            <span
                className={cn(
                    "text-xs font-medium",
                    isSelected && "text-primary-foreground",
                    isPast && !isSelected && "text-muted-foreground",
                    isAdditional && "text-primary"
                )}
            >
                {formatted.date}
            </span>
            <span
                className={cn(
                    "text-xs",
                    isSelected ? "opacity-90" : "opacity-70",
                    isPast && !isSelected && "text-muted-foreground"
                )}
            >
                {formatted.time}
            </span>
            {isAdditional && !isExcluded && (
                <span className="text-[10px] text-primary font-medium mt-0.5">
                    Added
                </span>
            )}
        </div>
    );
}
