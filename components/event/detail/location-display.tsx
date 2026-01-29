"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPreview } from "@/components/ui/map-preview";
import type { NexusLocation } from "@/types/nexus";
import {
    MapPin,
    Video,
    ExternalLink,
    Map,
    Bitcoin,
    Zap,
    NfcIcon,
} from "lucide-react";

interface LocationDisplayProps {
    /** Serialized locations JSON string from Nexus */
    locations?: string;
    /** Additional CSS classes */
    className?: string;
}

/** BTCMap element response */
interface BTCMapElement {
    id: string;
    osm_json: {
        type: string;
        id: number;
        lat?: number;
        lon?: number;
        center?: { lat: number; lon: number };
        tags?: Record<string, string>;
    };
    tags: Record<string, string>;
}

/** Payment methods parsed from BTCMap tags */
interface PaymentMethods {
    onchain: boolean;
    lightning: boolean;
    lightningContactless: boolean;
    btcmapId?: string;
}

/**
 * Parse OSM URL to extract osm_type and osm_id
 * Example: https://www.openstreetmap.org/node/1573053883
 */
function parseOsmUrl(url: string): { osmType: string; osmId: number } | null {
    const match = url.match(/openstreetmap\.org\/(node|way|relation)\/(\d+)/);
    if (!match) return null;
    return { osmType: match[1], osmId: parseInt(match[2], 10) };
}

/**
 * Extract coordinates from OSM URL by fetching from Nominatim
 */
async function fetchCoordsFromOsm(
    osmType: string,
    osmId: number
): Promise<{ lat: number; lon: number } | null> {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/lookup?osm_ids=${osmType[0].toUpperCase()}${osmId}&format=json`,
            {
                headers: {
                    "User-Agent": "Eventky/1.0 (https://eventky.app)",
                },
            }
        );
        const data = await response.json();
        if (data && data[0]) {
            return {
                lat: parseFloat(data[0].lat),
                lon: parseFloat(data[0].lon),
            };
        }
    } catch (error) {
        console.error("Failed to fetch coords from OSM:", error);
    }
    return null;
}

/**
 * Fetch BTCMap data for an OSM element
 * Returns the OSM tags which contain payment info
 */
async function fetchBTCMapData(
    osmType: string,
    osmId: number
): Promise<{ tags: Record<string, string>; lat?: number; lon?: number } | null> {
    try {
        // BTCMap API uses format like "node:1573053883"
        const response = await fetch(
            `https://api.btcmap.org/v2/elements/${osmType}:${osmId}`
        );
        if (!response.ok) {
            // Element not found in BTCMap
            return null;
        }
        const data: BTCMapElement = await response.json();
        // Payment tags are in osm_json.tags, not the top-level tags
        return {
            tags: data.osm_json?.tags || {},
            lat: data.osm_json?.lat ?? data.osm_json?.center?.lat,
            lon: data.osm_json?.lon ?? data.osm_json?.center?.lon,
        };
    } catch (error) {
        // Not an error - just means it's not in BTCMap
        return null;
    }
}

/**
 * Parse payment methods from BTCMap tags
 */
function parsePaymentMethods(
    tags: Record<string, string>,
    btcmapId?: string
): PaymentMethods | null {
    // Check if Bitcoin is accepted
    const hasBtc =
        tags["currency:XBT"] === "yes" ||
        tags["payment:bitcoin"] === "yes";

    if (!hasBtc) return null;

    return {
        onchain: tags["payment:onchain"] === "yes" || tags["payment:bitcoin"] === "yes",
        lightning: tags["payment:lightning"] === "yes",
        lightningContactless: tags["payment:lightning_contactless"] === "yes",
        btcmapId,
    };
}

/**
 * Build Google Maps URL with coordinates and name
 */
function buildGoogleMapsUrl(lat: number, lon: number, name: string): string {
    const query = encodeURIComponent(name);
    return `https://www.google.com/maps/search/?api=1&query=${query}&query_place_id=&center=${lat},${lon}`;
}

/**
 * Build Apple Maps URL with coordinates and name
 * Apple Maps uses OSM data so coordinates should match well
 */
function buildAppleMapsUrl(lat: number, lon: number, name: string): string {
    const query = encodeURIComponent(name);
    return `https://maps.apple.com/?q=${query}&ll=${lat},${lon}&z=17`;
}

/**
 * Build BTCMap merchant URL
 */
function buildBTCMapUrl(osmType: string, osmId: number): string {
    return `https://btcmap.org/merchant/${osmType}:${osmId}`;
}

/**
 * Single location item component
 */
function LocationItem({
    location,
    index,
}: {
    location: NexusLocation;
    index: number;
}) {
    const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethods | null>(null);
    const [isLoadingPayment, setIsLoadingPayment] = useState(false);
    const [osmInfo, setOsmInfo] = useState<{ osmType: string; osmId: number } | null>(null);

    const isPhysical = location.location_type === "PHYSICAL";
    const isOnline = location.location_type === "ONLINE";

    // Fetch coordinates and BTCMap data for physical locations with structured_data
    useEffect(() => {
        if (!isPhysical || !location.structured_data) return;

        const parsed = parseOsmUrl(location.structured_data);
        if (!parsed) return;

        setOsmInfo(parsed);

        // Fetch coordinates
        fetchCoordsFromOsm(parsed.osmType, parsed.osmId).then((result) => {
            if (result) setCoords(result);
        });

        // Fetch BTCMap data
        setIsLoadingPayment(true);
        fetchBTCMapData(parsed.osmType, parsed.osmId)
            .then((btcmapData) => {
                if (btcmapData) {
                    // Use coords from BTCMap if we don't have them yet
                    if (btcmapData.lat && btcmapData.lon) {
                        setCoords({ lat: btcmapData.lat, lon: btcmapData.lon });
                    }
                    const methods = parsePaymentMethods(
                        btcmapData.tags,
                        `${parsed.osmType}:${parsed.osmId}`
                    );
                    setPaymentMethods(methods);
                }
            })
            .finally(() => setIsLoadingPayment(false));
    }, [isPhysical, location.structured_data]);

    return (
        <div className={cn("space-y-3", index > 0 && "pt-4 border-t")}>
            {/* Location Header */}
            <div className="flex items-start gap-3">
                <div className="flex-shrink-0 p-2 bg-muted rounded-md">
                    {isPhysical ? (
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                    ) : (
                        <Video className="h-4 w-4 text-muted-foreground" />
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm">{location.name}</h4>
                    {location.description && (
                        <p className="text-sm text-muted-foreground mt-0.5">
                            {location.description}
                        </p>
                    )}
                </div>
            </div>

            {/* Physical Location: Map Links */}
            {isPhysical && coords && (
                <div className="flex flex-wrap gap-2 pl-11">
                    {/* Google Maps */}
                    <a
                        href={buildGoogleMapsUrl(coords.lat, coords.lon, location.name)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <Map className="h-3.5 w-3.5" />
                        Google Maps
                        <ExternalLink className="h-3 w-3" />
                    </a>

                    {/* Apple Maps */}
                    <a
                        href={buildAppleMapsUrl(coords.lat, coords.lon, location.name)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <Map className="h-3.5 w-3.5" />
                        Apple Maps
                        <ExternalLink className="h-3 w-3" />
                    </a>

                    {/* OpenStreetMap */}
                    {location.structured_data && (
                        <a
                            href={location.structured_data}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <Map className="h-3.5 w-3.5" />
                            OpenStreetMap
                            <ExternalLink className="h-3 w-3" />
                        </a>
                    )}
                </div>
            )}

            {/* Physical Location: OSM link only (no coords yet) */}
            {isPhysical && !coords && location.structured_data && (
                <div className="pl-11">
                    <a
                        href={location.structured_data}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                    >
                        <Map className="h-3.5 w-3.5" />
                        View on OpenStreetMap
                        <ExternalLink className="h-3 w-3" />
                    </a>
                </div>
            )}

            {/* Online Meeting: URL */}
            {isOnline && location.structured_data && (
                <div className="pl-11">
                    <a
                        href={location.structured_data}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline break-all"
                    >
                        {location.structured_data}
                        <ExternalLink className="h-3 w-3 flex-shrink-0" />
                    </a>
                </div>
            )}

            {/* Bitcoin Payment Methods */}
            {paymentMethods && osmInfo && (
                <div className="pl-11 flex items-center gap-3">
                    <a
                        href={buildBTCMapUrl(osmInfo.osmType, osmInfo.osmId)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-2.5 py-1.5 bg-amber-500/10 rounded-md hover:bg-amber-500/20 transition-colors"
                    >
                        <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                            Bitcoin Accepted
                        </span>
                        <div className="flex items-center gap-1.5">
                            {paymentMethods.onchain && (
                                <Bitcoin
                                    className="h-4 w-4 text-amber-600 dark:text-amber-400"
                                    title="On-chain"
                                />
                            )}
                            {paymentMethods.lightning && (
                                <Zap
                                    className="h-4 w-4 text-amber-600 dark:text-amber-400"
                                    title="Lightning"
                                />
                            )}
                            {paymentMethods.lightningContactless && (
                                <NfcIcon
                                    className="h-4 w-4 text-amber-600 dark:text-amber-400"
                                    title="Lightning NFC / Contactless"
                                />
                            )}
                        </div>
                        <ExternalLink className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                    </a>
                </div>
            )}

            {/* Map Preview for Physical Locations */}
            {isPhysical && coords && (
                <div className="pl-11 pb-2">
                    <MapPreview
                        lat={coords.lat}
                        lon={coords.lon}
                        className="h-[150px] max-w-sm"
                    />
                </div>
            )}
        </div>
    );
}

/**
 * Location display card for event detail page
 * Shows all locations with map links, BTC payment info, and map preview
 */
export function LocationDisplay({ locations, className }: LocationDisplayProps) {
    // Parse locations JSON
    const parsedLocations: NexusLocation[] = (() => {
        if (!locations) return [];
        try {
            const parsed = JSON.parse(locations);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    })();

    // Don't render if no locations
    if (parsedLocations.length === 0) {
        return null;
    }

    return (
        <Card className={cn("", className)}>
            <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {parsedLocations.length === 1 ? "Location" : "Locations"}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-0">
                {parsedLocations.map((location, index) => (
                    <LocationItem
                        key={index}
                        location={location}
                        index={index}
                    />
                ))}
            </CardContent>
        </Card>
    );
}
