# Event Display Page Implementation Plan

## Overview

This document outlines the implementation plan for an event displaying page at `/event/[authorId]/[eventId]`. The architecture is designed to be modular and easily replaceable, allowing for future migration from direct homeserver access to indexer API access.

## Architecture Philosophy

The implementation follows a layered architecture pattern:
1. **Data Layer**: Pubky SDK abstraction utilities
2. **Service Layer**: Event fetching and caching services  
3. **Hook Layer**: Custom React hooks for data management
4. **Component Layer**: Reusable UI components
5. **Page Layer**: Route-specific page components
NODE_ENV
## 1. Data Fetching Architecture

### 1.1 Utility Layer (`/lib/pubky/events.ts`)

Simple utility functions that fetch event data from Pubky homeserver. Implementation can be swapped to indexer API later by replacing function bodies.

```typescript
// Core event fetching utilities
export async function getEvent(authorId: string, eventId: string): Promise<PubkyAppEvent | null> {
  // Direct Pubky SDK calls for MVP
  const pubky = new Pubky();
  const url = eventUriBuilder(authorId, eventId);
  const data = await pubky.publicStorage.getJson(url as Address);
  return data ? PubkyAppEvent.fromJson(data) : null;
}

export async function getAttendees(authorId: string, eventId: string): Promise<PubkyAppAttendee[]> {
  // Fetch attendees from homeserver
}

export async function createAttendee(
  session: Session,
  eventUri: string,
  partstat: string
): Promise<boolean> {
  // Create/update RSVP status
}
```

### 1.2 React Query Integration (`/hooks/use-event.ts`)

Custom hooks that provide caching, loading states, and error handling.

```typescript
export const useEvent = (authorId: string, eventId: string) => {
  return useQuery({
    queryKey: ['event', authorId, eventId],
    queryFn: () => getEvent(authorId, eventId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useEventRSVP = () => {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ eventUri, status }: { eventUri: string; status: string }) => {
      if (!session) throw new Error('Authentication required');
      return createAttendee(session, eventUri, status);
    },
    onSuccess: () => {
      // Invalidate event queries to refetch with updated RSVP
      queryClient.invalidateQueries({ queryKey: ['event'] });
    },
  });
};
```

## 2. Component Architecture

### 2.1 Page Structure

The event page will be composed of several card-based components that can be easily rearranged:

```
EventPage
├── EventHeader
│   ├── EventImage
│   ├── EventTitle
│   └── EventStatus
├── EventDetails
│   ├── EventDateTime
│   ├── EventLocation
│   └── EventDescription
├── EventActions
│   ├── RSVPButton
│   └── ShareButton
│   └── AddToCalendarButton (future)
└── EventAttendees
    └── AttendeesList
```

### 2.2 Core Components

#### 2.2.1 Event Image Component (`/components/event/event-image.tsx`)

**Purpose**: Display event banner/image with fallback
**Features**:
- Responsive image display
- Fallback to display event color
- Loading skeleton
- Use image utilities from `/lib/pubky/utils.ts`
- Edit mode support (future)

#### 2.2.2 Event Title Component (`/components/event/event-title.tsx`)

**Purpose**: Display event title with optional inline editing
**Features**:
- Typography consistency
- Inline editing (edit mode)
- Character limit validation from `pubky-app-specs`

#### 2.2.3 Event DateTime Component (`/components/event/event-datetime.tsx`)

**Purpose**: Display formatted event date, time, and timezone
**Features**:
- Timezone-aware display
- Relative time ("in 2 days")
- Duration display
- Recurring event indicators
- Edit mode with date/time pickers and recurrence 

#### 2.2.4 Event Location Component (`/components/event/event-location.tsx`)

**Purpose**: Display location information
**Features**:
- Address display with map link
- Coordinates parsing
- Google Maps/OpenStreetMap integration
- Edit mode with location picker

```typescript
interface EventLocationProps {
  location?: string;
  geo?: string; // "lat;lon" format
  isEditable?: boolean;
  onLocationChange?: (location: string, geo?: string) => void;
}
```

#### 2.2.5 Event Map Component (`/components/event/event-map.tsx`)

**Purpose**: Interactive map display (when coordinates available)
**Features**:
- Embedded map widget
- Fallback to static map image
- Link to external map applications
- Progressive enhancement (loads after main content)

```typescript
interface EventMapProps {
  geo: string; // "lat;lon" format
  location?: string;
  className?: string;
  height?: number;
}
```

#### 2.2.6 Event Description Component (`/components/event/event-description.tsx`)

**Purpose**: Display and edit event description
**Features**:
- Markdown rendering (future)
- Expandable long descriptions
- Rich text editing (edit mode)
- Character count display

```typescript
interface EventDescriptionProps {
  description?: string;
  isEditable?: boolean;
  onDescriptionChange?: (newDescription: string) => void;
  maxLength?: number;
}
```

#### 2.2.7 RSVP Button Component (`/components/event/rsvp-button.tsx`)

**Purpose**: Handle event RSVP functionality
**Features**:
- Status selection (Accept/Decline/Tentative)
- Current user's RSVP status display
- Loading and error states
- Authentication requirement handling

```typescript
interface RSVPButtonProps {
  eventUri: string;
  currentStatus?: 'ACCEPTED' | 'DECLINED' | 'TENTATIVE' | 'NEEDS-ACTION';
  isAuthenticated: boolean;
  disabled?: boolean;
}
```

### 2.3 Layout Components

#### 2.3.1 Event Card (`/components/event/event-card.tsx`)

**Purpose**: Wrapper component for consistent card styling
**Features**:
- Consistent padding and spacing
- Shadow/border styling
- Optional header/footer
- Edit mode styling variations

```typescript
interface EventCardProps {
  title?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  isEditable?: boolean;
}
```

#### 2.3.2 Event Page Layout (`/components/event/event-page-layout.tsx`)

**Purpose**: Overall layout structure for event pages
**Features**:
- Responsive grid layout
- Sidebar for actions (desktop)
- Mobile-optimized stacking
- Edit mode layout adjustments

```typescript
interface EventPageLayoutProps {
  event: PubkyAppEvent;
  isEditable?: boolean;
  children: React.ReactNode;
}
```

## 3. Shadcn/UI Integration & Edit Mode

### 3.1 Edit Mode Strategy

The edit mode will be controlled by a URL parameter (`?edit=true`) or a toggle button for event organizers.

#### 3.1.1 Edit Context Provider (`/components/event/edit-context.tsx`)

```typescript
interface EditContextValue {
  isEditing: boolean;
  canEdit: boolean;
  toggleEdit: () => void;
  saveChanges: () => Promise<void>;
  discardChanges: () => void;
  hasUnsavedChanges: boolean;
}

export const EditContext = createContext<EditContextValue>();
```

#### 3.1.2 Editable Wrapper Component (`/components/event/editable-wrapper.tsx`)

A higher-order component that wraps editable fields:

```typescript
interface EditableWrapperProps {
  isEditable: boolean;
  children: React.ReactNode;
  onEdit?: () => void;
  className?: string;
}
```

### 3.2 Shadcn Components for Edit Mode

#### 3.2.1 Form Components

- **Input**: For title, location text editing
- **Textarea**: For description editing
- **DatePicker**: For date/time selection (custom component using Radix)
- **Select**: For status, timezone selection
- **Button**: For save/cancel actions
- **Dialog**: For confirmation modals

#### 3.2.2 Edit Mode UI Components

```typescript
// Edit toolbar for each editable section
interface EditToolbarProps {
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
  hasChanges: boolean;
}

// Edit indicator for hoverable sections
interface EditIndicatorProps {
  position: 'top-right' | 'top-left';
  onClick: () => void;
}
```

### 3.3 Edit Mode Implementation Pattern

Each editable component will follow this pattern:

```typescript
export function EditableEventTitle({ title, isEditable, onTitleChange }: EventTitleProps) {
  const [editMode, setEditMode] = useState(false);
  const [value, setValue] = useState(title);
  
  if (isEditable && editMode) {
    return (
      <div className="space-y-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Event title"
        />
        <EditToolbar
          onSave={() => {
            onTitleChange?.(value);
            setEditMode(false);
          }}
          onCancel={() => {
            setValue(title);
            setEditMode(false);
          }}
          hasChanges={value !== title}
        />
      </div>
    );
  }
  
  return (
    <div className="relative group">
      <h1 className="text-2xl font-bold">{title}</h1>
      {isEditable && (
        <EditIndicator
          position="top-right"
          onClick={() => setEditMode(true)}
        />
      )}
    </div>
  );
}
```

## 4. File Structure

```
app/
├── event/
│   └── [authorId]/
│       └── [eventId]/
│           └── page.tsx                    # Event page component

components/
├── event/
│   ├── edit-context.tsx                   # Edit mode context
│   ├── editable-wrapper.tsx               # HOC for editable components
│   ├── edit-indicator.tsx                 # Edit mode UI indicator
│   ├── edit-toolbar.tsx                   # Save/cancel toolbar
│   ├── event-card.tsx                     # Card wrapper component
│   ├── event-page-layout.tsx              # Page layout component
│   ├── event-image.tsx                    # Image display/edit
│   ├── event-title.tsx                    # Title display/edit
│   ├── event-datetime.tsx                 # Date/time display/edit
│   ├── event-location.tsx                 # Location display/edit
│   ├── event-map.tsx                      # Map integration
│   ├── event-description.tsx              # Description display/edit
│   ├── rsvp-button.tsx                    # RSVP functionality
│   └── index.ts                           # Export barrel
└── ui/
    ├── date-picker.tsx                    # Custom date picker
    ├── time-picker.tsx                    # Custom time picker
    └── location-picker.tsx                # Location selection component

hooks/
├── use-event.ts                           # Event data fetching
├── use-event-rsvp.ts                      # RSVP mutations
└── use-edit-mode.ts                       # Edit mode state management

lib/
├── pubky/
│   ├── events.ts                          # Event fetching utilities
│   └── attendees.ts                       # Attendee utilities
└── services/
    └── event-service.ts                   # Business logic layer
```

## 5. Implementation Phases

### Phase 1: Core Reading Functionality
1. Set up basic event fetching utilities
2. Create event page route and layout
3. Implement core display components:
   - EventImage
   - EventTitle  
   - EventDateTime
   - EventLocation
   - EventDescription
4. Basic RSVP button functionality

### Phase 2: Enhanced Display Features
1. Add event map component
2. Implement attendee count display
3. Add loading and error states
4. Responsive design improvements

### Phase 3: Edit Mode Foundation
1. Create edit context and providers
2. Implement editable wrapper components
3. Add edit indicators and toolbars
4. Basic inline editing for title and description

### Phase 4: Advanced Edit Features
1. Date/time picker integration
2. Location picker with map
3. Image upload functionality
4. Form validation and error handling

### Phase 5: Polish & Optimization
1. Animation and transition improvements
2. Accessibility enhancements
3. Performance optimization
4. Testing coverage

## 6. Data Flow Examples

### 6.1 Loading an Event Page

```
URL: /event/user123/01HCXB9P7QBVKM
↓
Page Component loads
↓
useEvent hook triggered
↓
EventService.getEventWithAttendees()
↓
HomeserverEventFetcher.getEvent() + getAttendees()
↓
PubkyClient fetches from homeserver
↓
Data flows back through layers
↓
Components render with data
```

### 6.2 RSVP Flow

```
User clicks RSVP button
↓
useEventRSVP mutation triggered
↓
EventService.rsvpToEvent()
↓
HomeserverEventFetcher.createAttendee()
↓
PubkyClient writes to homeserver
↓
React Query invalidates event cache
↓
Event refetches with updated attendance
```

### 6.3 Edit Mode Flow

```
Organizer enables edit mode
↓
EditContext.isEditing = true
↓
Components render edit interfaces
↓
User makes changes
↓
EditContext tracks unsaved changes
↓
User saves changes
↓
Form validation → API calls → Cache invalidation
```

## 7. Future Migration Path

When moving to an indexer API:

1. Create new `IndexerEventFetcher` class
2. Update dependency injection in services
3. Maintain same interface contracts
4. Add API key configuration
5. Update error handling for API-specific errors

The component layer remains completely unchanged, demonstrating the benefit of this abstracted architecture.

## 8. Security Considerations

1. **RSVP Authorization**: Verify user owns the pubky identity before allowing RSVP
2. **Edit Authorization**: Only event organizers can edit events
3. **Input Sanitization**: All user inputs are validated and sanitized
4. **URI Validation**: Event and user URIs are properly validated before use

## 9. Performance Considerations

1. **Image Optimization**: Use Next.js Image component for automatic optimization
2. **Lazy Loading**: Maps and images load progressively
3. **Caching Strategy**: React Query provides intelligent caching
4. **Bundle Splitting**: Edit mode components loaded on-demand

This implementation plan provides a solid foundation that can scale from the initial MVP to a full-featured event platform while maintaining clean separation of concerns and easy migration paths for future enhancements.