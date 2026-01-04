/**
 * Mutation hooks for event operations
 *
 * Production-grade features:
 * - Optimistic updates with rollback on error
 * - Automatic cache invalidation
 * - TanStack Query-only caching (no Zustand)
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
import { saveEvent, deleteEvent } from "@/lib/pubky/events";
import {
    queryKeys,
    pubkyEventToNexusFormat,
    setPendingEvent,
    clearPendingEvent,
    createLocalSyncMeta,
} from "@/lib/cache";
import { ingestUserIntoNexus } from "@/lib/nexus/ingest";
import { handleMutationError } from "@/lib/pubky/session-utils";
import { toast } from "sonner";
import type { CachedEvent } from "@/types/nexus";

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
 * - Updates TanStack Query cache immediately
 * - Invalidates relevant queries
 * - Background sync with Nexus
 */
export function useCreateEvent(options?: MutationOptions<CreateEventResult>) {
    const queryClient = useQueryClient();
    const { auth, logout } = useAuth();
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

            // Cancel any outgoing refetches for this event
            await queryClient.cancelQueries({
                predicate: (query) => {
                    const key = query.queryKey;
                    // Match event detail queries: ["nexus", "event", authorId, eventId, ...]
                    return key[0] === "nexus" &&
                        key[1] === "event" &&
                        key[2] === auth.publicKey &&
                        key[3] === eventId;
                },
            });

            // Create optimistic cache entry with sync metadata
            const nexusData = pubkyEventToNexusFormat(
                input.event,
                auth.publicKey,
                eventId
            );

            const optimisticData: CachedEvent = {
                ...nexusData,
                _syncMeta: createLocalSyncMeta(nexusData.details.sequence ?? 0),
            };

            // Update ALL matching event detail queries (different limit options, etc.)
            queryClient.setQueriesData<CachedEvent>(
                {
                    predicate: (query) => {
                        const key = query.queryKey;
                        return key[0] === "nexus" &&
                            key[1] === "event" &&
                            key[2] === auth.publicKey &&
                            key[3] === eventId;
                    },
                },
                (oldData) => ({
                    ...optimisticData,
                    // Preserve social data (tags, attendees) from existing cache if available
                    tags: oldData?.tags ?? [],
                    attendees: oldData?.attendees ?? [],
                })
            );

            // Also set the base query key for new fetches
            const baseQueryKey = queryKeys.events.detail(auth.publicKey, eventId, {});
            queryClient.setQueryData(baseQueryKey, optimisticData);

            // Track pending write
            setPendingEvent(auth.publicKey, eventId, nexusData, nexusData.details.sequence ?? 0);

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
            handleMutationError(error, "Failed to create event", { showToasts, logout });

            // Rollback optimistic update if we have context
            if (context?.eventId && auth?.publicKey) {
                const queryKey = queryKeys.events.detail(auth.publicKey, context.eventId, {});
                queryClient.removeQueries({ queryKey });
                clearPendingEvent(auth.publicKey, context.eventId);
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
    const { auth, logout } = useAuth();
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

            // Cancel any outgoing refetches for this event (all query variations)
            await queryClient.cancelQueries({
                predicate: (query) => {
                    const key = query.queryKey;
                    return key[0] === "nexus" &&
                        key[1] === "event" &&
                        key[2] === auth.publicKey &&
                        key[3] === input.eventId;
                },
            });

            // Snapshot previous values for rollback (from any matching query)
            let previousData: CachedEvent | undefined;
            queryClient.getQueriesData<CachedEvent>({
                predicate: (query) => {
                    const key = query.queryKey;
                    return key[0] === "nexus" &&
                        key[1] === "event" &&
                        key[2] === auth.publicKey &&
                        key[3] === input.eventId;
                },
            }).forEach(([, data]) => {
                if (data && !previousData) {
                    previousData = data;
                }
            });

            // Create optimistic cache entry with sync metadata
            const nexusData = pubkyEventToNexusFormat(
                input.event,
                auth.publicKey,
                input.eventId
            );

            const optimisticData: CachedEvent = {
                ...nexusData,
                _syncMeta: createLocalSyncMeta(nexusData.details.sequence ?? 0),
            };

            // Update ALL matching event detail queries (different limit options, etc.)
            queryClient.setQueriesData<CachedEvent>(
                {
                    predicate: (query) => {
                        const key = query.queryKey;
                        return key[0] === "nexus" &&
                            key[1] === "event" &&
                            key[2] === auth.publicKey &&
                            key[3] === input.eventId;
                    },
                },
                (oldData) => ({
                    ...optimisticData,
                    // Preserve social data from existing cache
                    tags: oldData?.tags ?? previousData?.tags ?? [],
                    attendees: oldData?.attendees ?? previousData?.attendees ?? [],
                })
            );

            // Track pending write
            setPendingEvent(auth.publicKey, input.eventId, nexusData, nexusData.details.sequence ?? 0);

            return { previousData };
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
            handleMutationError(error, "Failed to update event", { showToasts, logout });

            // Rollback ALL matching queries to previous cached value
            if (context?.previousData && auth?.publicKey) {
                queryClient.setQueriesData<CachedEvent>(
                    {
                        predicate: (query) => {
                            const key = query.queryKey;
                            return key[0] === "nexus" &&
                                key[1] === "event" &&
                                key[2] === auth.publicKey &&
                                key[3] === input.eventId;
                        },
                    },
                    () => context.previousData
                );
            }
            if (auth?.publicKey) {
                clearPendingEvent(auth.publicKey, input.eventId);
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
    const { auth, logout } = useAuth();
    const showToasts = options?.showToasts ?? true;

    return useMutation({
        mutationFn: async (input: DeleteEventInput): Promise<void> => {
            if (!auth?.session || !auth?.publicKey) {
                throw new Error("Authentication required. Please sign in.");
            }

            // Delete from Pubky Homeserver
            await deleteEvent(auth.session, input.eventId, auth.publicKey);
        },

        onMutate: async (input) => {
            if (!auth?.publicKey) return;

            // Snapshot for rollback
            const queryKey = queryKeys.events.detail(auth.publicKey, input.eventId, {});
            const previousData = queryClient.getQueryData<CachedEvent>(queryKey);

            // Optimistically remove from query cache
            queryClient.removeQueries({ queryKey });

            return { previousData, eventId: input.eventId };
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
            handleMutationError(error, "Failed to delete event", { showToasts, logout });

            // Rollback deletion
            if (context?.previousData && auth?.publicKey) {
                const queryKey = queryKeys.events.detail(auth.publicKey, input.eventId, {});
                queryClient.setQueryData(queryKey, context.previousData);
            }

            options?.onError?.(error);
        },
    });
}
