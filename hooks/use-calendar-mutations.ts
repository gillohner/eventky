/**
 * Mutation hooks for calendar operations
 *
 * Production-grade features:
 * - Optimistic updates with rollback on error
 * - Automatic cache invalidation
 * - Integration with optimistic cache store
 * - Type-safe mutations
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PubkyAppCalendar } from "pubky-app-specs";
import { useAuth } from "@/components/providers/auth-provider";
import { saveCalendar } from "@/lib/pubky/calendars";
import { useOptimisticCache } from "@/stores/optimistic-cache-store";
import { queryKeys, pubkyCalendarToNexusFormat } from "@/lib/cache";
import { ingestUserIntoNexus } from "@/lib/nexus/ingest";
import { toast } from "sonner";

/**
 * Input for creating a calendar
 */
export interface CreateCalendarInput {
    /** PubkyAppCalendar instance (validated via WASM) */
    calendar: PubkyAppCalendar;
    /** Calendar ID (required - get from PubkySpecsBuilder.createCalendar().meta.id) */
    calendarId: string;
}

/**
 * Result from creating a calendar
 */
export interface CreateCalendarResult {
    calendarId: string;
    authorId: string;
}

/**
 * Options for mutation hooks
 */
export interface MutationOptions<TResult> {
    /** Called on successful mutation */
    onSuccess?: (result: TResult) => void;
    /** Called on mutation error */
    onError?: (error: Error) => void;
    /** Show toast notifications (default: true) */
    showToasts?: boolean;
}

/**
 * Hook for creating calendars with optimistic updates
 */
export function useCreateCalendar(options?: MutationOptions<CreateCalendarResult>) {
    const queryClient = useQueryClient();
    const { auth } = useAuth();
    const setCalendar = useOptimisticCache((state) => state.setCalendar);
    const showToasts = options?.showToasts ?? true;

    return useMutation({
        mutationFn: async (input: CreateCalendarInput): Promise<CreateCalendarResult> => {
            if (!auth?.session || !auth?.publicKey) {
                throw new Error("Authentication required. Please sign in.");
            }

            // Calendar ID must be provided (from PubkySpecsBuilder.createCalendar().meta.id)
            const calendarId = input.calendarId;

            // Save to Pubky Homeserver
            await saveCalendar(auth.session, input.calendar, calendarId, auth.publicKey);

            return {
                calendarId,
                authorId: auth.publicKey,
            };
        },

        onMutate: async (input) => {
            if (!auth?.publicKey) return;

            const calendarId = input.calendarId;

            // Cancel any outgoing refetches
            await queryClient.cancelQueries({
                queryKey: queryKeys.calendars.all,
            });

            // Create optimistic cache entry
            const optimisticData = pubkyCalendarToNexusFormat(
                input.calendar,
                auth.publicKey,
                calendarId
            );

            // Store in optimistic cache
            setCalendar(auth.publicKey, calendarId, optimisticData, "local");

            // Also update TanStack Query cache
            const queryKey = queryKeys.calendars.detail(auth.publicKey, calendarId, {});
            queryClient.setQueryData(queryKey, optimisticData);

            return { calendarId, previousData: undefined };
        },

        onSuccess: (result) => {
            if (showToasts) {
                toast.success("Calendar created successfully!");
            }

            // Trigger Nexus ingest to speed up indexing
            ingestUserIntoNexus(result.authorId).catch(console.error);

            queryClient.invalidateQueries({
                queryKey: queryKeys.calendars.all,
            });

            options?.onSuccess?.(result);
        },

        onError: (error, _input, context) => {
            if (showToasts) {
                toast.error(`Failed to create calendar: ${error.message}`);
            }

            if (context?.calendarId && auth?.publicKey) {
                const queryKey = queryKeys.calendars.detail(auth.publicKey, context.calendarId, {});
                queryClient.removeQueries({ queryKey });
            }

            options?.onError?.(error);
        },
    });
}

/**
 * Input for updating a calendar
 */
export interface UpdateCalendarInput {
    /** PubkyAppCalendar instance with updates */
    calendar: PubkyAppCalendar;
    /** Calendar ID to update */
    calendarId: string;
}

/**
 * Hook for updating calendars with optimistic updates
 */
export function useUpdateCalendar(options?: MutationOptions<CreateCalendarResult>) {
    const queryClient = useQueryClient();
    const { auth } = useAuth();
    const setCalendar = useOptimisticCache((state) => state.setCalendar);
    const getCalendar = useOptimisticCache((state) => state.getCalendar);
    const showToasts = options?.showToasts ?? true;

    return useMutation({
        mutationFn: async (input: UpdateCalendarInput): Promise<CreateCalendarResult> => {
            if (!auth?.session || !auth?.publicKey) {
                throw new Error("Authentication required. Please sign in.");
            }

            await saveCalendar(auth.session, input.calendar, input.calendarId, auth.publicKey);

            return {
                calendarId: input.calendarId,
                authorId: auth.publicKey,
            };
        },

        onMutate: async (input) => {
            if (!auth?.publicKey) return;

            const queryKey = queryKeys.calendars.detail(auth.publicKey, input.calendarId, {});
            await queryClient.cancelQueries({ queryKey });

            const previousCached = getCalendar(auth.publicKey, input.calendarId);

            const optimisticData = pubkyCalendarToNexusFormat(
                input.calendar,
                auth.publicKey,
                input.calendarId
            );

            setCalendar(auth.publicKey, input.calendarId, optimisticData, "local");
            queryClient.setQueryData(queryKey, optimisticData);

            return { previousCached };
        },

        onSuccess: (result) => {
            if (showToasts) {
                toast.success("Calendar updated successfully!");
            }

            // Trigger Nexus ingest to speed up indexing
            ingestUserIntoNexus(result.authorId).catch(console.error);

            queryClient.invalidateQueries({
                queryKey: queryKeys.calendars.all,
            });

            options?.onSuccess?.(result);
        },

        onError: (error, input, context) => {
            if (showToasts) {
                toast.error(`Failed to update calendar: ${error.message}`);
            }

            if (context?.previousCached && auth?.publicKey) {
                setCalendar(
                    auth.publicKey,
                    input.calendarId,
                    context.previousCached.data,
                    context.previousCached.meta.source
                );
            }

            options?.onError?.(error);
        },
    });
}

/**
 * Input for deleting a calendar
 */
export interface DeleteCalendarInput {
    calendarId: string;
}

/**
 * Hook for deleting calendars
 */
export function useDeleteCalendar(options?: MutationOptions<void>) {
    const queryClient = useQueryClient();
    const { auth } = useAuth();
    const removeCalendar = useOptimisticCache((state) => state.removeCalendar);
    const getCalendar = useOptimisticCache((state) => state.getCalendar);
    const showToasts = options?.showToasts ?? true;

    return useMutation({
        mutationFn: async (input: DeleteCalendarInput): Promise<void> => {
            if (!auth?.session || !auth?.publicKey) {
                throw new Error("Authentication required. Please sign in.");
            }

            // TODO: Implement actual deletion from Pubky Homeserver
            removeCalendar(auth.publicKey, input.calendarId);
        },

        onMutate: async (input) => {
            if (!auth?.publicKey) return;

            const previousCached = getCalendar(auth.publicKey, input.calendarId);

            removeCalendar(auth.publicKey, input.calendarId);

            const queryKey = queryKeys.calendars.detail(auth.publicKey, input.calendarId, {});
            queryClient.removeQueries({ queryKey });

            return { previousCached };
        },

        onSuccess: () => {
            if (showToasts) {
                toast.success("Calendar deleted successfully!");
            }

            // Trigger Nexus ingest to speed up indexing
            if (auth?.publicKey) {
                ingestUserIntoNexus(auth.publicKey).catch(console.error);
            }

            queryClient.invalidateQueries({
                queryKey: queryKeys.calendars.all,
            });

            options?.onSuccess?.();
        },

        onError: (error, input, context) => {
            if (showToasts) {
                toast.error(`Failed to delete calendar: ${error.message}`);
            }

            if (context?.previousCached && auth?.publicKey) {
                const { setCalendar } = useOptimisticCache.getState();
                setCalendar(
                    auth.publicKey,
                    input.calendarId,
                    context.previousCached.data,
                    context.previousCached.meta.source
                );
            }

            options?.onError?.(error);
        },
    });
}
