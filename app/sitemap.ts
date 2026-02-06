import { MetadataRoute } from "next";

/**
 * Static sitemap for main pages.
 * Individual event and calendar pages are discoverable via their canonical URLs
 * and will be indexed when linked from these pages or external sources.
 *
 * Future enhancement: Add dynamic sitemap generation for popular events/calendars
 * by querying Nexus for recent/trending content.
 */
export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://eventky.app";

    return [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: "daily",
            priority: 1,
        },
        {
            url: `${baseUrl}/events`,
            lastModified: new Date(),
            changeFrequency: "hourly",
            priority: 0.9,
        },
        {
            url: `${baseUrl}/calendars`,
            lastModified: new Date(),
            changeFrequency: "hourly",
            priority: 0.9,
        },
    ];
}
