"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

interface StyledDescription {
    content: string;
    format: string;
    attachments?: string[];
}

interface EventDescriptionProps {
    /** Plain text description */
    description?: string;
    /** Styled description with format info */
    styledDescription?: string | StyledDescription | { fmttype: string; value: string };
    /** Additional CSS classes */
    className?: string;
}

/**
 * Display event description with proper formatting
 * Supports plain text, HTML, and Markdown formats
 */
export function EventDescription({
    description,
    styledDescription,
    className,
}: EventDescriptionProps) {
    const { content, format, attachments } = useMemo((): { content: string; format: string; attachments: string[] } => {
        // Parse styled description if provided
        if (styledDescription) {
            // If it's a JSON string, try to parse it first
            if (typeof styledDescription === "string") {
                // Check if it looks like JSON (starts with { or [)
                const trimmed = styledDescription.trim();
                if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
                    try {
                        const parsed = JSON.parse(styledDescription);
                        if (parsed && typeof parsed === "object") {
                            if ("content" in parsed) {
                                return {
                                    content: parsed.content as string,
                                    format: (parsed.format as string) || "text/html",
                                    attachments: (parsed.attachments as string[]) || [],
                                };
                            }
                            if ("value" in parsed && "fmttype" in parsed) {
                                return {
                                    content: parsed.value as string,
                                    format: parsed.fmttype as string,
                                    attachments: [],
                                };
                            }
                        }
                    } catch {
                        // Not valid JSON, treat as plain text
                    }
                }
                // Not JSON or failed to parse - treat as plain text content
                return { content: styledDescription, format: "text/plain", attachments: [] };
            }
            // Already an object
            if ("content" in styledDescription) {
                return {
                    content: styledDescription.content,
                    format: styledDescription.format,
                    attachments: styledDescription.attachments || [],
                };
            }
            if ("value" in styledDescription && "fmttype" in styledDescription) {
                return {
                    content: styledDescription.value,
                    format: styledDescription.fmttype,
                    attachments: [],
                };
            }
        }

        // Fall back to plain description
        return { content: description || "", format: "text/plain", attachments: [] as string[] };
    }, [description, styledDescription]);

    // Don't render if no content
    if (!content) return null;

    return (
        <Card className={cn("", className)}>
            <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    About
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Description Content */}
                <DescriptionContent content={content} format={format} />

                {/* Attachments */}
                {attachments.length > 0 && (
                    <div className="pt-4 border-t">
                        <p className="text-sm font-medium mb-2">Attachments</p>
                        <div className="flex flex-wrap gap-2">
                            {attachments.map((attachment, index) => (
                                <AttachmentPreview key={index} uri={attachment} />
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

/**
 * Render description content based on format
 */
function DescriptionContent({
    content,
    format,
}: {
    content: string;
    format: string;
}) {
    if (format === "text/html") {
        // Sanitize and render HTML
        return (
            <div
                className="prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }}
            />
        );
    }

    if (format === "text/markdown") {
        // For now, render as HTML (could add markdown parser later)
        return (
            <div
                className="prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: markdownToHtml(content) }}
            />
        );
    }

    // Default: plain text with preserved whitespace and line breaks
    return (
        <div className="text-sm text-foreground whitespace-pre-wrap break-words">
            {content}
        </div>
    );
}

/**
 * Basic HTML sanitization (remove script tags, etc.)
 * In production, use a proper sanitizer like DOMPurify
 */
function sanitizeHtml(html: string): string {
    // Remove script tags and event handlers
    return html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        .replace(/on\w+="[^"]*"/gi, "")
        .replace(/on\w+='[^']*'/gi, "")
        .replace(/javascript:/gi, "");
}

/**
 * Basic markdown to HTML conversion
 * In production, use a proper parser like marked or remark
 */
function markdownToHtml(markdown: string): string {
    return markdown
        // Headers
        .replace(/^### (.+)$/gm, "<h3>$1</h3>")
        .replace(/^## (.+)$/gm, "<h2>$1</h2>")
        .replace(/^# (.+)$/gm, "<h1>$1</h1>")
        // Bold and italic
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.+?)\*/g, "<em>$1</em>")
        // Links
        .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
        // Line breaks
        .replace(/\n/g, "<br>");
}

/**
 * Attachment preview component
 */
function AttachmentPreview({ uri }: { uri: string }) {
    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(uri);
    const fileName = uri.split("/").pop() || "Attachment";

    if (isImage) {
        return (
            <a
                href={uri}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-lg overflow-hidden border hover:border-primary transition-colors"
            >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={uri}
                    alt={fileName}
                    className="w-24 h-24 object-cover"
                    loading="lazy"
                />
            </a>
        );
    }

    return (
        <a
            href={uri}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 rounded-lg border hover:border-primary transition-colors text-sm"
        >
            <FileText className="h-4 w-4" />
            <span className="truncate max-w-[150px]">{fileName}</span>
        </a>
    );
}
