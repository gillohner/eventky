# Event Filtering

Date-based and tag filtering with URL synchronization for shareable links.

## Filter Options

```typescript
interface EventStreamFilterValues {
    tags?: string[];           // Max 5 tags
    status?: string;           // CONFIRMED | TENTATIVE | CANCELLED
    author?: string;           // Creator user ID
    timezone?: string;         // IANA timezone
    start_date?: number;       // Unix microseconds
    end_date?: number;         // Unix microseconds
}
```

## Default Behavior

- Shows events from **today onwards** (start of current day)
- No end date (all future events)
- URL reflects active filters for shareable links

## Date Handling

Events use ISO 8601 strings with optional timezone:

```typescript
dtstart: "2025-12-25T18:00:00"        // Naive datetime
dtstart: "2025-12-25T18:00:00Z"       // UTC
dtstart: "2025-12-25T18:00:00+01:00"  // With offset
dtstart: "2025-12-25"                 // Date only
```

Backend stores derived `dtstart_timestamp` (Unix microseconds) for efficient range queries.

## URL Synchronization

Filters sync to URL for shareable links:

```
/events                                    # Upcoming events from today
/events?start_date=1734134400000000       # From specific date
/events?tags=meetup,conference             # Tagged events
/events?author=pk1...&status=CONFIRMED     # User's confirmed events
```

## Date Range Display

| State              | Badge Display              |
| ------------------ | -------------------------- |
| Only start date    | "From Dec 14, 2025"        |
| Only end date      | "Until Dec 31, 2025"       |
| Both dates         | "Dec 14 - Dec 31, 2025"    |
| No date filter     | "All events"               |

## Tags

- Comma-separated in URL: `?tags=dev,free`
- Max 5 tags per query
- Case-insensitive matching

## Key Files

| File                                    | Purpose                    |
| --------------------------------------- | -------------------------- |
| `app/events/page.tsx`                   | Event list with filtering  |
| `components/event/event-filters.tsx`    | Filter UI components       |
| `hooks/use-event-stream.ts`             | Event stream query hook    |
