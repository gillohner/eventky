# Structured Locations & Conferences

Eventky uses RFC-compliant structured locations and virtual conferences for event locations.

## Overview

Events can have multiple locations (physical venues) and conferences (virtual meeting links):

```typescript
interface PubkyAppEvent {
    // ... other fields ...
    locations?: EventLocation[];    // RFC 9073 VLOCATION
    conferences?: EventConference[]; // RFC 7986 CONFERENCE
}
```

## EventLocation (RFC 9073)

Physical locations following the RFC 9073 VLOCATION component:

```typescript
interface EventLocation {
    uid: string;                    // Required unique identifier
    name?: string;                  // Human-readable name
    location_type?: string;         // RFC 4589 type (venue, parking, etc.)
    description?: string;           // Additional details
    geo?: string;                   // RFC 5870 geo URI (geo:lat,lon)
    structured_data_uri?: string;   // External reference (OSM URL)
}
```

### Example

```json
{
    "uid": "main-venue",
    "name": "Convention Center - Hall A",
    "location_type": "venue",
    "description": "Enter through the main entrance on 5th Avenue",
    "geo": "geo:40.7128,-74.0060",
    "structured_data_uri": "https://www.openstreetmap.org/node/123456"
}
```

### RFC 4589 Location Types

| Type | Description |
|------|-------------|
| `venue` | Primary event location |
| `parking` | Parking area |
| `restaurant` | Restaurant/dining |
| `hotel` | Hotel/accommodation |
| `convention-center` | Convention/conference center |
| `theater` | Theater/performance venue |
| `arena` | Arena/stadium |
| `airport` | Airport |
| `train-station` | Train station |
| `bus-station` | Bus station |
| `office` | Office building |
| `residence` | Private residence |
| `park` | Park/outdoor area |
| `other` | Other location type |

### RFC 5870 Geo URI Format

Coordinates use the RFC 5870 geo URI format:

```
geo:latitude,longitude
geo:latitude,longitude;u=uncertainty
```

Examples:
- `geo:47.3769,8.5417` - Zurich coordinates
- `geo:-33.8688,151.2093;u=10` - Sydney with 10m uncertainty

## EventConference (RFC 7986)

Virtual meeting links following RFC 7986 CONFERENCE property:

```typescript
interface EventConference {
    uri: string;                    // Required conference URI
    features?: string[];            // RFC 7986 FEATURE values
    label?: string;                 // Human-readable label
}
```

### Example

```json
{
    "uri": "https://zoom.us/j/123456789?pwd=abc123",
    "features": ["AUDIO", "VIDEO", "SCREEN", "CHAT"],
    "label": "Join via Zoom"
}
```

### RFC 7986 Features

| Feature | Description |
|---------|-------------|
| `AUDIO` | Audio conferencing capability |
| `VIDEO` | Video conferencing capability |
| `CHAT` | Text chat/messaging |
| `PHONE` | Phone dial-in available |
| `SCREEN` | Screen sharing capability |
| `MODERATOR` | Moderator controls available |
| `FEED` | Broadcast/streaming feed |

### Supported URI Schemes

Any valid URI is accepted per RFC 7986's permissive approach:

- `https://` - Web-based meetings (Zoom, Meet, Teams)
- `tel:` - Phone dial-in numbers
- `sip:` - SIP conferencing
- `xmpp:` - XMPP chat rooms

## Storage Format

In the Nexus API, locations and conferences are stored as JSON strings for Neo4j compatibility:

```typescript
interface NexusEventDetails {
    // ... other fields ...
    locations?: string;     // JSON string, parse with parseNexusLocations()
    conferences?: string;   // JSON string, parse with parseNexusConferences()
}
```

### Parsing Helpers

```typescript
import { parseNexusLocations, parseNexusConferences } from "@/types/nexus";

const event = await fetchEvent(authorId, eventId);
const locations = parseNexusLocations(event.details);
const conferences = parseNexusConferences(event.details);
```

## Validation

### Location Validation

```typescript
import { 
    isValidGeoUri,
    isValidLocationType,
    LOCATION_TYPES 
} from "@/types/event";

isValidGeoUri("geo:47.3769,8.5417");     // true
isValidGeoUri("47.3769,8.5417");         // false (missing geo: prefix)
isValidLocationType("venue");             // true
isValidLocationType("invalid");           // false
```

### Conference Validation

```typescript
import { 
    isValidConferenceFeatures,
    CONFERENCE_FEATURES 
} from "@/types/event";

isValidConferenceFeatures(["AUDIO", "VIDEO"]); // true
isValidConferenceFeatures(["INVALID"]);        // false
```

## Limits

- Maximum locations per event: **10**
- Maximum conferences per event: **10**
- Maximum location name length: **500 characters**
- Maximum location description length: **2000 characters**
- Maximum conference label length: **200 characters**

## Migration Notes

### Breaking Change

The legacy `location` and `geo` fields have been replaced with structured `locations` and `conferences` arrays. Old events with `location`/`geo` are not automatically migrated.

### Form Data

When creating/editing events, use the `locations` array:

```typescript
const formData: EventFormData = {
    summary: "Team Meeting",
    dtstart: "2025-01-15T10:00:00",
    locations: [{
        uid: "main-room",
        name: "Conference Room A",
        geo: "geo:47.3769,8.5417"
    }],
    conferences: [{
        uri: "https://zoom.us/j/123456789",
        features: ["AUDIO", "VIDEO"],
        label: "Join via Zoom"
    }]
};
```

## RFC References

| RFC | Description |
|-----|-------------|
| [RFC 9073](https://datatracker.ietf.org/doc/html/rfc9073) | VLOCATION component, STRUCTURED-DATA |
| [RFC 7986](https://datatracker.ietf.org/doc/html/rfc7986) | CONFERENCE property, FEATURE, LABEL |
| [RFC 5870](https://datatracker.ietf.org/doc/html/rfc5870) | geo URI scheme |
| [RFC 4589](https://datatracker.ietf.org/doc/html/rfc4589) | Location Types Registry |
| [RFC 5545](https://datatracker.ietf.org/doc/html/rfc5545) | iCalendar (base specification) |
