import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

// Hardcoded gateway URL - avoids any config import issues in edge runtime
const NEXUS_GATEWAY_URL = "https://nexus.eventky.app";

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
 *   uid      – Pubky user ID for image (optional)
 *   fid      – Pubky file ID for image (optional)
 *   color    – Accent color hex override (optional, default #f97316)
 */

export async function GET(request: NextRequest) {
    // Some clients incorrectly HTML-encode ampersands as &amp; in URLs.
    // This causes URL parsers to see parameters like "amp;type" instead of "type".
    // We handle this by:
    // 1. Trying to normalize the raw URL string if it contains &amp;
    // 2. Falling back to checking for amp;-prefixed parameter names

    const rawUrl = request.url;

    // Normalize &amp; to & if present in the raw URL
    const normalizedUrl = rawUrl.includes("&amp;")
        ? rawUrl.replace(/&amp;/g, "&")
        : rawUrl;

    const url = new URL(normalizedUrl);
    const searchParams = url.searchParams;

    // Helper to get param with amp; prefix fallback
    // When browsers/proxies parse &amp; URLs, they create params like "amp;type" instead of "type"
    const getParam = (name: string): string | null => {
        return searchParams.get(name) ?? searchParams.get(`amp;${name}`);
    };

    const title = getParam("title") || "Eventky";
    const type = getParam("type") || "event";
    const date = getParam("date");
    const location = getParam("location");
    const userId = getParam("uid");
    const fileId = getParam("fid");
    const accent = getParam("color") || "#f97316";

    const displayTitle = title.length > 70 ? title.slice(0, 67) + "…" : title;
    const typeLabel = type === "calendar" ? "Calendar" : "Event";

    // Build the image URL from userId and fileId - simple alphanumeric params, no encoding issues
    const imageUrl = userId && fileId
        ? `${NEXUS_GATEWAY_URL}/static/files/${userId}/${fileId}/main`
        : null;

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
