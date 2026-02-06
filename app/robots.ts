import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://eventky.app";

    return {
        rules: [
            {
                userAgent: "*",
                allow: "/",
                disallow: [
                    "/api/",
                    "/login",
                    "/event/create",
                    "/calendar/create",
                    "/*?*", // Disallow query string variations (canonical URLs preferred)
                ],
            },
        ],
        sitemap: `${baseUrl}/sitemap.xml`,
    };
}
