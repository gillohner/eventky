# Recurrence

RFC 5545 compliant recurrence support using RRULE.

## State Structure

```typescript
interface RecurrenceState {
    enabled: boolean;
    frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
    interval: number;
    count?: number;
    until?: string;
    
    // Weekly
    selectedWeekdays: Weekday[];
    
    // Monthly
    monthlyMode: "none" | "dayofmonth" | "dayofweek";
    bymonthday: number[];   // e.g., [21] or [-1] for last day
    bysetpos: number[];     // e.g., [-1] for last occurrence
    
    // Additional/Excluded
    rdates: string[];
    excludedOccurrences: Set<string>;
}
```

## Supported RRULE Properties

| Property    | Description                            | Example                    |
| ----------- | -------------------------------------- | -------------------------- |
| `FREQ`      | Frequency                              | DAILY, WEEKLY, MONTHLY, YEARLY |
| `INTERVAL`  | Every N periods                        | `INTERVAL=2` (every 2 weeks) |
| `COUNT`     | Total occurrences                      | `COUNT=10`                 |
| `UNTIL`     | End date                               | `UNTIL=20251231`           |
| `BYDAY`     | Weekdays                               | `BYDAY=MO,WE,FR`           |
| `BYMONTHDAY`| Days of month                          | `BYMONTHDAY=1,15,-1`       |
| `BYSETPOS`  | Position in set                        | `BYSETPOS=-1` (last)       |
| `RDATE`     | Additional dates                       | `RDATE=20251225`           |
| `EXDATE`    | Excluded dates                         | `EXDATE=20251224`          |

## Pattern Examples

### Every 21st of Each Month
```
FREQ=MONTHLY;BYMONTHDAY=21
```
UI: Monthly frequency → "Specific day(s) of month" → select "21"

### Last Thursday of Each Month
```
FREQ=MONTHLY;BYDAY=TH;BYSETPOS=-1
```
UI: Monthly frequency → "Specific weekday position" → Thursday + Last

### First and Third Monday
```
FREQ=MONTHLY;BYDAY=MO;BYSETPOS=1,3
```
UI: Monthly frequency → "Specific weekday position" → Monday + First, Third

### Every 4 Weeks
```
FREQ=WEEKLY;INTERVAL=4
```
UI: Weekly frequency → interval = 4

## Date Range Filtering

The backend returns:
- Single events filtered by date range
- ALL recurring events (no date filtering)

Frontend then filters recurring events by expanding occurrences:

```typescript
const hasOccurrencesInRange = calculateNextOccurrences({
    rrule: event.rrule,
    dtstart: event.dtstart,
    from: startDate,
    until: endDate,
    maxCount: 1,
}).length > 0;
```

**Rationale:** RRULE expansion is complex (RFC 5545). Keeping it frontend-only avoids duplicating logic in both Rust and TypeScript. Optimizations might be added later if performance becomes an issue due to many recurring events.

## DST Handling

Recurring events maintain wall-clock time across DST transitions. For example:
- Weekly meeting at 10:00 AM stays at 10:00 AM (not 11:00 AM or 9:00 AM)
- Intervals are added in the event's timezone, not UTC
- Crossing DST boundaries preserves the local time

See [TIMEZONE_HANDLING.md](TIMEZONE_HANDLING.md) for detailed DST behavior.

## Key Files

| File                                        | Purpose                           |
| ------------------------------------------- | --------------------------------- |
| `lib/pubky/rrule-utils.ts`                  | RRULE parsing and expansion       |
| `lib/datetime/rrule-display.ts`             | Human-readable labels             |
| `stores/event-form-store.ts`                | Recurrence state management       |
| `components/event/create/recurrence/*.tsx`  | UI components                     |

## COUNT + EXDATE Behavior

Per RFC 5545: COUNT specifies total candidates BEFORE EXDATE filtering.

```
COUNT=4 + 1 EXDATE → 3 results (not 4)
```

EXDATE removes dates from the candidate set; final result may have fewer than COUNT occurrences.
