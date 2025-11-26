# Event Date/Time Implementation

## RFC 5545 Compliance

Events store datetime as ISO 8601 strings (YYYY-MM-DDTHH:MM:SS) representing **local time** in the event's timezone. No automatic UTC conversion occurs.

### Storage Format

```typescript
{
  dtstart: "2025-11-29T15:00:00",        // Local time
  dtstart_tzid: "America/Denver",        // IANA timezone
  dtend: "2025-11-29T16:00:00",
  dtend_tzid: "America/Denver"
}
```

### Key Principle

Event time represents the local time in the event's timezone, **independent of the user's browser timezone**.

## Implementation Details

### Backend (pubky-app-specs)

#### Event Model (`PubkyAppEvent`)

```rust
pub struct PubkyAppEvent {
    pub uid: String,
    pub dtstamp: i64,                    // Creation timestamp in microseconds
    pub dtstart: String,                 // ISO 8601: "YYYY-MM-DDTHH:MM:SS"
    pub summary: String,
    pub dtend: Option<String>,           // ISO 8601: "YYYY-MM-DDTHH:MM:SS"
    pub duration: Option<String>,        // RFC 5545 duration (PT1H30M)
    pub dtstart_tzid: Option<String>,    // IANA timezone (America/Denver)
    pub dtend_tzid: Option<String>,      // IANA timezone
    // ... other fields
}
```

#### Validation

The `is_valid_datetime()` function validates:
- Correct ISO 8601 format
- Valid year (1000-9999)
- Valid month (1-12)
- Valid day for the month (including leap years)
- Valid hour (0-23)
- Valid minute (0-59)
- Valid second (0-59)

The `is_valid_timezone()` function validates:
- IANA timezone format (e.g., "America/New_York")
- Special cases: "UTC", "UTC+5", "UTC-3"

### Frontend (TypeScript)

#### Date Conversion (`event-utils.ts`)

**Format Date to ISO (No Conversion)**
```typescript
function formatDateToISO(date: Date): string {
    // Takes components directly from Date object
    // Returns "YYYY-MM-DDTHH:MM:SS"
    // NO timezone conversion happens
}
```

**Parse ISO to Date**
```typescript
function parseISOToDate(isoString: string): Date {
    // Parses components manually
    // Creates Date in browser's local timezone
    // Used for display purposes only
}
```

#### Form Data Conversion

**UI → WASM (formDataToEventData)**
- Takes `Date` objects from form
- Converts to ISO strings using `formatDateToISO()`
- Stores timezone separately
- **Result**: Event stored with local time + timezone

**WASM → UI (eventToFormData)**
- Takes ISO strings from event
- Parses to `Date` objects using `parseISOToDate()`
- Used for editing existing events

## User Experience

### Creating an Event

1. User selects date/time in datetime picker
2. User selects event timezone (e.g., "America/Denver")
3. On submit:
   - Selected date/time is converted to ISO string
   - Timezone is stored separately
   - **No conversion based on browser timezone**

### Viewing an Event

Events will be displayed with:
1. **Event Local Time**: The actual event time in its timezone
2. **User's Local Time**: Converted to user's browser timezone (for convenience)

Example Display:
```
Team Meeting
Starts: Nov 29, 2025, 10:00 PM MST (America/Denver)
Your time: Nov 30, 2025, 12:00 AM EST (if you're in America/New_York)
```

## Testing

### Test Scenarios

1. **Same Timezone**
   - Browser: America/Denver
   - Event: America/Denver, 10:00 PM
   - Expected: Event stored as "22:00:00" with America/Denver timezone

2. **Different Timezone**
   - Browser: UTC+5
   - Event: America/Denver (UTC-7), 10:00 PM
   - Expected: Event stored as "22:00:00" with America/Denver timezone
   - Display should show 10:00 PM Denver time and converted time in UTC+5

3. **Cross-Day Events**
   - Browser: UTC+0
   - Event: America/Los_Angeles (UTC-8), 11:00 PM Nov 29
   - Expected: Event stored as "23:00:00" on Nov 29 with America/Los_Angeles
   - UTC display would show Nov 30, 7:00 AM
## Best Practices

### For Developers

1. **Never do manual timezone conversion** - Let the utilities handle it
2. **Always store timezone with event** - Required for proper display
3. **Use IANA timezone identifiers** - Not offsets or abbreviations
4. **Test across timezones** - Especially edge cases like DST transitions

### For UI Components

1. **DateTime Picker**: Should show time "as-is" without conversion
2. **Timezone Selector**: Required field for all events
3. **Event Display**: Show both event time and user's local time
4. **Validation**: Check for valid ISO format and timezone before submit

## References

- RFC 5545 (iCalendar): https://tools.ietf.org/html/rfc5545
- ISO 8601 (Date/Time Format): https://en.wikipedia.org/wiki/ISO_8601
- IANA Timezone Database: https://www.iana.org/time-zones
- Intl.DateTimeFormat API: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat
