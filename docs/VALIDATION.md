# Validation (pubky-app-specs)

Eventky uses `pubky-app-specs` for data validation and URI handling.

## Field Validation

```typescript
import { 
    validateTimezone,
    validateColor,
    validateDuration,
    validateGeoCoordinates,
    validateRrule,
    getValidEventStatuses,
    getValidRsvpStatuses,
} from "pubky-app-specs";

validateTimezone("America/New_York");     // true
validateColor("#FF5733");                 // true
validateDuration("PT1H30M");              // true
validateGeoCoordinates("47.3769;8.5417"); // true
validateRrule("FREQ=WEEKLY;BYDAY=MO");    // true

getValidEventStatuses();  // ["CONFIRMED", "TENTATIVE", "CANCELLED"]
getValidRsvpStatuses();   // ["NEEDS-ACTION", "ACCEPTED", "DECLINED", "TENTATIVE"]
```

## URI Handling

### Building URIs

```typescript
import { eventUriBuilder, calendarUriBuilder, attendeeUriBuilder } from "pubky-app-specs";

eventUriBuilder("pk1abc...", "0034B3SX1FQC0");
// "pubky://pk1abc.../pub/eventky.app/events/0034B3SX1FQC0"

calendarUriBuilder("pk1abc...", "0034B3RE1RTP0");
// "pubky://pk1abc.../pub/eventky.app/calendars/0034B3RE1RTP0"
```

### Parsing URIs

```typescript
import { parse_uri } from "pubky-app-specs";

const parsed = parse_uri("pubky://pk1abc.../pub/eventky.app/events/0034B3SX1FQC0");
// parsed.user_id → "pk1abc..."
// parsed.resource_id → "0034B3SX1FQC0"
```

## Data Models

### PubkyAppEvent

| Field                   | Required | Validation                           |
| ----------------------- | -------- | ------------------------------------ |
| `uid`                   | ✓        | 1-255 characters                     |
| `dtstamp`               | ✓        | Unix microseconds                    |
| `dtstart`               | ✓        | ISO 8601 datetime                    |
| `summary`               | ✓        | 1-500 characters                     |
| `dtend`                 |          | ISO 8601 datetime                    |
| `duration`              |          | ISO 8601 duration (PT1H30M)          |
| `dtstart_tzid`          |          | IANA timezone                        |
| `status`                |          | CONFIRMED, TENTATIVE, CANCELLED      |
| `location`              |          | Max 500 characters                   |
| `geo`                   |          | "lat;lon" format                     |
| `rrule`                 |          | RFC 5545 RRULE                       |
| `x_pubky_calendar_uris` |          | Max 10 calendar URIs                 |
| `x_pubky_rsvp_access`   |          | "PUBLIC" only                        |

### PubkyAppCalendar

| Field             | Required | Validation              |
| ----------------- | -------- | ----------------------- |
| `name`            | ✓        | 1-100 characters        |
| `timezone`        | ✓        | IANA timezone           |
| `description`     |          | Max 10,000 characters   |
| `color`           |          | Hex (#RRGGBB)           |
| `x_pubky_authors` |          | Max 20 user IDs         |

### PubkyAppAttendee

| Field              | Required | Validation                                    |
| ------------------ | -------- | --------------------------------------------- |
| `x_pubky_event_uri`| ✓        | Valid event URI                               |
| `partstat`         | ✓        | NEEDS-ACTION, ACCEPTED, DECLINED, TENTATIVE   |
| `recurrence_id`    |          | ISO datetime (for specific instance)          |

## RSVP Instance Handling

### General vs Instance-Specific RSVPs

**General RSVP** (applies to all occurrences):
- `recurrence_id` is `null` or omitted
- Acts as default for all instances
- Example: User accepts entire recurring event series

**Instance-Specific RSVP** (overrides general):
- `recurrence_id` is set to specific ISO datetime (e.g., `"2025-01-15T10:00:00"`)
- Takes precedence over general RSVP for that instance
- Example: User declines one occurrence but accepts the series

### Priority Rules

When determining RSVP status for a specific instance:
1. **Instance-specific RSVP** (with matching `recurrence_id`) - **Highest priority**
2. **General RSVP** (without `recurrence_id`) - **Fallback**
3. **No RSVP** - User has not responded

### UI Behavior

- **Only valid RSVPs are shown**: If a user RSVPs to a `recurrence_id` that doesn't match any actual occurrence (e.g., due to event edits or invalid date), the RSVP won't be displayed in the UI
- **Instance filtering**: UI only shows RSVPs for the rendered instance based on the event's current RRULE expansion
- **Orphaned RSVPs**: If an event's recurrence pattern changes, previous instance-specific RSVPs may become invalid and hidden

## Spam Prevention & Data Sanity

### Current Limitations

**No Web of Trust**: Eventky MVP does not implement a web-of-trust or reputation systems. Any authenticated user can:
- Create unlimited events
- RSVP to any public event
- Create unlimited tags

**Reliance on Future Nexus Expansion**: Spam prevention will be handled at the Nexus indexer level, similar to how `pubky.app` will implement moderation.

### Basic Sanity Checks (pubky-app-specs)

Current validation enforces:
- **Field length limits**: `summary` (500 chars), `location` (500 chars), etc.
- **Date format validation**: ISO 8601 datetime strings
- **Timezone validation**: IANA timezone database
- **RRULE syntax**: RFC 5545 compliant recurrence rules
- **Max array sizes**: 10 calendars per event, 10 authors per calendar

### Known Attack Vectors (Unmitigated in MVP)

| Attack | Current State | Future Mitigation |
|--------|---------------|-------------------|
| Thousands of fake RSVPs | ❌ Not prevented | Nexus trust graphs, rate limiting |
| Events with dates in year 3000 | ❌ Allowed (valid ISO) | UI filtering, Nexus date range limits |
| Spam event creation | ❌ Not prevented | Nexus reputation scoring |
| Malicious recurrence rules | ⚠️ Partial (RRULE syntax validated) | Frontend expansion limits (maxCount) |
| Orphaned RSVPs (event deleted) | ⚠️ RSVPs remain, UI hides | Nexus garbage collection |

### Recommended Client-Side Protections

Until Nexus implements trust/moderation:
- **Date range filtering**: UI limits displayed events to reasonable timeframe
- **RRULE expansion limits**: Frontend enforces `maxCount` when expanding recurrences

## Convenience Re-exports

```typescript
// lib/pubky/validation.ts re-exports for cleaner imports
import {
    validateTimezone,
    validateGeoCoordinates,
    validateRrule,
    validateColor,
    validateDuration,
    getValidEventStatuses,
    getValidRsvpStatuses,
} from "@/lib/pubky/validation";
```

## Key Files

| File                      | Purpose                           |
| ------------------------- | --------------------------------- |
| `lib/pubky/validation.ts` | Re-exports validation functions   |
| `lib/pubky/event-utils.ts`| Form ↔ Event conversion           |
| `lib/pubky/client.ts`     | Pubky SDK wrapper                 |
