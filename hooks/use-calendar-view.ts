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
    /** External date range to override internal calculation (from API filters) */
    externalDateRange?: { start: Date; end: Date };
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

    // Agenda view extension
    loadMoreAgenda: () => void;
    canLoadMore: boolean;
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
        externalDateRange,
    } = options || {};

    const [currentDate, setCurrentDate] = useState(initialDate);
    const [viewMode, setViewMode] = useState<CalendarViewMode>(initialViewMode);
    const [selectedCalendars, setSelectedCalendars] = useState<string[]>(
        initialSelectedCalendars ?? []
    );
    const [agendaYearsToShow, setAgendaYearsToShow] = useState(1); // Start with 1 year

    // Reset agenda years when changing to/from agenda view
    const setViewModeWithReset = useCallback((mode: CalendarViewMode) => {
        setViewMode(mode);
        if (mode === "agenda") {
            setAgendaYearsToShow(1); // Reset to 1 year when entering agenda view
        }
    }, []);

    // Calculate date range based on view mode or use external range
    const dateRange = useMemo(() => {
        // If external date range is provided (from API filters), use it
        if (externalDateRange) {
            return externalDateRange;
        }

        // Otherwise calculate based on view mode
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
                // Agenda always shows from today onwards (never past events)
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                start = currentDate > today ? currentDate : today;
                end = addDays(start, 365 * agendaYearsToShow); // Show N years ahead from start
                break;
            default:
                start = startOfMonth(currentDate);
                end = endOfMonth(currentDate);
        }

        return { start, end };
    }, [currentDate, viewMode, externalDateRange, agendaYearsToShow]);

    // Transform events to calendar events with occurrences
    const calendarEvents = useMemo(() => {
        const result: CalendarEvent[] = [];

        // Deduplicate events by URI (in case backend returns duplicates)
        const seenEventIds = new Set<string>();
        const uniqueEvents = events.filter((rawEvent) => {
            const event = normalizeEvent(rawEvent);
            const eventKey = `${event.author}/${event.id}`;
            if (seenEventIds.has(eventKey)) {
                return false;
            }
            seenEventIds.add(eventKey);
            return true;
        });

        uniqueEvents.forEach((rawEvent) => {
            const event = normalizeEvent(rawEvent);

            // Get all calendar info from x_pubky_calendar_uris
            const calendarUris = event.x_pubky_calendar_uris || [];
            const eventCalendars: Array<{ id: string; name: string; color: string }> = [];

            calendarUris.forEach((uri) => {
                const match = uri.match(/calendars\/([^/]+)$/);
                const calendarId = match?.[1] || "";

                if (calendarId) {
                    const calendar = calendars?.find((c) => c.id === calendarId);
                    if (calendar) {
                        eventCalendars.push({
                            id: calendar.id,
                            name: calendar.name,
                            color: calendar.color,
                        });
                    } else {
                        // Calendar not in provided list, use default
                        eventCalendars.push({
                            id: calendarId,
                            name: calendarId,
                            color: "#3b82f6",
                        });
                    }
                }
            });

            // Get primary calendar (first one) for backwards compatibility
            const primaryCalendar = eventCalendars[0] || {
                id: "",
                name: "",
                color: "#3b82f6",
            };

            // Filter by selected calendars if specified
            // Only show event if it has at least one selected calendar
            // OR if it has no calendars and no calendars are selected
            if (selectedCalendars.length > 0) {
                const hasSelectedCalendar = eventCalendars.some((cal) =>
                    selectedCalendars.includes(cal.id)
                );
                // Skip events with no calendars OR events with calendars but none selected
                if (eventCalendars.length === 0 || !hasSelectedCalendar) {
                    return;
                }
            }

            // Handle recurring events
            if (event.rrule) {
                const occurrenceDates = calculateNextOccurrences({
                    rrule: event.rrule,
                    dtstart: event.dtstart,
                    rdate: event.rdate,
                    exdate: event.exdate,
                    maxCount: 1000, // Allow up to 1000 occurrences for 1 year display
                    from: dateRange.start, // Limit occurrences to date range start
                    until: dateRange.end, // Limit occurrences to date range end
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
                        description: event.description,
                        image: event.image_uri,
                        color: primaryCalendar.color,
                        calendarId: primaryCalendar.id,
                        calendarName: primaryCalendar.name,
                        calendars: eventCalendars,
                        authorId: event.author,
                        eventId: event.id,
                        isRecurring: true,
                        status: event.status,
                        rrule: event.rrule,
                        occurrenceDate,
                    });
                });
            } else {
                // Single event - filter by date range
                const eventTime = new Date(event.dtstart);
                if (eventTime < dateRange.start || eventTime > dateRange.end) {
                    return;
                }

                result.push({
                    id: event.id,
                    summary: event.summary,
                    dtstart: event.dtstart,
                    dtend: event.dtend,
                    duration: event.duration,
                    location: event.location,
                    description: event.description,
                    image: event.image_uri,
                    color: primaryCalendar.color,
                    calendarId: primaryCalendar.id,
                    calendarName: primaryCalendar.name,
                    calendars: eventCalendars,
                    authorId: event.author,
                    eventId: event.id,
                    isRecurring: false,
                    status: event.status,
                    rrule: event.rrule,
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

    // Load more events in agenda view (add another year)
    const loadMoreAgenda = useCallback(() => {
        if (viewMode === "agenda") {
            setAgendaYearsToShow((prev) => prev + 1);
        }
    }, [viewMode]);

    // Check if we can load more (max 3 years)
    const canLoadMore = viewMode === "agenda" && agendaYearsToShow < 3;

    return {
        currentDate,
        viewMode,
        setViewMode: setViewModeWithReset,
        calendarEvents,
        selectedCalendars,
        toggleCalendar,
        selectAllCalendars,
        deselectAllCalendars,
        goToNext,
        goToPrevious,
        goToToday,
        dateRange,
        loadMoreAgenda,
        canLoadMore,
    };
}
