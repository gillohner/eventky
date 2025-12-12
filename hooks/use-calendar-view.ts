/**
 * Calendar View Hook
 * 
 * State management for calendar view components with:
 * - View mode switching (month/week/agenda)
 * - Date navigation (previous/next/today)
 * - Event transformation with recurrence expansion
 * - Calendar filtering
 * - Date range calculation per view mode
 */

import { useState, useMemo, useCallback } from "react";
import {
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    addMonths,
    subMonths,
    addWeeks,
    subWeeks,
    addDays,
    subDays,
} from "date-fns";
import { calculateNextOccurrences } from "@/lib/pubky/rrule-utils";
import type {
    CalendarViewMode,
    CalendarEvent,
    CalendarViewEvent,
    CalendarFilterOption,
} from "@/types/calendar-view";
import type { NexusEventResponse } from "@/types/nexus";

// =============================================================================
// Type Guards & Helpers
// =============================================================================

/**
 * Type guard to check if event is NexusEventResponse (has details property)
 */
function isNexusEventResponse(event: CalendarViewEvent): event is NexusEventResponse {
    return 'details' in event;
}

/**
 * Normalize event to common format
 * Handles both NexusEventResponse and NexusEventStreamItem
 */
function normalizeEvent(event: CalendarViewEvent) {
    if (isNexusEventResponse(event)) {
        return event.details;
    }
    return event;
}

// =============================================================================
// Hook
// =============================================================================

export interface UseCalendarViewOptions {
    /** Available calendars for filtering */
    calendars?: CalendarFilterOption[];
    /** Initially selected calendar IDs (undefined = all) */
    initialSelectedCalendars?: string[];
    /** Initial view mode */
    initialViewMode?: CalendarViewMode;
    /** Initial date to display */
    initialDate?: Date;
}

export interface UseCalendarViewResult {
    // Current state
    currentDate: Date;
    viewMode: CalendarViewMode;
    selectedCalendars: string[];
    dateRange: { start: Date; end: Date };

    // Transformed data
    calendarEvents: CalendarEvent[];

    // State setters
    setViewMode: (mode: CalendarViewMode) => void;

    // Navigation
    goToNext: () => void;
    goToPrevious: () => void;
    goToToday: () => void;

    // Calendar filtering
    toggleCalendar: (calendarId: string) => void;
    selectAllCalendars: () => void;
    deselectAllCalendars: () => void;
}

/**
 * Calendar view state management hook
 * 
 * @example
 * ```tsx
 * const {
 *   calendarEvents,
 *   viewMode,
 *   setViewMode,
 *   goToNext,
 *   goToPrevious,
 * } = useCalendarView(events, {
 *   calendars: [{ id: '1', name: 'Work', color: '#3b82f6' }],
 * });
 * ```
 */
export function useCalendarView(
    events: CalendarViewEvent[],
    options?: UseCalendarViewOptions
): UseCalendarViewResult {
    const {
        calendars,
        initialSelectedCalendars,
        initialViewMode = "month",
        initialDate = new Date(),
    } = options || {};

    const [currentDate, setCurrentDate] = useState(initialDate);
    const [viewMode, setViewMode] = useState<CalendarViewMode>(initialViewMode);
    const [selectedCalendars, setSelectedCalendars] = useState<string[]>(
        initialSelectedCalendars ?? []
    );

    // Calculate date range based on view mode
    const dateRange = useMemo(() => {
        let start: Date;
        let end: Date;

        switch (viewMode) {
            case "month":
                start = startOfWeek(startOfMonth(currentDate));
                end = endOfWeek(endOfMonth(currentDate));
                break;
            case "week":
                start = startOfWeek(currentDate);
                end = endOfWeek(currentDate);
                break;
            case "agenda":
                start = currentDate;
                end = addDays(currentDate, 30); // Show 30 days ahead
                break;
            default:
                start = startOfMonth(currentDate);
                end = endOfMonth(currentDate);
        }

        return { start, end };
    }, [currentDate, viewMode]);

    // Transform events to calendar events with occurrences
    const calendarEvents = useMemo(() => {
        const result: CalendarEvent[] = [];

        events.forEach((rawEvent) => {
            const event = normalizeEvent(rawEvent);

            // Get calendar info
            const calendarUri = event.x_pubky_calendar_uris?.[0];
            let calendarId = "";
            let calendarName = "";
            let calendarColor = "#3b82f6"; // Default blue

            if (calendarUri) {
                // Extract calendar ID from URI
                const match = calendarUri.match(/calendars\/([^/]+)$/);
                calendarId = match?.[1] || "";

                // Find calendar in provided calendars
                const calendar = calendars?.find((c) => c.id === calendarId);
                if (calendar) {
                    calendarName = calendar.name;
                    calendarColor = calendar.color;
                }
            }

            // Filter by selected calendars if specified
            if (selectedCalendars.length > 0 && calendarId && !selectedCalendars.includes(calendarId)) {
                return;
            }

            // Handle recurring events
            if (event.rrule) {
                const occurrenceDates = calculateNextOccurrences({
                    rrule: event.rrule,
                    dtstart: event.dtstart,
                    rdate: event.rdate,
                    exdate: event.exdate,
                    maxCount: 100,
                });

                occurrenceDates.forEach((occurrenceDate: string) => {
                    // Filter by date range
                    const occurrenceTime = new Date(occurrenceDate);
                    if (occurrenceTime < dateRange.start || occurrenceTime > dateRange.end) {
                        return;
                    }

                    result.push({
                        id: `${event.id}-${occurrenceDate}`,
                        summary: event.summary,
                        dtstart: occurrenceDate,
                        dtend: event.dtend,
                        duration: event.duration,
                        location: event.location,
                        color: calendarColor,
                        calendarId,
                        calendarName,
                        authorId: event.author,
                        eventId: event.id,
                        isRecurring: true,
                        status: event.status,
                        occurrenceDate,
                    });
                });
            } else {
                // Single event
                result.push({
                    id: event.id,
                    summary: event.summary,
                    dtstart: event.dtstart,
                    dtend: event.dtend,
                    duration: event.duration,
                    location: event.location,
                    color: calendarColor,
                    calendarId,
                    calendarName,
                    authorId: event.author,
                    eventId: event.id,
                    isRecurring: false,
                    status: event.status,
                });
            }
        });

        return result;
    }, [events, calendars, selectedCalendars, dateRange]);

    // Navigation functions
    const goToNext = useCallback(() => {
        switch (viewMode) {
            case "month":
                setCurrentDate((prev) => addMonths(prev, 1));
                break;
            case "week":
                setCurrentDate((prev) => addWeeks(prev, 1));
                break;
            case "agenda":
                setCurrentDate((prev) => addDays(prev, 30));
                break;
        }
    }, [viewMode]);

    const goToPrevious = useCallback(() => {
        switch (viewMode) {
            case "month":
                setCurrentDate((prev) => subMonths(prev, 1));
                break;
            case "week":
                setCurrentDate((prev) => subWeeks(prev, 1));
                break;
            case "agenda":
                setCurrentDate((prev) => subDays(prev, 30));
                break;
        }
    }, [viewMode]);

    const goToToday = useCallback(() => {
        setCurrentDate(new Date());
    }, []);

    const toggleCalendar = useCallback((calendarId: string) => {
        setSelectedCalendars((prev) =>
            prev.includes(calendarId)
                ? prev.filter((id) => id !== calendarId)
                : [...prev, calendarId]
        );
    }, []);

    const selectAllCalendars = useCallback(() => {
        if (calendars) {
            setSelectedCalendars(calendars.map((c) => c.id));
        }
    }, [calendars]);

    const deselectAllCalendars = useCallback(() => {
        setSelectedCalendars([]);
    }, []);

    return {
        currentDate,
        viewMode,
        setViewMode,
        calendarEvents,
        selectedCalendars,
        toggleCalendar,
        selectAllCalendars,
        deselectAllCalendars,
        goToNext,
        goToPrevious,
        goToToday,
        dateRange,
    };
}
