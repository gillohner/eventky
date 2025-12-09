# Refactoring Tracker

## High Priority

### 1. Use WASM Validation
**Status:** ✅ DONE  
**Files:** `lib/pubky/validation.ts` (14 lines - was 82)  
**Result:** Simplified to pure re-exports from pubky-app-specs. Removed unused `validateUrl()` and `getFieldValidationError()`.

### 2. Use WASM for Event/Calendar Creation
**Status:** ✅ ALREADY DONE  
**Files:** `lib/pubky/events.ts`, `lib/pubky/calendars.ts`  
**Result:** Already using `PubkyAppEvent.fromJson()`, `PubkyAppCalendar.fromJson()`, `event.createId()` from WASM.

### 3. Use WASM URI Builders & Parser Consistently
**Status:** ✅ DONE  
**pubky-app-specs changes:**
- Removed broken `timestampToIso()` and `parseIsoToTimestamp()` from WASM (ISO strings used directly)
- Removed `Organizer` struct (was unused/commented out)
- `parse_uri()`, `eventUriBuilder()`, `calendarUriBuilder()`, `attendeeUriBuilder()` available

**eventky changes:**
- `lib/cache/utils.ts` - uses `eventUriBuilder()`, `calendarUriBuilder()` for URI construction
- `lib/pubky/events.ts`, `calendars.ts`, `attendees.ts`, `tags.ts` - already using URI builders
- `hooks/use-rsvp-mutation.ts` - uses `eventUriBuilder()`, `attendeeUriBuilder()`
- `components/event/detail/event-header.tsx` - uses `parse_uri()` for calendar URI parsing
- `components/event/detail/event-metadata.tsx` - uses `parse_uri()` for calendar URI parsing
- `components/event/create/calendar-selector.tsx` - uses `parse_uri()` for calendar URI parsing
- `app/calendar/[authorId]/[calendarId]/page.tsx` - uses `calendarUriBuilder()`

## Medium Priority

### 4. Consolidate Pending Writes Pattern
**Status:** TODO  
**Files:** `hooks/use-rsvp-mutation.ts`, `hooks/use-tag-mutation.ts`  
**Issue:** Duplicated Map + timeout pattern in each mutation hook  
**Action:** Create shared `lib/pending-writes.ts` utility  

### 5. Review Caching Layers
**Status:** TODO  
**Files:** `stores/optimistic-cache-store.ts` (180 lines)  
**Issue:** 3 overlapping systems: Zustand store, TanStack Query cache, pending writes Maps  
**Action:** Evaluate if Zustand store can be removed in favor of TanStack Query only  

## Low Priority

### 6. Nexus Client Consolidation
**Status:** TODO  
**Files:** `lib/nexus/client.ts`, individual fetch calls  
**Issue:** Some components fetch directly instead of using shared client  
**Action:** Audit and consolidate  

### 7. Type Definitions
**Status:** TODO  
**Files:** `types/`  
**Issue:** Some types duplicated or not aligned with pubky-app-specs  
**Action:** Import types from WASM bindings where possible

## Completed Cleanup

- Removed unused `DEFAULT_EVENTKY_BASE_URLS` from `lib/config.ts`
- Simplified `lib/pubky/validation.ts` from 82 lines to 14 lines
- Removed broken timestamp functions from pubky-app-specs
- Removed unused `Organizer` struct from pubky-app-specs
- Replaced all manual regex URI parsing with `parse_uri()` from pubky-app-specs
- Replaced all manual URI construction with URI builder functions from pubky-app-specs  