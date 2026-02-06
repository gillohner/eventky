import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Calendars | Eventky",
    description: "Explore calendars on Eventky.",
    alternates: {
        canonical: "/calendars",
    },
    openGraph: {
        title: "Calendars | Eventky",
        description: "Explore calendars on Eventky.",
        url: "/calendars",
        siteName: "Eventky",
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "Calendars | Eventky",
        description: "Explore calendars on Eventky",
    },
};

export default function CalendarsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
