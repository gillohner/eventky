/**
 * Hooks Index
 *
 * Central export for all application hooks
 */

// Event hooks
export {
    useEvent,
    useEventsStream,
    usePrefetchEvent,
    useInvalidateEvents,
    type UseEventOptions,
    type UseEventResult,
    type UseEventsStreamOptions,
} from "./use-event-optimistic";

// Event mutations
export {
    useCreateEvent,
    useUpdateEvent,
    useDeleteEvent,
    type CreateEventInput,
    type CreateEventResult,
    type UpdateEventInput,
    type DeleteEventInput,
    type MutationOptions,
} from "./use-event-mutations";

// Calendar hooks
export {
    useCalendar,
    useCalendarsStream,
    usePrefetchCalendar,
    useInvalidateCalendars,
    type UseCalendarOptions,
    type UseCalendarResult,
    type UseCalendarsStreamOptions,
} from "./use-calendar-optimistic";

// Calendar mutations
export {
    useCreateCalendar,
    useUpdateCalendar,
    useDeleteCalendar,
    type CreateCalendarInput,
    type CreateCalendarResult,
    type UpdateCalendarInput,
    type DeleteCalendarInput,
} from "./use-calendar-mutations";

// User calendars (where user is owner or admin)
export {
    useUserCalendars,
    useCalendarByUri,
    type UserCalendar,
} from "./use-user-calendars";

// Profile hooks
export { useProfile } from "./use-profile";

// User search hooks
export {
    useUserSearch,
    useUsersByIds,
    toSelectedUser,
    type SelectedUser,
} from "./use-user-search";

// Utility hooks
export { useIsMobile } from "./use-mobile";
