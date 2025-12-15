# RRULE Filtering Architecture

## Overview

This document explains how recurring event filtering works in Eventky and why we chose this architecture.

## The Problem

The backend (Nexus) needs to return events for a given date range. However:

1. **Single events** are straightforward - filter by `dtstart_timestamp`
2. **Recurring events** (with `RRULE`) are complex - the first occurrence might be outside the date range, but future occurrences could be within it

## Backend Limitations

The backend (Rust/Neo4j) currently:
- ✅ Filters single events by date range correctly
- ❌ Returns ALL recurring events regardless of date range
- ❌ Has no RRULE expansion logic

**Why not implement RRULE in backend?**
- Would require integrating a Rust RRULE library
- RRULE parsing is complex (RFC 5545 specification)
- Frontend already has working RRULE implementation
- Duplicating logic across Rust and TypeScript would be error-prone

## Current Architecture

### Backend (Nexus)
Location: `nexus-common/src/db/graph/queries/get.rs` (lines 1344-1351)

```cypher
// Simplified query logic
WHERE (e.rrule IS NULL AND e.dtstart_timestamp >= $start_date) 
   OR (e.rrule IS NOT NULL)
```

The backend intentionally returns:
- Single events within date range
- ALL recurring events (no date filtering)

### Frontend (Eventky)

**Step 1: Pre-filtering (`app/events/page.tsx`)**
```typescript
const filteredEvents = useMemo(() => {
    return events.filter((event) => {
        if (!event.rrule) return true; // Single events already filtered
        
        // Check if recurring event has any occurrences in date range
        const occurrences = calculateNextOccurrences({
            rrule: event.rrule,
            dtstart: event.dtstart,
            from: startDate,
            until: endDate,
            maxCount: 1, // Just need to know if ANY occurrence exists
        });
        
        return occurrences.length > 0;
    });
}, [events, startDate, endDate]);
```

**Step 2: Occurrence expansion (`hooks/use-calendar-view.ts`)**
```typescript
const occurrenceDates = calculateNextOccurrences({
    rrule: event.rrule,
    dtstart: event.dtstart,
    from: dateRange.start,
    until: dateRange.end,
    maxCount: 100,
});
```

**RRULE calculation (`lib/pubky/rrule-utils.ts`)**
- Full RFC 5545 implementation
- Supports: FREQ, INTERVAL, COUNT, UNTIL, BYDAY, BYMONTHDAY, BYSETPOS
- Handles: RDATE (additional dates), EXDATE (excluded dates)
- Date range filtering: `from` and `until` parameters

## Data Flow

```
1. User selects date range (Dec 15 - Jan 8)
   ↓
2. Frontend requests events from backend
   GET /v0/stream/events?start_date=...&end_date=...
   ↓
3. Backend returns:
   - Single events in range ✓
   - ALL recurring events (qik event, baden meetup, etc.)
   ↓
4. Frontend pre-filters (app/events/page.tsx):
   - Single events: pass through
   - Recurring events: calculateNextOccurrences(maxCount=1)
     • qik event (FREQ=MONTHLY;BYDAY=TH;BYSETPOS=-1,2):
       Has occurrence on Dec 25 & Jan 8 ✓
     • baden event (started Dec 11, COUNT=7):
       No occurrences in Dec 15 - Jan 8 ✗ (filtered out)
   ↓
5. CalendarView expands occurrences:
   - qik event → [Dec 25 @ 03:08, Jan 8 @ 03:08]
   ↓
6. User sees only relevant events
```

## Example: "qik event rrule past"

**Event details:**
```json
{
  "summary": "qik event rrule past",
  "dtstart": "2025-12-09T03:08:49",
  "rrule": "FREQ=MONTHLY;BYDAY=TH;BYSETPOS=-1,2",
  "status": "CONFIRMED"
}
```

**RRULE breakdown:**
- `FREQ=MONTHLY`: Occurs monthly
- `BYDAY=TH`: On Thursdays
- `BYSETPOS=-1,2`: Last Thursday and 2nd Thursday of each month

**Date range: Dec 15 - Jan 8, 2026**

**Calculation:**
- December 2025:
  - 2nd Thursday: Dec 11 (before range ✗)
  - Last Thursday: Dec 25 (in range ✓)
- January 2026:
  - 2nd Thursday: Jan 8 (in range ✓)
  - Last Thursday: Jan 29 (after range ✗)

**Result:** Event appears on Dec 25 and Jan 8

## Performance Considerations

**Pre-filtering (maxCount=1):**
- Fast check to determine if event should be shown
- Prevents unnecessary RRULE expansion
- Only processes events that will be displayed

**Occurrence expansion (maxCount=100):**
- Only runs for events that passed pre-filtering
- Limits to 100 occurrences per event
- Cached in `useMemo` with `dateRange` dependency

## Alternative Considered: Backend RRULE Expansion

**Pros:**
- Single source of truth
- Reduced frontend bundle size
- Consistent across all clients

**Cons:**
- Complex Rust RRULE library integration
- Duplicate logic (frontend still needs for date/time display)
- Higher backend complexity
- More difficult to debug RRULE issues
- Breaking change to existing API

**Decision:** Keep RRULE in frontend for now. If backend RRULE becomes necessary:
1. Use `rrule` crate (Rust)
2. Update `stream_events` query to expand occurrences
3. Return individual occurrence records with `recurrence_id`
4. Frontend can then treat all events uniformly

## Testing

To verify filtering works:
1. Create event with `RRULE` starting in the past
2. Set date range to future period
3. Verify event only appears if it has occurrences in range
4. Check debug view shows correct event count

**Test cases:**
- ✅ Single event in range
- ✅ Single event outside range
- ✅ Recurring event with occurrences in range
- ✅ Recurring event with no occurrences in range
- ✅ Recurring event with RDATE in range
- ✅ Recurring event with all dates in EXDATE

## Future Improvements

1. **Backend RRULE expansion** (if needed for other clients)
2. **Caching** of calculated occurrences
3. **Web Workers** for RRULE calculation (if performance becomes issue)
4. **Shared RRULE library** (WASM module used by both Rust and TS)
