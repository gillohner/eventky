# Event Filtering & Date Range

## Overview

Eventky implements comprehensive event filtering with date-based queries, tags, status, author, and timezone filtering. The system defaults to showing **upcoming events only** for better UX.

## Architecture

### Backend (pubky-nexus)

**Timestamp Indexing:**
- Events store both ISO 8601 `dtstart` (spec-compliant) and derived `dtstart_timestamp` (query optimization)
- `dtstart_timestamp`: Unix microseconds for efficient range queries and chronological sorting
- Automatically parsed from ISO 8601 when events are ingested

**Query Implementation:**
```rust
// nexus-webapi/src/routes/v0/stream/events.rs
pub struct EventStreamQuery {
    pub tags: Option<Vec<String>>,        // Comma-separated in URL
    pub status: Option<String>,           // CONFIRMED, TENTATIVE, CANCELLED
    pub start_date: Option<i64>,          // Unix microseconds
    pub end_date: Option<i64>,            // Unix microseconds
    pub author: Option<String>,           // User ID
    pub timezone: Option<String>,         // IANA timezone
}
```

**Cypher Query:**
```cypher
MATCH (u:User)-[:AUTHORED]->(e:Event)
WHERE e.dtstart_timestamp >= $start_date 
  AND e.dtstart_timestamp <= $end_date
ORDER BY COALESCE(e.dtstart_timestamp, e.indexed_at) ASC
```

### Frontend (eventky)

**Default Behavior:**
- Shows events from **today onwards** (start of current day)
- No end date (shows all future events)
- URL reflects active filters for shareable links

**Filter State:**
```typescript
interface EventStreamFilterValues {
    tags?: string[];           // Max 5 tags
    status?: string;           // Event status
    author?: string;           // Creator user ID
    timezone?: string;         // IANA timezone
    start_date?: number;       // Unix microseconds
    end_date?: number;         // Unix microseconds (optional)
}
```

## Date Handling

### ISO 8601 Format (pubky-app-specs)

Events use ISO 8601 strings as per RFC 5545:
```typescript
dtstart: "2025-12-25T18:00:00"        // Naive datetime (assume UTC)
dtstart: "2025-12-25T18:00:00Z"       // UTC
dtstart: "2025-12-25T18:00:00+01:00"  // Timezone offset
dtstart: "2025-12-25"                  // Date only (midnight UTC)
```

### Timestamp Conversion

**Backend (Rust):**
```rust
fn parse_dtstart_to_timestamp(dtstart: &str, _tzid: Option<&str>) -> Option<i64> {
    // Try RFC3339/ISO8601 with timezone
    if let Ok(dt) = DateTime::parse_from_rfc3339(dtstart) {
        return Some(dt.timestamp_micros());
    }
    
    // Try naive datetime (assume UTC)
    if let Ok(naive_dt) = NaiveDateTime::parse_from_str(dtstart, "%Y-%m-%dT%H:%M:%S") {
        let dt = DateTime::<Utc>::from_naive_utc_and_offset(naive_dt, Utc);
        return Some(dt.timestamp_micros());
    }
    
    // Try date only
    if let Ok(naive_date) = NaiveDate::parse_from_str(dtstart, "%Y-%m-%d") {
        let naive_dt = naive_date.and_hms_opt(0, 0, 0)?;
        let dt = DateTime::<Utc>::from_naive_utc_and_offset(naive_dt, Utc);
        return Some(dt.timestamp_micros());
    }
    
    None
}
```

**Frontend (TypeScript):**
```typescript
// Convert date input (YYYY-MM-DD) to microseconds
const parseDateFromInput = (dateString: string) => {
    if (!dateString) return undefined;
    const date = new Date(dateString);
    return date.getTime() * 1000; // ms → μs
};

// Convert microseconds to date input format
const formatDateForInput = (timestamp?: number) => {
    if (!timestamp) return "";
    const date = new Date(timestamp / 1000); // μs → ms
    return format(date, "yyyy-MM-dd");
};
```

## Filter Components

### Date Range Picker

**UI Component:**
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
    <Input
        type="date"
        value={formatDateForInput(filters.start_date)}
        onChange={(e) => onFiltersChange({
            ...filters,
            start_date: parseDateFromInput(e.target.value),
        })}
    />
    <Input
        type="date"
        value={formatDateForInput(filters.end_date)}
        onChange={(e) => onFiltersChange({
            ...filters,
            end_date: parseDateFromInput(e.target.value),
        })}
    />
</div>
```

**Date Range Badge:**
Shows current filter state:
- "From Dec 14, 2025" (only start date)
- "Until Dec 31, 2025" (only end date)  
- "Dec 14, 2025 - Dec 31, 2025" (both dates)
- "All events" (no date filter)

### Tags Filter

**Comma-Separated Serialization:**
```typescript
// Frontend sends: tags: ["dev", "free"] → URL: ?tags=dev,free
const apiParams = params?.tags
    ? { ...params, tags: params.tags.join(',') }
    : params;
```

**Backend Deserialization:**
```rust
// Shared utility: nexus-webapi/src/utils/serde_helpers.rs
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
#[derive(Deserialize)]
pub struct EventStreamQuery {
    #[serde(default, deserialize_with = "deserialize_comma_separated")]
    pub tags: Option<Vec<String>>,
}
```

## URL Sync & Shareable Links

**Implementation:**
```typescript
useEffect(() => {
    const params = new URLSearchParams();
    
    if (filters.tags && filters.tags.length > 0) {
        params.set("tags", filters.tags.join(","));
    }
    if (filters.status) params.set("status", filters.status);
    if (filters.author) params.set("author", filters.author);
    if (filters.timezone) params.set("timezone", filters.timezone);
    if (filters.start_date) params.set("start_date", filters.start_date.toString());
    if (filters.end_date) params.set("end_date", filters.end_date.toString());
    
    const newUrl = params.toString() ? `${pathname}?${params}` : pathname;
    router.replace(newUrl, { scroll: false });
}, [filters, pathname, router]);
```

**Example URLs:**
```
/events                                    # Upcoming events from today
/events?start_date=1734134400000000       # From specific date
/events?tags=meetup,conference             # Tagged events
/events?author=pk1...&status=CONFIRMED     # User's confirmed events
```

## Best Practices

### Event Creation

1. **Always provide ISO 8601 dtstart:**
   ```typescript
   dtstart: "2025-12-25T18:00:00"  // Required
   dtstart_tzid: "Europe/Zurich"   // Optional but recommended
   ```

2. **Use timezone identifiers:**
   - IANA format: `"America/New_York"`, `"Europe/Zurich"`
   - Avoid UTC offsets: `"+01:00"` (less portable)

3. **Validate with pubky-app-specs:**
   ```typescript
   import { validate, PubkyAppEvent } from "pubky-app-specs";
   
   const event: PubkyAppEvent = { /* ... */ };
   const errors = validate(event);
   ```

### Filtering Events

1. **Default to upcoming events:**
   ```typescript
   const today = new Date();
   today.setHours(0, 0, 0, 0);
   start_date: today.getTime() * 1000
   ```

2. **Use inclusive ranges:**
   - `start_date`: Events starting on/after this date
   - `end_date`: Events starting on/before this date

3. **Combine filters logically:**
   ```typescript
   // User's upcoming meetup events
   {
       author: "pk1abc...",
       tags: ["meetup"],
       start_date: Date.now() * 1000,
       status: "CONFIRMED"
   }
   ```

### Performance

1. **Index dtstart_timestamp:**
   ```cypher
   CREATE INDEX event_dtstart_timestamp IF NOT EXISTS
   FOR (e:Event) ON (e.dtstart_timestamp);
   ```

2. **Limit results:**
   ```typescript
   { limit: 100, skip: 0 }  // Pagination
   ```

3. **Filter server-side:**
   - Use backend date filtering (not client-side)
   - Reduces network payload
   - Faster rendering
