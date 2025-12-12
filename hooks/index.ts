/**
 * Hooks Index
 *
 * Central export for all application hooks
 */

// Event hooks - NEW unified implementation
export {
    useEvent,
    useEventsStream,
    usePrefetchEvent,
    useInvalidateEvents,
    useSetEventCache,
    type UseEventOptions,
    type UseEventResult,
    type UseEventsStreamOptions,
} from "./use-event-hooks";

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

// Calendar hooks - NEW unified implementation
export {
    useCalendar,
    useCalendarsStream,
    usePrefetchCalendar,
    useInvalidateCalendars,
    useSetCalendarCache,
    type UseCalendarOptions,
    type UseCalendarResult,
    type UseCalendarsStreamOptions,
} from "./use-calendar-hooks";

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

// RSVP/Attendance mutations
export {
    useRsvpMutation,
    getPartstatLabel,
    type RsvpInput,
    type RsvpMutationOptions,
} from "./use-rsvp-mutation";

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

// Calendar view hook - UI state management for calendar display
export {
    useCalendarView,
    type UseCalendarViewOptions,
    type UseCalendarViewResult,
} from "./use-calendar-view";

// Debug mode hook
export {
    useDebugView,
    type UseDebugViewOptions,
    type UseDebugViewResult,
} from "./use-debug-view";

// Utility hooks
export { useIsMobile } from "./use-mobile";
