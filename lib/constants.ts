/**
 * Shared constants for the Eventky application
 */

/**
 * Header banner dimensions for event/calendar detail pages
 */
export const HEADER_BANNER = {
    /** Width in pixels */
    width: 1200,
    /** Height in pixels */
    height: 500,
    /** Aspect ratio string for Tailwind CSS */
    aspectRatio: "1200/500",
    /** Aspect ratio as decimal (2.4) */
    ratio: 1200 / 500,
} as const;

/**
 * Header image gradient for overlay content readability
 * Gradient goes from solid at bottom to transparent at top
 */
export const HEADER_GRADIENT = {
    /** CSS gradient for dark overlay at bottom */
    overlay: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.6) 35%, rgba(0,0,0,0.2) 55%, transparent 70%)",
    /** Tailwind classes for gradient overlay */
    classes: "bg-gradient-to-t from-black/90 via-black/50 via-55% to-transparent to-70%",
} as const;
