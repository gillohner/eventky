import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Events | Eventky",
    description: "Discover upcoming events on Eventky.",
    alternates: {
        canonical: "/events",
    },
    openGraph: {
        title: "Events | Eventky",
        description: "Discover upcoming events on Eventky.",
        url: "/events",
        siteName: "Eventky",
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "Events | Eventky",
        description: "Discover upcoming events on Eventky",
    },
};

export default function EventsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
