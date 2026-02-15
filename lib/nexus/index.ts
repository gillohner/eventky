/**
 * Nexus API Module
 * Centralized access to Pubky Nexus API operations
 */

export { nexusClient, isAxiosError, getErrorMessage } from "./client";
export { fetchEventFromNexus, fetchEventsStream } from "./events";
export { fetchCalendarFromNexus, fetchCalendarsStream } from "./calendars";
export {
    searchUsersByName,
    searchUsersById,
    fetchUserFromNexus,
    fetchUsersByIds,
} from "./users";
export type {
    NexusEventResponse,
    NexusEventStreamItem
} from "./events";
export type {
    NexusCalendarResponse,
    NexusCalendarStreamItem
} from "./calendars";
export type {
    UserSearchResponse,
    NexusUserDetails,
    NexusUserView,
} from "./users";
