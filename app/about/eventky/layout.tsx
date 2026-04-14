import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "About Eventky | Eventky",
    description:
        "Eventky is a decentralized calendar and event client built on the Pubky stack.",
    alternates: {
        canonical: "/about/eventky",
    },
    openGraph: {
        title: "About Eventky",
        description:
            "Eventky is a decentralized calendar and event client built on the Pubky stack.",
        url: "/about/eventky",
        siteName: "Eventky",
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "About Eventky",
        description:
            "Eventky is a decentralized calendar and event client built on the Pubky stack.",
    },
};

export default function AboutEventkyLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
