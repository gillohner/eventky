# Event Rendering

Expected behavior for displaying events across calendar views, including recurring event expansion and progressive loading.

## Overview

Eventky renders events in multiple views (month, week, agenda) with smart handling of recurring events, date ranges, and performance optimization through progressive loading.

## Date Range Behavior

### Month View
- Displays events within the visible month
- Shows all-day events at the top
- Time-based events in grid cells
- No progressive loading (single month scope)

### Week View
- Displays events for the current week (Sunday-Saturday)
- Hour-by-hour timeline layout
- Shows event duration visually
- No progressive loading (single week scope)

### Agenda View
- **Initial Range**: 365 days (1 year) from current date
- **Progressive Loading**: Load More button adds 1 additional year
- **Maximum Range**: 3 years total
- **Default Filter**: On `/events` page without explicit filters, shows upcoming events only (today + 365 days)

## Recurring Event Expansion

### Generation Limits
- **Date Range**: Events generated up to 1 year (365 days) ahead from view start date
- **Occurrence Limit**: Maximum 1000 occurrences per recurring event
- **Whichever comes first**: Generation stops at 1 year OR 1000 occurrences

### Indefinite Recurrence Indicator
Events without `COUNT` or `UNTIL` are marked as indefinite:
- **Symbol**: Infinity symbol (∞) displayed in UI
- **Tooltip**: "Event repeats indefinitely" explanation
- **Locations**:
  - Recurrence rule labels (e.g., "Weekly on Mon, Wed, Fri ∞")
  - Event creation preview
  - Occurrence selectors

### Occurrence Display

#### Event Detail Page
- **Initial Display**: 50 occurrences
- **Progressive Loading**: Load More button adds 50 more occurrences at a time
- **Maximum Display**: 1000 occurrences (1 year limit)
- **Current Instance**: Selected instance highlighted and scrolled into view
- **Navigation**: Previous/Next buttons for moving between occurrences

#### Calendar Views
- **Occurrences as Separate Events**: Each occurrence rendered independently
- **Date-Aware Filtering**: Only occurrences within view's date range displayed
- **Instance Selection**: Clicking occurrence navigates to detail page with `?instance=` query param

## User Attendance Display

### Per-Instance RSVPs
- **Color-Coded Occurrence Chips**:
  - Green border: User accepted this instance
  - Red border: User declined this instance
  - Yellow border: User is tentative for this instance
  - Default (blue): No response or needs action

### General Event RSVPs
- RSVP without `recurrence_id` applies to all instances
- Instance-specific RSVPs override general RSVP for that date
- User can accept general event but decline specific instances

## Navigation & URL State

### Query Parameters
- `view`: Calendar view mode (`month` | `week` | `agenda`)
- `date`: Currently displayed date (ISO format `yyyy-MM-dd`)
- `instance`: For recurring events, specific occurrence date (ISO datetime)

### URL Updates
- View mode and date changes update URL
- Back/forward navigation works correctly
- Shareable URLs for specific dates/instances

### Deep Linking
- `/event/:authorId/:eventId` - Event detail (first/next occurrence for recurring)
- `/event/:authorId/:eventId?instance=2025-06-15T10:00:00Z` - Specific occurrence

## Timezone Handling

### Display Modes
- **Event Timezone**: Show times in event's original timezone (if set)
- **Local Timezone**: Convert all times to user's local timezone
- **Toggle**: Only shown if event has timezone AND it differs from local

### Occurrence Generation
- All occurrences generated in event's original timezone
- RRULE expansion respects `DTSTARTTZID` for DST transitions
- Display converted to selected timezone mode

## Performance Optimizations

### Backend Filtering
- Recurring events returned by backend regardless of date range
- Frontend filters occurrences to match view's date range
- Prevents duplicate events from backend

### Frontend Expansion
- Occurrences generated on-demand per view
- Memoized to prevent recalculation on re-renders
- Limited to visible date range + buffer

### Progressive Loading
- Manual Load More buttons (no infinite scroll)
- User-controlled data fetching
- Clear indication of total range displayed

## Formatting & Localization

### Date Display
- **Event cards**: "Mon, Jan 15, 2025"
- **Agenda headers**: "Monday, January 15, 2025"
- **Month view**: Day number only
- **Occurrence chips**: "Mon, Jan 15, 2025 at 10:00"

### Time Format
- All times displayed in 24-hour format
- Consistent across all views

### Recurrence Labels
- Human-readable RRULE parsing
- Examples:
  - `FREQ=DAILY` → "Daily"
  - `FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE,FR` → "Every 2 weeks on Mon, Wed, Fri"
  - `FREQ=MONTHLY;BYMONTHDAY=21` → "Monthly on day 21"
  - `FREQ=YEARLY;COUNT=5` → "Yearly (5 times)"
  - `FREQ=WEEKLY` (no COUNT/UNTIL) → "Weekly ∞"

## Key Files

- `hooks/use-calendar-view.ts` - Date range calculation, occurrence expansion, calendar filtering
- `lib/datetime/rrule-display.ts` - RRULE parsing, indefinite recurrence detection, label formatting
- `components/event/detail/datetime-recurrence.tsx` - Occurrence selector with progressive loading
- `components/calendar/calendar-view/calendar-agenda-view.tsx` - Agenda view with Load More
- `app/events/page.tsx` - Default 365-day filter for agenda view

## Examples

### Indefinite Weekly Event
**RRULE**: `FREQ=WEEKLY;BYDAY=TU,TH`
**Label**: "Weekly on Tue, Thu ∞"
**Display**: Shows 52 occurrences (1 year), Load More available
**Tooltip**: "Event repeats indefinitely"

### Monthly Event with End Date
**RRULE**: `FREQ=MONTHLY;BYMONTHDAY=15;UNTIL=20251231`
**Label**: "Monthly on day 15 until Dec 31, 2025"
**Display**: Shows 12 occurrences, no Load More (end reached)
**Tooltip**: None (finite recurrence)

### Yearly Event with Count
**RRULE**: `FREQ=YEARLY;COUNT=3`
**Label**: "Yearly (3 times)"
**Display**: Shows 3 occurrences total
**Tooltip**: None (finite recurrence)

### User Attending Some Instances
**General RSVP**: Accepted
**Instance-specific**: Declined 2nd occurrence (June 15)
**Display**: 
- First occurrence: Green border (accepted)
- June 15 occurrence: Red border (declined, overrides general)
- Other occurrences: Green border (general acceptance applies)
