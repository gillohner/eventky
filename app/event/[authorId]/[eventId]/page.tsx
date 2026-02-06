import type { Metadata } from "next";
import { fetchEventFromNexus } from "@/lib/nexus/events";
import {
  getAppUrl,
  getImageUrl,
  getOgImageUrl,
  truncateDescription,
  formatMetaDate,
  getPrimaryLocation,
  buildEventJsonLd,
} from "@/lib/metadata";
import { calculateNextOccurrences } from "@/lib/pubky/rrule-utils";
import EventPageClient from "./_client";

interface EventPageProps {
  params: Promise<{
    authorId: string;
    eventId: string;
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params, searchParams }: EventPageProps): Promise<Metadata> {
  const { authorId, eventId } = await params;
  const resolvedSearchParams = await searchParams;
  const instanceParam = typeof resolvedSearchParams.instance === "string" ? resolvedSearchParams.instance : undefined;

  const appUrl = getAppUrl();
  const canonicalUrl = `${appUrl}/event/${authorId}/${eventId}`;

  try {
    const event = await fetchEventFromNexus(authorId, eventId);

    if (!event) {
      return {
        title: "Event Not Found | Eventky",
        description: "This event could not be found.",
      };
    }

    const { details } = event;
    const title = details.summary;
    const description = truncateDescription(details.description);
    const rawImageUrl = getImageUrl(details.image_uri);
    const location = getPrimaryLocation(details.locations);

    // Handle recurring events
    const isRecurring = !!details.rrule;
    let dateStr: string;
    let displayDate: string;

    if (instanceParam) {
      // Specific instance requested - show that date
      dateStr = formatMetaDate(instanceParam, null, details.dtstart_tzid);
      displayDate = dateStr;
    } else if (isRecurring) {
      // Recurring event without instance - calculate next occurrence
      const occurrences = calculateNextOccurrences({
        rrule: details.rrule!,
        dtstart: details.dtstart,
        rdate: details.rdate,
        exdate: details.exdate,
        maxCount: 10,
      });

      const now = new Date();
      const nextOccurrence = occurrences.find(occ => new Date(occ) > now);

      if (nextOccurrence) {
        const nextDateStr = formatMetaDate(nextOccurrence, null, details.dtstart_tzid);
        dateStr = `Recurring · Next: ${nextDateStr}`;
        displayDate = `Next: ${nextDateStr}`;
      } else {
        // No future occurrences - show original date
        dateStr = formatMetaDate(details.dtstart, details.dtend, details.dtstart_tzid);
        displayDate = `Recurring · ${dateStr}`;
      }
    } else {
      // Single event
      dateStr = formatMetaDate(details.dtstart, details.dtend, details.dtstart_tzid);
      displayDate = dateStr;
    }

    // Build branded OG image
    const ogImageUrl = getOgImageUrl({
      title,
      type: "event",
      date: displayDate,
      location: location?.name,
      imageUrl: rawImageUrl,
    });

    // Build description with date and location info
    const metaDescription = [
      dateStr,
      location?.name,
      description,
    ].filter(Boolean).join(" · ") || "Event on Eventky";

    return {
      title: `${title} | Eventky`,
      description: metaDescription,
      alternates: {
        canonical: canonicalUrl,
      },
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
    console.error("[generateMetadata] Event metadata fetch failed:", { authorId, eventId, error });
    return {
      title: "Event | Eventky",
      description: "View this event on Eventky",
    };
  }
}

export default async function EventPage({ params }: EventPageProps) {
  const { authorId, eventId } = await params;
  const appUrl = getAppUrl();
  const canonicalUrl = `${appUrl}/event/${authorId}/${eventId}`;

  // Fetch event data server-side for JSON-LD (best-effort)
  let jsonLdScript: React.ReactNode = null;
  try {
    const event = await fetchEventFromNexus(authorId, eventId);
    if (event) {
      const imageUrl = getImageUrl(event.details.image_uri);
      const jsonLd = buildEventJsonLd(event.details, canonicalUrl, imageUrl);
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
      <EventPageClient params={params} />
    </>
  );
}
