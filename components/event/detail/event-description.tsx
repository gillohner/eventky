"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

interface StyledDescription {
    content: string;
    format: string;
    attachments?: string[] | null;
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
 * Recursively parse styled description that may have been double/triple JSON encoded
 * Returns the final HTML content and format
 */
function parseStyledDescription(input: unknown): { content: string; format: string; attachments: string[] } {
    // Base case: null or undefined
    if (input === null || input === undefined) {
        return { content: "", format: "text/plain", attachments: [] };
    }

    // If it's a string, try to parse as JSON
    if (typeof input === "string") {
        const trimmed = input.trim();

        // Check if it looks like JSON
        if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
            try {
                const parsed = JSON.parse(trimmed);
                // Recursively parse the result
                return parseStyledDescription(parsed);
            } catch {
                // Not valid JSON, return as plain text content
                return { content: trimmed, format: "text/plain", attachments: [] };
            }
        }

        // Check if it looks like HTML (has tags)
        if (trimmed.includes("<") && trimmed.includes(">")) {
            return { content: trimmed, format: "text/html", attachments: [] };
        }

        // Plain text
        return { content: trimmed, format: "text/plain", attachments: [] };
    }

    // If it's an object, extract content
    if (typeof input === "object") {
        const obj = input as Record<string, unknown>;

        // Format: { content, format, attachments }
        if ("content" in obj) {
            const content = obj.content;
            const format = (obj.format as string) || "text/plain";
            const attachments = (obj.attachments as string[]) || [];

            // If content is a string that might be further encoded, recurse
            if (typeof content === "string") {
                const trimmed = content.trim();

                // If content looks like JSON, parse it recursively
                if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
                    try {
                        const parsed = JSON.parse(trimmed);
                        return parseStyledDescription(parsed);
                    } catch {
                        // Not JSON, check format
                    }
                }

                // If format is text/html or the content looks like HTML, return as-is
                if (format === "text/html" || (trimmed.includes("<") && trimmed.includes(">"))) {
                    return { content: trimmed, format: "text/html", attachments };
                }

                return { content: trimmed, format, attachments };
            }

            // Content is not a string, recurse
            return parseStyledDescription(content);
        }

        // Format: { value, fmttype } (alternative format)
        if ("value" in obj && "fmttype" in obj) {
            const content = obj.value as string;
            const format = obj.fmttype as string;
            return { content, format, attachments: [] };
        }
    }

    // Fallback
    return { content: String(input), format: "text/plain", attachments: [] };
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
        // Parse styled description if provided (handles nested JSON encoding)
        if (styledDescription) {
            return parseStyledDescription(styledDescription);
        }

        // Fall back to plain description
        return { content: description || "", format: "text/plain", attachments: [] };
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
