---
name: event-calendar
description: Create, modify, or debug event and calendar features in Eventky. Use when working with PubkyAppEvent, PubkyAppCalendar, PubkyAppAttendee models, recurring events, RRULE handling, timezone management, or RSVP flows.
---

# Event & Calendar Development Guide

## Data Model Quick Reference

### Calendar
```json
{
  "name": "string (1-100 chars, required)",
  "timezone": "IANA timezone e.g. Europe/Zurich (required)",
  "color": "#RRGGBB hex (optional)",
  "description": "max 10000 chars (optional)",
  "image_uri": "pubky:// or https (optional)",
  "url": "valid URL (optional)",
  "created": "Unix microseconds (optional)",
  "sequence": "integer, increment on edit (optional)",
  "last_modified": "Unix microseconds (optional)",
  "x_pubky_authors": ["pubky:// URIs, max 20 (optional)"]
}
```
URI: `/pub/eventky.app/calendars/:timestamp_id`

### Event
Key fields and rules:
- `uid` — Globally unique ID, 1-255 chars (required)
- `dtstamp` — Creation timestamp, Unix microseconds (required)
- `dtstart` — ISO 8601: "2026-01-22T18:30:30" NOT Unix timestamp (required)
- `summary` — Event title, 1-500 chars (required)
- `dtend` and `duration` are MUTUALLY EXCLUSIVE
- `duration` uses RFC 5545 format: "PT1H30M" for 1 hour 30 minutes
- `dtstart_tzid` / `dtend_tzid` — IANA timezone IDs (optional)
- `status`: CONFIRMED | TENTATIVE | CANCELLED (uppercase only)
- `locations` — Array, max 5, each with `location_type`: PHYSICAL | ONLINE
- `rrule` — RFC 5545 recurrence: "FREQ=MONTHLY;COUNT=12"
- `rdate` — Additional one-off occurrence dates (ISO 8601)
- `exdate` — Dates excluded from recurrence pattern (ISO 8601)
- `recurrence_id` — ISO 8601 datetime for specific instance override
- `styled_description` — Rich text with `content`, `format`, `attachments`
- `x_pubky_calendar_uris` — Max 10 calendar URIs
- `x_pubky_rsvp_access` — Currently only "PUBLIC"

URI: `/pub/eventky.app/events/:timestamp_id`

### Attendee (RSVP)
- `partstat`: NEEDS-ACTION | ACCEPTED | DECLINED | TENTATIVE (required)
- `created_at`: Unix microseconds (required)
- `x_pubky_event_uri`: Full pubky event URI (required)
- `recurrence_id`: ISO 8601 for instance-specific RSVP (optional)
- `attendee_id` = Hash ID from `x_pubky_event_uri` + optional `recurrence_id`
- Global RSVP (no recurrence_id) = applies to entire series
- Instance RSVP (with recurrence_id) = overrides global for that instance

URI: `/pub/eventky.app/attendees/:hash_id`

## Write Flow
1. Validate with WASM (pubky-app-specs)
2. Write to homeserver via `lib/pubky/`
3. Optimistically update cache via `lib/cache/`
4. Nexus watcher eventually indexes it

## Read Flow
1. Query Nexus REST API via `lib/nexus/`
2. TanStack Query manages caching + refetching
3. Combine with optimistic cache for pending writes

## Timezone Handling
- Store timezone as IANA ID (dtstart_tzid / dtend_tzid)
- Display times in user's local timezone
- See `lib/datetime/` for conversion utilities
- See @docs/DATETIME.md for full strategy

## Recurring Events
- See @docs/RECURRENCE.md for the full recurrence strategy
- RRULE parsing and expansion happens client-side
- Use `rdate` for additional one-off occurrences
- Use `exdate` to exclude specific dates from the pattern
- Use `recurrence_id` on attendee RSVPs for instance-specific responses
