"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, ExternalLink, Copy, Check } from "lucide-react";
import { useState } from "react";

interface LocationDisplayProps {
    /** Location name/address string */
    location?: string;
    /** Geographic coordinates in "lat;lng" format */
    geo?: string;
    /** Whether to show map preview */
    showMapPreview?: boolean;
    /** Additional CSS classes */
    className?: string;
}

/**
 * Display event location with optional map preview and actions
 */
export function LocationDisplay({
    location,
    geo,
    showMapPreview = true,
    className,
}: LocationDisplayProps) {
    const [copied, setCopied] = useState(false);

    const coordinates = useMemo(() => {
        if (!geo) return null;
        const [lat, lng] = geo.split(";").map(Number);
        if (isNaN(lat) || isNaN(lng)) return null;
        return { lat, lng };
    }, [geo]);

    const mapUrls = useMemo(() => {
        if (!coordinates) return null;
        const { lat, lng } = coordinates;
        const query = location ? encodeURIComponent(location) : `${lat},${lng}`;

        return {
            google: `https://www.google.com/maps/search/?api=1&query=${query}`,
            apple: `https://maps.apple.com/?q=${query}&ll=${lat},${lng}`,
            osm: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}&zoom=15`,
        };
    }, [coordinates, location]);

    const handleCopyLocation = async () => {
        const text = location
            ? coordinates
                ? `${location}\n${coordinates.lat}, ${coordinates.lng}`
                : location
            : coordinates
                ? `${coordinates.lat}, ${coordinates.lng}`
                : "";

        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Don't render if no location data
    if (!location && !geo) return null;

    return (
        <Card className={cn("", className)}>
            <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    Location
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Location Name */}
                {location && (
                    <div className="space-y-1">
                        <p className="font-medium text-base">{location}</p>
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

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                    {mapUrls && (
                        <>
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
                        </>
                    )}
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
            </CardContent>
        </Card>
    );
}
