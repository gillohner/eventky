"use client";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    Link as LinkIcon,
    Globe,
    Shield,
    ExternalLink,
    Copy,
    Check,
    Clock,
} from "lucide-react";
import { useState } from "react";

interface CalendarMetadataProps {
    /** Calendar URL */
    url?: string;
    /** Calendar description */
    description?: string;
    /** Calendar timezone */
    timezone?: string;
    /** Calendar URI for sharing (pubky:// format) */
    calendarUri?: string;
    /** Calendar author ID */
    authorId?: string;
    /** Calendar ID */
    calendarId?: string;
    /** List of author public keys (users who can add events) */
    authors?: string[];
    /** Calendar sequence number (version) */
    sequence?: number;
    /** Last modified timestamp (microseconds) */
    lastModified?: number;
    /** Created timestamp (microseconds) */
    created?: number;
    /** Additional CSS classes */
    className?: string;
}

/**
 * Display calendar metadata including URL, description, timezone, and authors
 */
export function CalendarMetadata({
    url,
    description,
    timezone,
    calendarUri,
    authorId,
    calendarId,
    authors,
    sequence,
    lastModified,
    created,
    className,
}: CalendarMetadataProps) {
    const [copied, setCopied] = useState(false);

    const handleCopyUri = async () => {
        if (!authorId || !calendarId) return;
        // Use app base URL instead of pubky:// URI
        const appUrl = typeof window !== 'undefined'
            ? `${window.location.origin}/calendar/${authorId}/${calendarId}`
            : '';
        await navigator.clipboard.writeText(appUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const hasContent = url || description || timezone || (authors && authors.length > 0) || created;

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
                {/* Description */}
                {description && (
                    <div className="flex items-start gap-3">
                        <Globe className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium">Description</p>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                {description}
                            </p>
                        </div>
                    </div>
                )}

                {/* Calendar URL */}
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

                {/* Timezone */}
                {timezone && (
                    <div className="flex items-start gap-3">
                        <Clock className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium">Timezone</p>
                            <p className="text-sm text-muted-foreground">
                                {timezone}
                            </p>
                        </div>
                    </div>
                )}

                {/* Authors */}
                {authors && authors.length > 0 && (
                    <div className="flex items-start gap-3">
                        <Shield className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium mb-2">
                                Authors ({authors.length})
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {authors.map((authorId) => (
                                    <AdminBadge key={authorId} adminId={authorId} />
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Timestamps */}
                {(created || lastModified) && (
                    <div className="pt-2 border-t text-xs text-muted-foreground space-y-1">
                        {created && (
                            <p>
                                Created: {formatTimestamp(created)}
                            </p>
                        )}
                        {lastModified && lastModified !== created && (
                            <p>
                                Last modified: {formatTimestamp(lastModified)}
                            </p>
                        )}
                        {sequence !== undefined && (
                            <p>
                                Version: {sequence}
                            </p>
                        )}
                    </div>
                )}

                {/* Share URL */}
                {calendarUri && (
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
                                    Copy Calendar URL
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
 * Admin badge component (placeholder for user profile integration)
 */
function AdminBadge({ adminId }: { adminId: string }) {
    const initials = adminId.slice(0, 2).toUpperCase();
    const displayId = `${adminId.slice(0, 8)}...`;

    return (
        <Badge variant="secondary" className="gap-2 pr-2">
            <Avatar className="h-5 w-5">
                <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
            </Avatar>
            <span className="text-xs font-mono">{displayId}</span>
        </Badge>
    );
}

// Helper functions

function formatUrl(url: string): string {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname + urlObj.pathname;
    } catch {
        return url;
    }
}

function formatTimestamp(microseconds: number): string {
    const date = new Date(microseconds / 1000);
    return date.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
    });
}
