/**
 * Calendar Tag Mutation Hook
 *
 * Features:
 * - Optimistic updates with instant UI feedback
 * - Prevents stale Nexus data from overwriting successful writes
 * - Updates ALL calendar query variants
 * - Background Nexus sync
 * - Type-safe mutations
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/providers/auth-provider";
import { addTagToCalendar, removeTagFromCalendar } from "@/lib/pubky/tags";
import { ingestUserIntoNexus } from "@/lib/nexus/ingest";
import { handleMutationError } from "@/lib/pubky/session-utils";
import { toast } from "sonner";
import type { NexusCalendarResponse } from "@/lib/nexus/calendars";
import {
    setPendingTag,
    getPendingTag as getPendingTagFromCache,
    getPendingTagsForEvent as getPendingTagsForItemFromCache,
    clearPendingTag as clearPendingTagFromCache,
} from "@/lib/cache/pending-writes";

/**
 * Check if there's a pending write for this user/calendar/label combo
 */
export function getPendingCalendarTag(
    calendarAuthorId: string,
    calendarId: string,
    userPublicKey: string,
    label: string
) {
    return getPendingTagFromCache(calendarAuthorId, calendarId, userPublicKey, label);
}

/**
 * Get all pending tags for a calendar/user combo
 */
export function getPendingCalendarTags(
    calendarAuthorId: string,
    calendarId: string,
    userPublicKey: string
) {
    return getPendingTagsForItemFromCache(calendarAuthorId, calendarId, userPublicKey);
}

/**
 * Clear pending write (call when Nexus data is confirmed to be up-to-date)
 */
export function clearPendingCalendarTag(
    calendarAuthorId: string,
    calendarId: string,
    userPublicKey: string,
    label: string
): void {
    clearPendingTagFromCache(calendarAuthorId, calendarId, userPublicKey, label);
}

/**
 * Input for calendar tag mutations
 */
export interface CalendarTagInput {
    /** Calendar author's public key */
    calendarAuthorId: string;
    /** Calendar ID */
    calendarId: string;
    /** Tag label */
    label: string;
}

/**
 * Options for calendar tag mutation hooks
 */
export interface CalendarTagMutationOptions {
    /** Called on successful mutation */
    onSuccess?: () => void;
    /** Called on mutation error */
    onError?: (error: Error) => void;
    /** Show toast notifications (default: true) */
    showToasts?: boolean;
}

/**
 * Hook for adding tags to calendars with optimistic updates
 */
export function useAddCalendarTagMutation(options?: CalendarTagMutationOptions) {
    const queryClient = useQueryClient();
    const { auth, logout } = useAuth();
    const showToasts = options?.showToasts ?? true;

    return useMutation({
        mutationFn: async (input: CalendarTagInput): Promise<boolean> => {
            if (!auth?.session || !auth?.publicKey) {
                throw new Error("Authentication required. Please sign in.");
            }

            // Add tag to calendar
            return addTagToCalendar(
                auth.session,
                auth.publicKey,
                input.calendarAuthorId,
                input.calendarId,
                input.label
            );
        },

        onMutate: async (input) => {
            if (!auth?.publicKey) return;

            // Cancel any outgoing refetches for this calendar (all variants)
            await queryClient.cancelQueries({
                predicate: (query) => {
                    const key = query.queryKey;
                    return (
                        Array.isArray(key) &&
                        key[0] === "nexus" &&
                        key[1] === "calendar" &&
                        key[2] === input.calendarAuthorId &&
                        key[3] === input.calendarId
                    );
                },
            });

            // Find ALL matching calendar queries
            const matchingQueries = queryClient.getQueriesData<NexusCalendarResponse>({
                predicate: (query) => {
                    const key = query.queryKey;
                    return (
                        Array.isArray(key) &&
                        key[0] === "nexus" &&
                        key[1] === "calendar" &&
                        key[2] === input.calendarAuthorId &&
                        key[3] === input.calendarId
                    );
                },
            });

            // Snapshot all previous data for rollback
            const previousQueries = new Map<readonly unknown[], NexusCalendarResponse | undefined>();

            for (const [queryKey, data] of matchingQueries) {
                if (data) {
                    previousQueries.set(queryKey, data);

                    // Check if tag already exists
                    const existingTagIndex = data.tags.findIndex(
                        (t) => t.label.toLowerCase() === input.label.toLowerCase()
                    );

                    let updatedTags;
                    if (existingTagIndex >= 0) {
                        // Tag exists - add current user to taggers if not already there
                        updatedTags = data.tags.map((tag, index) => {
                            if (index === existingTagIndex) {
                                const alreadyTagged = tag.taggers.includes(auth.publicKey!);
                                if (alreadyTagged) return tag;
                                return {
                                    ...tag,
                                    taggers: [...tag.taggers, auth.publicKey!],
                                    taggers_count: tag.taggers_count + 1,
                                    relationship: true,
                                };
                            }
                            return tag;
                        });
                    } else {
                        // New tag
                        updatedTags = [
                            ...data.tags,
                            {
                                label: input.label.toLowerCase(),
                                taggers: [auth.publicKey!],
                                taggers_count: 1,
                                relationship: true,
                            },
                        ];
                    }

                    const optimisticCalendar: NexusCalendarResponse = {
                        ...data,
                        tags: updatedTags,
                    };

                    queryClient.setQueryData(queryKey, optimisticCalendar);
                }
            }

            return { previousQueries };
        },

        onSuccess: (_result, input) => {
            if (showToasts) {
                toast.success(`Tag "${input.label}" added to calendar`);
            }

            // Store successful write to prevent stale Nexus data from overwriting
            if (auth?.publicKey) {
                setPendingTag(
                    input.calendarAuthorId,
                    input.calendarId,
                    auth.publicKey,
                    input.label,
                    'add'
                );
            }

            // Trigger Nexus ingest
            if (auth?.publicKey) {
                ingestUserIntoNexus(auth.publicKey).catch(console.error);
            }

            options?.onSuccess?.();
        },

        onError: (error, _input, context) => {
            handleMutationError(error, "Failed to add tag", { showToasts, logout });

            // Rollback all previous calendar data
            if (context?.previousQueries) {
                for (const [queryKey, previousData] of context.previousQueries) {
                    if (previousData) {
                        queryClient.setQueryData(queryKey, previousData);
                    }
                }
            }

            options?.onError?.(error);
        },
    });
}

/**
 * Hook for removing tags from calendars with optimistic updates
 */
export function useRemoveCalendarTagMutation(options?: CalendarTagMutationOptions) {
    const queryClient = useQueryClient();
    const { auth, logout } = useAuth();
    const showToasts = options?.showToasts ?? true;

    return useMutation({
        mutationFn: async (input: CalendarTagInput): Promise<boolean> => {
            if (!auth?.session || !auth?.publicKey) {
                throw new Error("Authentication required. Please sign in.");
            }

            // Remove tag from calendar
            return removeTagFromCalendar(
                auth.session,
                auth.publicKey,
                input.calendarAuthorId,
                input.calendarId,
                input.label
            );
        },

        onMutate: async (input) => {
            if (!auth?.publicKey) return;

            // Cancel any outgoing refetches for this calendar (all variants)
            await queryClient.cancelQueries({
                predicate: (query) => {
                    const key = query.queryKey;
                    return (
                        Array.isArray(key) &&
                        key[0] === "nexus" &&
                        key[1] === "calendar" &&
                        key[2] === input.calendarAuthorId &&
                        key[3] === input.calendarId
                    );
                },
            });

            // Find ALL matching calendar queries
            const matchingQueries = queryClient.getQueriesData<NexusCalendarResponse>({
                predicate: (query) => {
                    const key = query.queryKey;
                    return (
                        Array.isArray(key) &&
                        key[0] === "nexus" &&
                        key[1] === "calendar" &&
                        key[2] === input.calendarAuthorId &&
                        key[3] === input.calendarId
                    );
                },
            });

            // Snapshot all previous data for rollback
            const previousQueries = new Map<readonly unknown[], NexusCalendarResponse | undefined>();

            for (const [queryKey, data] of matchingQueries) {
                if (data) {
                    previousQueries.set(queryKey, data);

                    // Remove current user from taggers, or remove tag entirely if they're the only tagger
                    const updatedTags = data.tags
                        .map((tag) => {
                            if (tag.label.toLowerCase() !== input.label.toLowerCase()) {
                                return tag;
                            }
                            // Remove current user from taggers
                            const newTaggers = tag.taggers.filter((t) => t !== auth.publicKey);
                            if (newTaggers.length === 0) {
                                return null; // Will be filtered out
                            }
                            return {
                                ...tag,
                                taggers: newTaggers,
                                taggers_count: newTaggers.length,
                                relationship: false,
                            };
                        })
                        .filter((tag): tag is NonNullable<typeof tag> => tag !== null);

                    const optimisticCalendar: NexusCalendarResponse = {
                        ...data,
                        tags: updatedTags,
                    };

                    queryClient.setQueryData(queryKey, optimisticCalendar);
                }
            }

            return { previousQueries };
        },

        onSuccess: (_result, input) => {
            if (showToasts) {
                toast.success(`Tag "${input.label}" removed from calendar`);
            }

            // Store successful write to prevent stale Nexus data from overwriting
            if (auth?.publicKey) {
                setPendingTag(
                    input.calendarAuthorId,
                    input.calendarId,
                    auth.publicKey,
                    input.label,
                    'remove'
                );
            }

            // Trigger Nexus ingest
            if (auth?.publicKey) {
                ingestUserIntoNexus(auth.publicKey).catch(console.error);
            }

            options?.onSuccess?.();
        },

        onError: (error, _input, context) => {
            handleMutationError(error, "Failed to remove tag", { showToasts, logout });

            // Rollback all previous calendar data
            if (context?.previousQueries) {
                for (const [queryKey, previousData] of context.previousQueries) {
                    if (previousData) {
                        queryClient.setQueryData(queryKey, previousData);
                    }
                }
            }

            options?.onError?.(error);
        },
    });
}
