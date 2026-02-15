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
 * Extract userId and fileId from a pubky:// URI
 */
export function parseImageUri(pubkyUri: string | undefined | null): { userId: string; fileId: string } | null {
    if (!pubkyUri) return null;

    const withoutProtocol = pubkyUri.replace("pubky://", "");
    const parts = withoutProtocol.split("/");
    if (parts.length < 2) return null;

    const userId = parts[0];
    const fileId = parts[parts.length - 1];

    return { userId, fileId };
}

/**
 * Build the OG image API URL for a branded preview card
 * Uses userId and fileId instead of full URL to avoid encoding issues
 */
export function getOgImageUrl(params: {
    title: string;
    type: "event" | "calendar";
    date?: string;
    location?: string;
    /** Pubky user ID for the image */
    imageUserId?: string | null;
    /** Pubky file ID for the image */
    imageFileId?: string | null;
    color?: string;
}): string {
    const appUrl = getAppUrl();
    const searchParams = new URLSearchParams();
    searchParams.set("title", params.title);
    searchParams.set("type", params.type);
    if (params.date) searchParams.set("date", params.date);
    if (params.location) searchParams.set("location", params.location);
    if (params.imageUserId) searchParams.set("uid", params.imageUserId);
    if (params.imageFileId) searchParams.set("fid", params.imageFileId);
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
 * The dtstart/dtend values are "local time" in the specified timezone.
 * e.g., dtstart="2026-02-11T18:00:00" with tzid="Europe/Zurich" means 6pm in Zurich.
 */
export function formatMetaDate(
    dtstart: string,
    dtend?: string | null,
    tzid?: string | null,
): string {
    try {
        // The datetime string represents wall-clock time in the given timezone.
        // We need to format it as that time, not convert it.

        // Parse the datetime string (it's already in the target timezone's local time)
        // We'll use a simple approach: parse as a "fake UTC" date then format with the timezone
        // This works because we want to display the literal time values, not convert them.

        // Parse the ISO string - treat it as if it's UTC for parsing purposes
        // Then use date-fns-tz to format it "in" the target timezone
        // Since the string already represents the local time, we need to create
        // a Date that represents that wall-clock time in the target timezone.

        // Parse components from the ISO string
        const dateMatch = dtstart.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/);
        if (!dateMatch) {
            return dtstart; // Fallback to raw string
        }

        const [, year, month, day, hour, minute] = dateMatch;

        // Format using Intl.DateTimeFormat with the timezone for display
        // Create a date object treating the input as UTC, then format it "as if" in that timezone
        // This is a workaround since the datetime IS the local time already
        const fakeUtcDate = new Date(`${year}-${month}-${day}T${hour}:${minute}:00Z`);

        // Format the date components
        const dateFormatter = new Intl.DateTimeFormat("en-US", {
            weekday: "short",
            year: "numeric",
            month: "short",
            day: "numeric",
            timeZone: "UTC", // Use UTC since our fakeUtcDate is already in "local" time
        });

        const timeFormatter = new Intl.DateTimeFormat("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
            timeZone: "UTC", // Use UTC since our fakeUtcDate is already in "local" time
        });

        const datePart = dateFormatter.format(fakeUtcDate);
        const timePart = timeFormatter.format(fakeUtcDate);

        let formatted = `${datePart}, ${timePart}`;

        if (dtend) {
            const endMatch = dtend.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/);
            if (endMatch) {
                const [, eYear, eMonth, eDay, eHour, eMinute] = endMatch;
                const fakeUtcEnd = new Date(`${eYear}-${eMonth}-${eDay}T${eHour}:${eMinute}:00Z`);
                const endTime = timeFormatter.format(fakeUtcEnd);
                formatted = `${formatted} – ${endTime}`;
            }
        }

        if (tzid) {
            formatted = `${formatted} (${tzid})`;
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
