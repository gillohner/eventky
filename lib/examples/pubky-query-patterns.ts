/**
 * Example: Using Pubky authentication with TanStack Query for calendar/event data
 * 
 * This file shows patterns for creating custom hooks that integrate
 * Pubky session management with TanStack Query for data fetching.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/providers/auth-provider";

// Types
interface CalendarData {
  events: string[];
  metadata?: Record<string, unknown>;
}

interface Event {
  id: string;
  title: string;
  date: string;
  description?: string;
  createdAt: string;
  updatedAt?: string;
}

interface CreateEventInput {
  title: string;
  date: string;
  description?: string;
}

// Types
interface CalendarData {
  events: string[];
  metadata?: Record<string, unknown>;
}

interface Event {
  id: string;
  title: string;
  date: string;
  description?: string;
  createdAt: string;
  updatedAt?: string;
}

interface CreateEventInput {
  title: string;
  date: string;
  description?: string;
}

// Example: Calendar Hook
export function useCalendar() {
  const { auth } = useAuth();
  const queryClient = useQueryClient();

  const calendarQuery = useQuery({
    queryKey: ["calendar", auth.publicKey],
    queryFn: async () => {
      if (!auth.session) throw new Error("No active session");

      // Example: Fetch calendar data from Pubky homeserver
      const calendarData = await auth.session.storage.getJson(
        "/pub/pubky.app/calendar/calendar.json"
      ) as CalendarData | null;
      return calendarData;
    },
    enabled: !!auth.session && !!auth.publicKey,
  });

  const addEventMutation = useMutation({
    mutationFn: async (event: CreateEventInput) => {
      if (!auth.session) throw new Error("No active session");

      // Store event data
      const eventId = generateEventId();
      const newEvent: Event = {
        id: eventId,
        ...event,
        createdAt: new Date().toISOString(),
      };
      await auth.session.storage.putJson(
        `/pub/pubky.app/calendar/events/${eventId}.json`,
        newEvent
      );
      return newEvent;
    },
    onSuccess: () => {
      // Refetch calendar after adding event
      queryClient.invalidateQueries({ queryKey: ["calendar", auth.publicKey] });
    },
  });

  return {
    calendar: calendarQuery.data,
    isLoading: calendarQuery.isLoading,
    addEvent: addEventMutation.mutate,
    isAddingEvent: addEventMutation.isPending,
  };
}

// Example: Events List Hook
export function useEvents() {
  const { auth } = useAuth();
  const queryClient = useQueryClient();

  const eventsQuery = useQuery({
    queryKey: ["events", auth.publicKey],
    queryFn: async () => {
      if (!auth.session) throw new Error("No active session");

      // Fetch all events
      const events = await auth.session.storage.getJson(
        "/pub/pubky.app/events/list.json"
      ) as Event[] | null;
      return events || [];
    },
    enabled: !!auth.session && !!auth.publicKey,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const createEventMutation = useMutation({
    mutationFn: async (event: CreateEventInput) => {
      if (!auth.session) throw new Error("No active session");

      const eventId = generateEventId();
      const newEvent: Event = {
        id: eventId,
        ...event,
        createdAt: new Date().toISOString(),
      };
      await auth.session.storage.putJson(
        `/pub/pubky.app/events/${eventId}.json`,
        newEvent
      );
      return newEvent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events", auth.publicKey] });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (eventId: string) => {
      if (!auth.session) throw new Error("No active session");

      await auth.session.storage.delete(
        `/pub/pubky.app/events/${eventId}.json`
      );

      return eventId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events", auth.publicKey] });
    },
  });

  return {
    events: eventsQuery.data,
    isLoading: eventsQuery.isLoading,
    createEvent: createEventMutation.mutate,
    deleteEvent: deleteEventMutation.mutate,
    isCreating: createEventMutation.isPending,
    isDeleting: deleteEventMutation.isPending,
  };
}

// Example: Single Event Hook
export function useEvent(eventId: string) {
  const { auth } = useAuth();
  const queryClient = useQueryClient();

  const eventQuery = useQuery({
    queryKey: ["event", eventId, auth.publicKey],
    queryFn: async () => {
      if (!auth.session) throw new Error("No active session");

      const event = await auth.session.storage.getJson(
        `/pub/pubky.app/events/${eventId}.json`
      ) as Event | null;
      return event;
    },
    enabled: !!auth.session && !!eventId,
  });

  const updateEventMutation = useMutation({
    mutationFn: async (updates: Partial<Omit<Event, 'id' | 'createdAt'>>) => {
      if (!auth.session) throw new Error("No active session");

      const currentEvent = eventQuery.data;
      if (!currentEvent) throw new Error("Event not found");
      const updatedEvent: Event = {
        ...currentEvent,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      await auth.session.storage.putJson(
        `/pub/pubky.app/events/${eventId}.json`,
        updatedEvent
      );

      return updatedEvent;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["event", eventId, auth.publicKey], data);
      queryClient.invalidateQueries({ queryKey: ["events", auth.publicKey] });
    },
  });

  return {
    event: eventQuery.data,
    isLoading: eventQuery.isLoading,
    updateEvent: updateEventMutation.mutate,
    isUpdating: updateEventMutation.isPending,
  };
}

// Helper function to generate event IDs
function generateEventId(): string {
  return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Usage Example in a Component:
 * 
 * function EventsPage() {
 *   const { events, isLoading, createEvent } = useEvents();
 * 
 *   const handleCreate = () => {
 *     createEvent({
 *       title: "Team Meeting",
 *       date: "2025-11-20",
 *       description: "Weekly sync"
 *     });
 *   };
 * 
 *   if (isLoading) return <div>Loading...</div>;
 * 
 *   return (
 *     <div>
 *       <button onClick={handleCreate}>Create Event</button>
 *       {events.map(event => (
 *         <div key={event.id}>{event.title}</div>
 *       ))}
 *     </div>
 *   );
 * }
 */
