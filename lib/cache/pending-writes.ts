/**
 * Pending Writes Manager
 *
 * Tracks successful writes that haven't been indexed by Nexus yet.
 * Prevents stale Nexus refetches from overwriting optimistic updates.
 *
 * This is a single unified module replacing the scattered Map instances
 * in individual mutation hooks.
 */

import type { PendingRsvp, PendingTag, PendingEventWrite, PendingCalendarWrite } from "@/types/nexus";

// =============================================================================
// Configuration
// =============================================================================

/** How long to keep pending writes before auto-clearing (30 seconds) */
const PENDING_WRITE_TTL = 30_000;

// =============================================================================
// Storage Maps
// =============================================================================

/** Pending RSVP writes: key = `${eventAuthorId}:${eventId}:${userPublicKey}:${recurrenceId}` */
const pendingRsvps = new Map<string, PendingRsvp>();

/** Pending tag writes: key = `${eventAuthorId}:${eventId}:${userPublicKey}:${label}` */
const pendingTags = new Map<string, PendingTag>();

/** Pending event writes: key = `${authorId}:${eventId}` */
const pendingEvents = new Map<string, PendingEventWrite>();

/** Pending calendar writes: key = `${authorId}:${calendarId}` */
const pendingCalendars = new Map<string, PendingCalendarWrite>();

// =============================================================================
// Key Builders
// =============================================================================

export function buildRsvpKey(
    eventAuthorId: string,
    eventId: string,
    userPublicKey: string,
    recurrenceId?: string
): string {
    return `${eventAuthorId}:${eventId}:${userPublicKey}:${recurrenceId || ""}`;
}

export function buildTagKey(
    eventAuthorId: string,
    eventId: string,
    userPublicKey: string,
    label: string
): string {
    return `${eventAuthorId}:${eventId}:${userPublicKey}:${label.toLowerCase()}`;
}

export function buildResourceKey(authorId: string, resourceId: string): string {
    return `${authorId}:${resourceId}`;
}

// =============================================================================
// RSVP Operations
// =============================================================================

/**
 * Record a successful RSVP write
 */
export function setPendingRsvp(
    eventAuthorId: string,
    eventId: string,
    userPublicKey: string,
    partstat: string,
    recurrenceId?: string
): void {
    const key = buildRsvpKey(eventAuthorId, eventId, userPublicKey, recurrenceId);
    pendingRsvps.set(key, {
        partstat,
        timestamp: Date.now(),
        recurrenceId,
    });

    // Auto-clear after TTL
    setTimeout(() => pendingRsvps.delete(key), PENDING_WRITE_TTL);
}

/**
 * Get pending RSVP if exists
 */
export function getPendingRsvp(
    eventAuthorId: string,
    eventId: string,
    userPublicKey: string,
    recurrenceId?: string
): PendingRsvp | undefined {
    const key = buildRsvpKey(eventAuthorId, eventId, userPublicKey, recurrenceId);
    return pendingRsvps.get(key);
}

/**
 * Clear a pending RSVP (call when Nexus has confirmed indexing)
 */
export function clearPendingRsvp(
    eventAuthorId: string,
    eventId: string,
    userPublicKey: string,
    recurrenceId?: string
): void {
    const key = buildRsvpKey(eventAuthorId, eventId, userPublicKey, recurrenceId);
    pendingRsvps.delete(key);
}

/**
 * Check if there's a pending RSVP for this user/event/instance
 */
export function hasPendingRsvp(
    eventAuthorId: string,
    eventId: string,
    userPublicKey: string,
    recurrenceId?: string
): boolean {
    const key = buildRsvpKey(eventAuthorId, eventId, userPublicKey, recurrenceId);
    return pendingRsvps.has(key);
}

// =============================================================================
// Tag Operations
// =============================================================================

/**
 * Record a successful tag write
 */
export function setPendingTag(
    eventAuthorId: string,
    eventId: string,
    userPublicKey: string,
    label: string,
    action: "add" | "remove"
): void {
    const key = buildTagKey(eventAuthorId, eventId, userPublicKey, label);
    pendingTags.set(key, {
        label: label.toLowerCase(),
        timestamp: Date.now(),
        action,
    });

    // Auto-clear after TTL
    setTimeout(() => pendingTags.delete(key), PENDING_WRITE_TTL);
}

/**
 * Get pending tag if exists
 */
export function getPendingTag(
    eventAuthorId: string,
    eventId: string,
    userPublicKey: string,
    label: string
): PendingTag | undefined {
    const key = buildTagKey(eventAuthorId, eventId, userPublicKey, label);
    return pendingTags.get(key);
}

/**
 * Get all pending tags for an event/user combo
 */
export function getPendingTagsForEvent(
    eventAuthorId: string,
    eventId: string,
    userPublicKey: string
): PendingTag[] {
    const prefix = `${eventAuthorId}:${eventId}:${userPublicKey}:`;
    const results: PendingTag[] = [];

    for (const [key, value] of pendingTags.entries()) {
        if (key.startsWith(prefix)) {
            results.push(value);
        }
    }

    return results;
}

/**
 * Clear a pending tag
 */
export function clearPendingTag(
    eventAuthorId: string,
    eventId: string,
    userPublicKey: string,
    label: string
): void {
    const key = buildTagKey(eventAuthorId, eventId, userPublicKey, label);
    pendingTags.delete(key);
}

// =============================================================================
// Event/Calendar Write Operations
// =============================================================================

/**
 * Record a successful event write (create/edit)
 */
export function setPendingEvent(
    authorId: string,
    eventId: string,
    data: PendingEventWrite["data"],
    sequence: number
): void {
    const key = buildResourceKey(authorId, eventId);
    pendingEvents.set(key, {
        data,
        timestamp: Date.now(),
        sequence,
    });

    // Auto-clear after extended TTL (60s for create/edit)
    setTimeout(() => pendingEvents.delete(key), 60_000);
}

/**
 * Get pending event write
 */
export function getPendingEvent(
    authorId: string,
    eventId: string
): PendingEventWrite | undefined {
    const key = buildResourceKey(authorId, eventId);
    return pendingEvents.get(key);
}

/**
 * Clear pending event write
 */
export function clearPendingEvent(authorId: string, eventId: string): void {
    const key = buildResourceKey(authorId, eventId);
    pendingEvents.delete(key);
}

/**
 * Check if Nexus version is current with our pending write
 */
export function isEventSynced(
    authorId: string,
    eventId: string,
    nexusSequence: number
): boolean {
    const pending = getPendingEvent(authorId, eventId);
    if (!pending) return true;
    return nexusSequence >= pending.sequence;
}

/**
 * Record a successful calendar write
 */
export function setPendingCalendar(
    authorId: string,
    calendarId: string,
    data: PendingCalendarWrite["data"],
    sequence: number
): void {
    const key = buildResourceKey(authorId, calendarId);
    pendingCalendars.set(key, {
        data,
        timestamp: Date.now(),
        sequence,
    });

    // Auto-clear after extended TTL
    setTimeout(() => pendingCalendars.delete(key), 60_000);
}

/**
 * Get pending calendar write
 */
export function getPendingCalendar(
    authorId: string,
    calendarId: string
): PendingCalendarWrite | undefined {
    const key = buildResourceKey(authorId, calendarId);
    return pendingCalendars.get(key);
}

/**
 * Clear pending calendar write
 */
export function clearPendingCalendar(authorId: string, calendarId: string): void {
    const key = buildResourceKey(authorId, calendarId);
    pendingCalendars.delete(key);
}

/**
 * Check if Nexus version is current with our pending write
 */
export function isCalendarSynced(
    authorId: string,
    calendarId: string,
    nexusSequence: number
): boolean {
    const pending = getPendingCalendar(authorId, calendarId);
    if (!pending) return true;
    return nexusSequence >= pending.sequence;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get total count of pending writes (useful for UI indicators)
 */
export function getPendingWriteCount(): number {
    return (
        pendingRsvps.size +
        pendingTags.size +
        pendingEvents.size +
        pendingCalendars.size
    );
}

/**
 * Clear all pending writes (use with caution)
 */
export function clearAllPendingWrites(): void {
    pendingRsvps.clear();
    pendingTags.clear();
    pendingEvents.clear();
    pendingCalendars.clear();
}

/**
 * Clear stale pending writes (older than TTL)
 */
export function clearStalePendingWrites(): void {
    const now = Date.now();

    for (const [key, value] of pendingRsvps.entries()) {
        if (now - value.timestamp > PENDING_WRITE_TTL) {
            pendingRsvps.delete(key);
        }
    }

    for (const [key, value] of pendingTags.entries()) {
        if (now - value.timestamp > PENDING_WRITE_TTL) {
            pendingTags.delete(key);
        }
    }

    for (const [key, value] of pendingEvents.entries()) {
        if (now - value.timestamp > 60_000) {
            pendingEvents.delete(key);
        }
    }

    for (const [key, value] of pendingCalendars.entries()) {
        if (now - value.timestamp > 60_000) {
            pendingCalendars.delete(key);
        }
    }
}
