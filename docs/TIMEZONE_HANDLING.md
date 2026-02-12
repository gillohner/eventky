# Timezone Handling

## Overview
This document describes how timezone handling works in the event calendar system. The implementation follows RFC 5545 (iCalendar specification) to ensure accurate event timing across all timezones worldwide.

---

## Core Principles

### Wall-Clock Time Preservation
Recurring events maintain their wall-clock time in the event's timezone, even when crossing DST boundaries.

**Example:**
- A weekly meeting at 10:00 AM in New York stays at 10:00 AM
- When DST transitions occur, the UTC offset changes but the local time remains constant
- This matches user expectations and RFC 5545 requirements

### Timezone-Aware Date Arithmetic
When calculating recurring events, intervals are added in the event's timezone, not in UTC.

**Why this matters:**
- Adding "1 week" means "same time next week in the local timezone"
- UTC-based arithmetic would cause events to shift during DST transitions
- Our implementation ensures consistent wall-clock times year-round

---

## Implementation

### Timezone-Aware Functions

Located in `/lib/pubky/rrule-utils.ts`:

```typescript
// Add intervals while maintaining wall-clock time
addDaysInTimezone(date, days, timezone)
addWeeksInTimezone(date, weeks, timezone)
addMonthsInTimezone(date, months, timezone)
addYearsInTimezone(date, years, timezone)
```

**How they work:**
1. Extract wall-clock time components in the timezone
2. Add the interval to the date components
3. Parse the result back in the timezone to get a Date object

**Example:**
```typescript
// Event at 10:00 AM EST on March 2, 2026
const date = parseIsoInTimezone("2026-03-02T10:00:00", "America/New_York");

// Add 1 week (crossing DST boundary on March 9)
const nextWeek = addWeeksInTimezone(date, 1, "America/New_York");

// Result: March 9 at 10:00 AM EDT (not 11:00 AM)
// Wall-clock time is preserved despite UTC offset change
```

### Recurring Event Calculation

The `calculateNextOccurrences()` function generates event instances based on RRULE specifications:

```typescript
calculateNextOccurrences({
    rrule: "FREQ=WEEKLY;COUNT=4",
    dtstart: "2026-01-20T09:00:00",
    dtstartTzid: "Europe/Berlin",
    maxCount: 4
})
// Returns: ["2026-01-20T09:00:00", "2026-01-27T09:00:00", ...]
```

**Supported frequencies:**
- `DAILY` - Daily recurrence
- `WEEKLY` - Weekly recurrence (with optional BYDAY)
- `MONTHLY` - Monthly recurrence (with BYMONTHDAY or BYSETPOS)
- `YEARLY` - Yearly recurrence

**Advanced features:**
- `BYDAY` - Specify days of week (e.g., "MO,WE,FR")
- `BYMONTHDAY` - Specify day of month (e.g., "21" or "-1" for last day)
- `BYSETPOS` - Specify position (e.g., "-1" with BYDAY for "last Thursday")
- `COUNT` - Limit number of occurrences
- `UNTIL` - End date for recurrence
- `INTERVAL` - Interval between occurrences

---

## Timezone Coverage

### Complete IANA Support
The system supports all **419 IANA timezones** via `/lib/timezones.ts`.

**How it's generated:**
```bash
npx tsx scripts/generate-timezones.ts > lib/timezones.ts
```

This uses `Intl.supportedValuesOf('timeZone')` to get all browser-supported timezones.

### Organized by Region
Timezones are categorized into 15 regions:
- Africa
- Antarctica
- Arctic
- Asia
- Atlantic
- Australia
- Caribbean
- Central America
- Europe
- Global (UTC)
- Indian Ocean
- Middle East
- North America
- Pacific
- South America

### Edge Cases Supported

**Unusual UTC Offsets:**
- Asia/Kathmandu: UTC+5:45 (Nepal)
- Asia/Kolkata: UTC+5:30 (India)
- Pacific/Chatham: UTC+12:45/+13:45 (Chatham Islands)

**Unusual DST Behaviors:**
- Australia/Lord_Howe: 30-minute DST shift (not 1 hour)
- Africa/Casablanca: DST suspended during Ramadan
- America/Phoenix: No DST observance

**Geographic Edge Cases:**
- Pacific/Apia: West of International Date Line (UTC+13)
- Southern Hemisphere: DST in opposite season (Oct-Apr)

---

## Usage in Components

### Parsing Event Times

Always use timezone-aware parsing:

```typescript
import { parseIsoInTimezone, parseIsoDateTime } from "@/lib/datetime";

// With timezone (preferred for events)
const eventDate = event.dtstartTzid
    ? parseIsoInTimezone(event.dtstart, event.dtstartTzid)
    : parseIsoDateTime(event.dtstart);
```

**Do NOT use:**
- `new Date(isoString)` - Treats as UTC or local, unpredictable
- `parseISO(isoString)` - Doesn't account for event timezone

### Displaying Times

Use the `formatDateTime` helper:

```typescript
import { formatDateTime, getLocalTimezone } from "@/lib/datetime";

const formatted = formatDateTime(
    event.dtstart,
    getLocalTimezone(),
    event.dtstartTzid,
    { includeWeekday: true }
);
// Returns: { date: "Mon, Jan 20", time: "9:00 AM", timezone: "CET" }
```

### Calendar Views

Events are grouped by date in their **event timezone**:

```typescript
// Parse in event timezone for accurate day grouping
const eventDate = event.dtstartTzid
    ? parseIsoInTimezone(event.dtstart, event.dtstartTzid)
    : parseIsoDateTime(event.dtstart);

const dateKey = format(eventDate, "yyyy-MM-dd");
```

This ensures events appear on the correct day regardless of the viewer's timezone.

### Date Comparisons

For past/future detection, always parse with timezone:

```typescript
const eventDate = event.dtstartTzid
    ? parseIsoInTimezone(event.dtstart, event.dtstartTzid)
    : parseIsoDateTime(event.dtstart);

const isPast = eventDate < new Date();
```

---

## RFC 5545 Compliance

The implementation follows these RFC 5545 requirements:

✅ **DTSTART with TZID** - Event start time respects timezone parameter
✅ **RRULE Processing** - Recurring events generated correctly
✅ **Wall-Clock Time** - Times preserved across DST transitions
✅ **RDATE/EXDATE** - Additional and excluded dates handled
✅ **COUNT vs UNTIL** - Recurrence limits work as specified
✅ **BYDAY, BYMONTHDAY, BYSETPOS** - Advanced recurrence rules supported

### RFC 5545 References
- [Section 3.3.5](https://datatracker.ietf.org/doc/html/rfc5545#section-3.3.5) - DATE-TIME format
- [Section 3.8.5](https://datatracker.ietf.org/doc/html/rfc5545#section-3.8.5) - Recurrence rules
- [Section 3.2.19](https://datatracker.ietf.org/doc/html/rfc5545#section-3.2.19) - TZID parameter

---

## Testing

### Test Coverage
The system has **263 tests** covering:
- Basic timezone parsing and formatting
- Recurring event calculation
- DST transitions (spring and fall)
- Unusual timezone behaviors
- Calendar view grouping
- Duration calculations
- Date range filtering

### Test Files
- `/lib/__tests__/timezone-integration.test.ts` - 24 integration tests
- `/lib/__tests__/timezone-dst-verification.test.ts` - 3 DST tests
- `/lib/__tests__/timezone-edge-cases.test.ts` - 8 edge case tests

### Running Tests
```bash
# All tests
npm test

# Timezone tests only
npm test -- timezone

# Specific test file
npm test -- timezone-dst-verification.test.ts
```

### DST Verification
Tests verify wall-clock time is maintained across DST transitions:

```typescript
// Weekly event at 10:00 AM crossing spring DST
expect(occurrences[0]).toBe("2026-03-02T10:00:00"); // Before DST (EST)
expect(occurrences[1]).toBe("2026-03-09T10:00:00"); // After DST (EDT)
// Wall-clock time stays at 10:00 AM
```

### Edge Case Coverage
Tests include unusual timezones to ensure global compatibility:
- Lord Howe Island (30-min DST)
- Nepal (45-min offset)
- Chatham Islands (45-min offset + DST)
- Morocco (Ramadan DST suspension)
- Arizona (no DST)
- Southern Hemisphere DST

---

## API Response Format

### Event Stream Response
```typescript
interface NexusEventStreamItem {
    dtstart: string;           // ISO 8601 datetime (e.g., "2026-01-20T09:00:00")
    dtstart_tzid?: string;     // IANA timezone (e.g., "Europe/Berlin")
    dtend?: string;            // End datetime (optional)
    dtend_tzid?: string;       // End timezone (optional)
    duration?: string;         // ISO 8601 duration (e.g., "PT1H30M")
    rrule?: string;            // Recurrence rule (e.g., "FREQ=WEEKLY;COUNT=4")
    rdate?: string[];          // Additional dates
    exdate?: string[];         // Excluded dates
    // ... other fields
}
```

### Timezone Fields
- **dtstart_tzid**: Event's timezone (where it's "happening")
- **Local timezone**: Viewer's timezone (for display)
- **UTC**: Universal time (for storage and calculations)

---

## Common Patterns

### Creating an Event
```typescript
// Store event in its local timezone
const event = {
    dtstart: "2026-01-20T09:00:00",
    dtstart_tzid: "Europe/Berlin",
    duration: "PT1H30M",  // 1 hour 30 minutes
    rrule: "FREQ=WEEKLY;COUNT=4"
};
```

### Displaying an Event
```typescript
// Parse in event timezone
const eventTime = parseIsoInTimezone(
    event.dtstart,
    event.dtstart_tzid || getLocalTimezone()
);

// Format for display in viewer's timezone
const display = formatDateTime(
    event.dtstart,
    getLocalTimezone(),
    event.dtstartTzid
);
```

### Calculating Duration
```typescript
import { parseDuration, parseIsoInTimezone } from "@/lib/datetime";

const startDate = parseIsoInTimezone(event.dtstart, event.dtstartTzid);
const durationMs = parseDuration(event.duration);
const endDate = new Date(startDate.getTime() + durationMs);
```

### Filtering by Date Range
```typescript
// Parse event in its timezone for accurate comparison
const eventDate = event.dtstartTzid
    ? parseIsoInTimezone(event.dtstart, event.dtstartTzid)
    : parseIsoDateTime(event.dtstart);

const inRange = eventDate >= rangeStart && eventDate <= rangeEnd;
```

---

## Performance Considerations

### Timezone Calculations
- Uses native `Intl.DateTimeFormat` API (browser-optimized)
- No external timezone libraries required
- Timezone data cached by browser

### Recurring Events
- Generates occurrences on-demand (not pre-computed)
- Configurable `maxCount` to limit iterations
- Prevents infinite loops with iteration limits

### Component Optimization
- `useMemo` for expensive calculations
- Timezone selector supports search (handles 419 options)
- Calendar views group events by date for efficient rendering

---

## Troubleshooting

### Event Shows on Wrong Day
**Cause:** Event parsed without timezone
**Fix:** Always use `parseIsoInTimezone` with event's timezone

### Recurring Event Shifts After DST
**Cause:** Using UTC-based date arithmetic
**Fix:** Use `addWeeksInTimezone` functions, not `addWeeks`

### Timezone Not Found
**Cause:** Invalid IANA timezone identifier
**Fix:** Use `isSupportedTimezone()` to validate, default to UTC

### Duration Calculation Wrong
**Cause:** Adding duration without timezone context
**Fix:** Parse start date in event timezone before adding duration

---

## Related Documentation
- [RFC 5545 - iCalendar Specification](https://datatracker.ietf.org/doc/html/rfc5545)
- [IANA Time Zone Database](https://www.iana.org/time-zones)
- [MDN - Intl.DateTimeFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat)
- [MDN - Intl.supportedValuesOf](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/supportedValuesOf)
