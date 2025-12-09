"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { config } from "@/lib/config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Users,
    Check,
    X,
    HelpCircle,
    ChevronDown,
    ChevronUp,
    Info,
} from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { getPendingRsvp } from "@/hooks/use-rsvp-mutation";

interface Attendee {
    id: string;
    author: string;
    partstat: string; // ACCEPTED, DECLINED, TENTATIVE, NEEDS-ACTION
    indexed_at: number;
    created_at: number;
    last_modified?: number;
    recurrence_id?: string; // ISO datetime string for recurring event instances
}

interface AttendanceSectionProps {
    /** List of attendees from Nexus */
    attendees: Attendee[];
    /** Current user's public key */
    currentUserId?: string;
    /** Whether current user can RSVP */
    canRsvp?: boolean;
    /** RSVP access setting */
    rsvpAccess?: string;
    /** Whether this is for a specific instance (recurring) */
    instanceDate?: string;
    /** Event author ID (for pending write lookup) */
    eventAuthorId?: string;
    /** Event ID (for pending write lookup) */
    eventId?: string;
    /** Callback when user RSVPs */
    onRsvp?: (status: string) => void;
    /** Whether RSVP is in progress */
    isRsvpLoading?: boolean;
    /** Additional CSS classes */
    className?: string;
}

type PartStat = "ACCEPTED" | "DECLINED" | "TENTATIVE" | "NEEDS-ACTION";

/**
 * Display attendees and RSVP controls
 */
export function AttendanceSection({
    attendees,
    currentUserId,
    canRsvp = true,
    rsvpAccess,
    instanceDate,
    eventAuthorId,
    eventId,
    onRsvp,
    isRsvpLoading = false,
    className,
}: AttendanceSectionProps) {
    const [expanded, setExpanded] = useState(false);

    // Check for pending writes that haven't been indexed yet
    // Include instanceDate for recurring events
    const pendingWrite = useMemo(() => {
        if (!eventAuthorId || !eventId || !currentUserId) return undefined;
        return getPendingRsvp(eventAuthorId, eventId, currentUserId, instanceDate);
    }, [eventAuthorId, eventId, currentUserId, instanceDate]);

    // Filter and deduplicate attendees for this instance
    // Priority: instance-specific RSVP > global event RSVP
    const deduplicatedAttendees = useMemo(() => {
        const map = new Map<string, Attendee>();

        console.log("[AttendanceSection] Filtering attendees:", {
            instanceDate,
            totalAttendees: attendees.length,
            attendees: attendees.map(a => ({
                author: a.author.slice(0, 8),
                partstat: a.partstat,
                recurrence_id: a.recurrence_id,
            })),
        });

        for (const attendee of attendees) {
            const existing = map.get(attendee.author);

            if (instanceDate) {
                // For recurring event instance view:
                // 1. Instance-specific RSVP (recurrence_id matches) takes priority
                // 2. Fall back to global RSVP (no recurrence_id) if no instance-specific
                const isInstanceSpecific = attendee.recurrence_id === instanceDate;
                const isGlobal = !attendee.recurrence_id;

                console.log(`[AttendanceSection] Processing ${attendee.author.slice(0, 8)}:`, {
                    recurrence_id: attendee.recurrence_id,
                    isInstanceSpecific,
                    isGlobal,
                    willSkip: !isInstanceSpecific && !isGlobal,
                });

                if (!isInstanceSpecific && !isGlobal) {
                    // Skip RSVPs for other instances
                    continue;
                }

                if (!existing) {
                    map.set(attendee.author, attendee);
                } else {
                    const existingIsInstance = existing.recurrence_id === instanceDate;
                    // Prefer instance-specific over global, then by timestamp
                    if (isInstanceSpecific && !existingIsInstance) {
                        map.set(attendee.author, attendee);
                    } else if (isInstanceSpecific === existingIsInstance && attendee.indexed_at > existing.indexed_at) {
                        map.set(attendee.author, attendee);
                    }
                }
            } else {
                // For non-recurring or series view: only show global RSVPs
                if (attendee.recurrence_id) continue;

                if (!existing || attendee.indexed_at > existing.indexed_at) {
                    map.set(attendee.author, attendee);
                }
            }
        }

        // Override current user's status with pending write if exists
        if (pendingWrite && currentUserId) {
            const existing = map.get(currentUserId);
            if (existing) {
                // Update existing entry with pending write status
                map.set(currentUserId, {
                    ...existing,
                    partstat: pendingWrite.partstat,
                    indexed_at: pendingWrite.timestamp,
                    recurrence_id: pendingWrite.recurrenceId,
                });
            } else {
                // Add new entry for current user from pending write
                map.set(currentUserId, {
                    id: `pending-${currentUserId}`,
                    author: currentUserId,
                    partstat: pendingWrite.partstat,
                    indexed_at: pendingWrite.timestamp,
                    created_at: pendingWrite.timestamp,
                    recurrence_id: pendingWrite.recurrenceId,
                });
            }
        }

        const result = Array.from(map.values());
        console.log("[AttendanceSection] Filtered result:", {
            instanceDate,
            resultCount: result.length,
            result: result.map(a => ({
                author: a.author.slice(0, 8),
                partstat: a.partstat,
                recurrence_id: a.recurrence_id,
            })),
        });
        return result;
    }, [attendees, pendingWrite, currentUserId, instanceDate]);

    // Group attendees by status
    const groupedAttendees = deduplicatedAttendees.reduce(
        (acc, attendee) => {
            const status = (attendee.partstat?.toUpperCase() || "NEEDS-ACTION") as PartStat;
            acc[status] = acc[status] || [];
            acc[status].push(attendee);
            return acc;
        },
        {} as Record<PartStat, Attendee[]>
    );

    const acceptedCount = groupedAttendees["ACCEPTED"]?.length || 0;
    const declinedCount = groupedAttendees["DECLINED"]?.length || 0;
    const tentativeCount = groupedAttendees["TENTATIVE"]?.length || 0;
    const totalCount = deduplicatedAttendees.length;

    // Find current user's RSVP status
    const currentUserAttendance = deduplicatedAttendees.find((a) => a.author === currentUserId);
    const currentUserStatus = currentUserAttendance?.partstat?.toUpperCase() as PartStat | undefined;

    // Determine if RSVPs are open
    // TODO: Currently defaulting to PUBLIC only. Extend when full RSVP access rhythm is implemented.
    const isRsvpOpen = !rsvpAccess || rsvpAccess.toUpperCase() === "PUBLIC";
    const showRsvpControls = canRsvp && isRsvpOpen && currentUserId;

    // Attendees to show (limited when collapsed)
    const displayLimit = expanded ? deduplicatedAttendees.length : 5;
    const displayAttendees = deduplicatedAttendees.slice(0, displayLimit);

    return (
        <Card className={cn("", className)}>
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Users className="h-5 w-5 text-muted-foreground" />
                        Attendees
                        {totalCount > 0 && (
                            <Badge variant="secondary" className="ml-1">
                                {totalCount}
                            </Badge>
                        )}
                        {instanceDate && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Showing RSVPs for this instance only</p>
                                </TooltipContent>
                            </Tooltip>
                        )}
                    </CardTitle>

                    {/* Quick Stats */}
                    {totalCount > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                            <span className="flex items-center gap-1 text-green-600">
                                <Check className="h-3 w-3" />
                                {acceptedCount}
                            </span>
                            <span className="flex items-center gap-1 text-yellow-600">
                                <HelpCircle className="h-3 w-3" />
                                {tentativeCount}
                            </span>
                            <span className="flex items-center gap-1 text-red-600">
                                <X className="h-3 w-3" />
                                {declinedCount}
                            </span>
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* RSVP Controls */}
                {showRsvpControls && (
                    <div className="space-y-2">
                        <p className="text-sm font-medium">Your Response</p>
                        <div className="flex flex-wrap gap-2">
                            <RsvpButton
                                status="ACCEPTED"
                                label="Going"
                                icon={<Check className="h-4 w-4" />}
                                isSelected={currentUserStatus === "ACCEPTED"}
                                onClick={() => onRsvp?.("ACCEPTED")}
                                isLoading={isRsvpLoading}
                            />
                            <RsvpButton
                                status="TENTATIVE"
                                label="Maybe"
                                icon={<HelpCircle className="h-4 w-4" />}
                                isSelected={currentUserStatus === "TENTATIVE"}
                                onClick={() => onRsvp?.("TENTATIVE")}
                                isLoading={isRsvpLoading}
                            />
                            <RsvpButton
                                status="DECLINED"
                                label="Can't Go"
                                icon={<X className="h-4 w-4" />}
                                isSelected={currentUserStatus === "DECLINED"}
                                onClick={() => onRsvp?.("DECLINED")}
                                isLoading={isRsvpLoading}
                            />
                        </div>
                    </div>
                )}

                {/* RSVP Closed Notice */}
                {!isRsvpOpen && (
                    <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                        RSVPs are {rsvpAccess?.toLowerCase() === "closed" ? "closed" : "restricted"} for this event.
                    </div>
                )}

                {/* Attendee List */}
                {totalCount > 0 ? (
                    <div className="space-y-2">
                        <p className="text-sm font-medium">
                            {acceptedCount > 0 ? `${acceptedCount} going` : "Responses"}
                        </p>
                        <div className="space-y-2">
                            {displayAttendees.map((attendee) => (
                                <AttendeeRow key={attendee.id} attendee={attendee} />
                            ))}
                        </div>

                        {/* Show more/less toggle */}
                        {totalCount > 5 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-full"
                                onClick={() => setExpanded(!expanded)}
                            >
                                {expanded ? (
                                    <>
                                        <ChevronUp className="h-4 w-4 mr-1" />
                                        Show less
                                    </>
                                ) : (
                                    <>
                                        <ChevronDown className="h-4 w-4 mr-1" />
                                        Show all {totalCount} attendees
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="text-sm text-muted-foreground text-center py-4">
                        No responses yet. Be the first to RSVP!
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

/**
 * RSVP button component
 */
function RsvpButton({
    status,
    label,
    icon,
    isSelected,
    onClick,
    isLoading,
}: {
    status: string;
    label: string;
    icon: React.ReactNode;
    isSelected: boolean;
    onClick: () => void;
    isLoading: boolean;
}) {
    const variants: Record<string, string> = {
        ACCEPTED: isSelected
            ? "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400"
            : "hover:bg-green-50 hover:border-green-200",
        TENTATIVE: isSelected
            ? "bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400"
            : "hover:bg-yellow-50 hover:border-yellow-200",
        DECLINED: isSelected
            ? "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400"
            : "hover:bg-red-50 hover:border-red-200",
    };

    return (
        <Button
            variant="outline"
            size="sm"
            className={cn(
                "flex items-center gap-1.5 transition-colors",
                variants[status]
            )}
            onClick={onClick}
            disabled={isLoading}
        >
            {icon}
            {label}
        </Button>
    );
}

/**
 * Attendee row component
 */
function AttendeeRow({ attendee }: { attendee: Attendee }) {
    const statusIcon = getStatusIcon(attendee.partstat);
    const statusColor = getStatusColor(attendee.partstat);
    const initials = attendee.author.slice(0, 2).toUpperCase();

    return (
        <a
            href={`${config.pubkyApp.profileUrl}/${attendee.author}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors"
        >
            <Avatar className="h-8 w-8">
                <AvatarImage src={undefined} alt={attendee.author} />
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                    {truncateId(attendee.author)}
                </p>
            </div>
            <div className={cn("flex items-center gap-1 text-xs", statusColor)}>
                {statusIcon}
                <span>{formatPartStat(attendee.partstat)}</span>
            </div>
        </a>
    );
}

// Helper functions

function getStatusIcon(partstat: string) {
    switch (partstat?.toUpperCase()) {
        case "ACCEPTED":
            return <Check className="h-3 w-3" />;
        case "DECLINED":
            return <X className="h-3 w-3" />;
        case "TENTATIVE":
            return <HelpCircle className="h-3 w-3" />;
        default:
            return <HelpCircle className="h-3 w-3" />;
    }
}

function getStatusColor(partstat: string): string {
    switch (partstat?.toUpperCase()) {
        case "ACCEPTED":
            return "text-green-600";
        case "DECLINED":
            return "text-red-600";
        case "TENTATIVE":
            return "text-yellow-600";
        default:
            return "text-muted-foreground";
    }
}

function formatPartStat(partstat: string): string {
    switch (partstat?.toUpperCase()) {
        case "ACCEPTED":
            return "Going";
        case "DECLINED":
            return "Not going";
        case "TENTATIVE":
            return "Maybe";
        case "NEEDS-ACTION":
            return "Pending";
        default:
            return partstat || "Unknown";
    }
}

function truncateId(id: string): string {
    if (id.length <= 12) return id;
    return `${id.slice(0, 6)}...${id.slice(-4)}`;
}
