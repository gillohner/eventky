"use client";

import { Control, Controller } from "react-hook-form";
import type { EventFormData } from "@/types/event";
import { useUserCalendars, type UserCalendar } from "@/hooks/use-user-calendars";
import { useCalendar } from "@/hooks/use-calendar-hooks";
import { useAuth } from "@/components/providers/auth-provider";
import { parse_uri } from "pubky-app-specs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Calendar, Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { useState, useCallback, useMemo } from "react";

interface CalendarSelectorProps {
    control: Control<EventFormData>;
    /** Initial calendar URIs to pre-fill */
    initialCalendarUris?: string[];
}

/**
 * Calendar selector component for event creation
 * Allows selecting calendars where the user is owner or admin
 */
export function CalendarSelector({ control, initialCalendarUris }: CalendarSelectorProps) {
    return (
        <Controller
            name="x_pubky_calendar_uris"
            control={control}
            defaultValue={initialCalendarUris}
            render={({ field }) => (
                <CalendarSelectorInner
                    value={field.value || []}
                    onChange={field.onChange}
                    initialCalendarUris={initialCalendarUris}
                />
            )}
        />
    );
}

interface CalendarSelectorInnerProps {
    value: string[];
    onChange: (value: string[]) => void;
    initialCalendarUris?: string[];
}

/**
 * Parse a pubky calendar URI to extract author and calendar ID
 */
function parseCalendarUri(uri: string): { authorId: string; calendarId: string } | null {
    // Format: pubky://{authorId}/pub/eventky.app/calendars/{calendarId}
    try {
        const parsed = parse_uri(uri);
        if (parsed.resource === "calendars" && parsed.resource_id) {
            return { authorId: parsed.user_id, calendarId: parsed.resource_id };
        }
    } catch {
        // Fall through to return null
    }
    return null;
}

/**
 * Hook to fetch a single calendar from URI (for pre-selected calendars not in stream)
 */
function useCalendarFromUri(uri: string | undefined, enabled: boolean) {
    const parsed = uri ? parseCalendarUri(uri) : null;
    return useCalendar(
        parsed?.authorId || "",
        parsed?.calendarId || "",
        { queryOptions: { enabled: enabled && !!parsed } }
    );
}

/**
 * Component to display a pre-selected calendar that may not be in the user's calendar stream
 */
function PreSelectedCalendarBadge({
    uri,
    onRemove,
    userCalendars
}: {
    uri: string;
    onRemove: (uri: string) => void;
    userCalendars: UserCalendar[] | undefined;
}) {
    const { auth } = useAuth();
    // Check if this calendar is already in user calendars
    const existingCalendar = userCalendars?.find(cal => cal.uri === uri);

    // Only fetch if not already in user calendars
    const { data: fetchedCalendar, isLoading } = useCalendarFromUri(
        uri,
        !existingCalendar
    );

    // Use existing or fetched calendar data
    const calendar = existingCalendar || (fetchedCalendar ? {
        id: fetchedCalendar.details.id,
        uri: fetchedCalendar.details.uri,
        name: fetchedCalendar.details.name,
        author: fetchedCalendar.details.author,
        color: fetchedCalendar.details.color,
        timezone: fetchedCalendar.details.timezone,
        isOwner: fetchedCalendar.details.author === auth?.publicKey,
    } : null);

    if (isLoading) {
        return (
            <Badge variant="secondary" className="flex items-center gap-1.5 py-1.5 px-3">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span className="text-xs">Loading...</span>
            </Badge>
        );
    }

    if (!calendar) {
        // Show URI as fallback if calendar not found
        const parsed = parseCalendarUri(uri);
        return (
            <Badge
                variant="secondary"
                className="flex items-center gap-1.5 py-1.5 px-3"
            >
                <Calendar className="h-3 w-3" />
                <span className="max-w-[150px] truncate text-xs">
                    {parsed?.calendarId || uri}
                </span>
                <button
                    type="button"
                    onClick={() => onRemove(uri)}
                    className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
                >
                    <X className="h-3 w-3" />
                </button>
            </Badge>
        );
    }

    return (
        <Badge
            variant="secondary"
            className="flex items-center gap-1.5 py-1.5 px-3"
            style={{
                borderLeftColor: calendar.color || undefined,
                borderLeftWidth: calendar.color ? 3 : undefined,
            }}
        >
            <Calendar className="h-3 w-3" />
            <span className="max-w-[150px] truncate">{calendar.name}</span>
            {calendar.isOwner ? (
                <span className="text-xs text-muted-foreground">(owner)</span>
            ) : (
                <span className="text-xs text-muted-foreground">(admin)</span>
            )}
            <button
                type="button"
                onClick={() => onRemove(uri)}
                className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
            >
                <X className="h-3 w-3" />
            </button>
        </Badge>
    );
}

function CalendarSelectorInner({ value, onChange }: CalendarSelectorInnerProps) {
    const [open, setOpen] = useState(false);
    const { data: calendars, isLoading } = useUserCalendars();

    // Available calendars for selection (not already selected)
    const availableCalendars = useMemo(() =>
        calendars?.filter((cal) => !value.includes(cal.uri)) || [],
        [calendars, value]
    );

    const handleSelect = useCallback((calendar: UserCalendar) => {
        if (!value.includes(calendar.uri)) {
            onChange([...value, calendar.uri]);
        }
        setOpen(false);
    }, [value, onChange]);

    const handleRemove = useCallback((uri: string) => {
        onChange(value.filter((u) => u !== uri));
    }, [value, onChange]);

    return (
        <div className="space-y-3">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Calendars
            </label>
            <p className="text-sm text-muted-foreground">
                Add this event to calendars you own or manage
            </p>

            {/* Selected calendars */}
            {value.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {value.map((uri) => (
                        <PreSelectedCalendarBadge
                            key={uri}
                            uri={uri}
                            onRemove={handleRemove}
                            userCalendars={calendars}
                        />
                    ))}
                </div>
            )}

            {/* Add calendar button */}
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        disabled={isLoading || availableCalendars.length === 0}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Loading...
                            </>
                        ) : (
                            <>
                                <Plus className="h-4 w-4" />
                                Add Calendar
                            </>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="start">
                    <div className="p-2">
                        <p className="text-sm font-medium px-2 py-1.5">
                            Select a calendar
                        </p>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                        {availableCalendars.length === 0 ? (
                            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                                {calendars?.length === 0 ? (
                                    <>
                                        No calendars found.
                                        <br />
                                        Create a calendar first.
                                    </>
                                ) : (
                                    "All your calendars are already added."
                                )}
                            </div>
                        ) : (
                            <div className="p-1">
                                {availableCalendars.map((calendar) => (
                                    <button
                                        key={calendar.uri}
                                        type="button"
                                        onClick={() => handleSelect(calendar)}
                                        className={cn(
                                            "w-full flex items-center gap-3 px-3 py-2 rounded-md text-left",
                                            "hover:bg-accent hover:text-accent-foreground",
                                            "focus:outline-none focus:bg-accent focus:text-accent-foreground"
                                        )}
                                    >
                                        <div
                                            className="w-3 h-3 rounded-full shrink-0"
                                            style={{ backgroundColor: calendar.color || "#666" }}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium truncate">
                                                {calendar.name}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {calendar.isOwner ? "Owner" : "Admin"} • {calendar.timezone}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </PopoverContent>
            </Popover>

            {/* Empty state hint - only show if no calendars AND no pre-selected ones */}
            {!isLoading && calendars?.length === 0 && value.length === 0 && (
                <p className="text-sm text-muted-foreground italic">
                    You don&apos;t have any calendars yet. Create a calendar to organize your events.
                </p>
            )}
        </div>
    );
}
