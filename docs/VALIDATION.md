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
| `description`     |          | Max 500 characters      |
| `color`           |          | Hex (#RRGGBB)           |
| `x_pubky_authors` |          | Max 10 user IDs         |

### PubkyAppAttendee

| Field              | Required | Validation                                    |
| ------------------ | -------- | --------------------------------------------- |
| `x_pubky_event_uri`| ✓        | Valid event URI                               |
| `partstat`         | ✓        | NEEDS-ACTION, ACCEPTED, DECLINED, TENTATIVE   |
| `recurrence_id`    |          | ISO datetime (for specific instance)          |

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
