# pubky-app-specs Integration

## Overview

Eventky uses `pubky-app-specs` for data validation, URI parsing, and ensuring compliance with Pubky protocol standards. The library is shared between frontend (WASM) and backend (Rust native).

## Installation

### Frontend (TypeScript/WASM)

```bash
npm install pubky-app-specs
```

**Import:**
```typescript
import { 
    parse_uri,
    eventUriBuilder,
    calendarUriBuilder,
    attendeeUriBuilder,
    getValidEventStatuses,
    getValidRsvpStatuses,
    validateTimezone,
    validateColor,
    validateDuration,
    validateGeoCoordinates,
    validateRrule,
    PubkyAppEvent,
    PubkyAppCalendar,
    PubkyAppAttendee,
    type StyledDescription,
} from "pubky-app-specs";

// Or use validation re-exports for convenience
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

### Backend (Rust)

```toml
# Cargo.toml
[dependencies]
pubky-app-specs = { workspace = true }
```

**Import:**
```rust
use pubky_app_specs::{
    PubkyAppEvent, 
    PubkyAppCalendar,
    event_uri_builder,
    calendar_uri_builder,
};
```

## Validation

### Field Validation Functions

The library provides granular validation functions:

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

// Timezone validation (IANA format)
validateTimezone("America/New_York");  // true
validateTimezone("Invalid/Zone");      // false

// Color validation (#RRGGBB)
validateColor("#FF5733");  // true
validateColor("red");      // false

// Duration validation (ISO 8601)
validateDuration("PT1H30M");  // true
validateDuration("invalid");  // false

// Geo coordinates (lat;lon)
validateGeoCoordinates("47.3769;8.5417");  // true
validateGeoCoordinates("invalid");         // false

// RRULE validation
validateRrule("FREQ=WEEKLY;BYDAY=MO,WE,FR");  // true

// Get valid enums
const eventStatuses = getValidEventStatuses();
// ["CONFIRMED", "TENTATIVE", "CANCELLED"]

const rsvpStatuses = getValidRsvpStatuses();
// ["NEEDS-ACTION", "ACCEPTED", "DECLINED", "TENTATIVE"]
```

### Frontend Validation Pattern

```typescript
import { PubkyAppEvent } from "pubky-app-specs";
import { validateTimezone, validateColor } from "@/lib/pubky/validation";

function validateEventForm(data: Partial<PubkyAppEvent>): string[] {
    const errors: string[] = [];
    
    if (!data.summary || data.summary.length < 1 || data.summary.length > 500) {
        errors.push("Summary must be 1-500 characters");
    }
    
    if (data.dtstart_tzid && !validateTimezone(data.dtstart_tzid)) {
        errors.push("Invalid timezone format");
    }
    
    if (data.geo && !validateGeoCoordinates(data.geo)) {
        errors.push("Invalid geo coordinates format (use lat;lon)");
    }
    
    return errors;
}
```

**Common Validations:**
- `uid`: 1-255 characters
- `summary`: 1-500 characters  
- `dtstart`: Valid ISO 8601 datetime
- `status`: One of `["CONFIRMED", "TENTATIVE", "CANCELLED"]`
- `x_pubky_rsvp_access`: Currently only `"PUBLIC"` supported
- `x_pubky_calendar_uris`: Max 10 calendar URIs

## URI Handling

### Building URIs

**Events:**
```typescript
import { eventUriBuilder } from "pubky-app-specs";

const uri = eventUriBuilder(
    "pk1abc...",           // author_id
    "0034B3SX1FQC0"       // event_id
);
// Returns: "pubky://pk1abc.../pub/eventky.app/events/0034B3SX1FQC0"
```

**Calendars:**
```typescript
import { calendarUriBuilder } from "pubky-app-specs";

const uri = calendarUriBuilder(
    "pk1abc...",           // author_id
    "0034B3RE1RTP0"       // calendar_id
);
// Returns: "pubky://pk1abc.../pub/eventky.app/calendars/0034B3RE1RTP0"
```

### Parsing URIs

```typescript
import { parse_uri } from "pubky-app-specs";

const uri = "pubky://pk1abc.../pub/eventky.app/events/0034B3SX1FQC0";
const parsed = parse_uri(uri);

console.log(parsed.user_id);      // "pk1abc..."
console.log(parsed.resource_id);  // "0034B3SX1FQC0"
console.log(parsed.resource);     // { Event: "0034B3SX1FQC0" }
```

**Error Handling:**
```typescript
try {
    const parsed = parse_uri(invalidUri);
} catch (error) {
    console.error("Invalid URI format:", error);
}
```

## Constants & Enums

### Event Statuses

**Frontend:**
```typescript
import { getValidEventStatuses } from "pubky-app-specs";

const statuses = getValidEventStatuses();
// Returns: ["CONFIRMED", "TENTATIVE", "CANCELLED"]

// Use in UI
const statusOptions = statuses.map(status => ({
    value: status,
    label: status.charAt(0) + status.slice(1).toLowerCase()
}));
```

**Backend:**
```rust
// Validation ensures only valid statuses are accepted
match event.status.as_deref() {
    Some("CONFIRMED") => { /* ... */ },
    Some("TENTATIVE") => { /* ... */ },
    Some("CANCELLED") => { /* ... */ },
    None => { /* No status */ },
    _ => { /* Invalid - would fail validation */ }
}
```

## Data Models

### PubkyAppEvent

**Required Fields:**
```typescript
interface PubkyAppEvent {
    uid: string;               // Unique identifier
    dtstamp: number;           // Unix microseconds
    dtstart: string;           // ISO 8601 datetime
    summary: string;           // Event title
}
```

**Optional Fields:**
```typescript
interface PubkyAppEvent {
    // Time & Duration
    dtend?: string;            // ISO 8601 datetime
    duration?: string;         // ISO 8601 duration
    dtstart_tzid?: string;     // IANA timezone
    dtend_tzid?: string;       // IANA timezone
    
    // Details
    description?: string;
    status?: string;           // CONFIRMED | TENTATIVE | CANCELLED
    location?: string;
    geo?: string;              // "lat;lon"
    url?: string;
    
    // Publishing
    image_uri?: string;
    
    // Change Management
    sequence?: number;
    last_modified?: number;    // Unix microseconds
    created?: number;          // Unix microseconds
    
    // Recurrence
    rrule?: string;
    rdate?: string[];
    exdate?: string[];
    recurrence_id?: string;
    
    // Rich Content
    styled_description?: StyledDescription;
    
    // Pubky Extensions
    x_pubky_calendar_uris?: string[];  // Max 10
    x_pubky_rsvp_access?: string;      // Currently "PUBLIC" only
}
```

### PubkyAppCalendar

```typescript
interface PubkyAppCalendar {
    // Required
    name: string;              // 1-100 characters
    timezone: string;          // IANA timezone
    
    // Optional
    description?: string;      // Max 500 characters
    color?: string;            // Hex color (#RRGGBB)
    url?: string;              // Homepage/details link
    image_uri?: string;        // Banner/icon
    
    // Change Management
    sequence?: number;
    last_modified?: number;
    created?: number;
    
    // Pubky Extensions
    x_pubky_authors?: string[]; // Max 10 author user IDs (users who can add events to calendar)
}
```

## Validation Rules

### String Lengths

```typescript
// Events
uid: 1-255 characters
summary: 1-500 characters
description: 0-10,000 characters
location: 0-1,000 characters

// Calendars
name: 1-100 characters
description: 0-500 characters
```

### Format Validation

**Datetime (ISO 8601):**
```typescript
"2025-12-25T18:00:00"          // Valid
"2025-12-25T18:00:00Z"         // Valid
"2025-12-25T18:00:00+01:00"   // Valid
"2025-12-25"                   // Valid (date only)
"12/25/2025"                   // Invalid
```

**Timezone (IANA):**
```typescript
"America/New_York"    // Valid
"Europe/Zurich"       // Valid
"UTC"                 // Valid
"+01:00"              // Invalid (use IANA)
"EST"                 // Invalid (use IANA)
```

**Color (Hex):**
```typescript
"#FF5733"    // Valid
"#000000"    // Valid
"red"        // Invalid
"FF5733"     // Invalid (missing #)
```

**Geo Coordinates:**
```typescript
"47.3769;8.5417"     // Valid (Zurich)
"-33.8688;151.2093"  // Valid (Sydney)
"invalid"            // Invalid
```

## Backend Integration (pubky-nexus)

### Shared Deserialization Utilities

**Location:** `nexus-webapi/src/utils/serde_helpers.rs`

```rust
/// Deserialize comma-separated string to Vec<String>
/// Example: "tag1,tag2,tag3" → vec!["tag1", "tag2", "tag3"]
pub fn deserialize_comma_separated<'de, D>(
    deserializer: D,
) -> Result<Option<Vec<String>>, D::Error>
where
    D: Deserializer<'de>,
{
    let s: Option<String> = Option::deserialize(deserializer)?;
    if let Some(s) = s {
        if s.is_empty() {
            return Err(de::Error::custom("Tags cannot be empty"));
        }
        let tags: Vec<String> = s.split(',')
            .map(|tag| tag.trim().to_string())
            .collect();
        return Ok(Some(tags));
    }
    Ok(None)
}
```

**Usage:**
```rust
use crate::utils::serde_helpers::deserialize_comma_separated;

#[derive(Deserialize)]
pub struct EventStreamQuery {
    #[serde(default, deserialize_with = "deserialize_comma_separated")]
    pub tags: Option<Vec<String>>,
}
```

### Event Model Conversion

```rust
use nexus_common::models::event::EventDetails;
use pubky_app_specs::PubkyAppEvent;

impl EventDetails {
    pub async fn from_homeserver(
        homeserver_event: PubkyAppEvent,
        author_id: &str,
        event_id: &str,
    ) -> Result<Self, DynError> {
        // Parse dtstart to timestamp for efficient date-range queries
        // This converts ISO 8601 datetime + timezone to Unix microseconds
        let dtstart_timestamp = Self::parse_dtstart_to_timestamp(
            &homeserver_event.dtstart,
            homeserver_event.dtstart_tzid.as_deref(),
        );
        
        Ok(EventDetails {
            uri: event_uri_builder(author_id, event_id),
            id: event_id.to_string(),
            indexed_at: Utc::now().timestamp_millis(),
            author: author_id.to_string(),
            
            // Copy all spec fields
            uid: homeserver_event.uid,
            dtstamp: homeserver_event.dtstamp,
            dtstart: homeserver_event.dtstart,
            dtstart_timestamp,
            summary: homeserver_event.summary,
            // ... etc
        })
    }
}
```

## Timezone Handling

### Validation vs. Display Data

**pubky-app-specs provides validation:**
```rust
// In validation.rs
pub fn is_valid_timezone(tz: &str) -> bool {
    // Validates IANA timezone format pattern
    // Allows: UTC, Europe/Zurich, America/New_York, etc.
}
```

**Frontend provides display data:**
```typescript
// In lib/timezones.ts
import { TIMEZONES, getUTCOffset, getUserTimezone } from "@/lib/timezones";

// Comprehensive list of ~70 timezones with regions
const timezone = TIMEZONES.find(tz => tz.value === "Europe/Zurich");
// { value: "Europe/Zurich", label: "Zurich", region: "Europe" }

// Get dynamic UTC offset
const offset = getUTCOffset("Europe/Zurich"); // "GMT+1" or "GMT+2" (DST-aware)

// Get user's current timezone
const userTz = getUserTimezone(); // Uses Intl.DateTimeFormat
```

**Why this split?**
- ✅ **Validation in Rust**: Pattern matching works for any IANA timezone
- ✅ **Display list in TypeScript**: Easy to update, uses `Intl` API for offsets
- ✅ **Single source**: `lib/timezones.ts` used in event creation, filtering, and calendar management
- ✅ **No duplication**: Shared across all frontend components

## Hooks Integration

Eventky uses TanStack Query with optimistic caching. Here's how pubky-app-specs integrates:

### Event Hooks

```typescript
import { useEvent, useEventsStream, useCreateEvent } from "@/hooks";
import type { PubkyAppEvent } from "pubky-app-specs";

// Fetch single event with optimistic caching
function EventDetail({ authorId, eventId }: Props) {
    const { data, syncStatus, isOptimistic } = useEvent(authorId, eventId);
    
    return (
        <div>
            {isOptimistic && <SyncBadge status={syncStatus} />}
            <h1>{data?.summary}</h1>
        </div>
    );
}

// Stream events with filters
function EventsList() {
    const { data, isLoading } = useEventsStream({
        tags: ["meetup"],
        status: "CONFIRMED",
        start_date: Date.now() * 1000,
    });
    
    return <>{data?.map(event => <EventCard key={event.id} event={event} />)}</>;
}

// Create event with optimistic update
function CreateEventForm() {
    const { mutate, isPending } = useCreateEvent();
    
    const handleSubmit = (formData: Partial<PubkyAppEvent>) => {
        mutate({
            uid: `event-${Date.now()}`,
            dtstamp: Date.now() * 1000,
            summary: formData.summary!,
            dtstart: formData.dtstart!,
            // ... other fields
        });
    };
}
```

### Calendar Hooks

```typescript
import { useCalendar, useCalendarsStream, useCreateCalendar } from "@/hooks";
import type { PubkyAppCalendar } from "pubky-app-specs";

// Fetch calendar
function CalendarView({ authorId, calendarId }: Props) {
    const { data } = useCalendar(authorId, calendarId);
    return <h1>{data?.name}</h1>;
}

// Stream user's calendars
function CalendarsList({ userId }: Props) {
    const { data } = useCalendarsStream({ author: userId });
    return <>{data?.map(cal => <CalendarCard key={cal.id} calendar={cal} />)}</>;
}
```

### Available Hooks (from `/hooks/index.ts`)

**Event Hooks:**
- `useEvent(authorId, eventId, options?)` - Fetch single event
- `useEventsStream(params?)` - Stream events with filters
- `usePrefetchEvent(authorId, eventId)` - Prefetch for performance
- `useInvalidateEvents()` - Invalidate cache
- `useSetEventCache(authorId, eventId, data)` - Manual cache updates

**Event Mutations:**
- `useCreateEvent()` - Create with optimistic updates
- `useUpdateEvent()` - Update with optimistic updates
- `useDeleteEvent()` - Delete with cache invalidation

**Calendar Hooks:**
- `useCalendar(authorId, calendarId, options?)` - Fetch single calendar
- `useCalendarsStream(params?)` - Stream calendars with filters
- `usePrefetchCalendar(authorId, calendarId)` - Prefetch
- `useInvalidateCalendars()` - Invalidate cache
- `useSetCalendarCache(authorId, calendarId, data)` - Manual cache updates

**Calendar Mutations:**
- `useCreateCalendar()` - Create with optimistic updates
- `useUpdateCalendar()` - Update with optimistic updates
- `useDeleteCalendar()` - Delete with cache invalidation

**Other Hooks:**
- `useRsvpMutation()` - Manage event RSVPs
- `useTagMutation()` - Tag events
- `useCalendarTagMutation()` - Tag calendars

## Best Practices

### 1. Validate Before Storage

```typescript
import { validateTimezone, validateColor } from "@/lib/pubky/validation";
import type { PubkyAppEvent } from "pubky-app-specs";

async function createEvent(data: Partial<PubkyAppEvent>) {
    // Validate individual fields
    if (data.dtstart_tzid && !validateTimezone(data.dtstart_tzid)) {
        throw new Error("Invalid timezone");
    }
    
    // Use mutation hook
    const { mutate } = useCreateEvent();
    mutate(data as PubkyAppEvent);
}
```

### 2. Use Hooks for Data Fetching

**Don't:** Fetch data directly
```typescript
// ❌ Bad
const response = await fetch(`/api/events/${eventId}`);
const event = await response.json();
```

**Do:** Use hooks with caching
```typescript
// ✅ Good
import { useEvent } from "@/hooks";
const { data: event } = useEvent(authorId, eventId);
```

### 3. Use URI Builders

**Don't:** Manually construct URIs
```typescript
// ❌ Bad
const uri = `pubky://${userId}/pub/eventky.app/events/${eventId}`;
```

**Do:** Use spec builders
```typescript
// ✅ Good
import { eventUriBuilder } from "pubky-app-specs";
const uri = eventUriBuilder(userId, eventId);
```

### 4. Handle Validation Errors Gracefully

```typescript
try {
    const parsed = parse_uri(uri);
    // Use parsed data
} catch (error) {
    // Show user-friendly error
    toast.error("Invalid event link");
    // Log for debugging
    console.error("URI parse error:", error);
}
```

### 5. Use Type Guards

```typescript
function isValidEventStatus(status: string): boolean {
    const validStatuses = getValidEventStatuses();
    return validStatuses.includes(status);
}

// In forms
if (!isValidEventStatus(inputStatus)) {
    setError("Invalid status. Must be CONFIRMED, TENTATIVE, or CANCELLED");
}
```

### 6. Backend Pattern Consistency

Use shared utilities across endpoints:

```rust
// ✅ Good - Shared deserializer
use crate::utils::serde_helpers::deserialize_comma_separated;

#[derive(Deserialize)]
pub struct PostStreamQuery {
    #[serde(default, deserialize_with = "deserialize_comma_separated")]
    pub tags: Option<Vec<String>>,
}

#[derive(Deserialize)]
pub struct EventStreamQuery {
    #[serde(default, deserialize_with = "deserialize_comma_separated")]
    pub tags: Option<Vec<String>>,
}
```

## Testing

### Frontend Tests

```typescript
import { validateTimezone, getValidEventStatuses, eventUriBuilder } from "pubky-app-specs";

describe("Event Validation", () => {
    it("should validate timezone", () => {
        expect(validateTimezone("America/New_York")).toBe(true);
        expect(validateTimezone("Invalid/Zone")).toBe(false);
    });
    
    it("should get valid statuses", () => {
        const statuses = getValidEventStatuses();
        expect(statuses).toContain("CONFIRMED");
        expect(statuses).toContain("TENTATIVE");
        expect(statuses).toContain("CANCELLED");
    });
    
    it("should build URIs correctly", () => {
        const uri = eventUriBuilder("pk1abc", "event123");
        expect(uri).toBe("pubky://pk1abc/pub/eventky.app/events/event123");
    });
});
```

### Backend Tests

```rust
#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_comma_separated_deserializer() {
        let query = serde_urlencoded::from_str::<TestQuery>(
            "tags=dev,free,opensource"
        ).unwrap();
        
        assert_eq!(
            query.tags,
            Some(vec!["dev".to_string(), "free".to_string(), "opensource".to_string()])
        );
    }
}
```

## Version Compatibility

- **pubky-app-specs**: Use latest stable version
- **Breaking changes**: Check CHANGELOG when upgrading
- **WASM compatibility**: Ensure browser support for WASM features

## Troubleshooting

### WASM Import Errors

```typescript
// If you see: "Cannot find module 'pubky-app-specs'"
// Ensure package is installed
npm install pubky-app-specs

// Check package.json
import pkg from "pubky-app-specs/package.json";
console.log("Version:", pkg.version);
```

### Validation Functions Not Working

```typescript
// Check if functions are properly imported
import { validateTimezone } from "pubky-app-specs";
console.log(typeof validateTimezone); // Should be "function"

// Or use re-exports
import { validateTimezone } from "@/lib/pubky/validation";
```

### Hook Not Updating

```typescript
// Make sure you're using hooks from @/hooks
import { useEvent } from "@/hooks"; // ✅ Good
// Not from individual files (unless contributing)

// Check TanStack Query DevTools for cache state
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
<ReactQueryDevtools initialIsOpen={false} />
```

### URI Parsing Fails

```typescript
// Check URI format
const uri = "pubky://user/pub/eventky.app/events/id";
console.log(uri.startsWith("pubky://")); // Must be true
console.log(uri.includes("/pub/eventky.app/")); // Must be true
```

## See Also

- [Event Filtering](./EVENT_FILTERING.md) - Date range and filter implementation
- [Data Model](./DATA_MODEL.md) - Complete schema documentation
- [RFC 5545](https://www.rfc-editor.org/rfc/rfc5545) - iCalendar specification
