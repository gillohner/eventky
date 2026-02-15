---
name: pubky-writes
description: Guide for writing data to Pubky homeservers from Eventky. Use when implementing create/update/delete operations, working with the pubky SDK, or debugging write failures and data validation errors.
---

# Writing Data to Pubky Homeservers

## Architecture
Eventky uses `@synonymdev/pubky` SDK to write JSON data to user-owned homeservers.
Data is stored at well-known paths under the user's public key.

## Write Pattern

```typescript
// 1. Build the data object matching pubky-app-specs model
const event: PubkyAppEvent = { ... };

// 2. Validate using WASM (pubky-app-specs)
// This MUST happen before writing — it's the enforcement layer
const validated = validateEvent(event);

// 3. Construct the path
const path = `/pub/eventky.app/events/${generateTimestampId()}`;

// 4. Write to homeserver
await pubky.put(path, JSON.stringify(validated));

// 5. Optimistically update local cache
updateOptimisticCache('events', path, validated);
```

## Namespaces
- Social features (users, posts, files, tags, bookmarks, follows, feeds): `pubky.app`
- Calendar features (calendars, events, attendees): `eventky.app`

## ID Generation
- **Timestamp IDs**: Crockford Base32 encoded current time (events, calendars, posts, files)
- **Hash IDs**: Blake3 hash of deterministic inputs (tags, bookmarks, attendees)
- NEVER generate random UUIDs — IDs must be deterministic and reproducible

## Delete Pattern
Writing `[DELETED]` as content marks an entity as deleted.
The actual homeserver record persists but Nexus treats it as removed.

## Update Pattern
- Increment `sequence` field on the entity
- Update `last_modified` to current Unix microseconds
- Write the full updated object to the same path (PUT replaces)

## Error Handling
- WASM validation errors → show user-friendly message, don't attempt write
- Network errors → retry with exponential backoff
- Auth errors → redirect to re-authentication flow (see @docs/AUTH.md)

## Critical Rules
- ALWAYS validate with pubky-app-specs WASM before writing
- ALWAYS use the correct namespace (eventky.app for events/calendars/attendees)
- NEVER write to another user's path
- Timestamps MUST be Unix microseconds for dtstamp/created/last_modified
- After writing, invalidate relevant TanStack Query caches
