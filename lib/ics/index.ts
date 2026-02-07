/**
 * ICS (iCalendar) Module
 *
 * Public API for generating RFC 5545 compliant iCalendar files.
 */

export {
    generateEventICS,
    generateCalendarICS,
} from "./generator";

export type {
    ICSResult,
    CalendarICSOptions,
} from "./generator";
