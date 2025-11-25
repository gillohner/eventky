# Create Event Page Implementation Plan

## Overview

This document outlines the implementation plan for the create/edit event page at `/event/create` and `/event/[authorId]/[eventId]?edit=true`. The form uses modular, reusable field components and integrates with pubky-app-specs WASM bindings.

## Architecture

### Component Structure

```
CreateEventPage (/app/event/create/page.tsx)
└── CreateEventPageLayout (/components/event/create/create-event-page-layout.tsx)
    ├── EventImageUpload (Field Component)
    ├── EventBasicFields (Field Component)
    │   ├── EventTitleField
    │   ├── EventColorField
    │   └── EventStatusField
    ├── EventDateTimeFields (Field Component)
    │   ├── DateTimePicker (from/dtstart)
    │   ├── DateTimePicker (to/dtend) OR DurationInput
    │   └── TimezoneSelector
    ├── EventLocationFields (Field Component)
    │   ├── LocationSearch (Nominatim)
    │   └── MapPreview (shows selected location)
    ├── EventDetailsFields (Field Component)
    │   ├── DescriptionField
    │   ├── CategoriesField
    │   └── URLField
    ├── EventRecurrenceFields (Field Component - Optional)
    │   ├── RecurrenceRuleBuilder
    │   ├── RDatePicker
    │   └── ExDatePicker
    └── SubmitButton (color: theme accent)
```

### Data Layer Structure

```
lib/
├── pubky/
│   ├── events.ts          # Event CRUD utilities
│   │   ├── createEvent()  # Uses PubkySpecsBuilder.createEvent()
│   │   ├── updateEvent()  # Overwrites existing event
│   │   ├── getEvent()     # Fetches event for editing
│   │   └── deleteEvent()  # Removes event
│   ├── files.ts           # File upload utilities
│   │   ├── uploadFile()   # Uses PubkySpecsBuilder.createFile()
│   │   └── uploadBlob()   # Uses PubkySpecsBuilder.createBlob()
│   └── client.ts          # PubkyClient singleton
└── services/
    ├── location.ts        # Nominatim API integration
    │   ├── searchLocation()
    │   └── geocodeAddress()
    └── validation.ts      # Form validation helpers
```

## Field Components (Modular Design)

### 1. Image Upload Component

**File**: `/components/event/create/fields/event-image-upload.tsx`

**Purpose**: Upload event banner image using PubkyAppFile

**Features**:
- Drag-and-drop file upload
- Image preview with crop/resize
- Uses `PubkySpecsBuilder.createFile()` to generate file metadata
- Uploads blob data using session.storage.put()
- Returns `image_uri` (pubky:// URL)

**Props**:
```typescript
interface EventImageUploadProps {
  value?: string;              // Current image_uri
  onChange: (imageUri: string) => void;
  color?: string;              // Fallback color for empty state
  session: Session;            // Auth session for uploads
}
```

**Implementation Notes**:
- File upload flow:
  1. User selects image file
  2. Client-side validation (size, type, dimensions)
  3. Generate blob from file data
  4. Call `builder.createBlob(blobData)` to get blob metadata
  5. Upload blob: `session.storage.put(meta.path, blobData)`
  6. Create file record: `builder.createFile(name, blobUri, contentType, size)`
  7. Upload file JSON: `session.storage.putJson(fileMeta.path, file.toJson())`
  8. Return file URI for `image_uri` field

If a user removes the image, set `image_uri` to `undefined`. And delete the blob/file from homeserver.

### 2. Color Selector Component

**File**: `/components/event/create/fields/event-color-field.tsx`

**Purpose**: Select event theme color

**Features**:
- Preset color palette
- Custom color picker (hex input)
- Uses `validateColor()` from pubky-app-specs
- Preview badge with selected color

**Props**:
```typescript
interface EventColorFieldProps {
  value?: string;              // Current color (#RRGGBB)
  onChange: (color: string) => void;
}
```

**Preset Colors**:
```typescript
const PRESET_COLORS = [
  '#3498db', // Blue
  '#e74c3c', // Red
  '#2ecc71', // Green
  '#f39c12', // Orange
  '#9b59b6', // Purple
  '#1abc9c', // Teal
];
```

### 3. DateTime Picker Component

**File**: `/components/event/create/fields/event-datetime-picker.tsx`

**Purpose**: Select date and time with timezone support

**Features**:
- Date picker (calendar UI)
- Time picker (hour/minute with AM/PM)
- Timezone selector (IANA timezones)
- Uses `validateTimezone()` from pubky-app-specs
- Converts to Unix microseconds (bigint)

**Props**:
```typescript
interface EventDateTimePickerProps {
  label: string;               // "Start" or "End"
  value?: bigint;              // Unix microseconds
  timezoneValue?: string;      // IANA timezone
  onChange: (timestamp: bigint) => void;
  onTimezoneChange?: (timezone: string) => void;
  minDate?: Date;              // Validation constraint
}
```

**Implementation Notes**:
- Store timestamp as Unix microseconds (bigint)
- Display in local timezone by default
- Allow timezone override (dtstart_tzid, dtend_tzid)

### 4. Duration Input Component

**File**: `/components/event/create/fields/event-duration-input.tsx`

**Purpose**: Alternative to end time - specify duration

**Features**:
- Hour and minute inputs
- Converts to RFC 5545 duration format (PT2H30M)
- Uses `validateDuration()` from pubky-app-specs
- Toggle between "End Time" and "Duration" modes

**Props**:
```typescript
interface EventDurationInputProps {
  value?: string;              // RFC 5545 duration (PT2H30M)
  onChange: (duration: string) => void;
}
```

**UI Behavior**:
```typescript
// User sees toggle:
// [ End Time ] [ Duration ]

// If "Duration" selected:
// - Show hour/minute inputs
// - Auto-calculate dtend from dtstart + duration
// - Save duration field in event

// If "End Time" selected:
// - Show DateTimePicker for dtend
// - duration field is null
```

### 5. Location Search Component

**File**: `/components/event/create/fields/event-location-search.tsx`

**Purpose**: Search and select location using Nominatim API. Add a toggle to have just a text input for location without geo coordinates and nominatim search.

**Features**:
- Autocomplete search input (debounced)
- Results dropdown with formatted addresses
- Automatically sets both `location` (address string) and `geo` (lat;lon)
- Uses `validateGeoCoordinates()` from pubky-app-specs
- Map preview of selected location

**Props**:
```typescript
interface EventLocationSearchProps {
  locationValue?: string;      // Address string
  geoValue?: string;           // "lat;lon" format
  onLocationChange: (location: string) => void;
  onGeoChange: (geo: string) => void;
}
```

**Nominatim Integration**:
```typescript
// lib/services/location.ts

export interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  address: {
    road?: string;
    city?: string;
    state?: string;
    country?: string;
  };
}

export async function searchLocation(query: string): Promise<NominatimResult[]> {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?` +
    `q=${encodeURIComponent(query)}&format=json&addressdetails=1`
  );
  return response.json();
}
```

### 6. Map Preview Component

**File**: `/components/event/create/fields/event-map-preview.tsx`

**Purpose**: Display selected location on embedded map

**Features**:
- Shows map pin at geo coordinates
- Uses OpenStreetMap tiles (Leaflet.js)
- Click to adjust pin position
- Updates geo coordinates on pin drag

**Props**:
```typescript
interface EventMapPreviewProps {
  geo?: string;                // "lat;lon" format
  location?: string;           // Address label
  onGeoChange?: (geo: string) => void;
  editable?: boolean;          // Allow pin dragging
}
```

### 7. Categories Field Component

**File**: `/components/event/create/fields/event-categories-field.tsx`

**Purpose**: Add/remove event category tags

**Features**:
- Tag input with autocomplete
- Multi-select chips
- Preset suggestions (Technology, Music, Sports, etc.)
- Custom category creation

**Props**:
```typescript
interface EventCategoriesFieldProps {
  value?: string[];            // Array of category strings
  onChange: (categories: string[]) => void;
}
```

### 8. Description Field Component

**File**: `/components/event/create/fields/event-description-field.tsx`

**Purpose**: Event description with optional rich text

**Features**:
- Textarea for plain text
- Character count display
- Markdown editor support (styled_description)
- Auto-resize textarea

**Props**:
```typescript
interface EventDescriptionFieldProps {
  value?: string;
  onChange: (description: string) => void;
  maxLength?: number;          // From pubky-app-specs validation
}
```

### 9. Recurrence Rule Builder

**File**: `/components/event/create/fields/event-recurrence-builder.tsx`

**Purpose**: Build RRULE for recurring events

**Features**:
- Frequency selector (Daily, Weekly, Monthly, Yearly)
- Interval input
- Until date or count limit
- Uses `validateRrule()` from pubky-app-specs
- Human-readable summary ("Every 2 weeks")

**Props**:
```typescript
interface EventRecurrenceBuilderProps {
  rruleValue?: string;         // RFC 5545 RRULE
  rdateValue?: string[];       // Additional dates
  exdateValue?: string[];      // Exception dates
  onRruleChange: (rrule: string) => void;
  onRdateChange: (rdate: string[]) => void;
  onExdateChange: (exdate: string[]) => void;
}
```

## Form State Management

### Form Hook

**File**: `/hooks/use-event-form.ts`

```typescript
interface EventFormData {
  // Required fields
  uid: string;
  dtstart: bigint;
  summary: string;
  
  // Optional fields
  dtend?: bigint;
  duration?: string;
  dtstart_tzid?: string;
  dtend_tzid?: string;
  description?: string;
  status?: string;
  organizer?: { name: string };
  categories?: string[];
  location?: string;
  geo?: string;
  image_uri?: string;
  url?: string;
  rrule?: string;
  rdate?: string[];
  exdate?: string[];
  styled_description?: {
    content: string;
    format: string;
    attachments?: string[];
  };
  x_pubky_calendar_uris?: string[];
  x_pubky_rsvp_access?: string;
}

export function useEventForm(initialData?: PubkyAppEvent) {
  const [formData, setFormData] = useState<EventFormData>(() => {
    if (initialData) {
      // Edit mode: populate from existing event
      return eventToFormData(initialData);
    }
    // Create mode: defaults
    return {
      uid: `event-${Date.now()}`,
      dtstart: BigInt(Date.now() * 1000),
      summary: '',
      status: 'CONFIRMED',
    };
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const updateField = (field: keyof EventFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    setErrors(prev => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };
  
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.summary.trim()) {
      newErrors.summary = 'Event title is required';
    }
    
    if (formData.dtend && formData.dtend <= formData.dtstart) {
      newErrors.dtend = 'End time must be after start time';
    }
    
    // Additional validation...
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  return {
    formData,
    errors,
    updateField,
    validate,
  };
}
```

## Pubky Integration

### Create Event Flow

**File**: `/lib/pubky/events.ts`

```typescript
import { PubkySpecsBuilder, Organizer, StyledDescription } from 'pubky-app-specs';
import { getClient } from './client';

export async function createEvent(
  session: Session,
  eventData: EventFormData
): Promise<string> {
  const client = await getClient();
  const userId = session.publicKey.z32();
  
  // Initialize builder
  const builder = new PubkySpecsBuilder(userId);
  
  // Prepare organizer
  const organizer = eventData.organizer 
    ? new Organizer(eventData.organizer.name)
    : new Organizer('Unknown');
  
  // Prepare styled_description if needed
  const styledDescription = eventData.styled_description
    ? new StyledDescription(
        eventData.styled_description.content,
        eventData.styled_description.format,
        eventData.styled_description.attachments
      )
    : null;
  
  // Create event using WASM builder
  const result = builder.createEvent(
    eventData.uid,
    eventData.dtstart,
    eventData.summary,
    eventData.dtend ?? null,
    eventData.duration ?? null,
    eventData.dtstart_tzid ?? null,
    eventData.dtend_tzid ?? null,
    eventData.description ?? null,
    eventData.status ?? null,
    organizer,
    eventData.categories ?? [],
    eventData.location ?? null,
    eventData.geo ?? null,
    eventData.image_uri ?? null,
    eventData.url ?? null,
    eventData.rrule ?? null,
    eventData.rdate ?? [],
    eventData.exdate ?? [],
    eventData.recurrence_id ?? null,
    styledDescription,
    eventData.x_pubky_calendar_uris ?? [],
    eventData.x_pubky_rsvp_access ?? null
  );
  
  // Upload to homeserver
  await session.storage.putJson(
    result.meta.path as `/pub/${string}`,
    result.event.toJson()
  );
  
  return result.meta.id; // Return event ID
}

export async function updateEvent(
  session: Session,
  eventId: string,
  eventData: EventFormData
): Promise<void> {
  // Same as createEvent but overwrites existing path
  const userId = session.publicKey.z32();
  const builder = new PubkySpecsBuilder(userId);
  
  // Create updated event
  const result = builder.createEvent(/* same params */);
  
  // Overwrite existing event
  await session.storage.putJson(
    result.meta.path as `/pub/${string}`,
    result.event.toJson()
  );
}

export async function getEvent(
  authorId: string,
  eventId: string
): Promise<PubkyAppEvent | null> {
  const client = await getClient();
  const url = `pubky://${authorId}/pub/pubky.app/events/${eventId}`;
  
  const data = await client.publicStorage.getJson(url);
  if (!data) return null;
  
  return PubkyAppEvent.fromJson(data);
}
```

### File Upload Flow

**File**: `/lib/pubky/files.ts`

```typescript
import { PubkySpecsBuilder } from 'pubky-app-specs';

export async function uploadEventImage(
  session: Session,
  file: File
): Promise<string> {
  const userId = session.publicKey.z32();
  const builder = new PubkySpecsBuilder(userId);
  
  // Read file as blob
  const arrayBuffer = await file.arrayBuffer();
  const blobData = new Uint8Array(arrayBuffer);
  
  // Create blob record
  const blobResult = builder.createBlob(blobData);
  
  // Upload blob data
  await session.storage.put(
    blobResult.meta.path as `/pub/${string}`,
    blobData
  );
  
  // Create file record
  const fileResult = builder.createFile(
    file.name,
    blobResult.meta.url, // Reference to blob
    file.type,
    file.size
  );
  
  // Upload file metadata
  await session.storage.putJson(
    fileResult.meta.path as `/pub/${string}`,
    fileResult.file.toJson()
  );
  
  return fileResult.meta.url; // Return file URI for image_uri
}
```

## Edit Mode Integration

### Route Setup

```typescript
// app/event/[authorId]/[eventId]/page.tsx

export default function EventPage({
  params,
  searchParams,
}: {
  params: { authorId: string; eventId: string };
  searchParams: { edit?: string };
}) {
  const isEditMode = searchParams.edit === 'true';
  
  if (isEditMode) {
    return <CreateEventPageLayout 
      mode="edit" 
      authorId={params.authorId}
      eventId={params.eventId}
    />;
  }
  
  return <EventPageLayout 
    authorId={params.authorId} 
    eventId={params.eventId} 
  />;
}
```

### Form Pre-population

```typescript
// components/event/create/create-event-page-layout.tsx

export function CreateEventPageLayout({
  mode = 'create',
  authorId,
  eventId,
}: {
  mode?: 'create' | 'edit';
  authorId?: string;
  eventId?: string;
}) {
  const { data: existingEvent, isLoading } = useEvent(
    authorId!,
    eventId!,
    { enabled: mode === 'edit' }
  );
  
  const form = useEventForm(existingEvent);
  
  // Rest of component...
}
```

## UI/UX Details

### Form Layout

```typescript
<div className="container mx-auto py-8 px-4 max-w-4xl">
  <h1 className="text-3xl font-bold mb-8">
    {mode === 'edit' ? 'Edit Event' : 'Create Event'}
  </h1>
  
  <form onSubmit={handleSubmit} className="space-y-8">
    {/* Image Upload - Full width */}
    <section className="space-y-4">
      <EventImageUpload {...imageProps} />
    </section>
    
    {/* Basic Info - 2 columns on desktop */}
    <section className="grid md:grid-cols-2 gap-6">
      <EventTitleField {...titleProps} />
      <EventColorField {...colorProps} />
    </section>
    
    {/* Date/Time - Stacked */}
    <section className="space-y-4">
      <EventDateTimeFields {...dateTimeProps} />
    </section>
    
    {/* Location - Full width */}
    <section className="space-y-4">
      <EventLocationFields {...locationProps} />
    </section>
    
    {/* Details - Full width */}
    <section className="space-y-4">
      <EventDetailsFields {...detailsProps} />
    </section>
    
    {/* Recurrence - Collapsible */}
    <section className="space-y-4">
      <Collapsible>
        <CollapsibleTrigger>
          Advanced: Recurring Event
        </CollapsibleTrigger>
        <CollapsibleContent>
          <EventRecurrenceFields {...recurrenceProps} />
        </CollapsibleContent>
      </Collapsible>
    </section>
    
    {/* Submit Button - Themed */}
    <div className="flex justify-end gap-4 pt-6 border-t">
      <Button variant="outline" onClick={onCancel}>
        Cancel
      </Button>
      <Button 
        type="submit" 
        disabled={isSubmitting}
        style={{ backgroundColor: formData.color || '#3498db' }}
      >
        {isSubmitting ? 'Saving...' : mode === 'edit' ? 'Update Event' : 'Create Event'}
      </Button>
    </div>
  </form>
</div>
```

### Submit Button Color

The submit button background color matches the selected event color:

```typescript
<Button 
  type="submit"
  className="min-w-32"
  style={{ 
    backgroundColor: formData.color || '#3498db',
    color: 'white',
  }}
>
  {mode === 'edit' ? 'Update Event' : 'Create Event'}
</Button>
```

## Implementation Phases

### Phase 1: Core Form Structure ✅
- [x] Create form layout component
- [x] Setup form state management (useEventForm hook)
- [x] Basic validation logic
- [x] Create/Edit mode routing

### Phase 2: Basic Field Components
- [ ] EventTitleField
- [ ] EventColorField
- [ ] EventStatusField
- [ ] EventDescriptionField
- [ ] CategoriesField

### Phase 3: DateTime Components
- [ ] DateTimePicker component
- [ ] TimezoneSelector
- [ ] DurationInput component
- [ ] Toggle between end time / duration

### Phase 4: Location Components
- [ ] Nominatim API integration (lib/services/location.ts)
- [ ] LocationSearch with autocomplete
- [ ] MapPreview component (Leaflet.js)
- [ ] Geo coordinate validation

### Phase 5: Image Upload
- [ ] File upload utilities (lib/pubky/files.ts)
- [ ] EventImageUpload component
- [ ] Blob/File creation with PubkySpecsBuilder
- [ ] Image preview and validation

### Phase 6: Advanced Features
- [ ] RecurrenceRuleBuilder
- [ ] RDate/ExDate pickers
- [ ] Calendar association selector
- [ ] RSVP access control selector

### Phase 7: Pubky Integration
- [ ] Event creation (lib/pubky/events.ts)
- [ ] Event update/overwrite
- [ ] Proper error handling
- [ ] Success/failure notifications

### Phase 8: Polish
- [ ] Form validation messages
- [ ] Loading states
- [ ] Success redirect
- [ ] Accessibility improvements
- [ ] Mobile responsive design

## Dependencies

```json
{
  "dependencies": {
    "pubky-app-specs": "*",
    "@synonymdev/pubky": "^0.6.0-rc.6",
    "leaflet": "^1.9.4",
    "react-leaflet": "^4.2.1",
    "@radix-ui/react-collapsible": "^1.0.3",
    "date-fns": "^3.0.0",
    "date-fns-tz": "^2.0.0"
  },
  "devDependencies": {
    "@types/leaflet": "^1.9.8"
  }
}
```

## File Checklist

### Hooks
- [ ] `/hooks/use-event-form.ts`

### Services/Utils
- [ ] `/lib/services/location.ts` (Nominatim)
- [ ] `/lib/services/validation.ts`
- [ ] `/lib/pubky/events.ts` (create, update, get)
- [ ] `/lib/pubky/files.ts` (upload image)

### Field Components
- [ ] `/components/event/create/fields/event-title-field.tsx`
- [ ] `/components/event/create/fields/event-color-field.tsx`
- [ ] `/components/event/create/fields/event-status-field.tsx`
- [ ] `/components/event/create/fields/event-datetime-picker.tsx`
- [ ] `/components/event/create/fields/event-duration-input.tsx`
- [ ] `/components/event/create/fields/event-timezone-selector.tsx`
- [ ] `/components/event/create/fields/event-location-search.tsx`
- [ ] `/components/event/create/fields/event-map-preview.tsx`
- [ ] `/components/event/create/fields/event-description-field.tsx`
- [ ] `/components/event/create/fields/event-categories-field.tsx`
- [ ] `/components/event/create/fields/event-url-field.tsx`
- [ ] `/components/event/create/fields/event-image-upload.tsx`
- [ ] `/components/event/create/fields/event-recurrence-builder.tsx`

### Layout Components
- [ ] `/components/event/create/create-event-page-layout.tsx`
- [ ] `/components/event/create/event-basic-fields.tsx`
- [ ] `/components/event/create/event-datetime-fields.tsx`
- [ ] `/components/event/create/event-location-fields.tsx`
- [ ] `/components/event/create/event-details-fields.tsx`
- [ ] `/components/event/create/event-recurrence-fields.tsx`

### Pages
- [ ] `/app/event/create/page.tsx`
- [ ] Update `/app/event/[authorId]/[eventId]/page.tsx` for edit mode

## Testing Strategy

1. **Form Validation**: Test all field validation rules
2. **Pubky Integration**: Test event creation and update flows
3. **File Upload**: Test image upload and blob creation
4. **Location Search**: Test Nominatim API integration
5. **Edit Mode**: Test form pre-population from existing events
6. **Error Handling**: Test network failures and validation errors

## Security Considerations

1. **Authentication**: Verify user is authenticated before allowing create/edit
2. **Authorization**: Only event organizer can edit events
3. **Input Sanitization**: Validate all form inputs
4. **File Upload**: Validate file types, sizes, dimensions
5. **XSS Prevention**: Sanitize description and other text fields

This implementation plan provides a complete roadmap for building a modular, maintainable event creation/editing form that integrates properly with the pubky-app-specs WASM bindings.
