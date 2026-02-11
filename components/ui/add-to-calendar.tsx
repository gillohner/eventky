"use client";

import { useState, useCallback, useMemo } from "react";
import {
    Popover,
    PopoverTrigger,
    PopoverContent,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
    CalendarPlus,
    Copy,
    Check,
    Download,
    ExternalLink,
    Rss,
} from "lucide-react";
import { cn } from "@/lib/utils";

// =============================================================================
// Types
// =============================================================================

interface AddToCalendarProps {
    /** "event" or "calendar" — drives URL shape and labels */
    type: "event" | "calendar";
    /** Author public key */
    authorId: string;
    /** Event or calendar ID */
    resourceId: string;
    /** Event title or calendar name — used for subscription links */
    title?: string;
    /** Additional CSS classes for the trigger button */
    className?: string;
    /** Render as an inline link-style button instead of outlined */
    variant?: "default" | "inline";
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Build the HTTPS ICS URL for this resource.
 * Works on both server and client because we defer to window.location.
 */
function getIcsHttpUrl(type: "event" | "calendar", authorId: string, resourceId: string): string {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/api/ics/${type}/${authorId}/${resourceId}`;
}

/**
 * Convert the HTTPS URL to a webcal:// URL for one-click subscription.
 * webcal:// is the de-facto scheme that calendar clients recognise.
 */
function toWebcalUrl(httpsUrl: string): string {
    return httpsUrl.replace(/^https?:\/\//, "webcal://");
}

/**
 * Build a Google Calendar URL that subscribes to an ICS feed.
 * Uses the `cid` parameter which adds the feed as a subscribed calendar.
 */
function googleCalendarSubscribeUrl(icsHttpUrl: string): string {
    // Google Calendar accepts the HTTPS URL directly via `cid`
    return `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(icsHttpUrl)}`;
}

/**
 * Build an Outlook Web URL that subscribes to an ICS feed.
 * Uses the "addfromweb" action with the feed URL and calendar name.
 */
function outlookCalendarSubscribeUrl(icsHttpUrl: string, name: string): string {
    const params = new URLSearchParams({
        url: icsHttpUrl,
        name: name,
    });
    return `https://outlook.live.com/calendar/0/addfromweb?${params.toString()}`;
}

// =============================================================================
// Component
// =============================================================================

/**
 * "Add to Calendar" popover.
 *
 * For **calendars** it offers:
 *   • Copy webcal:// subscription URL
 *   • Download .ics snapshot
 *
 * For **events** it offers:
 *   • Copy webcal:// URL (subscribes to event updates)
 *   • Download .ics file
 *   • Open in Google Calendar
 *   • Open in Outlook
 */
export function AddToCalendar({
    type,
    authorId,
    resourceId,
    title,
    className,
    variant = "default",
}: AddToCalendarProps) {
    const [copied, setCopied] = useState(false);
    const [open, setOpen] = useState(false);

    const icsUrl = useMemo(
        () => getIcsHttpUrl(type, authorId, resourceId),
        [type, authorId, resourceId]
    );

    const webcalUrl = useMemo(() => toWebcalUrl(icsUrl), [icsUrl]);

    const handleCopyWebcal = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(webcalUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback: select-and-copy via a hidden textarea
            const ta = document.createElement("textarea");
            ta.value = webcalUrl;
            ta.style.position = "fixed";
            ta.style.opacity = "0";
            document.body.appendChild(ta);
            ta.select();
            document.execCommand("copy");
            document.body.removeChild(ta);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    }, [webcalUrl]);

    const handleDownload = useCallback(() => {
        window.open(icsUrl, "_blank");
    }, [icsUrl]);

    const handleSubscribe = useCallback(() => {
        window.location.href = webcalUrl;
    }, [webcalUrl]);

    const isCalendar = type === "calendar";
    const label = isCalendar ? "Subscribe" : "Add to Calendar";

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant={variant === "inline" ? "ghost" : "outline"}
                    size="sm"
                    className={cn(
                        "gap-2",
                        variant === "inline" && "h-auto p-0 text-sm font-normal text-primary hover:underline hover:bg-transparent",
                        className
                    )}
                >
                    <CalendarPlus className="h-4 w-4" />
                    {label}
                </Button>
            </PopoverTrigger>

            <PopoverContent align="end" className="w-64 p-2" sideOffset={8}>
                <div className="space-y-1">
                    {/* Header */}
                    <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                        {isCalendar
                            ? "Subscribe to this calendar"
                            : "Add this event to your calendar"}
                    </p>

                    {/* Subscribe via webcal:// (primary action) */}
                    <button
                        onClick={handleSubscribe}
                        className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                        <Rss className="h-4 w-4 text-muted-foreground" />
                        <div className="text-left">
                            <p className="font-medium">
                                {isCalendar ? "Subscribe" : "Subscribe to Updates"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Opens in your calendar app
                            </p>
                        </div>
                    </button>

                    {/* Copy webcal URL */}
                    <button
                        onClick={handleCopyWebcal}
                        className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                        {copied ? (
                            <Check className="h-4 w-4 text-green-500" />
                        ) : (
                            <Copy className="h-4 w-4 text-muted-foreground" />
                        )}
                        <div className="text-left">
                            <p className="font-medium">
                                {copied ? "Copied!" : "Copy Subscription URL"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                webcal:// link for any client
                            </p>
                        </div>
                    </button>

                    {/* Download .ics */}
                    <button
                        onClick={handleDownload}
                        className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                        <Download className="h-4 w-4 text-muted-foreground" />
                        <div className="text-left">
                            <p className="font-medium">Download .ics</p>
                            <p className="text-xs text-muted-foreground">
                                {isCalendar ? "Snapshot of all events" : "Import as a file"}
                            </p>
                        </div>
                    </button>

                    {/* Google Calendar & Outlook feed subscription links */}
                    <div className="my-1 border-t" />

                    <a
                        href={googleCalendarSubscribeUrl(icsUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        <div className="text-left">
                            <p className="font-medium">Google Calendar</p>
                            <p className="text-xs text-muted-foreground">Subscribe in browser</p>
                        </div>
                    </a>

                    <a
                        href={outlookCalendarSubscribeUrl(icsUrl, title || (isCalendar ? "Calendar" : "Event"))}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        <div className="text-left">
                            <p className="font-medium">Outlook</p>
                            <p className="text-xs text-muted-foreground">Subscribe in browser</p>
                        </div>
                    </a>
                </div>
            </PopoverContent>
        </Popover>
    );
}
