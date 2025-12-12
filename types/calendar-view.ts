/**
 * Calendar View Types
 * 
 * Type definitions for calendar view components and state
 */

import type { NexusEventResponse, NexusEventStreamItem } from "@/types/nexus";

/**
 * Calendar view mode - determines layout
 */
export type CalendarViewMode = "month" | "week" | "agenda";

/**
 * Union type for events that calendar view can accept
 * Supports both full responses (with tags/attendees) and stream items
 */
export type CalendarViewEvent = NexusEventResponse | NexusEventStreamItem;

/**
 * Transformed calendar event for display in calendar views
 * Normalized from either NexusEventResponse or NexusEventStreamItem
 */
export interface CalendarEvent {
    id: string;
    summary: string;
    dtstart: string;
    dtend?: string;
    duration?: string;
    location?: string;
    color: string;
    calendarId: string;
    calendarName: string;
    authorId: string;
    eventId: string;
    isRecurring: boolean;
    status?: string;
    /** For recurring events, this is the specific occurrence date */
    occurrenceDate?: string;
}

/**
 * Calendar metadata for filtering and display
 */
export interface CalendarFilterOption {
    id: string;
    name: string;
    color: string;
}

/**
 * Props for main CalendarView component
 */
export interface CalendarViewProps {
    /** Events to display - supports both full responses and stream items */
    events: CalendarViewEvent[];
    /** Available calendars for filtering */
    calendars?: CalendarFilterOption[];
    /** Initially selected calendar IDs (undefined = all) */
    initialSelectedCalendars?: string[];
    /** Callback when event is clicked */
    onEventClick?: (event: CalendarEvent) => void;
    /** Whether data is loading */
    isLoading?: boolean;
    /** Additional CSS classes */
    className?: string;
}

/**
 * Props for CalendarMonthView component
 */
export interface CalendarMonthViewProps {
    currentDate: Date;
    events: CalendarEvent[];
    onEventClick?: (event: CalendarEvent) => void;
    isToday?: (date: Date) => boolean;
    className?: string;
}

/**
 * Props for CalendarWeekView component
 */
export interface CalendarWeekViewProps {
    currentDate: Date;
    events: CalendarEvent[];
    onEventClick?: (event: CalendarEvent) => void;
    className?: string;
}

/**
 * Props for CalendarAgendaView component
 */
export interface CalendarAgendaViewProps {
    dateRange: { start: Date; end: Date };
    events: CalendarEvent[];
    onEventClick?: (event: CalendarEvent) => void;
    className?: string;
}
