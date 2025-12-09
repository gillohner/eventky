/**
 * Tag Mutation Hook
 *
 * Features:
 * - Optimistic updates with instant UI feedback
 * - Prevents stale Nexus data from overwriting successful writes
 * - Updates ALL event query variants (tags are global, not per-instance)
 * - Background Nexus sync
 * - Type-safe mutations
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/providers/auth-provider";
import { addTagToEvent, removeTagFromEvent } from "@/lib/pubky/tags";
import { ingestUserIntoNexus } from "@/lib/nexus/ingest";
import { toast } from "sonner";
import type { NexusEventResponse } from "@/lib/nexus/events";

/**
 * In-memory store of successful tag writes that haven't been indexed yet.
 * Used to prevent stale Nexus refetches from overwriting optimistic updates.
 * Key format: `${eventAuthorId}:${eventId}:${userPublicKey}:${label}`
 */
const pendingTagWrites = new Map<string, { label: string; timestamp: number; action: 'add' | 'remove' }>();

/**
 * Build a key for pending tag writes
 */
function buildPendingKey(eventAuthorId: string, eventId: string, userPublicKey: string, label: string): string {
    return `${eventAuthorId}:${eventId}:${userPublicKey}:${label.toLowerCase()}`;
}

/**
 * Check if there's a pending write for this user/event/label combo
 */
export function getPendingTag(
    eventAuthorId: string,
    eventId: string,
    userPublicKey: string,
    label: string
): { label: string; timestamp: number; action: 'add' | 'remove' } | undefined {
    const key = buildPendingKey(eventAuthorId, eventId, userPublicKey, label);
    return pendingTagWrites.get(key);
}

/**
 * Get all pending tags for an event/user combo
 */
export function getPendingTagsForEvent(
    eventAuthorId: string,
    eventId: string,
    userPublicKey: string
): Array<{ label: string; action: 'add' | 'remove' }> {
    const prefix = `${eventAuthorId}:${eventId}:${userPublicKey}:`;
    const results: Array<{ label: string; action: 'add' | 'remove' }> = [];

    for (const [key, value] of pendingTagWrites.entries()) {
        if (key.startsWith(prefix)) {
            results.push({ label: value.label, action: value.action });
        }
    }

    return results;
}

/**
 * Clear pending write (call when Nexus data is confirmed to be up-to-date)
 */
export function clearPendingTag(eventAuthorId: string, eventId: string, userPublicKey: string, label: string): void {
    const key = buildPendingKey(eventAuthorId, eventId, userPublicKey, label);
    pendingTagWrites.delete(key);
}

/**
 * Input for tag mutations
 */
export interface TagInput {
    /** Event author's public key */
    eventAuthorId: string;
    /** Event ID */
    eventId: string;
    /** Tag label */
    label: string;
}

/**
 * Options for tag mutation hooks
 */
export interface TagMutationOptions {
    /** Called on successful mutation */
    onSuccess?: () => void;
    /** Called on mutation error */
    onError?: (error: Error) => void;
    /** Show toast notifications (default: true) */
    showToasts?: boolean;
}

/**
 * Hook for adding tags to events with optimistic updates
 * Tags are global - they apply to the entire event series, not specific instances
 */
export function useAddTagMutation(options?: TagMutationOptions) {
    const queryClient = useQueryClient();
    const { auth } = useAuth();
    const showToasts = options?.showToasts ?? true;

    return useMutation({
        mutationFn: async (input: TagInput): Promise<boolean> => {
            if (!auth?.session || !auth?.publicKey) {
                throw new Error("Authentication required. Please sign in.");
            }

            return addTagToEvent(
                auth.session,
                auth.publicKey,
                input.eventAuthorId,
                input.eventId,
                input.label
            );
        },

        onMutate: async (input) => {
            if (!auth?.publicKey) return;

            // Cancel any outgoing refetches for this event (all variants)
            await queryClient.cancelQueries({
                predicate: (query) => {
                    const key = query.queryKey;
                    return (
                        Array.isArray(key) &&
                        key[0] === "nexus" &&
                        key[1] === "event" &&
                        key[2] === input.eventAuthorId &&
                        key[3] === input.eventId
                    );
                },
            });

            // Find ALL matching event queries (all instances share the same tags)
            const matchingQueries = queryClient.getQueriesData<NexusEventResponse>({
                predicate: (query) => {
                    const key = query.queryKey;
                    return (
                        Array.isArray(key) &&
                        key[0] === "nexus" &&
                        key[1] === "event" &&
                        key[2] === input.eventAuthorId &&
                        key[3] === input.eventId
                    );
                },
            });

            // Snapshot all previous data for rollback
            const previousQueries = new Map<readonly unknown[], NexusEventResponse | undefined>();

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

                    const optimisticEvent: NexusEventResponse = {
                        ...data,
                        tags: updatedTags,
                    };

                    queryClient.setQueryData(queryKey, optimisticEvent);
                }
            }

            return { previousQueries };
        },

        onSuccess: (_result, input) => {
            if (showToasts) {
                toast.success(`Tag "${input.label}" added`);
            }

            // Store successful write to prevent stale Nexus data from overwriting
            if (auth?.publicKey) {
                const key = buildPendingKey(input.eventAuthorId, input.eventId, auth.publicKey, input.label);
                pendingTagWrites.set(key, {
                    label: input.label.toLowerCase(),
                    timestamp: Date.now(),
                    action: 'add',
                });

                // Auto-clear after 30 seconds (Nexus should be synced by then)
                setTimeout(() => {
                    pendingTagWrites.delete(key);
                }, 30000);
            }

            // Trigger Nexus ingest
            if (auth?.publicKey) {
                ingestUserIntoNexus(auth.publicKey).catch(console.error);
            }

            options?.onSuccess?.();
        },

        onError: (error, _input, context) => {
            if (showToasts) {
                toast.error(`Failed to add tag: ${error.message}`);
            }

            // Rollback all previous event data
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
 * Hook for removing tags from events with optimistic updates
 * Tags are global - they apply to the entire event series, not specific instances
 */
export function useRemoveTagMutation(options?: TagMutationOptions) {
    const queryClient = useQueryClient();
    const { auth } = useAuth();
    const showToasts = options?.showToasts ?? true;

    return useMutation({
        mutationFn: async (input: TagInput): Promise<boolean> => {
            if (!auth?.session || !auth?.publicKey) {
                throw new Error("Authentication required. Please sign in.");
            }

            return removeTagFromEvent(
                auth.session,
                auth.publicKey,
                input.eventAuthorId,
                input.eventId,
                input.label
            );
        },

        onMutate: async (input) => {
            if (!auth?.publicKey) return;

            // Cancel any outgoing refetches for this event (all variants)
            await queryClient.cancelQueries({
                predicate: (query) => {
                    const key = query.queryKey;
                    return (
                        Array.isArray(key) &&
                        key[0] === "nexus" &&
                        key[1] === "event" &&
                        key[2] === input.eventAuthorId &&
                        key[3] === input.eventId
                    );
                },
            });

            // Find ALL matching event queries (all instances share the same tags)
            const matchingQueries = queryClient.getQueriesData<NexusEventResponse>({
                predicate: (query) => {
                    const key = query.queryKey;
                    return (
                        Array.isArray(key) &&
                        key[0] === "nexus" &&
                        key[1] === "event" &&
                        key[2] === input.eventAuthorId &&
                        key[3] === input.eventId
                    );
                },
            });

            // Snapshot all previous data for rollback
            const previousQueries = new Map<readonly unknown[], NexusEventResponse | undefined>();

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

                    const optimisticEvent: NexusEventResponse = {
                        ...data,
                        tags: updatedTags,
                    };

                    queryClient.setQueryData(queryKey, optimisticEvent);
                }
            }

            return { previousQueries };
        },

        onSuccess: (_result, input) => {
            if (showToasts) {
                toast.success(`Tag "${input.label}" removed`);
            }

            // Store successful write to prevent stale Nexus data from overwriting
            if (auth?.publicKey) {
                const key = buildPendingKey(input.eventAuthorId, input.eventId, auth.publicKey, input.label);
                pendingTagWrites.set(key, {
                    label: input.label.toLowerCase(),
                    timestamp: Date.now(),
                    action: 'remove',
                });

                // Auto-clear after 30 seconds (Nexus should be synced by then)
                setTimeout(() => {
                    pendingTagWrites.delete(key);
                }, 30000);
            }

            // Trigger Nexus ingest
            if (auth?.publicKey) {
                ingestUserIntoNexus(auth.publicKey).catch(console.error);
            }

            options?.onSuccess?.();
        },

        onError: (error, _input, context) => {
            if (showToasts) {
                toast.error(`Failed to remove tag: ${error.message}`);
            }

            // Rollback all previous event data
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
