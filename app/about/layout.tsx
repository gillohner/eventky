import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "About | Eventky",
    description:
        "Learn about Eventky and Loombot — decentralized event tools for communities.",
    alternates: {
        canonical: "/about",
    },
    openGraph: {
        title: "About | Eventky",
        description:
            "Learn about Eventky and Loombot — decentralized event tools for communities.",
        url: "/about",
        siteName: "Eventky",
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "About | Eventky",
        description:
            "Learn about Eventky and Loombot — decentralized event tools for communities.",
    },
};

export default function AboutLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
