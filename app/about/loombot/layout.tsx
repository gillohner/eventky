import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "About Loombot | Eventky",
    description:
        "Loombot is a modular Telegram community bot with optional Pubky event publishing. Run the hosted @dezentralschweiz_bot or self-host your own.",
    alternates: {
        canonical: "/about/loombot",
    },
    openGraph: {
        title: "About Loombot",
        description:
            "A modular Telegram community bot with optional Pubky event publishing.",
        url: "/about/loombot",
        siteName: "Eventky",
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "About Loombot",
        description:
            "A modular Telegram community bot with optional Pubky event publishing.",
    },
};

export default function AboutLoombotLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
