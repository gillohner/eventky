/**
 * Add to Calendar Component
 * 
 * Popover menu for subscribing to events/calendars via:
 * - webcal:// subscription URL
 * - Direct .ics download
 * - Google Calendar link
 * - Outlook.com link
 * - Apple Calendar (uses webcal://)
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    CalendarPlus,
    Copy,
    Download,
    ExternalLink,
    Check,
} from "lucide-react";
import { toast } from "sonner";
import type { NexusEventResponse, NexusEventStreamItem } from "@/types/nexus";
import { generateGoogleCalendarUrl, generateOutlookCalendarUrl } from "@/lib/ics";

// =============================================================================
// Types
// =============================================================================

export type AddToCalendarMode = "event" | "calendar";

interface AddToCalendarBaseProps {
    /** Display mode for the button */
    variant?: "default" | "outline" | "ghost" | "secondary";
    /** Size of the button */
    size?: "default" | "sm" | "lg" | "icon";
    /** Additional CSS classes */
    className?: string;
}

interface AddToCalendarEventProps extends AddToCalendarBaseProps {
    mode: "event";
    /** Author ID of the event */
    authorId: string;
    /** Event ID */
    eventId: string;
    /** Event data for generating Google/Outlook links */
    event: NexusEventResponse | NexusEventStreamItem;
}

interface AddToCalendarCalendarProps extends AddToCalendarBaseProps {
    mode: "calendar";
    /** Author ID of the calendar */
    authorId: string;
    /** Calendar ID */
    calendarId: string;
    /** Calendar name for display */
    calendarName: string;
}

export type AddToCalendarProps = AddToCalendarEventProps | AddToCalendarCalendarProps;

// =============================================================================
// URL Generators
// =============================================================================

/**
 * Generate the ICS endpoint URL for an event or calendar
 */
function getIcsUrl(mode: AddToCalendarMode, authorId: string, resourceId: string): string {
    if (typeof window === "undefined") return "";

    const baseUrl = window.location.origin;
    const path = mode === "event"
        ? `/api/ics/event/${authorId}/${resourceId}`
        : `/api/ics/calendar/${authorId}/${resourceId}`;

    return `${baseUrl}${path}`;
}

/**
 * Generate webcal:// URL from https:// URL
 */
function getWebcalUrl(httpsUrl: string): string {
    return httpsUrl.replace(/^https?:\/\//, "webcal://");
}

// =============================================================================
// Component
// =============================================================================

export function AddToCalendar(props: AddToCalendarProps) {
    const { mode, authorId, variant = "outline", size = "sm", className } = props;
    const [copied, setCopied] = useState(false);

    const resourceId = mode === "event" ? props.eventId : props.calendarId;
    const displayName = mode === "event" ? "event" : props.calendarName;

    // Get URLs
    const icsUrl = getIcsUrl(mode, authorId, resourceId);
    const webcalUrl = getWebcalUrl(icsUrl);

    // Get Google/Outlook URLs for events
    const googleUrl = mode === "event" ? generateGoogleCalendarUrl(props.event) : null;
    const outlookUrl = mode === "event" ? generateOutlookCalendarUrl(props.event) : null;

    const handleCopyUrl = async () => {
        try {
            await navigator.clipboard.writeText(webcalUrl);
            setCopied(true);
            toast.success("Calendar URL copied to clipboard");
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error("Failed to copy URL:", error);
            toast.error("Failed to copy URL");
        }
    };

    const handleDownload = () => {
        // Trigger download by opening the ICS URL
        window.open(icsUrl, "_blank");
    };

    const handleWebcal = () => {
        // Open webcal:// URL to trigger calendar app subscription
        window.location.href = webcalUrl;
    };

    const handleGoogleCalendar = () => {
        if (googleUrl) {
            window.open(googleUrl, "_blank", "noopener,noreferrer");
        }
    };

    const handleOutlookCalendar = () => {
        if (outlookUrl) {
            window.open(outlookUrl, "_blank", "noopener,noreferrer");
        }
    };

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant={variant} size={size} className={className}>
                    <CalendarPlus className="h-4 w-4 mr-2" />
                    {mode === "event" ? "Add to Calendar" : "Subscribe"}
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-2">
                <div className="flex flex-col gap-1">
                    {/* Subscription options */}
                    <button
                        onClick={handleWebcal}
                        className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors text-left"
                    >
                        <CalendarPlus className="h-4 w-4" />
                        {mode === "event" ? "Apple Calendar" : "Subscribe (Apple/macOS)"}
                    </button>

                    {/* Google Calendar - only for events */}
                    {mode === "event" && googleUrl && (
                        <button
                            onClick={handleGoogleCalendar}
                            className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors text-left"
                        >
                            <ExternalLink className="h-4 w-4" />
                            Google Calendar
                        </button>
                    )}

                    {/* Outlook - only for events */}
                    {mode === "event" && outlookUrl && (
                        <button
                            onClick={handleOutlookCalendar}
                            className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors text-left"
                        >
                            <ExternalLink className="h-4 w-4" />
                            Outlook.com
                        </button>
                    )}

                    {/* Separator */}
                    <div className="h-px bg-border my-1" />

                    {/* Download ICS */}
                    <button
                        onClick={handleDownload}
                        className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors text-left"
                    >
                        <Download className="h-4 w-4" />
                        Download .ics file
                    </button>

                    {/* Copy URL */}
                    <button
                        onClick={handleCopyUrl}
                        className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors text-left"
                    >
                        {copied ? (
                            <Check className="h-4 w-4 text-green-500" />
                        ) : (
                            <Copy className="h-4 w-4" />
                        )}
                        {copied ? "Copied!" : "Copy subscription URL"}
                    </button>
                </div>
            </PopoverContent>
        </Popover>
    );
}
