# Optimistic Caching Architecture

This document describes the production-grade optimistic caching system implemented for Eventky to provide instant UI updates when creating or editing events and calendars.

## Problem Statement

When a user creates or edits an event:
1. Data is written to the **Pubky Homeserver** (source of truth)
2. **Nexus** indexes the data asynchronously (typically 1-5 seconds, can be longer)
3. User is redirected to the event page
4. Page fetches from Nexus, which may not have indexed the data yet

This creates a poor UX where users see "Event not found" or stale data immediately after creating/editing.

## Solution Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Action                               │
│                    (Create/Edit Event)                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Mutation Hook                                 │
│              (useCreateEvent / useUpdateEvent)                   │
├─────────────────────────────────────────────────────────────────┤
│  1. Save to Pubky Homeserver (source of truth)                  │
│  2. Store in Optimistic Cache (local, unsynced)                 │
│  3. Update TanStack Query cache                                  │
│  4. Redirect to detail page                                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Detail Page                                  │
│                    (useEvent hook)                               │
├─────────────────────────────────────────────────────────────────┤
│  1. Check Optimistic Cache for local data                       │
│  2. Fetch from Nexus (may return 404 or stale data)             │
│  3. Merge: Show local data if newer, Nexus tags/attendees       │
│  4. Display immediately (no loading state)                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Background Sync                                 │
│              (Built into useEvent hook)                          │
├─────────────────────────────────────────────────────────────────┤
│  1. Poll Nexus with exponential backoff                         │
│  2. Compare versions (sequence, last_modified)                  │
│  3. When Nexus catches up, mark as synced                       │
│  4. Clear local cache entry (Nexus is source of truth)          │
└─────────────────────────────────────────────────────────────────┘
```

## Key Components

### 1. Optimistic Cache Store (`stores/optimistic-cache-store.ts`)

Zustand store that manages local cache with metadata:

```typescript
interface CacheMetadata {
    cachedAt: number;       // When entry was cached
    specVersion: string;    // Cache schema version
    source: "local" | "nexus";
    syncAttempts: number;   // Failed sync attempts
    synced: boolean;        // Whether Nexus has confirmed
    lastSyncCheck?: number;
}

interface CachedEvent {
    data: NexusEventResponse;
    meta: CacheMetadata;
}
```

**Features:**
- Persists to localStorage (only unsynced items)
- Version-aware cache invalidation
- Automatic cleanup of stale entries
- Sync status tracking

### 2. Query Hooks (`hooks/use-event-optimistic.ts`)

Enhanced TanStack Query hooks with optimistic cache integration:

```typescript
const { 
    data,           // Merged event data
    isLoading,      // Only true if no local cache
    isFetching,     // True while fetching from Nexus
    syncStatus,     // "pending" | "syncing" | "synced" | "stale" | "error"
    isOptimistic,   // True if showing local/merged data
    refetch         // Force refetch from Nexus
} = useEvent(authorId, eventId);
```

**Features:**
- Automatic cache merging (local + Nexus)
- Background sync polling with exponential backoff
- Version comparison using `sequence` and `last_modified`
- Placeholder data from local cache while fetching

### 3. Mutation Hooks (`hooks/use-event-mutations.ts`)

TanStack Query mutations with optimistic updates:

```typescript
const { mutateAsync: createEvent, isPending } = useCreateEvent({
    onSuccess: (result) => {
        router.push(`/event/${result.authorId}/${result.eventId}`);
    }
});

// Usage
await createEvent({
    event: pubkyAppEvent,
    eventId: generatedId
});
```

**Features:**
- Writes to Pubky Homeserver
- Updates optimistic cache immediately
- Automatic query invalidation
- Rollback on error

### 4. Cache Utilities (`lib/cache/utils.ts`)

Helper functions for cache operations:

```typescript
// Query key factory for consistent keys
queryKeys.events.detail(authorId, eventId, options)

// Convert Pubky data to Nexus format
pubkyEventToNexusFormat(event, authorId, eventId)

// Version comparison
compareEventVersions(eventA, eventB)  // positive if A newer

// Sync configuration
SYNC_CONFIG.INITIAL_SYNC_DELAY  // 1 second
SYNC_CONFIG.SYNC_INTERVAL       // 3 seconds
SYNC_CONFIG.MAX_SYNC_ATTEMPTS   // 20 attempts
SYNC_CONFIG.MAX_SYNC_TIME       // 60 seconds
```

### 5. UI Components

**SyncStatusIndicator** (`components/ui/sync-status-indicator.tsx`):
```tsx
// Badge that shows sync status
<SyncBadge status={syncStatus} />

// Full indicator with tooltip
<SyncStatusIndicator status={syncStatus} showLabel />
```

**GlobalSyncIndicator** (`components/providers/cache-sync-provider.tsx`):
- Shows floating indicator when items are syncing
- Appears in bottom-right corner

## Version Comparison Strategy

The system uses RFC 5545 versioning fields from `pubky-app-specs`:

1. **`sequence`**: Modification counter (0, 1, 2, ...)
   - Incremented on each edit
   - Higher sequence = newer version

2. **`last_modified`**: Unix microseconds timestamp
   - Used as tiebreaker when sequences match

3. **`indexed_at`**: Nexus processing timestamp
   - Fallback comparison when above fields aren't available

```typescript
function compareEventVersions(a, b): number {
    // First by sequence
    if (a.sequence !== b.sequence) return a.sequence - b.sequence;
    // Then by last_modified
    if (a.last_modified !== b.last_modified) return a.last_modified - b.last_modified;
    // Finally by indexed_at
    return a.indexed_at - b.indexed_at;
}
```

## Data Flow Examples

### Creating an Event

```
User clicks "Create Event"
         │
         ▼
┌─────────────────────┐
│  Form Submitted     │
│  (validated)        │
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│  useCreateEvent     │
│  mutation called    │
└─────────────────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌─────────┐  ┌─────────────────┐
│ Pubky   │  │ Optimistic      │
│ Storage │  │ Cache           │
│ (async) │  │ (sync)          │
└─────────┘  └─────────────────┘
                     │
                     ▼
            ┌─────────────────┐
            │ Router.push()   │
            │ to event page   │
            └─────────────────┘
                     │
                     ▼
            ┌─────────────────┐
            │ useEvent()      │
            │ returns local   │
            │ cache instantly │
            └─────────────────┘
                     │
                     ▼
            ┌─────────────────────┐
            │ Background sync     │
            │ polls Nexus every   │
            │ 3s until synced     │
            └─────────────────────┘
```

### Viewing an Event (after create)

```
Page loads with useEvent(authorId, eventId)
         │
    ┌────┴────────────────┐
    │                     │
    ▼                     ▼
┌─────────────┐    ┌─────────────┐
│ Check local │    │ Fetch from  │
│ cache       │    │ Nexus       │
└─────────────┘    └─────────────┘
    │ Found!           │ 404 (not indexed yet)
    │                  │
    ▼                  ▼
┌─────────────────────────────────┐
│ Return local data immediately   │
│ Show "Syncing..." badge         │
└─────────────────────────────────┘
         │
         ▼ (background)
┌─────────────────────────────────┐
│ Poll Nexus with backoff:        │
│ 1s, 2s, 4s, 8s... (max 15s)    │
└─────────────────────────────────┘
         │
         ▼ (Nexus indexed)
┌─────────────────────────────────┐
│ Compare versions                │
│ Nexus.sequence >= Local.sequence│
│ Mark as synced                  │
│ Remove "Syncing..." badge       │
└─────────────────────────────────┘
```

## Configuration

### Sync Timing (`lib/cache/utils.ts`)

```typescript
export const SYNC_CONFIG = {
    INITIAL_SYNC_DELAY: 1000,     // Wait 1s before first check
    SYNC_INTERVAL: 3000,          // Base interval (with backoff)
    MAX_SYNC_ATTEMPTS: 20,        // Give up after 20 attempts
    MAX_SYNC_TIME: 60000,         // Max 60s total
    OPTIMISTIC_STALE_TIME: 30000, // Refetch every 30s for unsynced
};
```

### Cache Cleanup (`components/providers/cache-sync-provider.tsx`)

```typescript
<CacheSyncProvider
    cleanupInterval={5 * 60 * 1000}  // Clean every 5 minutes
    maxStaleAge={24 * 60 * 60 * 1000} // Remove entries > 24 hours old
>
```

## Error Handling

1. **Mutation Failure**: Rollback optimistic cache, show toast error
2. **Nexus 404**: Keep showing local data, continue polling
3. **Network Error**: Retry with backoff, don't clear local data
4. **Max Attempts Reached**: Mark as "error" status, stop polling

## Migration from Legacy Hooks

Replace old hooks with optimistic versions:

```typescript
// Before
import { useEvent } from "@/hooks/use-event";

// After
import { useEvent } from "@/hooks/use-event-optimistic";
// Or from index:
import { useEvent } from "@/hooks";
```

The API is mostly compatible, with additional fields:
- `syncStatus`
- `isOptimistic`
- `refetch`

## Testing Checklist

- [ ] Create event → immediate display on detail page
- [ ] Edit event → shows updated data instantly
- [ ] Sync badge appears and disappears correctly
- [ ] Works offline (localStorage persistence)
- [ ] Cache clears on version mismatch
- [ ] Error states show correctly
- [ ] Global sync indicator shows during pending syncs
