"use client";

import { cn } from "@/lib/utils";
import { parse_uri } from "@eventky/pubky-app-specs";
import { useCalendar } from "@/hooks/use-calendar-hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Link as LinkIcon,
    Calendar,
    Users,
    Clock,
    Shield,
    ExternalLink,
    Copy,
    Check,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

interface EventMetadataProps {
    /** Event URL */
    url?: string;
    /** Event status (CONFIRMED, TENTATIVE, CANCELLED) */
    status?: string;
    /** Calendar URIs this event belongs to */
    calendarUris?: string[];
    /** RSVP access setting (OPEN, CLOSED, FOLLOWERS, INVITE_ONLY) */
    rsvpAccess?: string;
    /** Event sequence number (version) */
    sequence?: number;
    /** Last modified timestamp (microseconds) */
    lastModified?: number;
    /** Created timestamp (microseconds) */
    created?: number;
    /** Event URI for sharing (pubky:// format) */
    eventUri?: string;
    /** Event author ID */
    authorId?: string;
    /** Event ID */
    eventId?: string;
    /** Additional CSS classes */
    className?: string;
}

/**
 * Display event metadata including URL, calendars, and access settings
 */
export function EventMetadata({
    url,
    status,
    calendarUris,
    rsvpAccess,
    sequence,
    lastModified,
    created,
    eventUri,
    authorId,
    eventId,
    className,
}: EventMetadataProps) {
    const [copied, setCopied] = useState(false);

    const handleCopyUri = async () => {
        if (!authorId || !eventId) return;
        // Use app base URL instead of pubky:// URI
        const appUrl = typeof window !== 'undefined'
            ? `${window.location.origin}/event/${authorId}/${eventId}`
            : '';
        await navigator.clipboard.writeText(appUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const hasContent = url || (calendarUris && calendarUris.length > 0) || rsvpAccess || created;

    if (!hasContent) return null;

    return (
        <Card className={cn("", className)}>
            <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                    <LinkIcon className="h-5 w-5 text-muted-foreground" />
                    Details
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Event URL */}
                {url && (
                    <div className="flex items-start gap-3">
                        <ExternalLink className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium">Website</p>
                            <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-primary hover:underline truncate block"
                            >
                                {formatUrl(url)}
                            </a>
                        </div>
                    </div>
                )}

                {/* Calendars */}
                {calendarUris && calendarUris.length > 0 && (
                    <div className="flex items-start gap-3">
                        <Calendar className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium mb-1">Calendars</p>
                            <div className="flex flex-wrap gap-1">
                                {calendarUris.map((uri, index) => (
                                    <CalendarLink key={index} uri={uri} />
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* RSVP Access */}
                {rsvpAccess && (
                    <div className="flex items-start gap-3">
                        <Shield className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium">RSVP Access</p>
                            <div className="flex items-center gap-2">
                                <Badge variant={getRsvpBadgeVariant(rsvpAccess)} className="text-xs">
                                    {formatRsvpAccess(rsvpAccess)}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                    {getRsvpDescription(rsvpAccess)}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Status */}
                {status && status !== "CONFIRMED" && (
                    <div className="flex items-start gap-3">
                        <Users className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium">Status</p>
                            <Badge variant={getStatusBadgeVariant(status)} className="text-xs">
                                {formatStatus(status)}
                            </Badge>
                        </div>
                    </div>
                )}

                {/* Timestamps */}
                {(created || lastModified) && (
                    <div className="flex items-start gap-3">
                        <Clock className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0 flex-1 text-sm text-muted-foreground">
                            {created && (
                                <p>Created: {formatTimestamp(created)}</p>
                            )}
                            {lastModified && sequence !== undefined && sequence > 0 && (
                                <p>Updated: {formatTimestamp(lastModified)} (v{sequence})</p>
                            )}
                        </div>
                    </div>
                )}

                {/* Share URL */}
                {(eventUri || (authorId && eventId)) && (
                    <div className="pt-3 border-t">
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={handleCopyUri}
                        >
                            {copied ? (
                                <>
                                    <Check className="h-4 w-4 mr-2" />
                                    Copied!
                                </>
                            ) : (
                                <>
                                    <Copy className="h-4 w-4 mr-2" />
                                    Copy Event URL
                                </>
                            )}
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

/**
 * Calendar link component - fetches calendar name from Nexus
 */
function CalendarLink({ uri }: { uri: string }) {
    const { authorId, calendarId } = parseCalendarUri(uri);

    if (!authorId || !calendarId) {
        return (
            <Badge variant="outline" className="text-xs">
                {uri.slice(0, 20)}...
            </Badge>
        );
    }

    return <CalendarLinkWithData authorId={authorId} calendarId={calendarId} />;
}

/**
 * Inner component that uses the hook to fetch calendar data
 */
function CalendarLinkWithData({ authorId, calendarId }: { authorId: string; calendarId: string }) {
    // Use existing useCalendar hook to fetch calendar details
    const { data: calendar, isLoading } = useCalendar(authorId, calendarId, {
        queryOptions: {
            staleTime: 5 * 60 * 1000, // 5 minutes
        },
    });

    const calendarName = calendar?.details?.name;

    // Truncate long calendar names
    const displayName = calendarName
        ? (calendarName.length > 25 ? `${calendarName.slice(0, 25)}...` : calendarName)
        : `${calendarId.slice(0, 8)}...`;

    return (
        <Link href={`/calendar/${authorId}/${calendarId}`}>
            <Badge
                variant="secondary"
                className="text-xs hover:bg-secondary/80 cursor-pointer max-w-[200px] inline-flex items-center gap-1"
            >
                <Calendar className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">
                    {isLoading ? "Loading..." : displayName}
                </span>
            </Badge>
        </Link>
    );
}

// Helper functions

function parseCalendarUri(uri: string): {
    authorId?: string;
    calendarId?: string;
} {
    // Parse pubky://authorId/pub/eventky.app/calendars/calendarId using pubky-app-specs
    try {
        const parsed = parse_uri(uri);
        if (parsed.resource === "calendars" && parsed.resource_id) {
            return { authorId: parsed.user_id, calendarId: parsed.resource_id };
        }
    } catch {
        // Fall through to return empty
    }
    return {};
}

function formatUrl(url: string): string {
    try {
        const parsed = new URL(url);
        return parsed.hostname + (parsed.pathname !== "/" ? parsed.pathname : "");
    } catch {
        return url.length > 40 ? url.slice(0, 40) + "..." : url;
    }
}

function formatStatus(status: string): string {
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}

function getStatusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
    switch (status?.toUpperCase()) {
        case "CONFIRMED":
            return "default";
        case "TENTATIVE":
            return "secondary";
        case "CANCELLED":
            return "destructive";
        default:
            return "outline";
    }
}

function formatRsvpAccess(access: string): string {
    switch (access?.toUpperCase()) {
        case "OPEN":
            return "Open";
        case "CLOSED":
            return "Closed";
        case "FOLLOWERS":
            return "Followers Only";
        case "INVITE_ONLY":
            return "Invite Only";
        default:
            return access || "Unknown";
    }
}

function getRsvpBadgeVariant(access: string): "default" | "secondary" | "destructive" | "outline" {
    switch (access?.toUpperCase()) {
        case "OPEN":
            return "default";
        case "FOLLOWERS":
            return "secondary";
        case "INVITE_ONLY":
        case "CLOSED":
            return "outline";
        default:
            return "outline";
    }
}

function getRsvpDescription(access: string): string {
    switch (access?.toUpperCase()) {
        case "OPEN":
            return "Anyone can RSVP";
        case "CLOSED":
            return "RSVPs are disabled";
        case "FOLLOWERS":
            return "Only followers can RSVP";
        case "INVITE_ONLY":
            return "By invitation only";
        default:
            return "";
    }
}

function formatTimestamp(microseconds: number): string {
    try {
        const date = new Date(microseconds / 1000);
        return new Intl.DateTimeFormat("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
        }).format(date);
    } catch {
        return "Unknown";
    }
}
