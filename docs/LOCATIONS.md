# Locations

Events support multiple structured locations based on RFC 9073 VLOCATION.

## Location Types

| Type | Description | Form Input | structured_data |
|------|-------------|------------|-----------------|
| `PHYSICAL` | In-person venue | Nominatim search or manual name | OSM URL |
| `ONLINE` | Virtual meeting | Meeting URL | The URL itself |

## Data Model

```typescript
interface EventLocation {
    name: string;           // Required: "Hafenbar", "Zoom Call", "My backyard"
    location_type: "PHYSICAL" | "ONLINE";
    description?: string;   // Additional instructions
    structured_data?: string; // OSM URL or meeting URL
}
```

### Validation (pubky-app-specs)

| Field | Max Length |
|-------|-----------|
| `name` | 500 characters |
| `description` | 2,000 characters |
| `structured_data` | 2,048 characters |
| **Max locations per event** | 5 |

## Physical Locations

Two modes:

1. **Simple**: Just a name (e.g., "My backyard")
2. **Full**: Nominatim search → name + OSM URL

### Nominatim Search

- 1-second debounce (rate limit compliance)
- Returns OSM node/way/relation
- `structured_data` stores the OSM URL: `https://www.openstreetmap.org/node/1573053883`

### Map Preview

When coordinates are available, an embedded OSM map preview is shown:
```typescript
function buildMapEmbedUrl(lat: number, lon: number): string {
    const delta = 0.005; // ~500m bbox
    const bbox = `${lon - delta},${lat - delta},${lon + delta},${lat + delta}`;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lon}`;
}
```

## Online Locations

For virtual meetings:
- `name`: Display name (e.g., "Zoom Call")
- `structured_data`: The meeting URL (validated as http/https)

Platform icons are inferred at display time from the URL domain.

## Form Component

`LocationFields` component (`components/event/create/location-fields.tsx`):

- Card-based UI for multiple locations
- Location type selector (Physical/Online)
- Physical: Nominatim search with keyboard navigation (↑↓ Enter Escape)
- Online: URL input with validation
- Map preview for selected physical locations
- Add/remove locations (max 5)

## Storage

```json
{
    "locations": [
        {
            "name": "Hafenbar zur Metzgerhalle",
            "location_type": "PHYSICAL",
            "description": "Enter through the back door",
            "structured_data": "https://www.openstreetmap.org/node/1573053883"
        },
        {
            "name": "Zoom Backup",
            "location_type": "ONLINE",
            "structured_data": "https://zoom.us/j/123456789"
        }
    ]
}
```

## Display

Physical locations with `structured_data` can:
- Link directly to OpenStreetMap
- Fetch coordinates for map display
- (Future) Fetch BTCMap payment tags

## Migration

Legacy `location` and `geo` string fields have been removed from:
- pubky-app-specs (PubkyAppEvent)
- pubky-nexus (EventDetails)
- eventky (types, forms)

No migration needed as few events existed with the old format.
