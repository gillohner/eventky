# Eventky Data Model

## Architecture

```mermaid
graph TB
    subgraph "User A Homeserver"
        CA[Calendar<br/>x_pubky_admins: User B, C]
        AA[Attendee<br/>partstat: ACCEPTED<br/>→ Event on User B]
    end
    
    subgraph "Nexus Aggregation"
        N[Watches homeservers<br/>Indexes relationships<br/>Provides queries]
    end
    
    subgraph "User B Homeserver"
        EB[Event<br/>x_pubky_calendar_uris: Calendar A]
        AB[Attendee<br/>partstat: TENTATIVE<br/>→ Event on User B]
    end
    
    CA -->|watches| N
    AA -->|watches| N
    EB -->|watches| N
    AB -->|watches| N
    EB -.references.-> CA
    AA -.references.-> EB
    AB -.references.-> EB
```

## Data Models

### Calendar
- **Path**: `/pub/eventky.app/calendars/:calendar_id` (timestamp-based ID)
- **Storage**: Owner's homeserver
- **Required**: `name`, `timezone`
- **Optional**: `color`, `image_uri`, `description`, `x_pubky_admins` (admin user URIs)

### Event
- **Path**: `/pub/eventky.app/events/:event_id` (timestamp-based ID)
- **Storage**: Creator's homeserver
- **Required**: `uid`, `summary`, `dtstart`, `dtstamp`
- **Optional**: `dtend`, `duration`, `location`, `description`, `rrule` (recurrence), `x_pubky_calendar_uris`
- **RFC 5545 compliant**

### Attendee (RSVP)
- **Path**: `/pub/eventky.app/attendees/:attendee_id` (hash of event URI + recurrence_id)
- **Storage**: Attendee's homeserver
- **Required**: `x_pubky_event_uri`, `partstat` (NEEDS-ACTION | ACCEPTED | DECLINED | TENTATIVE)
- **Optional**: `recurrence_id` (for specific recurring instances)

## Relationships

```mermaid
graph LR
    A[Calendar<br/>User A Homeserver]
    E[Event<br/>User B Homeserver]
    AT1[Attendee<br/>User C Homeserver]
    AT2[Attendee<br/>User D Homeserver]
    
    E -.x_pubky_calendar_uris.-> A
    AT1 -.x_pubky_event_uri.-> E
    AT2 -.x_pubky_event_uri.-> E
```

### Calendar ← Events (Many-to-Many)
- Events reference calendars via `x_pubky_calendar_uris`
- Calendar admins create events on their own homeservers
- No calendar modification needed when events added/removed
- Nexus indexes by calendar URI

### Event ← Attendees (One-to-Many)
- Attendees reference events via `x_pubky_event_uri`
- Each user's RSVP stored on their homeserver
- No event modification needed when users RSVP
- Supports instance-specific RSVPs with `recurrence_id`

## Data Flow

```mermaid
sequenceDiagram
    participant UA as User A<br/>(Calendar Owner)
    participant UB as User B<br/>(Admin)
    participant UC as User C<br/>(Attendee)
    participant N as Nexus
    
    UA->>UA: PUT /calendars/:id<br/>x_pubky_admins: [User B]
    UA->>N: Homeserver watched
    
    UB->>UB: PUT /events/:id<br/>x_pubky_calendar_uris: [Calendar A]
    UB->>N: Homeserver watched
    
    UC->>UC: PUT /attendees/:id<br/>x_pubky_event_uri: Event B<br/>partstat: ACCEPTED
    UC->>N: Homeserver watched
    
    N->>N: Aggregate & Index
```
