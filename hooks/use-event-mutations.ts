/**
 * Mutation hooks for event operations
 *
 * Production-grade features:
 * - Optimistic updates with rollback on error
 * - Automatic cache invalidation
 * - Integration with optimistic cache store
 * - Type-safe mutations
 *
 * Usage:
 * ```tsx
 * const { mutate: createEvent, isPending } = useCreateEvent();
 *
 * const handleSubmit = (data) => {
 *   createEvent({
 *     event: data,
 *     onSuccess: (eventId) => router.push(`/event/${authorId}/${eventId}`),
 *   });
 * };
 * ```
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PubkyAppEvent } from "pubky-app-specs";
import { useAuth } from "@/components/providers/auth-provider";
import { saveEvent } from "@/lib/pubky/events";
import { useOptimisticCache } from "@/stores/optimistic-cache-store";
import { queryKeys, pubkyEventToNexusFormat } from "@/lib/cache";
import { ingestUserIntoNexus } from "@/lib/nexus/ingest";
import { toast } from "sonner";

/**
 * Input for creating an event
 */
export interface CreateEventInput {
    /** PubkyAppEvent instance (validated via WASM) */
    event: PubkyAppEvent;
    /** Optional custom event ID (generated if not provided) */
    eventId?: string;
}

/**
 * Result from creating an event
 */
export interface CreateEventResult {
    eventId: string;
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
 * Hook for creating events with optimistic updates
 *
 * Features:
 * - Writes to Pubky Homeserver
 * - Updates optimistic cache immediately
 * - Invalidates relevant queries
 * - Background sync with Nexus
 */
export function useCreateEvent(options?: MutationOptions<CreateEventResult>) {
    const queryClient = useQueryClient();
    const { auth } = useAuth();
    const setEvent = useOptimisticCache((state) => state.setEvent);
    const showToasts = options?.showToasts ?? true;

    return useMutation({
        mutationFn: async (input: CreateEventInput): Promise<CreateEventResult> => {
            if (!auth?.session || !auth?.publicKey) {
                throw new Error("Authentication required. Please sign in.");
            }

            // Generate event ID if not provided
            const eventId = input.eventId ?? input.event.createId();

            // Save to Pubky Homeserver
            await saveEvent(auth.session, input.event, eventId, auth.publicKey);

            return {
                eventId,
                authorId: auth.publicKey,
            };
        },

        onMutate: async (input) => {
            if (!auth?.publicKey) return;

            const eventId = input.eventId ?? input.event.createId();

            // Cancel any outgoing refetches
            await queryClient.cancelQueries({
                queryKey: queryKeys.events.all,
            });

            // Create optimistic cache entry
            const optimisticData = pubkyEventToNexusFormat(
                input.event,
                auth.publicKey,
                eventId
            );

            // Store in optimistic cache (will show immediately)
            setEvent(auth.publicKey, eventId, optimisticData, "local");

            // Also update TanStack Query cache for immediate display
            const queryKey = queryKeys.events.detail(auth.publicKey, eventId, {});
            queryClient.setQueryData(queryKey, optimisticData);

            return { eventId, previousData: undefined };
        },

        onSuccess: (result) => {
            if (showToasts) {
                toast.success("Event created successfully!");
            }

            // Trigger Nexus ingest to speed up indexing
            ingestUserIntoNexus(result.authorId).catch(console.error);

            // Invalidate event queries to refresh lists
            queryClient.invalidateQueries({
                queryKey: queryKeys.events.all,
            });

            options?.onSuccess?.(result);
        },

        onError: (error, _input, context) => {
            if (showToasts) {
                toast.error(`Failed to create event: ${error.message}`);
            }

            // Rollback optimistic update if we have context
            if (context?.eventId && auth?.publicKey) {
                const queryKey = queryKeys.events.detail(auth.publicKey, context.eventId, {});
                queryClient.removeQueries({ queryKey });
            }

            options?.onError?.(error);
        },
    });
}

/**
 * Input for updating an event
 */
export interface UpdateEventInput {
    /** PubkyAppEvent instance with updates (validated via WASM) */
    event: PubkyAppEvent;
    /** Event ID to update */
    eventId: string;
    /** Previous event data for rollback */
    previousEvent?: PubkyAppEvent;
}

/**
 * Hook for updating events with optimistic updates
 */
export function useUpdateEvent(options?: MutationOptions<CreateEventResult>) {
    const queryClient = useQueryClient();
    const { auth } = useAuth();
    const setEvent = useOptimisticCache((state) => state.setEvent);
    const getEvent = useOptimisticCache((state) => state.getEvent);
    const showToasts = options?.showToasts ?? true;

    return useMutation({
        mutationFn: async (input: UpdateEventInput): Promise<CreateEventResult> => {
            if (!auth?.session || !auth?.publicKey) {
                throw new Error("Authentication required. Please sign in.");
            }

            // Save updated event to Pubky Homeserver
            await saveEvent(auth.session, input.event, input.eventId, auth.publicKey);

            return {
                eventId: input.eventId,
                authorId: auth.publicKey,
            };
        },

        onMutate: async (input) => {
            if (!auth?.publicKey) return;

            // Cancel any outgoing refetches
            const queryKey = queryKeys.events.detail(auth.publicKey, input.eventId, {});
            await queryClient.cancelQueries({ queryKey });

            // Snapshot previous value for rollback
            const previousCached = getEvent(auth.publicKey, input.eventId);

            // Create optimistic cache entry
            const optimisticData = pubkyEventToNexusFormat(
                input.event,
                auth.publicKey,
                input.eventId
            );

            // Store in optimistic cache
            setEvent(auth.publicKey, input.eventId, optimisticData, "local");

            // Update TanStack Query cache
            queryClient.setQueryData(queryKey, optimisticData);

            return { previousCached };
        },

        onSuccess: (result) => {
            if (showToasts) {
                toast.success("Event updated successfully!");
            }

            // Trigger Nexus ingest to speed up indexing
            ingestUserIntoNexus(result.authorId).catch(console.error);

            // Invalidate queries
            queryClient.invalidateQueries({
                queryKey: queryKeys.events.all,
            });

            options?.onSuccess?.(result);
        },

        onError: (error, input, context) => {
            if (showToasts) {
                toast.error(`Failed to update event: ${error.message}`);
            }

            // Rollback to previous cached value
            if (context?.previousCached && auth?.publicKey) {
                setEvent(
                    auth.publicKey,
                    input.eventId,
                    context.previousCached.data,
                    context.previousCached.meta.source
                );
            }

            options?.onError?.(error);
        },
    });
}

/**
 * Input for deleting an event
 */
export interface DeleteEventInput {
    eventId: string;
}

/**
 * Hook for deleting events
 *
 * Note: This removes from local cache and invalidates queries.
 * Actual deletion from Pubky Homeserver needs to be implemented.
 */
export function useDeleteEvent(options?: MutationOptions<void>) {
    const queryClient = useQueryClient();
    const { auth } = useAuth();
    const removeEvent = useOptimisticCache((state) => state.removeEvent);
    const getEvent = useOptimisticCache((state) => state.getEvent);
    const showToasts = options?.showToasts ?? true;

    return useMutation({
        mutationFn: async (input: DeleteEventInput): Promise<void> => {
            if (!auth?.session || !auth?.publicKey) {
                throw new Error("Authentication required. Please sign in.");
            }

            // TODO: Implement actual deletion from Pubky Homeserver
            // await deleteEvent(auth.session, input.eventId, auth.publicKey);

            // For now, just remove from local cache
            removeEvent(auth.publicKey, input.eventId);
        },

        onMutate: async (input) => {
            if (!auth?.publicKey) return;

            // Snapshot for rollback
            const previousCached = getEvent(auth.publicKey, input.eventId);

            // Optimistically remove from cache
            removeEvent(auth.publicKey, input.eventId);

            // Remove from query cache
            const queryKey = queryKeys.events.detail(auth.publicKey, input.eventId, {});
            queryClient.removeQueries({ queryKey });

            return { previousCached };
        },

        onSuccess: () => {
            if (showToasts) {
                toast.success("Event deleted successfully!");
            }

            // Trigger Nexus ingest to speed up indexing
            if (auth?.publicKey) {
                ingestUserIntoNexus(auth.publicKey).catch(console.error);
            }

            queryClient.invalidateQueries({
                queryKey: queryKeys.events.all,
            });

            options?.onSuccess?.();
        },

        onError: (error, input, context) => {
            if (showToasts) {
                toast.error(`Failed to delete event: ${error.message}`);
            }

            // Rollback deletion
            if (context?.previousCached && auth?.publicKey) {
                const { setEvent } = useOptimisticCache.getState();
                setEvent(
                    auth.publicKey,
                    input.eventId,
                    context.previousCached.data,
                    context.previousCached.meta.source
                );
            }

            options?.onError?.(error);
        },
    });
}
