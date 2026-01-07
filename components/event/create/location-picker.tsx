"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Search, MapPin, Loader2, X, Plus, ExternalLink } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { LOCATION_TYPES, EventLocation } from "@/types/event";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface OSMPlace {
    place_id: number;
    display_name: string;
    lat: string;
    lon: string;
    type: string;
    osm_type: string;
    osm_id: string;
}

interface LocationPickerProps {
    value: EventLocation[];
    onChange: (locations: EventLocation[]) => void;
}

/**
 * Generate a simple UID for a location
 */
function generateLocationUid(): string {
    return `loc-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Search OpenStreetMap Nominatim for places
 */
async function searchOSM(query: string): Promise<OSMPlace[]> {
    if (!query.trim()) return [];

    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
                query
            )}&limit=5`,
            {
                headers: {
                    "User-Agent": "Eventky/1.0",
                },
            }
        );

        if (!response.ok) throw new Error("Search failed");
        return await response.json();
    } catch (error) {
        console.error("OSM search error:", error);
        return [];
    }
}

/**
 * Debounce hook
 */
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}

export function LocationPicker({ value, onChange }: LocationPickerProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<OSMPlace[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const debouncedSearchQuery = useDebounce(searchQuery, 500);

    // Search OSM when query changes
    useEffect(() => {
        if (!debouncedSearchQuery.trim()) {
            setSearchResults([]);
            setShowResults(false);
            return;
        }

        setIsSearching(true);
        searchOSM(debouncedSearchQuery)
            .then((results) => {
                setSearchResults(results);
                setShowResults(true);
            })
            .finally(() => setIsSearching(false));
    }, [debouncedSearchQuery]);

    const handleSelectPlace = useCallback(
        (place: OSMPlace) => {
            const newLocation: EventLocation = {
                uid: generateLocationUid(),
                name: place.display_name,
                location_type: "venue", // Default type
                geo: `geo:${place.lat},${place.lon}`,
                structured_data_uri: `https://www.openstreetmap.org/${place.osm_type}/${place.osm_id}`,
            };

            onChange([...value, newLocation]);
            setSearchQuery("");
            setShowResults(false);
            setSearchResults([]);
        },
        [value, onChange]
    );

    const handleAddManual = useCallback(() => {
        const newLocation: EventLocation = {
            uid: generateLocationUid(),
            name: "",
            location_type: "venue",
        };
        onChange([...value, newLocation]);
    }, [value, onChange]);

    const handleRemoveLocation = useCallback(
        (uid: string) => {
            onChange(value.filter((loc) => loc.uid !== uid));
        },
        [value, onChange]
    );

    const handleUpdateLocation = useCallback(
        (uid: string, updates: Partial<EventLocation>) => {
            onChange(
                value.map((loc) =>
                    loc.uid === uid ? { ...loc, ...updates } : loc
                )
            );
        },
        [value, onChange]
    );

    return (
        <div className="space-y-4">
            {/* OSM Search */}
            <div className="space-y-2">
                <Label>Search Location</Label>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Search by address, place name, or coordinates..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => {
                            if (searchResults.length > 0) setShowResults(true);
                        }}
                        className="pl-10 pr-10"
                    />
                    {isSearching && (
                        <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                    )}
                    {searchQuery && !isSearching && (
                        <button
                            type="button"
                            onClick={() => {
                                setSearchQuery("");
                                setShowResults(false);
                                setSearchResults([]);
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}

                    {/* Search Results Dropdown */}
                    {showResults && searchResults.length > 0 && (
                        <Card className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-auto p-2">
                            {searchResults.map((place) => (
                                <button
                                    key={place.place_id}
                                    type="button"
                                    onClick={() => handleSelectPlace(place)}
                                    className="flex w-full items-start gap-2 rounded-md p-2 text-left hover:bg-accent"
                                >
                                    <MapPin className="mt-1 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                                    <div className="flex-1 overflow-hidden">
                                        <div className="truncate text-sm">{place.display_name}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {place.lat}, {place.lon}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </Card>
                    )}
                </div>

                <p className="text-xs text-muted-foreground">
                    Powered by OpenStreetMap · Search for addresses, landmarks, or coordinates
                </p>
            </div>

            {/* Manual Add Button */}
            {value.length === 0 && (
                <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddManual}
                    className="w-full"
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Location Manually
                </Button>
            )}

            {/* Selected Locations */}
            {value.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <Label>Locations ({value.length})</Label>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleAddManual}
                            disabled={value.length >= 10}
                        >
                            <Plus className="mr-1 h-3 w-3" />
                            Add Another
                        </Button>
                    </div>

                    {value.map((location, index) => (
                        <Card key={location.uid} className="p-4">
                            <div className="space-y-3">
                                {/* Location Header */}
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline">Location {index + 1}</Badge>
                                        {location.structured_data_uri && (
                                            <a
                                                href={location.structured_data_uri}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-muted-foreground hover:text-foreground"
                                            >
                                                <ExternalLink className="h-3 w-3" />
                                            </a>
                                        )}
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleRemoveLocation(location.uid)}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>

                                {/* Name */}
                                <div className="space-y-1">
                                    <Label htmlFor={`loc-name-${location.uid}`}>Name</Label>
                                    <Input
                                        id={`loc-name-${location.uid}`}
                                        type="text"
                                        placeholder="Convention Center, Main Hall"
                                        value={location.name || ""}
                                        onChange={(e) =>
                                            handleUpdateLocation(location.uid, { name: e.target.value })
                                        }
                                    />
                                </div>

                                {/* Type */}
                                <div className="space-y-1">
                                    <Label htmlFor={`loc-type-${location.uid}`}>Type</Label>
                                    <Select
                                        value={location.location_type || "venue"}
                                        onValueChange={(value) =>
                                            handleUpdateLocation(location.uid, { location_type: value })
                                        }
                                    >
                                        <SelectTrigger id={`loc-type-${location.uid}`}>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {LOCATION_TYPES.map((type) => (
                                                <SelectItem key={type} value={type}>
                                                    {type.charAt(0).toUpperCase() + type.slice(1).replace(/-/g, " ")}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Coordinates (read-only if from OSM) */}
                                {location.geo && (
                                    <div className="space-y-1">
                                        <Label>Coordinates</Label>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                type="text"
                                                value={location.geo.replace("geo:", "")}
                                                readOnly
                                                className="font-mono text-xs"
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    const coords = location.geo?.replace("geo:", "");
                                                    if (coords) {
                                                        const [lat, lon] = coords.split(",");
                                                        window.open(
                                                            `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}&zoom=15`,
                                                            "_blank"
                                                        );
                                                    }
                                                }}
                                            >
                                                <ExternalLink className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* Description */}
                                <div className="space-y-1">
                                    <Label htmlFor={`loc-desc-${location.uid}`}>Description (optional)</Label>
                                    <Input
                                        id={`loc-desc-${location.uid}`}
                                        type="text"
                                        placeholder="Enter through main entrance on 5th Avenue"
                                        value={location.description || ""}
                                        onChange={(e) =>
                                            handleUpdateLocation(location.uid, { description: e.target.value })
                                        }
                                    />
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            <p className="text-xs text-muted-foreground">
                Add up to 10 locations (venue, parking, dining, etc.)
            </p>
        </div>
    );
}
