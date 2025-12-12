/**
 * Debug View Toggle Button
 * 
 * Reusable button for switching between UI and raw data view
 * Only visible when debug mode is enabled
 */

"use client";

import { Button } from "@/components/ui/button";
import { Bug, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

interface DebugViewToggleProps {
    /** Whether raw data view is currently shown */
    showRawData: boolean;
    /** Callback to toggle view */
    onToggle: () => void;
    /** Whether debug mode is enabled */
    debugEnabled: boolean;
    /** Additional CSS classes */
    className?: string;
}

/**
 * Button to toggle between UI and raw data view
 * Only renders when debug mode is enabled
 * 
 * @example
 * ```tsx
 * const { debugEnabled, showRawData, toggleRawData } = useDebugView();
 * 
 * <DebugViewToggle
 *   debugEnabled={debugEnabled}
 *   showRawData={showRawData}
 *   onToggle={toggleRawData}
 * />
 * ```
 */
export function DebugViewToggle({
    showRawData,
    onToggle,
    debugEnabled,
    className,
}: DebugViewToggleProps) {
    if (!debugEnabled) {
        return null;
    }

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={onToggle}
            className={cn("gap-2", className)}
        >
            {showRawData ? (
                <>
                    <Eye className="h-4 w-4" />
                    Show UI
                </>
            ) : (
                <>
                    <Bug className="h-4 w-4" />
                    Show Raw Data
                </>
            )}
        </Button>
    );
}
