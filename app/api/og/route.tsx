import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

/**
 * OG image generator for Eventky
 *
 * Dark theme with orange (#f97316) accents.
 * When an event/calendar has an image, it's used as a full-bleed background
 * with a dark gradient overlay so text stays readable.
 * Without an image, a clean dark card with subtle orange accents is rendered.
 *
 * Query params:
 *   title    – Event or calendar name (required)
 *   type     – "event" | "calendar"
 *   date     – Formatted date string (optional)
 *   location – Location name (optional)
 *   image    – Event image URL from Nexus (optional)
 *   color    – Accent color hex override (optional, default #f97316)
 */

/**
 * Fetch image with retries and edge caching for reliability.
 * Returns the image as a base64 data URL for reliable embedding, or null if all attempts fail.
 */
async function getValidImageDataUrl(url: string): Promise<string | null> {
    const maxRetries = 3;
    const timeoutMs = 8000; // 8s timeout per attempt

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

            const response = await fetch(url, {
                signal: controller.signal,
                // Edge cache: reuse cached response for 1 hour
                cache: "force-cache",
                next: { revalidate: 3600 },
                headers: {
                    "Accept": "image/*",
                },
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                if (attempt < maxRetries) continue;
                return null;
            }

            const contentType = response.headers.get("content-type");
            if (!contentType?.startsWith("image/")) {
                if (attempt < maxRetries) continue;
                return null;
            }

            // Check size - limit to 5MB to avoid memory issues
            const contentLength = response.headers.get("content-length");
            if (contentLength && parseInt(contentLength) > 5 * 1024 * 1024) {
                return null; // Too large, don't retry
            }

            const arrayBuffer = await response.arrayBuffer();
            const base64 = Buffer.from(arrayBuffer).toString("base64");
            return `data:${contentType};base64,${base64}`;
        } catch (error) {
            // Only retry on timeout/network errors
            if (attempt >= maxRetries) {
                console.error(`[OG] Image fetch failed after ${maxRetries} attempts:`, url, error);
                return null;
            }
            // Brief delay before retry
            await new Promise(r => setTimeout(r, 500 * attempt));
        }
    }

    return null;
}

export async function GET(request: NextRequest) {
    // Some clients incorrectly HTML-encode ampersands as &amp; in URLs.
    // Normalize the URL by replacing &amp; with & before parsing.
    const rawUrl = request.url;
    const normalizedUrl = rawUrl.includes("&amp;")
        ? rawUrl.replace(/&amp;/g, "&")
        : rawUrl;
    const url = new URL(normalizedUrl);
    const searchParams = url.searchParams;

    const title = searchParams.get("title") || "Eventky";
    const type = searchParams.get("type") || "event";
    const date = searchParams.get("date");
    const location = searchParams.get("location");
    const rawImageUrl = searchParams.get("image");
    const accent = searchParams.get("color") || "#f97316";

    const displayTitle = title.length > 70 ? title.slice(0, 67) + "…" : title;
    const typeLabel = type === "calendar" ? "Calendar" : "Event";

    // Pre-fetch and validate the image to avoid render-time failures
    const imageUrl = rawImageUrl ? await getValidImageDataUrl(rawImageUrl) : null;

    return new ImageResponse(
        (
            <div
                style={{
                    width: "1200px",
                    height: "630px",
                    display: "flex",
                    position: "relative",
                    fontFamily: "system-ui, -apple-system, sans-serif",
                    overflow: "hidden",
                    background: "#09090b",
                }}
            >
                {/* ── Background layer ── */}
                {imageUrl ? (
                    /* Event image as full-bleed background */
                    <div style={{ position: "absolute", inset: 0, display: "flex" }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={imageUrl}
                            alt=""
                            style={{
                                width: "1200px",
                                height: "630px",
                                objectFit: "cover",
                            }}
                        />
                    </div>
                ) : (
                    /* No-image: subtle radial glow */
                    <div
                        style={{
                            position: "absolute",
                            inset: 0,
                            display: "flex",
                            background: `radial-gradient(ellipse 80% 60% at 70% 40%, ${accent}14 0%, transparent 70%)`,
                        }}
                    />
                )}

                {/* Bottom-to-top gradient – ensures text readability on any image */}
                {imageUrl && (
                    <div
                        style={{
                            position: "absolute",
                            bottom: 0,
                            left: 0,
                            width: "1200px",
                            height: "630px",
                            display: "flex",
                            background: "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.8) 35%, rgba(0,0,0,0.3) 60%, transparent 80%)",
                        }}
                    />
                )}

                {/* Orange accent line at top */}
                <div
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        height: "4px",
                        display: "flex",
                        background: accent,
                    }}
                />

                {/* ── Content ── */}
                <div
                    style={{
                        position: "relative",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "flex-end",
                        width: "100%",
                        height: "100%",
                        padding: "48px 60px",
                        gap: "24px",
                    }}
                >
                    {/* Type badge – top-left, solid orange with black text */}
                    <div
                        style={{
                            position: "absolute",
                            top: "48px",
                            left: "60px",
                            display: "flex",
                            alignItems: "center",
                            borderRadius: "8px",
                            padding: "8px 18px",
                            background: accent,
                        }}
                    >
                        <span
                            style={{
                                fontSize: "15px",
                                fontWeight: 800,
                                color: "#000000",
                                textTransform: "uppercase",
                                letterSpacing: "0.1em",
                            }}
                        >
                            {typeLabel}
                        </span>
                    </div>

                    {/* Title */}
                    <div
                        style={{
                            fontSize: displayTitle.length > 35 ? "44px" : "54px",
                            fontWeight: 800,
                            color: accent,
                            lineHeight: 1.1,
                            letterSpacing: "-0.02em",
                            display: "flex",
                            maxWidth: "1000px",
                        }}
                    >
                        {displayTitle}
                    </div>

                    {/* Meta row: date & location */}
                    {(date || location) && (
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "14px",
                            }}
                        >
                            {date && (
                                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                                    <div
                                        style={{
                                            width: "12px",
                                            height: "12px",
                                            borderRadius: "50%",
                                            background: accent,
                                            flexShrink: 0,
                                        }}
                                    />
                                    <span
                                        style={{
                                            fontSize: "28px",
                                            fontWeight: 600,
                                            color: "#ffffff",
                                        }}
                                    >
                                        {date.length > 45 ? date.slice(0, 42) + "…" : date}
                                    </span>
                                </div>
                            )}
                            {location && (
                                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                                    <div
                                        style={{
                                            width: "12px",
                                            height: "12px",
                                            borderRadius: "50%",
                                            background: accent,
                                            flexShrink: 0,
                                        }}
                                    />
                                    <span
                                        style={{
                                            fontSize: "28px",
                                            fontWeight: 600,
                                            color: "#ffffff",
                                        }}
                                    >
                                        {location.length > 40 ? location.slice(0, 37) + "…" : location}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Subtle site label */}
                    <div style={{ display: "flex", marginTop: "4px" }}>
                        <span
                            style={{
                                fontSize: "16px",
                                fontWeight: 600,
                                color: "rgba(255,255,255,0.69)",
                                letterSpacing: "0.05em",
                            }}
                        >
                            eventky.app
                        </span>
                    </div>
                </div>
            </div>
        ),
        {
            width: 1200,
            height: 630,
        },
    );
}
