/**
 * ICS Library
 * 
 * Re-exports ICS generation utilities for calendar subscriptions
 */

export {
    generateEventICS,
    generateCalendarICS,
    generateGoogleCalendarUrl,
    generateOutlookCalendarUrl,
    eventToICSAttributes,
    type ICSGeneratorResult,
    type CalendarMetadata,
} from "./generator";
