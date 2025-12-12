/**
 * Calendar View Components
 * 
 * UI components for displaying events in different calendar layouts
 */

export { CalendarView } from "./calendar-view";
export { CalendarMonthView } from "./calendar-month-view";
export { CalendarWeekView } from "./calendar-week-view";
export { CalendarAgendaView } from "./calendar-agenda-view";

// Re-export from centralized locations
export { useCalendarView } from "@/hooks";
export type {
    CalendarViewMode,
    CalendarEvent,
    CalendarViewProps,
    CalendarMonthViewProps,
    CalendarWeekViewProps,
    CalendarAgendaViewProps,
    CalendarFilterOption,
} from "@/types";
