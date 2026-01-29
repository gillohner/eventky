"use client";

import { cn } from "@/lib/utils";

interface MapPreviewProps {
    /** Latitude coordinate */
    lat: number;
    /** Longitude coordinate */
    lon: number;
    /** Additional CSS classes */
    className?: string;
}

/**
 * Build OpenStreetMap embed URL with bbox and marker
 */
function buildMapEmbedUrl(lat: number, lon: number): string {
    // Create a small bbox around the point (approximately 0.005 degree ~= 500m)
    const delta = 0.005;
    const bbox = `${lon - delta},${lat - delta},${lon + delta},${lat + delta}`;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lon}`;
}

/**
 * OSM Map preview embed component
 * Used in both event creation (location-fields) and event detail (location-display)
 */
export function MapPreview({ lat, lon, className }: MapPreviewProps) {
    return (
        <div className={cn("rounded-md overflow-hidden border bg-muted", className)}>
            <iframe
                title="Location Map"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src={buildMapEmbedUrl(lat, lon)}
            />
        </div>
    );
}

// Re-export the URL builder for use elsewhere
export { buildMapEmbedUrl };
