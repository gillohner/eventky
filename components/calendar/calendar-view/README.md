# Calendar View Components

A comprehensive calendar view component system with multiple view modes for displaying events.

## Architecture

The calendar view follows the project's architectural patterns:

- **Types**: `/types/calendar-view.ts` - TypeScript interfaces and type definitions
- **Hook**: `/hooks/use-calendar-view.ts` - State management logic
- **Components**: `/components/calendar/calendar-view/` - UI components

This separation ensures:
- Types are centrally exported from `/types`
- Business logic is in `/hooks` and can be reused
- UI components are self-contained and focused on rendering

## Features

- **Three View Modes**:
  - **Month View**: Traditional calendar grid showing events in day cells
  - **Week View**: Column-based layout showing events by day of the week
  - **Agenda View**: Chronological list of events grouped by date

- **Mobile-First Design**:
  - Agenda view default on mobile devices
  - Month/Week views available on tablets and desktop
  - Responsive layouts with proper touch targets

- **Calendar Filtering**:
  - Multi-select calendar filtering
  - Color-coded calendar badges
  - Select/deselect all calendars

- **Navigation Controls**:
  - Previous/Next period navigation
  - Jump to Today
  - Period label shows current month/week

## Usage

### Basic Usage

```tsx
import { useEventsStream } from "@/hooks";
import { CalendarView } from "@/components/calendar/calendar-view";

export default function MyPage() {
    const { data: events } = useEventsStream();
    
    return <CalendarView events={events || []} />;
}
```

### With Calendar Filtering

```tsx
import { useEventsStream } from "@/hooks";
import { CalendarView } from "@/components/calendar/calendar-view";
import type { CalendarFilterOption } from "@/types";

export default function MyPage() {
    const { data: events } = useEventsStream();
    
    const calendars: CalendarFilterOption[] = [
        { id: "cal1", name: "Work", color: "#3b82f6" },
        { id: "cal2", name: "Personal", color: "#10b981" },
    ];
    
    return (
        <CalendarView
            events={events || []}
            calendars={calendars}
            initialSelectedCalendars={["cal1"]}
        />
    );
}
```

### Using the Hook Directly

```tsx
import { useEventsStream, useCalendarView } from "@/hooks";
import type { CalendarFilterOption } from "@/types";

export default function MyCustomCalendar() {
    const { data: events } = useEventsStream();
    
    const calendars: CalendarFilterOption[] = [
        { id: "1", name: "Work", color: "#3b82f6" },
    ];
    
    const {
        calendarEvents,
        viewMode,
        setViewMode,
        goToNext,
        goToPrevious,
        currentDate,
    } = useCalendarView(events || [], {
        calendars,
        initialViewMode: "month",
    });
    
    return (
        <div>
            <h1>{format(currentDate, "MMMM yyyy")}</h1>
            <button onClick={goToPrevious}>Previous</button>
            <button onClick={goToNext}>Next</button>
            {/* Render events */}
            {calendarEvents.map(event => (
                <div key={event.id}>{event.summary}</div>
            ))}
        </div>
    );
}
```

## Project Structure

```
types/calendar-view.ts                              # Type definitions
├── CalendarViewMode
├── CalendarViewEvent
├── CalendarEvent
├── CalendarFilterOption
├── CalendarViewProps
├── CalendarMonthViewProps
├── CalendarWeekViewProps
└── CalendarAgendaViewProps

hooks/use-calendar-view.ts                          # State management hook
├── useCalendarView()
├── UseCalendarViewOptions
└── UseCalendarViewResult

components/calendar/calendar-view/                  # UI Components
├── index.ts                    # Component exports
├── calendar-view.tsx           # Main container with controls
├── calendar-month-view.tsx     # Month grid view
├── calendar-week-view.tsx      # Week column view
├── calendar-agenda-view.tsx    # Agenda list view
└── README.md                   # This file
```

## Hook API

The `useCalendarView` hook (from `/hooks/use-calendar-view.ts`) manages state and provides utilities:

### Signature

```tsx
function useCalendarView(
    events: CalendarViewEvent[],
    options?: UseCalendarViewOptions
): UseCalendarViewResult
```

### Options

```tsx
interface UseCalendarViewOptions {
    calendars?: CalendarFilterOption[];
    initialSelectedCalendars?: string[];
    initialViewMode?: CalendarViewMode;
    initialDate?: Date;
}
```

### Return Value

```tsx
interface UseCalendarViewResult {
    // Current state
    currentDate: Date;              // Current date being viewed
    viewMode: CalendarViewMode;     // "month" | "week" | "agenda"
    selectedCalendars: string[];    // Array of selected calendar IDs
    dateRange: { start: Date; end: Date }; // Current date range
    
    // Transformed data
    calendarEvents: CalendarEvent[];  // Events with occurrences expanded
    
    // State setters
    setViewMode: (mode: CalendarViewMode) => void;
    
    // Navigation
    goToNext: () => void;            // Navigate to next period
    goToPrevious: () => void;        // Navigate to previous period
    goToToday: () => void;           // Jump to today
    
    // Calendar filtering
    toggleCalendar: (calendarId: string) => void;
    selectAllCalendars: () => void;
    deselectAllCalendars: () => void;
}
```

## Event Transformation

The hook automatically:
- Expands recurring events into individual occurrences
- Filters events by date range (month/week/30 days)
- Filters by selected calendars
- Parses calendar URIs to extract calendar info
- Applies calendar colors to events

## Styling

Events are color-coded using the calendar's color:
- Background: `${color}20` (20% opacity)
- Left border: `3px solid ${color}`
- Selected calendar badges use full color

## Mobile Behavior

- **Mobile (< 768px)**: Always shows Agenda view
- **Tablet/Desktop (≥ 768px)**: Shows view mode selector (Month/Week/Agenda)

## Examples

See the implementation in:
- `/app/events/page.tsx` - Full events stream with calendar view
- Component can be integrated into calendar detail pages
- Can be used in calendar overview pages

## Future Enhancements

Potential improvements:
- Drag-and-drop event rescheduling
- Time slot display in week view
- Event filtering by status/tags
- Export to iCal
- Print view
- Swipe gestures for mobile navigation
- Bottom sheet event preview on mobile
