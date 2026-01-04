# Caching

Optimistic UI updates using TanStack Query with localStorage persistence.

## Architecture

```
User Action → Save to Homeserver → Update Cache → Show UI Immediately
                                                         ↓
                                              Poll Nexus → Mark Synced
```

**TanStack Query-Only** — No Zustand store for caching. All caching handled by TanStack Query with localStorage persistence.

## Usage

```typescript
import { useCreateEvent, useEvent } from "@/hooks";

// Query with sync status
const { data, syncStatus, isOptimistic } = useEvent(authorId, eventId);
// syncStatus: "pending" | "syncing" | "synced" | "error"

// Mutation with optimistic update
const { mutateAsync: createEvent } = useCreateEvent();
await createEvent({ event, eventId });
```

## Sync Metadata

Data returned from hooks includes embedded `_syncMeta`:

```typescript
interface SyncMetadata {
  lastFetched: number;
  source: "local" | "nexus" | "merged";
  version?: { sequence?: number; lastModified?: number };
  synced: boolean;
  syncAttempts: number;
}
```

## Version Comparison

Uses RFC 5545 fields for conflict resolution:

1. **`sequence`**: Modification counter (higher = newer)
2. **`last_modified`**: Unix microseconds (tiebreaker)
3. **`indexed_at`**: Nexus processing timestamp (fallback)

## Configuration

```typescript
// lib/cache/utils.ts
SYNC_CONFIG = {
  INITIAL_SYNC_DELAY: 1000,   // 1s before first check
  SYNC_INTERVAL: 3000,        // 3s between checks
  MAX_SYNC_ATTEMPTS: 20,      // Give up after 20 attempts
  MAX_SYNC_TIME: 60000,       // Max 60s total
};
```

## Persistence

TanStack Query persists to localStorage with 24-hour max age:

```typescript
<PersistQueryClientProvider
  persistOptions={{
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
  }}
>
```

## Error Handling

| Scenario             | Behavior                              |
| -------------------- | ------------------------------------- |
| Mutation failure     | Rollback cache, show toast error      |
| Nexus 404            | Keep cached data, continue polling    |
| Network error        | Retry with backoff, preserve cache    |
| Max attempts reached | Mark as "error" status, stop polling  |

## Key Files

| File                                      | Purpose                              |
| ----------------------------------------- | ------------------------------------ |
| `types/nexus.ts`                          | Unified types with sync metadata     |
| `lib/cache/pending-writes.ts`             | Pending writes tracking              |
| `lib/cache/sync.ts`                       | Version comparison, data merging     |
| `lib/cache/utils.ts`                      | Query keys, config constants         |
| `hooks/use-event-hooks.ts`                | Event hooks with sync status         |
| `hooks/use-event-mutations.ts`            | Event mutation hooks                 |
| `hooks/use-author-profile.ts`             | Author profile caching               |
| `components/ui/sync-status-indicator.tsx` | Sync badge UI                        |
| `components/providers/query-provider.tsx` | TanStack Query persistence setup     |

## Author Profile Caching

Author profiles are fetched from Nexus and cached separately from events/calendars:

```typescript
import { useAuthorProfile, useAuthorProfiles } from "@/hooks";

// Single author
const { author, isLoading } = useAuthorProfile(authorId);
// author?.name, author?.avatarUrl

// Multiple authors (batch)
const { authors, isLoading } = useAuthorProfiles(authorIds);
// authors.get(authorId)?.name
```

**Query Keys**: `["nexus", "author", authorId]` — shared across both hooks for cache efficiency.

**Stale Time**: 5 minutes — profiles change less frequently than events.

**Usage Pattern**:
- Detail pages: `useAuthorProfile` in layout, pass `authorName`/`authorAvatar` as props
- Lists with multiple authors: `useAuthorProfiles` in parent component, pass profiles to rows
- Always use `getPubkyAvatarUrl(userId)` for avatar URLs (Nexus static endpoint)
