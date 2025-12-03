/**
 * Nexus API Module
 * Centralized access to Pubky Nexus API operations
 */

export { nexusClient, isAxiosError, getErrorMessage } from "./client";
export { fetchEventFromNexus, fetchEventsStream } from "./events";
export { fetchCalendarFromNexus, fetchCalendarsStream } from "./calendars";
export type {
    NexusEventResponse,
    NexusEventStreamResponse
} from "./events";
export type {
    NexusCalendarResponse,
    NexusCalendarStreamResponse
} from "./calendars";
