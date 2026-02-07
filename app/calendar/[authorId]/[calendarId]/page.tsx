import type { Metadata } from "next";
import { fetchCalendarFromNexus } from "@/lib/nexus/calendars";
import {
    getAppUrl,
    getImageUrl,
    getOgImageUrl,
    parseImageUri,
    truncateDescription,
    buildCalendarJsonLd,
} from "@/lib/metadata";
import CalendarPageClient from "./_client";

interface CalendarPageProps {
    params: Promise<{
        authorId: string;
        calendarId: string;
    }>;
}

export async function generateMetadata({ params }: CalendarPageProps): Promise<Metadata> {
    const { authorId, calendarId } = await params;
    const appUrl = getAppUrl();
    const canonicalUrl = `${appUrl}/calendar/${authorId}/${calendarId}`;

    try {
        const calendar = await fetchCalendarFromNexus(authorId, calendarId);

        if (!calendar) {
            return {
                title: "Calendar Not Found | Eventky",
                description: "This calendar could not be found.",
            };
        }

        const { details } = calendar;
        const title = details.name;
        const description = truncateDescription(details.description);
        const rawImageUrl = getImageUrl(details.image_uri);

        // Build branded OG image - use userId/fileId to avoid URL encoding issues
        const imageInfo = parseImageUri(details.image_uri);
        const ogImageUrl = getOgImageUrl({
            title,
            type: "calendar",
            imageUserId: imageInfo?.userId,
            imageFileId: imageInfo?.fileId,
        });

        // Build description with timezone info
        const metaDescription = [
            details.timezone ? `${details.timezone}` : null,
            description,
        ].filter(Boolean).join(" · ") || "Calendar on Eventky";

        return {
            title: `${title} | Eventky`,
            description: metaDescription,
            alternates: {
                canonical: canonicalUrl,
            },
            ...(details.color ? { themeColor: details.color } : {}),
            openGraph: {
                title,
                description: metaDescription,
                url: canonicalUrl,
                siteName: "Eventky",
                type: "website",
                images: [
                    {
                        url: ogImageUrl,
                        width: 1200,
                        height: 630,
                        alt: title,
                    },
                ],
            },
            twitter: {
                card: "summary_large_image",
                title,
                description: metaDescription,
                images: [ogImageUrl],
            },
        };
    } catch (error) {
        console.error("[generateMetadata] Calendar metadata fetch failed:", { authorId, calendarId, error });
        return {
            title: "Calendar | Eventky",
            description: "View this calendar on Eventky",
        };
    }
}

export default async function CalendarPage({ params }: CalendarPageProps) {
    const { authorId, calendarId } = await params;
    const appUrl = getAppUrl();
    const canonicalUrl = `${appUrl}/calendar/${authorId}/${calendarId}`;

    // Fetch calendar data server-side for JSON-LD (best-effort)
    let jsonLdScript: React.ReactNode = null;
    try {
        const calendar = await fetchCalendarFromNexus(authorId, calendarId);
        if (calendar) {
            const imageUrl = getImageUrl(calendar.details.image_uri);
            const jsonLd = buildCalendarJsonLd(calendar.details, canonicalUrl, imageUrl);
            jsonLdScript = (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
                />
            );
        }
    } catch {
        // JSON-LD is best-effort; don't block rendering
    }

    return (
        <>
            {jsonLdScript}
            <CalendarPageClient params={params} />
        </>
    );
}
