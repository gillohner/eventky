/**
 * Dev Mode - JSON View Component
 * Displays raw JSON data for development and debugging
 * Only visible in development mode
 */

"use client";

import { config } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useState } from "react";

interface DevJsonViewProps {
    data: unknown;
    title: string;
    isLoading?: boolean;
    error?: Error | null;
}

/**
 * Component to display raw JSON data in development mode
 * Shows loading state, errors, and formatted JSON
 */
export function DevJsonView({
    data,
    title,
    isLoading = false,
    error = null,
}: DevJsonViewProps) {
    const [copied, setCopied] = useState(false);

    // Only render in development mode
    if (!config.isDevelopment) {
        return null;
    }

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    };

    return (
        <div className="container mx-auto py-8 px-4">
            <div className="max-w-6xl mx-auto space-y-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">{title}</h1>
                    <div className="px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-500 text-xs font-medium">
                        DEV MODE
                    </div>
                </div>

                {isLoading && (
                    <div className="rounded-lg border border-border bg-card p-8 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                        <p className="text-muted-foreground">Loading data...</p>
                    </div>
                )}

                {error && (
                    <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-6">
                        <h2 className="text-lg font-semibold text-red-500 mb-2">Error</h2>
                        <p className="text-sm text-red-400">{error.message}</p>
                    </div>
                )}

                {!isLoading && !error && (
                    <div className="rounded-lg border border-border bg-muted/50 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold">Raw JSON Data</h2>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleCopy}
                                className="gap-2"
                            >
                                {copied ? (
                                    <>
                                        <Check className="h-4 w-4" />
                                        Copied!
                                    </>
                                ) : (
                                    <>
                                        <Copy className="h-4 w-4" />
                                        Copy JSON
                                    </>
                                )}
                            </Button>
                        </div>
                        <pre className="overflow-auto text-xs bg-background rounded-md p-4 border border-border max-h-[70vh]">
                            <code>{JSON.stringify(data, null, 2)}</code>
                        </pre>
                    </div>
                )}

                {!isLoading && !error && !data && (
                    <div className="rounded-lg border border-border bg-card p-8 text-center">
                        <p className="text-muted-foreground">No data available</p>
                    </div>
                )}
            </div>
        </div>
    );
}
