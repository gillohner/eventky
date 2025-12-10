/**
 * Mutation hooks for calendar operations
 *
 * Production-grade features:
 * - Optimistic updates with rollback on error
 * - Automatic cache invalidation
 * - TanStack Query caching
 * - Type-safe mutations
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PubkyAppCalendar } from "pubky-app-specs";
import { useAuth } from "@/components/providers/auth-provider";
import { saveCalendar, deleteCalendar } from "@/lib/pubky/calendars";
import {
    queryKeys,
    pubkyCalendarToNexusFormat,
    setPendingCalendar,
    clearPendingCalendar,
    createLocalSyncMeta,
} from "@/lib/cache";
import { ingestUserIntoNexus } from "@/lib/nexus/ingest";
import { toast } from "sonner";
import type { CachedCalendar } from "@/types/nexus";

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

            // Cancel any outgoing refetches for this calendar
            await queryClient.cancelQueries({
                predicate: (query) => {
                    const key = query.queryKey;
                    return key[0] === "nexus" &&
                        key[1] === "calendar" &&
                        key[2] === auth.publicKey &&
                        key[3] === calendarId;
                },
            });

            // Create optimistic cache entry with sync metadata
            const nexusData = pubkyCalendarToNexusFormat(
                input.calendar,
                auth.publicKey,
                calendarId
            );

            const optimisticData: CachedCalendar = {
                ...nexusData,
                _syncMeta: createLocalSyncMeta(nexusData.details.sequence ?? 0),
            };

            // Update ALL matching calendar detail queries
            queryClient.setQueriesData<CachedCalendar>(
                {
                    predicate: (query) => {
                        const key = query.queryKey;
                        return key[0] === "nexus" &&
                            key[1] === "calendar" &&
                            key[2] === auth.publicKey &&
                            key[3] === calendarId;
                    },
                },
                (oldData) => ({
                    ...optimisticData,
                    tags: oldData?.tags ?? [],
                    events: oldData?.events ?? [],
                })
            );

            // Also set the base query key for new fetches
            const baseQueryKey = queryKeys.calendars.detail(auth.publicKey, calendarId, {});
            queryClient.setQueryData(baseQueryKey, optimisticData);

            // Track pending write
            setPendingCalendar(auth.publicKey, calendarId, nexusData, nexusData.details.sequence ?? 0);

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
                clearPendingCalendar(auth.publicKey, context.calendarId);
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

            // Cancel any outgoing refetches for this calendar
            await queryClient.cancelQueries({
                predicate: (query) => {
                    const key = query.queryKey;
                    return key[0] === "nexus" &&
                        key[1] === "calendar" &&
                        key[2] === auth.publicKey &&
                        key[3] === input.calendarId;
                },
            });

            // Snapshot previous values for rollback
            let previousData: CachedCalendar | undefined;
            queryClient.getQueriesData<CachedCalendar>({
                predicate: (query) => {
                    const key = query.queryKey;
                    return key[0] === "nexus" &&
                        key[1] === "calendar" &&
                        key[2] === auth.publicKey &&
                        key[3] === input.calendarId;
                },
            }).forEach(([, data]) => {
                if (data && !previousData) {
                    previousData = data;
                }
            });

            // Create optimistic cache entry with sync metadata
            const nexusData = pubkyCalendarToNexusFormat(
                input.calendar,
                auth.publicKey,
                input.calendarId
            );

            const optimisticData: CachedCalendar = {
                ...nexusData,
                _syncMeta: createLocalSyncMeta(nexusData.details.sequence ?? 0),
            };

            // Update ALL matching calendar detail queries
            queryClient.setQueriesData<CachedCalendar>(
                {
                    predicate: (query) => {
                        const key = query.queryKey;
                        return key[0] === "nexus" &&
                            key[1] === "calendar" &&
                            key[2] === auth.publicKey &&
                            key[3] === input.calendarId;
                    },
                },
                (oldData) => ({
                    ...optimisticData,
                    tags: oldData?.tags ?? previousData?.tags ?? [],
                    events: oldData?.events ?? previousData?.events ?? [],
                })
            );

            // Track pending write
            setPendingCalendar(auth.publicKey, input.calendarId, nexusData, nexusData.details.sequence ?? 0);

            return { previousData };
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

            // Rollback ALL matching queries to previous cached value
            if (context?.previousData && auth?.publicKey) {
                queryClient.setQueriesData<CachedCalendar>(
                    {
                        predicate: (query) => {
                            const key = query.queryKey;
                            return key[0] === "nexus" &&
                                key[1] === "calendar" &&
                                key[2] === auth.publicKey &&
                                key[3] === input.calendarId;
                        },
                    },
                    () => context.previousData
                );
            }
            if (auth?.publicKey) {
                clearPendingCalendar(auth.publicKey, input.calendarId);
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
    const showToasts = options?.showToasts ?? true;

    return useMutation({
        mutationFn: async (input: DeleteCalendarInput): Promise<void> => {
            if (!auth?.session || !auth?.publicKey) {
                throw new Error("Authentication required. Please sign in.");
            }

            // Delete from Pubky Homeserver
            await deleteCalendar(auth.session, input.calendarId, auth.publicKey);
        },

        onMutate: async (input) => {
            if (!auth?.publicKey) return;

            const queryKey = queryKeys.calendars.detail(auth.publicKey, input.calendarId, {});
            const previousData = queryClient.getQueryData<CachedCalendar>(queryKey);

            queryClient.removeQueries({ queryKey });

            return { previousData, calendarId: input.calendarId };
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

            if (context?.previousData && auth?.publicKey) {
                const queryKey = queryKeys.calendars.detail(auth.publicKey, input.calendarId, {});
                queryClient.setQueryData(queryKey, context.previousData);
            }

            options?.onError?.(error);
        },
    });
}
