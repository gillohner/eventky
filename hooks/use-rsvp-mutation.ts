/**
 * RSVP Mutation Hook
 *
 * - Optimistic updates with instant UI feedback
 * - Prevents stale Nexus data from overwriting successful writes
 * - Background Nexus sync
 * - Type-safe mutations
 *
 * Usage:
 * ```tsx
 * const { mutate: rsvp, isPending } = useRsvpMutation();
 *
 * const handleRsvp = (status: string) => {
 *   rsvp({
 *     eventAuthorId: authorId,
 *     eventId: eventId,
 *     partstat: status,
 *   });
 * };
 * ```
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/providers/auth-provider";
import { saveAttendee, type SaveAttendeeResult } from "@/lib/pubky/attendees";
import { ingestUserIntoNexus } from "@/lib/nexus/ingest";
import { eventUriBuilder, attendeeUriBuilder } from "pubky-app-specs";
import { handleMutationError } from "@/lib/pubky/session-utils";
import { toast } from "sonner";
import type { NexusEventResponse } from "@/lib/nexus/events";
import {
    setPendingRsvp,
    getPendingRsvp as getPendingRsvpFromCache,
    clearPendingRsvp as clearPendingRsvpFromCache,
} from "@/lib/cache/pending-writes";

/**
 * Check if there's a pending write for this user/event/instance combo
 * Re-exported for backwards compatibility
 */
export function getPendingRsvp(
    eventAuthorId: string,
    eventId: string,
    userPublicKey: string,
    recurrenceId?: string
) {
    return getPendingRsvpFromCache(eventAuthorId, eventId, userPublicKey, recurrenceId);
}

/**
 * Clear pending write (call when Nexus data is confirmed to be up-to-date)
 * Re-exported for backwards compatibility
 */
export function clearPendingRsvp(eventAuthorId: string, eventId: string, userPublicKey: string, recurrenceId?: string): void {
    clearPendingRsvpFromCache(eventAuthorId, eventId, userPublicKey, recurrenceId);
}

/**
 * Input for RSVP mutation
 */
export interface RsvpInput {
    /** Event author's public key */
    eventAuthorId: string;
    /** Event ID */
    eventId: string;
    /** Participation status: ACCEPTED, DECLINED, TENTATIVE */
    partstat: string;
    /** For recurring events, the specific instance datetime (ISO 8601) */
    recurrenceId?: string;
}

/**
 * Options for mutation hooks
 */
export interface RsvpMutationOptions {
    /** Called on successful mutation */
    onSuccess?: (result: SaveAttendeeResult) => void;
    /** Called on mutation error */
    onError?: (error: Error) => void;
    /** Show toast notifications (default: true) */
    showToasts?: boolean;
}

/**
 * Hook for RSVP operations with optimistic updates
 *
 * Features:
 * - Writes attendee record to Pubky Homeserver
 * - Updates event cache with new attendee immediately
 * - Invalidates queries and triggers Nexus ingest
 */
export function useRsvpMutation(options?: RsvpMutationOptions) {
    const queryClient = useQueryClient();
    const { auth, logout } = useAuth();
    const showToasts = options?.showToasts ?? true;

    return useMutation({
        mutationFn: async (input: RsvpInput): Promise<SaveAttendeeResult> => {
            if (!auth?.session || !auth?.publicKey) {
                throw new Error("Authentication required. Please sign in.");
            }

            // Save attendee to Pubky Homeserver
            const result = await saveAttendee(
                auth.session,
                input.eventAuthorId,
                input.eventId,
                auth.publicKey,
                input.partstat,
                input.recurrenceId
            );

            return result;
        },

        onMutate: async (input) => {
            if (!auth?.publicKey) return;

            // Cancel any outgoing refetches for this event (all variants of the query key)
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

            // Find all matching event queries and update them optimistically
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

                    const now = Date.now();
                    const optimisticAttendee = {
                        id: `optimistic-${auth.publicKey}-${now}`,
                        indexed_at: now,
                        author: auth.publicKey,
                        uri: attendeeUriBuilder(auth.publicKey, `optimistic-${now}`), // Placeholder - real ID from builder
                        partstat: input.partstat.toUpperCase(),
                        x_pubky_event_uri: eventUriBuilder(input.eventAuthorId, input.eventId),
                        created_at: now,
                        last_modified: now,
                        recurrence_id: input.recurrenceId,
                    };

                    // Remove any existing RSVP from current user for this same instance
                    // Keep RSVPs for other instances of recurring events
                    const updatedAttendees = data.attendees.filter((a) => {
                        if (a.author !== auth.publicKey) return true;
                        // For same user, only remove if same instance
                        if (input.recurrenceId) {
                            return a.recurrence_id !== input.recurrenceId;
                        }
                        // For non-recurring, remove if attendee also has no recurrence_id
                        return !!a.recurrence_id;
                    });
                    updatedAttendees.push(optimisticAttendee);

                    const optimisticEvent: NexusEventResponse = {
                        ...data,
                        attendees: updatedAttendees,
                    };

                    queryClient.setQueryData(queryKey, optimisticEvent);
                }
            }

            return { previousQueries };
        },

        onSuccess: (result, input) => {
            const statusLabels: Record<string, string> = {
                ACCEPTED: "Going",
                DECLINED: "Not going",
                TENTATIVE: "Maybe",
            };

            if (showToasts) {
                const label = statusLabels[result.partstat] || result.partstat;
                toast.success(`RSVP updated: ${label}`);
            }

            // Store successful write to prevent stale Nexus data from overwriting
            // (auto-clears after TTL defined in pending-writes manager)
            if (auth?.publicKey) {
                setPendingRsvp(
                    input.eventAuthorId,
                    input.eventId,
                    auth.publicKey,
                    result.partstat,
                    input.recurrenceId
                );
            }

            // Trigger Nexus ingest for both the attendee's user and the event author
            // This speeds up indexing so the UI reflects the change faster
            if (auth?.publicKey) {
                ingestUserIntoNexus(auth.publicKey).catch(console.error);
            }
            // Also ingest event author in case event needs reindexing
            if (input.eventAuthorId !== auth?.publicKey) {
                ingestUserIntoNexus(input.eventAuthorId).catch(console.error);
            }

            // Don't invalidate queries immediately - the optimistic update is correct
            // and Nexus may return stale data. Let background refetch happen naturally.

            options?.onSuccess?.(result);
        },

        onError: (error, _input, context) => {
            handleMutationError(error, "Failed to RSVP", { showToasts, logout });

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
 * Get status label for display
 */
export function getPartstatLabel(partstat: string): string {
    const labels: Record<string, string> = {
        ACCEPTED: "Going",
        DECLINED: "Not going",
        TENTATIVE: "Maybe",
        "NEEDS-ACTION": "Pending",
    };
    return labels[partstat.toUpperCase()] || partstat;
}
