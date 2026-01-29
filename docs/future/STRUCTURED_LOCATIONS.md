# Structured Locations Implementation Plan

## Overview

Replace simple `location` + `geo` strings with RFC 9073-based structured locations, supporting physical venues and online meetings.

**RFC Basis**:
- [RFC 9073](https://datatracker.ietf.org/doc/html/rfc9073) - VLOCATION component
- [RFC 5545](https://datatracker.ietf.org/doc/html/rfc5545) - GEO property

**Legacy Fields**: Existing `location`/`geo` fields are ignored. No migration needed (few events exist).

**Implementation Status**:
- [x] Phase 1: pubky-app-specs - Location model created, PubkyAppEvent updated
- [x] Phase 3: Nexus - EventDetails updated, Neo4j queries updated
- [ ] Phase 2: Eventky UI - Components pending

---

## RFC 9073 VLOCATION Structure

```ics
BEGIN:VLOCATION
UID:location-1
NAME:Hafenbar zur Metzgerhalle
DESCRIPTION:Enter through the back door
LOCATION-TYPE:PHYSICAL
STRUCTURED-DATA;VALUE=URI:https://www.openstreetmap.org/node/1573053883
END:VLOCATION
```

### Location Types

| Type | Description | Form Inputs |
|------|-------------|-------------|
| `PHYSICAL` | In-person venue | Simple text OR Nominatim search (fills structured_data) |
| `ONLINE` | Virtual meeting | Meeting URL (platform inferred at display time) |

**Physical locations can be:**
- **Simple**: Just a name string (e.g., "My backyard")
- **Full**: Nominatim search → name, structured_data (OSM URL)

### STRUCTURED-DATA Usage

For physical locations with OSM reference:
```
STRUCTURED-DATA;VALUE=URI:https://www.openstreetmap.org/node/1573053883
```

This enables:
- Fetching coordinates from OSM at display time for map links
- Fetching BTCMap payment tags at display time
- Direct link to BTCMap merchant page

---

## Phase 1: pubky-app-specs - Location Model

### 1.1 Create `Location` Model

**File**: `pubky-app-specs/src/models/location.rs` ✅ IMPLEMENTED

```rust
use serde::{Deserialize, Serialize};

#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

#[cfg(feature = "openapi")]
use utoipa::ToSchema;

// Validation constants
const MAX_NAME_LENGTH: usize = 500;
const MAX_DESCRIPTION_LENGTH: usize = 2000;
const MAX_STRUCTURED_DATA_LENGTH: usize = 2048;

/// Maximum number of locations per event
pub const MAX_LOCATIONS: usize = 5;

/// RFC 9073 LOCATION-TYPE
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Default)]
#[cfg_attr(feature = "openapi", derive(ToSchema))]
#[serde(rename_all = "UPPERCASE")]
pub enum LocationType {
    #[default]
    Physical,
    Online,
}

/// Structured location (RFC 9073 VLOCATION)
/// 
/// Events can have multiple locations. First is primary.
/// Physical locations can be simple (name only) or full (with OSM link).
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Default)]
#[cfg_attr(feature = "openapi", derive(ToSchema))]
pub struct Location {
    /// Human-readable location name (required)
    /// Examples: "Hafenbar zur Metzgerhalle", "My backyard", "Zoom Call"
    pub name: String,
    
    /// Additional details or instructions
    pub description: Option<String>,
    
    /// PHYSICAL or ONLINE
    pub location_type: LocationType,
    
    /// URI reference (RFC 9073 STRUCTURED-DATA)
    /// Physical: OSM URL (https://openstreetmap.org/node/123) - fetch coords & BTCMap
    /// Online: Meeting URL (https://zoom.us/j/123)
    pub structured_data: Option<String>,
}

impl Location {
    /// Simple physical location (just a name)
    pub fn physical(name: impl Into<String>) -> Self {
        Self {
            name: name.into(),
            location_type: LocationType::Physical,
            ..Default::default()
        }
    }

    /// Online location with meeting URL
    pub fn online(name: impl Into<String>, url: impl Into<String>) -> Self {
        Self {
            name: name.into(),
            location_type: LocationType::Online,
            structured_data: Some(url.into()),
            ..Default::default()
        }
    }

    /// Physical location with OSM reference (from Nominatim search)
    pub fn physical_with_osm(name: impl Into<String>, osm_url: impl Into<String>) -> Self {
        Self {
            name: name.into(),
            location_type: LocationType::Physical,
            structured_data: Some(osm_url.into()),
            ..Default::default()
        }
    }

    /// Check if this has an OSM reference (for BTCMap & map links)
    pub fn has_osm_link(&self) -> bool {
        self.structured_data
            .as_ref()
            .map(|u| u.contains("openstreetmap.org"))
            .unwrap_or(false)
    }

    /// Extract OSM type and ID from structured_data
    pub fn osm_id(&self) -> Option<(&str, &str)> {
        let uri = self.structured_data.as_ref()?;
        for prefix in ["node/", "way/", "relation/"] {
            if let Some(pos) = uri.find(prefix) {
                let osm_type = prefix.trim_end_matches('/');
                let start = pos + prefix.len();
                let id = uri[start..].split(&['?', '#', '/'][..]).next()?;
                return Some((osm_type, id));
            }
        }
        None
    }
}

impl Validatable for Location {
    fn sanitize(self) -> Self {
        Self {
            name: self.name.trim().chars().take(MAX_NAME_LENGTH).collect(),
            description: self.description.map(|s| s.trim().chars().take(MAX_DESCRIPTION_LENGTH).collect()),
            location_type: self.location_type,
            structured_data: self.structured_data.map(|s| s.trim().chars().take(MAX_STRUCTURED_DATA_LENGTH).collect()),
        }
    }

    fn validate(&self, _id: Option<&str>) -> Result<(), String> {
        if self.name.is_empty() {
            return Err("Validation Error: Location name is required".into());
        }
        
        // Online locations require structured_data (meeting URL)
        if self.location_type == LocationType::Online && self.structured_data.is_none() {
            return Err("Validation Error: Online locations require a meeting URL".into());
        }
        
        if let Some(ref uri) = self.structured_data {
            if !uri.starts_with("https://") && !uri.starts_with("http://") {
                return Err("Validation Error: structured_data must be a valid URL".into());
            }
        }
        
        Ok(())
    }
}
```

### 1.2 Update `PubkyAppEvent` Model ✅ IMPLEMENTED

**File**: `pubky-app-specs/src/models/event.rs`

```rust
// RFC 9073 - Structured Locations
/// Structured locations for this event (RFC 9073 VLOCATION)
/// First location is considered primary. Supports multiple for hybrid events.
/// Note: Legacy `location` and `geo` fields are ignored - use `locations` instead.
#[cfg_attr(target_arch = "wasm32", wasm_bindgen(skip))]
pub locations: Option<Vec<Location>>,

// Legacy location fields (deprecated - use `locations` instead)
#[cfg_attr(target_arch = "wasm32", wasm_bindgen(skip))]
#[serde(skip_serializing_if = "Option::is_none")]
pub location: Option<String>,       // DEPRECATED
#[cfg_attr(target_arch = "wasm32", wasm_bindgen(skip))]
#[serde(skip_serializing_if = "Option::is_none")]
pub geo: Option<String>,            // DEPRECATED
```

### 1.3 Export from lib.rs ✅ IMPLEMENTED

```rust
pub use models::location::{Location, LocationType, MAX_LOCATIONS};
```

---

## Phase 2: Eventky UI Components

### 2.1 Location Type Definitions

**File**: `eventky/types/location.ts`

```typescript
/**
 * Structured location - matches pubky-app-specs Location
 */

export type LocationType = 'PHYSICAL' | 'ONLINE';

export interface Location {
  name: string;              // Required
  description?: string;
  location_type: LocationType;
  geo?: string;              // "lat;lon" - from Nominatim, enables map URLs
  structured_data?: string;  // OSM URL (physical) or meeting URL (online)
}

/** BTCMap tags fetched from OSM at display time (NOT stored in event) */
export interface BtcMapTags {
  currency_xbt?: boolean;
  payment_onchain?: boolean;
  payment_lightning?: boolean;
  payment_lightning_contactless?: boolean;
  check_date_currency_xbt?: string;
}

/** Parse OSM URL to extract type and ID */
export function parseOsmUrl(url: string): { type: string; id: string } | null {
  const match = url.match(/openstreetmap\.org\/(node|way|relation)\/(\d+)/);
  return match ? { type: match[1], id: match[2] } : null;
}

/** Infer platform from meeting URL for display */
export function inferPlatform(url: string): string | null {
  if (url.includes('zoom.us')) return 'Zoom';
  if (url.includes('meet.google.com')) return 'Google Meet';
  if (url.includes('meet.jit.si')) return 'Jitsi';
  if (url.includes('teams.microsoft.com')) return 'Teams';
  if (url.includes('webex.com')) return 'Webex';
  return null;
}

/** Generate map URLs from coordinates */
export function getMapUrls(geo: string) {
  const [lat, lon] = geo.split(';').map(Number);
  if (isNaN(lat) || isNaN(lon)) return null;
  return {
    google: `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`,
    apple: `https://maps.apple.com/?ll=${lat},${lon}`,
    osm: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}&zoom=17`,
  };
}

/** Generate BTCMap merchant URL from OSM ID */
export function getBtcMapUrl(osmId: string): string {
  return `https://btcmap.org/merchant/${osmId}`;
}
```

### 2.2 Location Fields Component

**File**: `eventky/components/event/create/location-fields.tsx`

```typescript
"use client";

import { Control, Controller, useFieldArray, useWatch } from "react-hook-form";
import type { EventFormData } from "@/types/event";
import type { Location, LocationType } from "@/types/location";
import { FormSection } from "@/components/ui/form-section";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Video, Trash2, GripVertical } from "lucide-react";
import { NominatimSearch } from "./location/nominatim-search";

interface LocationFieldsProps {
  control: Control<EventFormData>;
}

export function LocationFields({ control }: LocationFieldsProps) {
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: "locations",
  });

  const addPhysical = () => append({
    location_type: 'PHYSICAL',
    name: '',
  } as Location);

  const addOnline = () => append({
    location_type: 'ONLINE',
    name: '',
    structured_data: '',
  } as Location);

  return (
    <FormSection
      title="Locations"
      description="Where is your event? Add multiple for hybrid events."
    >
      <div className="space-y-4">
        {fields.map((field, index) => (
          <LocationCard
            key={field.id}
            index={index}
            control={control}
            onRemove={() => remove(index)}
            onMoveUp={() => index > 0 && move(index, index - 1)}
            isPrimary={index === 0}
          />
        ))}
      </div>

      <div className="flex gap-2 mt-4">
        <Button type="button" variant="outline" size="sm" onClick={addPhysical}>
          <MapPin className="h-4 w-4 mr-2" />
          Add Physical Location
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={addOnline}>
          <Video className="h-4 w-4 mr-2" />
          Add Online Meeting
        </Button>
      </div>
    </FormSection>
  );
}

function LocationCard({ index, control, onRemove, onMoveUp, isPrimary }: {
  index: number;
  control: Control<EventFormData>;
  onRemove: () => void;
  onMoveUp: () => void;
  isPrimary: boolean;
}) {
  const locationType = useWatch({
    control,
    name: `locations.${index}.location_type`,
  }) as LocationType;

  return (
    <Card className={isPrimary ? "border-primary" : ""}>
      <CardContent className="pt-4">
        <div className="flex items-start gap-2">
          <Button type="button" variant="ghost" size="icon" onClick={onMoveUp}>
            <GripVertical className="h-4 w-4" />
          </Button>

          <div className="flex-1 space-y-4">
            {isPrimary && (
              <span className="text-xs text-primary font-medium">Primary</span>
            )}

            {locationType === 'PHYSICAL' ? (
              <PhysicalFields control={control} index={index} />
            ) : (
              <OnlineFields control={control} index={index} />
            )}
          </div>

          <Button type="button" variant="ghost" size="icon" onClick={onRemove}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PhysicalFields({ control, index }: { control: Control<EventFormData>; index: number }) {
  const [useNominatim, setUseNominatim] = useState(true);
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          Physical Location
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setUseNominatim(!useNominatim)}
        >
          {useNominatim ? "Enter manually" : "Search address"}
        </Button>
      </div>

      {useNominatim ? (
        /* Nominatim search - auto-fills name, geo, structured_data (OSM URL) */
        <NominatimSearch control={control} index={index} />
      ) : (
        /* Simple text input - just name, no coordinates */
        <Controller
          name={`locations.${index}.name`}
          control={control}
          rules={{ required: "Location name is required" }}
          render={({ field }) => (
            <div className="space-y-2">
              <Label>Location Name *</Label>
              <Input {...field} placeholder="My backyard, Room 101, etc." />
            </div>
          )}
        />
      )}

      <Controller
        name={`locations.${index}.description`}
        control={control}
        render={({ field }) => (
          <div className="space-y-2">
            <Label>Instructions (optional)</Label>
            <Textarea {...field} placeholder="Enter through the back door..." />
          </div>
        )}
      />
    </div>
  );
}

function OnlineFields({ control, index }: { control: Control<EventFormData>; index: number }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Video className="h-4 w-4" />
        Online Meeting
      </div>

      <Controller
        name={`locations.${index}.name`}
        control={control}
        render={({ field }) => (
          <div className="space-y-2">
            <Label>Meeting Name (optional)</Label>
            <Input {...field} placeholder="Weekly Standup" />
          </div>
        )}
      />

      <Controller
        name={`locations.${index}.structured_data`}
        control={control}
        rules={{ required: "Meeting URL is required" }}
        render={({ field }) => (
          <div className="space-y-2">
            <Label>Meeting URL *</Label>
            <Input {...field} type="url" placeholder="https://zoom.us/j/123456789" />
            <p className="text-xs text-muted-foreground">
              Platform will be detected automatically
            </p>
          </div>
        )}
      />

      <Controller
        name={`locations.${index}.description`}
        control={control}
        render={({ field }) => (
          <div className="space-y-2">
            <Label>Instructions (optional)</Label>
            <Textarea {...field} placeholder="Meeting ID: 123-456-789, Passcode: abc" />
          </div>
        )}
      />
    </div>
  );
}
```

### 2.3 Nominatim Search Component

**File**: `eventky/components/event/create/location/nominatim-search.tsx`

```typescript
"use client";

import { useState } from "react";
import { Control, useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2 } from "lucide-react";
import { useDebouncedCallback } from "use-debounce";

interface NominatimResult {
  place_id: number;
  osm_type: string;
  osm_id: number;
  lat: string;
  lon: string;
  display_name: string;
}

interface NominatimSearchProps {
  control: Control<any>;
  index: number;
  onSelect?: (result: NominatimResult) => void;
}

export function NominatimSearch({ control, index, onSelect }: NominatimSearchProps) {
  const { setValue } = useFormContext();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useDebouncedCallback(async (q: string) => {
    if (q.length < 3) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
        new URLSearchParams({ q, format: "json", limit: "5" }),
        { headers: { "User-Agent": "Eventky/1.0" } }
      );
      setResults(await response.json());
    } catch (error) {
      console.error("Nominatim search error:", error);
    } finally {
      setLoading(false);
    }
  }, 300);

  const handleSelect = (result: NominatimResult) => {
    // Auto-fill form fields from Nominatim result
    setValue(`locations.${index}.name`, result.display_name.split(",")[0]);
    // geo enables map URL generation (Google Maps, Apple Maps, OSM)
    setValue(`locations.${index}.geo`, `${result.lat};${result.lon}`);
    // structured_data is OSM URL for BTCMap integration
    setValue(`locations.${index}.structured_data`, 
      `https://www.openstreetmap.org/${result.osm_type}/${result.osm_id}`
    );

    setQuery(result.display_name);
    setResults([]);
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            search(e.target.value);
          }}
          placeholder="Search for address..."
          className="pr-10"
        />
        {loading ? (
          <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin" />
        ) : (
          <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
        )}
      </div>

      {results.length > 0 && (
        <ul className="border rounded-md divide-y max-h-48 overflow-auto">
          {results.map((result) => (
            <li key={result.place_id}>
              <Button
                type="button"
                variant="ghost"
                className="w-full justify-start text-left h-auto py-2"
                onClick={() => handleSelect(result)}
              >
                <span className="text-sm truncate">{result.display_name}</span>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

### 2.4 Location Display Component

**File**: `eventky/components/event/detail/location-display.tsx`

```typescript
"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Video, ExternalLink, Bitcoin, Zap, Map } from "lucide-react";
import type { Location, BtcMapTags } from "@/types/location";
import { parseOsmUrl, getMapUrls, getBtcMapUrl, inferPlatform } from "@/types/location";

const LocationMap = dynamic(() => import("./location-map"), {
  ssr: false,
  loading: () => <div className="h-64 bg-muted animate-pulse rounded-lg" />,
});

interface LocationDisplayProps {
  locations?: Location[];
  className?: string;
}

export function LocationDisplay({ locations, className }: LocationDisplayProps) {
  if (!locations?.length) return null;

  const primaryGeo = locations.find(l => l.geo)?.geo;

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <MapPin className="h-5 w-5 text-muted-foreground" />
          {locations.length > 1 ? 'Locations' : 'Location'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {primaryGeo && <LocationMap geo={primaryGeo} />}

        <div className="space-y-3">
          {locations.map((loc, i) => (
            <LocationItem key={i} location={loc} isPrimary={i === 0} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function LocationItem({ location, isPrimary }: { location: Location; isPrimary: boolean }) {
  if (location.location_type === 'ONLINE') {
    return <OnlineLocationItem location={location} />;
  }
  return <PhysicalLocationItem location={location} isPrimary={isPrimary} />;
}

function PhysicalLocationItem({ location, isPrimary }: { location: Location; isPrimary: boolean }) {
  const [btcmapTags, setBtcmapTags] = useState<BtcMapTags | null>(null);
  
  // geo field enables map URL generation (from Nominatim search)
  const mapUrls = location.geo ? getMapUrls(location.geo) : null;
  // structured_data contains OSM URL for BTCMap lookup
  const osmInfo = location.structured_data ? parseOsmUrl(location.structured_data) : null;

  // Fetch BTCMap tags from OSM at display time
  useEffect(() => {
    if (!osmInfo) return;
    
    fetch(`https://api.openstreetmap.org/api/0.6/${osmInfo.type}/${osmInfo.id}.json`)
      .then(res => res.json())
      .then(data => {
        const tags = data.elements[0]?.tags || {};
        if (tags["currency:XBT"] === "yes") {
          setBtcmapTags({
            currency_xbt: true,
            payment_onchain: tags["payment:onchain"] === "yes",
            payment_lightning: tags["payment:lightning"] === "yes",
            payment_lightning_contactless: tags["payment:lightning_contactless"] === "yes",
            check_date_currency_xbt: tags["check_date:currency:XBT"],
          });
        }
      })
      .catch(console.error);
  }, [osmInfo?.type, osmInfo?.id]);

  return (
    <div className="p-3 border rounded-lg space-y-2">
      <div className="flex items-start justify-between">
        <div>
          {isPrimary && <Badge variant="outline" className="mb-1">Primary</Badge>}
          {location.name && <p className="font-medium">{location.name}</p>}
          {location.description && (
            <p className="text-sm text-muted-foreground">{location.description}</p>
          )}
        </div>
        <MapPin className="h-4 w-4 text-muted-foreground" />
      </div>

      {btcmapTags?.currency_xbt && <BtcMapPaymentBadges tags={btcmapTags} />}

      {mapUrls && (
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <a href={mapUrls.google} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3 w-3 mr-1" /> Google
            </a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href={mapUrls.apple} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3 w-3 mr-1" /> Apple
            </a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href={mapUrls.osm} target="_blank" rel="noopener noreferrer">
              <Map className="h-3 w-3 mr-1" /> OSM
            </a>
          </Button>
          {osmInfo && btcmapTags?.currency_xbt && (
            <Button asChild variant="outline" size="sm" className="border-orange-500 text-orange-600">
              <a href={getBtcMapUrl(osmInfo.id)} target="_blank" rel="noopener noreferrer">
                <Bitcoin className="h-3 w-3 mr-1" /> BTCMap
              </a>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function OnlineLocationItem({ location }: { location: Location }) {
  // Platform inferred from URL at display time (no preset stored)
  const platform = location.structured_data ? inferPlatform(location.structured_data) : null;
  
  return (
    <div className="p-3 border rounded-lg space-y-2">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium flex items-center gap-2">
            <Video className="h-4 w-4" />
            {location.name || platform || 'Online Meeting'}
          </p>
          {location.description && (
            <p className="text-sm text-muted-foreground">{location.description}</p>
          )}
        </div>
      </div>
      {location.structured_data && (
        <Button asChild className="w-full">
          <a href={location.structured_data} target="_blank" rel="noopener noreferrer">
            Join {platform || 'Meeting'}
          </a>
        </Button>
      )}
    </div>
  );
}

function BtcMapPaymentBadges({ tags }: { tags: BtcMapTags }) {
  return (
    <div className="flex items-center gap-3 p-2 bg-orange-50 dark:bg-orange-950 rounded-md">
      <Bitcoin className="h-5 w-5 text-orange-500" />
      <div className="flex-1">
        <p className="text-sm font-medium">Bitcoin Accepted</p>
        <div className="flex flex-wrap gap-2 mt-1">
          {tags.payment_lightning && (
            <Badge variant="secondary" className="text-xs">
              <Zap className="h-3 w-3 mr-1" /> Lightning
            </Badge>
          )}
          {tags.payment_lightning_contactless && (
            <Badge variant="secondary" className="text-xs">📱 NFC</Badge>
          )}
          {tags.payment_onchain && (
            <Badge variant="secondary" className="text-xs">🔗 On-chain</Badge>
          )}
        </div>
        {tags.check_date_currency_xbt && (
          <p className="text-xs text-muted-foreground mt-1">
            Verified: {tags.check_date_currency_xbt}
          </p>
        )}
      </div>
    </div>
  );
}
```

### 2.5 Embedded Map Component

**File**: `eventky/components/event/detail/location-map.tsx`

```typescript
"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export default function LocationMap({ geo }: { geo: string }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const [lat, lng] = geo.split(";").map(Number);
    if (isNaN(lat) || isNaN(lng)) return;

    const map = L.map(mapRef.current).setView([lat, lng], 15);
    mapInstance.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    L.marker([lat, lng]).addTo(map);

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, [geo]);

  return <div ref={mapRef} className="h-64 rounded-lg overflow-hidden border" />;
}
```

---

## Phase 3: Nexus Integration

### 3.1 Update Event Details Model

**File**: `pubky-nexus/nexus-common/src/models/event/details.rs` ✅ IMPLEMENTED

```rust
pub struct EventDetails {
    // ... existing fields ...
    
    // RFC 9073 Structured Locations (serialized JSON array)
    /// Structured locations for this event (RFC 9073 VLOCATION)
    /// Contains serialized JSON array of Location objects
    #[serde(skip_serializing_if = "Option::is_none")]
    pub locations: Option<String>,
    
    // NOTE: location and geo fields removed - use locations instead
}
```

---

## Phase 4: Dependencies

**eventky/package.json**:
```json
{
  "dependencies": {
    "leaflet": "^1.9.4",
    "use-debounce": "^10.0.0"
  },
  "devDependencies": {
    "@types/leaflet": "^1.9.8"
  }
}
```

---

## Summary

### Data Model (Final)

```typescript
interface Location {
  name: string;              // Required - venue name or meeting title
  description?: string;      // Optional additional details
  location_type: LocationType; // 'PHYSICAL' | 'ONLINE'
  structured_data?: string;  // OSM URL (physical) or meeting URL (online)
}
```

**No `geo` field** - coordinates are fetched from OSM at display time using `structured_data` URL.

### Form Behavior by Type

| Type | Input Fields |
|------|--------------|
| **PHYSICAL (Nominatim)** | Search → auto-fills name, structured_data (OSM URL); description optional |
| **PHYSICAL (Simple)** | Manual name input (just text); description optional |
| **ONLINE** | Meeting URL in structured_data (required), name optional, description optional |

### No Legacy Migration

- Old events with `location` + `geo` fields are simply ignored (fields removed from Nexus)
- New events use `locations: Vec<Location>`
- No conversion logic needed - clean break

### BTCMap & Map Links Integration

When `structured_data` contains an OSM URL (e.g., `https://openstreetmap.org/node/123`):
1. Fetch from OSM API: `GET /api/0.6/node/123.json`
2. Response includes:
   - `lat`, `lon` → Generate map links (Google, Apple, OSM)
   - `tags` → Check for BTCMap data (`currency:XBT`, `payment:lightning`, etc.)

**Single fetch, multiple uses** - no separate `geo` field needed.

### Platform Detection (Online)

Platform inferred from URL at display time:
- `zoom.us` → "Zoom"
- `meet.google.com` → "Google Meet"
- `meet.jit.si` → "Jitsi"
- etc.

No storage overhead, always up-to-date.
