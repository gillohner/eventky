"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, ExternalLink, Copy, Check, Video, Phone, Monitor, MessageSquare, Rss } from "lucide-react";
import { useState } from "react";
import type { EventLocation, EventConference } from "@/types/event";

interface LocationDisplayProps {
    /** Structured locations array (RFC 9073) */
    locations?: EventLocation[];
    /** Virtual conferences array (RFC 7986) */
    conferences?: EventConference[];
    /** Whether to show map preview */
    showMapPreview?: boolean;
    /** Additional CSS classes */
    className?: string;
}

/**
 * Parse geo URI (geo:lat,lon) to coordinates object
 */
function parseGeoUri(geo?: string): { lat: number; lng: number } | null {
    if (!geo) return null;
    const match = geo.match(/^geo:(-?[\d.]+),(-?[\d.]+)/);
    if (!match) return null;
    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[2]);
    if (isNaN(lat) || isNaN(lng)) return null;
    return { lat, lng };
}

/**
 * Get icon for conference feature
 */
function getFeatureIcon(feature: string) {
    switch (feature.toUpperCase()) {
        case "VIDEO": return <Video className="h-3 w-3" />;
        case "PHONE": return <Phone className="h-3 w-3" />;
        case "SCREEN": return <Monitor className="h-3 w-3" />;
        case "CHAT": return <MessageSquare className="h-3 w-3" />;
        case "FEED": return <Rss className="h-3 w-3" />;
        default: return null;
    }
}

/**
 * Display event location with optional map preview and actions
 * Supports RFC 9073 structured locations and RFC 7986 conferences
 */
export function LocationDisplay({
    locations,
    conferences,
    showMapPreview = true,
    className,
}: LocationDisplayProps) {
    const [copied, setCopied] = useState(false);

    // Get the primary location (first in array)
    const primaryLocation = locations?.[0];
    const coordinates = useMemo(() => parseGeoUri(primaryLocation?.geo), [primaryLocation?.geo]);

    const mapUrls = useMemo(() => {
        if (!coordinates) return null;
        const { lat, lng } = coordinates;
        const query = primaryLocation?.name ? encodeURIComponent(primaryLocation.name) : `${lat},${lng}`;

        return {
            google: `https://www.google.com/maps/search/?api=1&query=${query}`,
            apple: `https://maps.apple.com/?q=${query}&ll=${lat},${lng}`,
            osm: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}&zoom=15`,
            preview: `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=14&size=400x200&markers=${lat},${lng},red`,
        };
    }, [coordinates, primaryLocation?.name]);

    const handleCopyLocation = async () => {
        const text = primaryLocation?.name
            ? coordinates
                ? `${primaryLocation.name}\n${coordinates.lat}, ${coordinates.lng}`
                : primaryLocation.name
            : coordinates
                ? `${coordinates.lat}, ${coordinates.lng}`
                : "";

        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Don't render if no location data
    if ((!locations || locations.length === 0) && (!conferences || conferences.length === 0)) {
        return null;
    }

    return (
        <Card className={cn("", className)}>
            <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    Location
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Physical Locations */}
                {locations && locations.length > 0 && (
                    <div className="space-y-3">
                        {locations.map((loc, index) => (
                            <div key={loc.uid || index} className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <p className="font-medium text-base">{loc.name || "Unnamed Location"}</p>
                                    {loc.location_type && (
                                        <Badge variant="secondary" className="text-xs capitalize">
                                            {loc.location_type.replace(/-/g, " ")}
                                        </Badge>
                                    )}
                                </div>
                                {loc.description && (
                                    <p className="text-sm text-muted-foreground">{loc.description}</p>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Coordinates */}
                {coordinates && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Navigation className="h-4 w-4" />
                        <span>
                            {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
                        </span>
                    </div>
                )}

                {/* Map Preview */}
                {showMapPreview && mapUrls && (
                    <div className="relative rounded-lg overflow-hidden border">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={mapUrls.preview}
                            alt={`Map showing ${primaryLocation?.name || "event location"}`}
                            className="w-full h-40 object-cover"
                            loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                    </div>
                )}

                {/* Map Links */}
                {mapUrls && (
                    <div className="flex flex-wrap gap-2">
                        <Button asChild variant="outline" size="sm">
                            <a href={mapUrls.google} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4 mr-1" />
                                Google Maps
                            </a>
                        </Button>
                        <Button asChild variant="outline" size="sm">
                            <a href={mapUrls.apple} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4 mr-1" />
                                Apple Maps
                            </a>
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleCopyLocation}
                        >
                            {copied ? (
                                <>
                                    <Check className="h-4 w-4 mr-1" />
                                    Copied
                                </>
                            ) : (
                                <>
                                    <Copy className="h-4 w-4 mr-1" />
                                    Copy
                                </>
                            )}
                        </Button>
                    </div>
                )}

                {/* Virtual Conferences */}
                {conferences && conferences.length > 0 && (
                    <div className="space-y-2 pt-2 border-t">
                        <p className="text-sm font-medium text-muted-foreground">Virtual Meeting</p>
                        {conferences.map((conf, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <Button asChild variant="default" size="sm">
                                    <a href={conf.uri} target="_blank" rel="noopener noreferrer">
                                        <Video className="h-4 w-4 mr-1" />
                                        {conf.label || "Join Meeting"}
                                    </a>
                                </Button>
                                {conf.features && conf.features.length > 0 && (
                                    <div className="flex gap-1">
                                        {conf.features.map((feat) => (
                                            <span key={feat} className="text-muted-foreground" title={feat}>
                                                {getFeatureIcon(feat)}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
