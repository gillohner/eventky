# Date/Time Handling

RFC 5545 compliant. Dates stored as ISO strings with separate timezone field.

## Storage Format

```typescript
{
  dtstart: "2025-11-29T15:00:00",  // Local time (no Z suffix)
  dtstart_tzid: "America/Denver",  // IANA timezone
  dtend: "2025-11-29T16:00:00",
  duration: "PT1H"                  // Alternative to dtend
}
```

## Key Rule

**Never convert to UTC.** Store the time as the user entered it + timezone.

## Key Files

| File                            | Purpose                          |
| ------------------------------- | -------------------------------- |
| `lib/datetime/format.ts`        | Parse/format ISO strings         |
| `lib/datetime/duration.ts`      | RFC 5545 duration (PT1H30M)      |
| `lib/datetime/rrule-display.ts` | Human-readable recurrence labels |
| `lib/pubky/event-utils.ts`      | Form ↔ Event conversion          |

## Recurrence

Basic RRULE support:

- `FREQ`: DAILY, WEEKLY, MONTHLY, YEARLY
- `INTERVAL`: Every N periods
- `COUNT` / `UNTIL`: End conditions
- `RDATE`: Additional dates
- `EXDATE`: Excluded dates

No per-instance overrides (out of scope).
