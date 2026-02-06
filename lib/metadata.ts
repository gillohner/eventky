/**
 * Metadata utilities for Open Graph, Twitter Cards, and JSON-LD
 * Used by server components to generate dynamic link preview metadata
 */

import { config } from "@/lib/config";
import type { NexusEventDetails, NexusCalendarDetails, NexusLocation } from "@/types/nexus";

/**
 * Get the public-facing app URL for absolute metadata URLs.
 * Uses NEXT_PUBLIC_APP_URL if set, otherwise infers from environment.
 */
export function getAppUrl(): string {
    if (process.env.NEXT_PUBLIC_APP_URL) {
        return process.env.NEXT_PUBLIC_APP_URL;
    }
    // Fallback based on environment
    if (config.environment === "production") return "https://eventky.app";
    if (config.environment === "staging") return "https://staging.eventky.app";
    return "http://localhost:3000";
}

/**
 * Get a Nexus image URL from a pubky:// image URI
 */
export function getImageUrl(pubkyUrl: string | undefined | null): string | null {
    if (!pubkyUrl) return null;

    const withoutProtocol = pubkyUrl.replace("pubky://", "");
    const parts = withoutProtocol.split("/");
    const userId = parts[0];
    const fileId = parts[parts.length - 1];

    return `${config.gateway.url}/static/files/${userId}/${fileId}/main`;
}

/**
 * Build the OG image API URL for a branded preview card
 */
export function getOgImageUrl(params: {
    title: string;
    type: "event" | "calendar";
    date?: string;
    location?: string;
    imageUrl?: string | null;
    color?: string;
}): string {
    const appUrl = getAppUrl();
    const searchParams = new URLSearchParams();
    searchParams.set("title", params.title);
    searchParams.set("type", params.type);
    if (params.date) searchParams.set("date", params.date);
    if (params.location) searchParams.set("location", params.location);
    if (params.imageUrl) searchParams.set("image", params.imageUrl);
    if (params.color) searchParams.set("color", params.color);

    return `${appUrl}/api/og?${searchParams.toString()}`;
}

/**
 * Truncate a description for OG/meta usage (max ~160 chars)
 */
export function truncateDescription(text: string | undefined | null, maxLength = 160): string {
    if (!text) return "";
    // Strip HTML tags if present
    const plain = text.replace(/<[^>]*>/g, "").trim();
    if (plain.length <= maxLength) return plain;
    return plain.slice(0, maxLength - 1) + "…";
}

/**
 * Format an ISO datetime string for display in metadata
 * Uses the event's location timezone if provided
 */
export function formatMetaDate(
    dtstart: string,
    dtend?: string | null,
    tzid?: string | null,
): string {
    try {
        // Parse date - dtstart is in format like "2026-03-15T18:00:00"
        const startDate = new Date(dtstart);

        const dateOpts: Intl.DateTimeFormatOptions = {
            weekday: "short",
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
            ...(tzid ? { timeZone: tzid } : {}),
        };

        const formatted = startDate.toLocaleDateString("en-US", dateOpts);

        if (dtend) {
            const endDate = new Date(dtend);
            const timeOpts: Intl.DateTimeFormatOptions = {
                hour: "numeric",
                minute: "2-digit",
                ...(tzid ? { timeZone: tzid } : {}),
            };
            const endTime = endDate.toLocaleTimeString("en-US", timeOpts);
            return `${formatted} – ${endTime}`;
        }

        return formatted;
    } catch {
        return dtstart;
    }
}

/**
 * Parse the primary location from a Nexus event's serialized locations field
 */
export function getPrimaryLocation(locationsJson: string | undefined | null): NexusLocation | null {
    if (!locationsJson) return null;
    try {
        const locations: NexusLocation[] = JSON.parse(locationsJson);
        // Prefer physical locations, then take the first
        return locations.find(l => l.location_type === "PHYSICAL") || locations[0] || null;
    } catch {
        return null;
    }
}

/**
 * Build JSON-LD structured data for an Event (schema.org)
 */
export function buildEventJsonLd(
    event: NexusEventDetails,
    canonicalUrl: string,
    imageUrl: string | null,
): Record<string, unknown> {
    const location = getPrimaryLocation(event.locations);

    const jsonLd: Record<string, unknown> = {
        "@context": "https://schema.org",
        "@type": "Event",
        name: event.summary,
        startDate: event.dtstart,
        url: canonicalUrl,
    };

    if (event.dtend) jsonLd.endDate = event.dtend;
    if (event.description) jsonLd.description = truncateDescription(event.description, 500);
    if (imageUrl) jsonLd.image = imageUrl;
    if (event.status) {
        // Map to schema.org EventStatusType
        const statusMap: Record<string, string> = {
            CONFIRMED: "https://schema.org/EventScheduled",
            TENTATIVE: "https://schema.org/EventScheduled",
            CANCELLED: "https://schema.org/EventCancelled",
        };
        jsonLd.eventStatus = statusMap[event.status] || "https://schema.org/EventScheduled";
    }

    if (location) {
        if (location.location_type === "ONLINE") {
            jsonLd.eventAttendanceMode = "https://schema.org/OnlineEventAttendanceMode";
            jsonLd.location = {
                "@type": "VirtualLocation",
                name: location.name,
                ...(location.structured_data ? { url: location.structured_data } : {}),
            };
        } else {
            jsonLd.eventAttendanceMode = "https://schema.org/OfflineEventAttendanceMode";
            jsonLd.location = {
                "@type": "Place",
                name: location.name,
                ...(location.description ? { description: location.description } : {}),
            };
        }
    }

    return jsonLd;
}

/**
 * Build JSON-LD structured data for a Calendar (schema.org)
 * Uses CollectionPage type as there's no exact schema.org Calendar type
 */
export function buildCalendarJsonLd(
    calendar: NexusCalendarDetails,
    canonicalUrl: string,
    imageUrl: string | null,
): Record<string, unknown> {
    return {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: calendar.name,
        url: canonicalUrl,
        ...(calendar.description ? { description: truncateDescription(calendar.description, 500) } : {}),
        ...(imageUrl ? { image: imageUrl } : {}),
        mainEntity: {
            "@type": "ItemList",
            name: calendar.name,
            ...(calendar.description ? { description: calendar.description } : {}),
        },
    };
}
