"use client";

import { Control, Controller, useFieldArray, useWatch } from "react-hook-form";
import type { EventFormData, EventLocation, LocationType } from "@/types/event";
import { FormSection } from "@/components/ui/form-section";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { CharacterCounter } from "@/components/ui/character-counter";
import { getUnicodeLength } from "@/lib/utils/unicode-length";
import { Plus, Trash2, MapPin, Video, Search, X, ExternalLink } from "lucide-react";
import { useState, useCallback, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { MapPreview } from "@/components/ui/map-preview";

// Validation constants from pubky-app-specs
const MAX_NAME_LENGTH = 500;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_LOCATIONS = 5;

// Nominatim types
interface NominatimResult {
    place_id: number;
    osm_type: string;
    osm_id: number;
    display_name: string;
    lat: string;
    lon: string;
    type: string;
    address?: {
        house_number?: string;
        road?: string;
        city?: string;
        town?: string;
        village?: string;
        state?: string;
        country?: string;
        postcode?: string;
    };
}

interface LocationFieldsProps {
    control: Control<EventFormData>;
}

/**
 * Location type options matching pubky-app-specs
 */
const LOCATION_TYPES: { value: LocationType; label: string; icon: React.ReactNode; description: string }[] = [
    {
        value: "PHYSICAL",
        label: "Physical Location",
        icon: <MapPin className="h-4 w-4" />,
        description: "In-person venue with address",
    },
    {
        value: "ONLINE",
        label: "Online Meeting",
        icon: <Video className="h-4 w-4" />,
        description: "Virtual meeting link",
    },
];

/**
 * Default empty location
 */
const createEmptyLocation = (type: LocationType = "PHYSICAL"): EventLocation => ({
    name: "",
    location_type: type,
    description: undefined,
    structured_data: undefined,
});

/**
 * Build OSM URL from Nominatim result
 */
function buildOsmUrl(result: NominatimResult): string {
    return `https://www.openstreetmap.org/${result.osm_type}/${result.osm_id}`;
}

/**
 * Single location card component
 */
function LocationCard({
    index,
    control,
    onRemove,
    canRemove,
}: {
    index: number;
    control: Control<EventFormData>;
    onRemove: () => void;
    canRemove: boolean;
}) {
    const location = useWatch({ control, name: `locations.${index}` }) as EventLocation | undefined;
    const locationType = location?.location_type || "PHYSICAL";
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [focusedIndex, setFocusedIndex] = useState(0);
    // Store selected coordinates for map preview
    const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lon: number } | null>(null);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const searchContainerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

    // Reset focused index when results change
    useEffect(() => {
        setFocusedIndex(0);
    }, [searchResults]);

    // Scroll focused item into view
    useEffect(() => {
        if (showResults && itemRefs.current[focusedIndex]) {
            itemRefs.current[focusedIndex]?.scrollIntoView({
                block: "nearest",
                behavior: "smooth",
            });
        }
    }, [focusedIndex, showResults]);

    // Close search results when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
                setShowResults(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Debounced Nominatim search
    const searchNominatim = useCallback(async (query: string) => {
        if (query.length < 3) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            // Use Nominatim with proper rate limiting
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?` +
                new URLSearchParams({
                    q: query,
                    format: "json",
                    addressdetails: "1",
                    limit: "5",
                }),
                {
                    headers: {
                        "User-Agent": "Eventky/1.0 (https://eventky.app)",
                    },
                }
            );
            const data = await response.json();
            setSearchResults(data);
            setShowResults(true);
        } catch (error) {
            console.error("Nominatim search error:", error);
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    }, []);

    // Handle search input with debounce (1 second to respect Nominatim rate limits)
    const handleSearchChange = useCallback((value: string) => {
        setSearchQuery(value);

        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        searchTimeoutRef.current = setTimeout(() => {
            searchNominatim(value);
        }, 1000);
    }, [searchNominatim]);

    // Keyboard navigation handler
    const handleKeyDown = useCallback((
        e: React.KeyboardEvent,
        onSelect: (result: NominatimResult) => void
    ) => {
        if (!showResults || searchResults.length === 0) return;

        switch (e.key) {
            case "ArrowDown":
                e.preventDefault();
                e.stopPropagation();
                setFocusedIndex((prev) =>
                    prev < searchResults.length - 1 ? prev + 1 : 0
                );
                break;
            case "ArrowUp":
                e.preventDefault();
                e.stopPropagation();
                setFocusedIndex((prev) =>
                    prev > 0 ? prev - 1 : searchResults.length - 1
                );
                break;
            case "Enter":
                e.preventDefault();
                e.stopPropagation();
                if (searchResults[focusedIndex]) {
                    onSelect(searchResults[focusedIndex]);
                }
                break;
            case "Escape":
                e.preventDefault();
                e.stopPropagation();
                setShowResults(false);
                break;
            case "Tab":
                setShowResults(false);
                break;
        }
    }, [showResults, searchResults, focusedIndex]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, []);

    return (
        <Card className="relative">
            <CardHeader className="pb-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                        <CardTitle className="text-base flex items-center gap-2">
                            {locationType === "PHYSICAL" ? (
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                            ) : (
                                <Video className="h-4 w-4 text-muted-foreground" />
                            )}
                            Location {index + 1}
                        </CardTitle>
                        <CardDescription>
                            {locationType === "PHYSICAL"
                                ? "Add a physical venue"
                                : "Add an online meeting link"}
                        </CardDescription>
                    </div>
                    {canRemove && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={onRemove}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Remove location</span>
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {/* Location Type Selector */}
                <Controller
                    name={`locations.${index}.location_type`}
                    control={control}
                    render={({ field }) => (
                        <div className="space-y-2">
                            <Label>Type</Label>
                            <Select
                                value={field.value}
                                onValueChange={(value: LocationType) => field.onChange(value)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {LOCATION_TYPES.map((type) => (
                                        <SelectItem key={type.value} value={type.value}>
                                            <div className="flex items-center gap-2">
                                                {type.icon}
                                                <span>{type.label}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                />

                {/* Name Field */}
                <Controller
                    name={`locations.${index}.name`}
                    control={control}
                    rules={{
                        required: "Location name is required",
                        maxLength: {
                            value: MAX_NAME_LENGTH,
                            message: `Name must not exceed ${MAX_NAME_LENGTH} characters`,
                        },
                    }}
                    render={({ field, fieldState }) => (
                        <div className="space-y-2">
                            <Label htmlFor={`location-name-${index}`}>
                                {locationType === "PHYSICAL" ? "Venue Name" : "Meeting Name"}*
                            </Label>
                            <Input
                                {...field}
                                id={`location-name-${index}`}
                                placeholder={locationType === "PHYSICAL"
                                    ? "e.g., Conference Center, Room 101"
                                    : "e.g., Weekly Standup"}
                                aria-invalid={!!fieldState.error}
                                className={fieldState.error ? "border-destructive" : ""}
                            />
                            <CharacterCounter
                                current={getUnicodeLength(field.value || "")}
                                max={MAX_NAME_LENGTH}
                            />
                            {fieldState.error && (
                                <p className="text-sm text-destructive">{fieldState.error.message}</p>
                            )}
                        </div>
                    )}
                />

                {/* Physical Location: Nominatim Search */}
                {locationType === "PHYSICAL" && (
                    <Controller
                        name={`locations.${index}`}
                        control={control}
                        render={({ field: locationField }) => {
                            const handleSelectResult = (result: NominatimResult) => {
                                const currentLocation = locationField.value as EventLocation;
                                locationField.onChange({
                                    ...currentLocation,
                                    name: currentLocation.name || result.display_name.split(",")[0],
                                    structured_data: buildOsmUrl(result),
                                });
                                setSelectedCoords({
                                    lat: parseFloat(result.lat),
                                    lon: parseFloat(result.lon),
                                });
                                setSearchQuery(result.display_name);
                                setShowResults(false);
                            };

                            return (
                                <div ref={searchContainerRef} className="space-y-1.5 relative">
                                    <Label>Search Address</Label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            ref={searchInputRef}
                                            value={searchQuery}
                                            onChange={(e) => handleSearchChange(e.target.value)}
                                            onKeyDown={(e) => handleKeyDown(e, handleSelectResult)}
                                            placeholder="Search for an address..."
                                            className="pl-9"
                                            onFocus={() => searchResults.length > 0 && setShowResults(true)}
                                        />
                                        {isSearching && (
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                            </div>
                                        )}
                                        {/* Search Results Dropdown - positioned directly under input */}
                                        {showResults && searchResults.length > 0 && (
                                            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-md max-h-[200px] overflow-y-auto p-1">
                                                {searchResults.map((result, resultIndex) => (
                                                    <button
                                                        key={result.place_id}
                                                        ref={(el) => {
                                                            itemRefs.current[resultIndex] = el;
                                                        }}
                                                        type="button"
                                                        className={cn(
                                                            "flex w-full cursor-pointer select-none flex-col items-start rounded-sm px-2 py-1.5 text-left outline-none transition-colors",
                                                            focusedIndex === resultIndex && "bg-accent/50"
                                                        )}
                                                        onClick={() => handleSelectResult(result)}
                                                        onMouseEnter={() => setFocusedIndex(resultIndex)}
                                                    >
                                                        <span className="text-sm truncate w-full text-left">
                                                            {result.display_name.split(",")[0]}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground truncate w-full text-left">
                                                            {result.display_name}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Search powered by OpenStreetMap Nominatim
                                    </p>
                                </div>
                            );
                        }}
                    />
                )}

                {/* Online Meeting: URL Field */}
                {locationType === "ONLINE" && (
                    <Controller
                        name={`locations.${index}.structured_data`}
                        control={control}
                        rules={{
                            required: "Meeting URL is required for online locations",
                            pattern: {
                                value: /^https?:\/\/.+/,
                                message: "Must be a valid URL (starting with http:// or https://)",
                            },
                        }}
                        render={({ field, fieldState }) => (
                            <div className="space-y-2">
                                <Label htmlFor={`location-url-${index}`}>Meeting URL*</Label>
                                <Input
                                    {...field}
                                    value={field.value || ""}
                                    id={`location-url-${index}`}
                                    type="url"
                                    placeholder="https://zoom.us/j/123456789"
                                    aria-invalid={!!fieldState.error}
                                    className={fieldState.error ? "border-destructive" : ""}
                                />
                                {fieldState.error && (
                                    <p className="text-sm text-destructive">{fieldState.error.message}</p>
                                )}
                            </div>
                        )}
                    />
                )}

                {/* Show OSM link if physical location has structured_data */}
                {locationType === "PHYSICAL" && location?.structured_data && (
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                        <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">Location linked</p>
                            <a
                                href={location.structured_data}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary hover:underline flex items-center gap-1"
                            >
                                View on OpenStreetMap
                                <ExternalLink className="h-3 w-3" />
                            </a>
                        </div>
                        <Controller
                            name={`locations.${index}.structured_data`}
                            control={control}
                            render={({ field }) => (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => {
                                        field.onChange(undefined);
                                        setSearchQuery("");
                                        setSelectedCoords(null);
                                    }}
                                >
                                    <X className="h-4 w-4" />
                                    <span className="sr-only">Remove link</span>
                                </Button>
                            )}
                        />
                    </div>
                )}

                {/* Map Preview for Physical Locations */}
                {locationType === "PHYSICAL" && location?.structured_data && selectedCoords && (
                    <div className="space-y-1">
                        <Label>Map Preview</Label>
                        <MapPreview
                            lat={selectedCoords.lat}
                            lon={selectedCoords.lon}
                            className="h-[150px] max-w-sm"
                        />
                    </div>
                )}

                {/* Description Field */}
                <Controller
                    name={`locations.${index}.description`}
                    control={control}
                    rules={{
                        maxLength: {
                            value: MAX_DESCRIPTION_LENGTH,
                            message: `Description must not exceed ${MAX_DESCRIPTION_LENGTH} characters`,
                        },
                    }}
                    render={({ field, fieldState }) => (
                        <div className="space-y-2">
                            <Label htmlFor={`location-desc-${index}`}>
                                Additional Instructions
                            </Label>
                            <Textarea
                                {...field}
                                value={field.value || ""}
                                id={`location-desc-${index}`}
                                placeholder={locationType === "PHYSICAL"
                                    ? "e.g., Enter through the side door, parking available"
                                    : "e.g., Meeting password: 123456"}
                                rows={2}
                                aria-invalid={!!fieldState.error}
                                className={cn(fieldState.error && "border-destructive")}
                            />
                            <CharacterCounter
                                current={getUnicodeLength(field.value || "")}
                                max={MAX_DESCRIPTION_LENGTH}
                            />
                            {fieldState.error && (
                                <p className="text-sm text-destructive">{fieldState.error.message}</p>
                            )}
                        </div>
                    )}
                />
            </CardContent>
        </Card>
    );
}

/**
 * LocationFields component - manages multiple locations for an event
 */
export function LocationFields({ control }: LocationFieldsProps) {
    const { fields, append, remove } = useFieldArray({
        control,
        name: "locations",
    });

    const handleAddLocation = (type: LocationType) => {
        if (fields.length < MAX_LOCATIONS) {
            append(createEmptyLocation(type));
        }
    };

    return (
        <FormSection
            title="Locations"
            description="Add one or more locations for your event (physical venues or online meetings)"
        >
            <div className="space-y-4">
                {/* Location Cards */}
                {fields.map((field, index) => (
                    <LocationCard
                        key={field.id}
                        index={index}
                        control={control}
                        onRemove={() => remove(index)}
                        canRemove={fields.length > 0}
                    />
                ))}

                {/* Add Location Buttons */}
                {fields.length < MAX_LOCATIONS && (
                    <div className="flex flex-wrap gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddLocation("PHYSICAL")}
                            className="gap-2"
                        >
                            <MapPin className="h-4 w-4" />
                            Add Physical Location
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddLocation("ONLINE")}
                            className="gap-2"
                        >
                            <Video className="h-4 w-4" />
                            Add Online Meeting
                        </Button>
                    </div>
                )}

                {/* Max locations reached */}
                {fields.length >= MAX_LOCATIONS && (
                    <p className="text-sm text-muted-foreground">
                        Maximum of {MAX_LOCATIONS} locations reached
                    </p>
                )}

                {/* Empty state */}
                {fields.length === 0 && (
                    <div className="text-center py-6 text-muted-foreground">
                        <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No locations added yet</p>
                        <p className="text-xs">Add a physical venue or online meeting link</p>
                    </div>
                )}
            </div>
        </FormSection>
    );
}
