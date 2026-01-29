import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "Eventky",
        short_name: "Eventky",
        description: "Pubky based Event and Calendar App",
        start_url: "/",
        display: "standalone",
        background_color: "#1a1a1a",
        theme_color: "#E8712C",
        orientation: "portrait-primary",
        icons: [
            {
                src: "/logo/eventky-logo-192.png",
                sizes: "192x192",
                type: "image/png",
                purpose: "any",
            },
            {
                src: "/logo/eventky-logo-512.png",
                sizes: "512x512",
                type: "image/png",
                purpose: "any",
            },
            {
                src: "/logo/eventky-logo-192.png",
                sizes: "192x192",
                type: "image/png",
                purpose: "maskable",
            },
        ],
        categories: ["productivity", "social"],
    };
}
