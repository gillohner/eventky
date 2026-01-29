/**
 * Hook to fetch calendars where the current user is owner or admin
 */

import { useQuery } from "@tanstack/react-query";
import { fetchCalendarsStream, type NexusCalendarStreamItem } from "@/lib/nexus/calendars";
import { useAuth } from "@/components/providers/auth-provider";

export interface UserCalendar {
    id: string;
    uri: string;
    name: string;
    author: string;
    color?: string;
    timezone: string;
    description?: string;
    isOwner: boolean;
}

/**
 * Hook to fetch calendars where the current user is owner or admin
 * Uses the admin filter on the calendars stream endpoint
 */
export function useUserCalendars(options?: {
    enabled?: boolean;
    limit?: number;
}) {
    const { auth, isAuthenticated } = useAuth();
    const userId = auth?.publicKey;
    const enabled = options?.enabled ?? true;

    return useQuery({
        queryKey: ["userCalendars", userId],
        queryFn: async (): Promise<UserCalendar[]> => {
            if (!userId) return [];

            const calendars = await fetchCalendarsStream({
                admin: userId,
                limit: options?.limit ?? 50,
            });

            return calendars.map((cal: NexusCalendarStreamItem) => ({
                id: cal.id,
                uri: cal.uri,
                name: cal.name,
                author: cal.author,
                color: cal.color,
                timezone: cal.timezone,
                description: cal.description,
                isOwner: cal.author === userId,
            }));
        },
        enabled: enabled && isAuthenticated && !!userId,
        staleTime: 30 * 1000, // 30 seconds
    });
}

/**
 * Hook to fetch a specific calendar by URI
 */
export function useCalendarByUri(uri: string | undefined) {
    const { data: calendars, isLoading } = useUserCalendars({
        enabled: !!uri,
    });

    const calendar = calendars?.find((cal) => cal.uri === uri);

    return {
        calendar,
        isLoading,
    };
}
