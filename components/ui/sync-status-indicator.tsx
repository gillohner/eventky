/**
 * Sync Status Indicator Component
 *
 * Shows the current sync status between local cache and Nexus
 * Used to provide user feedback during optimistic updates
 */

"use client";

import { cn } from "@/lib/utils";
import { type SyncStatus } from "@/types/nexus";
import { Cloud, CloudOff, Loader2, AlertCircle, Check } from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface SyncStatusIndicatorProps {
    status: SyncStatus;
    className?: string;
    showLabel?: boolean;
    size?: "sm" | "md" | "lg";
}

const statusConfig: Record<
    SyncStatus,
    {
        icon: typeof Cloud;
        label: string;
        description: string;
        className: string;
    }
> = {
    pending: {
        icon: Cloud,
        label: "Pending",
        description: "Waiting to sync with server",
        className: "text-yellow-500",
    },
    syncing: {
        icon: Loader2,
        label: "Syncing",
        description: "Synchronizing with server...",
        className: "text-blue-500 animate-spin",
    },
    synced: {
        icon: Check,
        label: "Synced",
        description: "Data is synchronized with server",
        className: "text-green-500",
    },
    stale: {
        icon: CloudOff,
        label: "Stale",
        description: "Data may be out of date",
        className: "text-gray-400",
    },
    error: {
        icon: AlertCircle,
        label: "Error",
        description: "Failed to sync with server",
        className: "text-red-500",
    },
};

const sizeClasses = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
};

export function SyncStatusIndicator({
    status,
    className,
    showLabel = false,
    size = "md",
}: SyncStatusIndicatorProps) {
    const config = statusConfig[status];
    const Icon = config.icon;

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div
                        className={cn(
                            "inline-flex items-center gap-1.5",
                            className
                        )}
                    >
                        <Icon
                            className={cn(sizeClasses[size], config.className)}
                        />
                        {showLabel && (
                            <span
                                className={cn(
                                    "text-xs font-medium",
                                    config.className
                                )}
                            >
                                {config.label}
                            </span>
                        )}
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{config.description}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

/**
 * Compact badge version for inline use
 */
interface SyncBadgeProps {
    status: SyncStatus;
    className?: string;
}

export function SyncBadge({ status, className }: SyncBadgeProps) {
    const config = statusConfig[status];
    const Icon = config.icon;

    // Only show badge for non-synced states
    if (status === "synced") {
        return null;
    }

    return (
        <div
            className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                status === "pending" && "bg-yellow-100 text-yellow-700",
                status === "syncing" && "bg-blue-100 text-blue-700",
                status === "stale" && "bg-gray-100 text-gray-600",
                status === "error" && "bg-red-100 text-red-700",
                className
            )}
        >
            <Icon className={cn("h-3 w-3", config.className)} />
            {config.label}
        </div>
    );
}
