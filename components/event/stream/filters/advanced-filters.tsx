"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { UserSearch } from "@/components/ui/user-search";
import { useUsersByIds, type SelectedUser } from "@/hooks/use-user-search";
import { Settings2, User } from "lucide-react";
import { getValidEventStatuses } from "pubky-app-specs";
import { useForm } from "react-hook-form";
import { TimezoneSelector } from "@/components/ui/timezone-selector";

const EVENT_STATUSES = getValidEventStatuses().map((status) => ({
    value: status,
    label: status.charAt(0) + status.slice(1).toLowerCase(),
}));

interface AdvancedFiltersProps {
    author?: string;
    status?: string;
    timezone?: string;
    onChange: (filters: { author?: string; status?: string; timezone?: string }) => void;
}

export function AdvancedFilters({
    author,
    status,
    timezone,
    onChange
}: AdvancedFiltersProps) {
    const [isOpen, setIsOpen] = useState(false);

    const { control, watch, setValue } = useForm({
        defaultValues: {
            timezone: timezone || "",
        },
    });

    const timezoneValue = watch("timezone");

    // Sync timezone changes to parent (only when user selects a timezone)
    useEffect(() => {
        const normalizedTimezone = timezone || "";
        const normalizedValue = timezoneValue || "";

        if (normalizedValue !== normalizedTimezone) {
            onChange({ author, status, timezone: timezoneValue || undefined });
        }
    }, [timezoneValue]);

    // Update form when prop changes externally (e.g., clear button)
    useEffect(() => {
        const normalizedTimezone = timezone || "";
        const normalizedValue = timezoneValue || "";

        if (normalizedTimezone !== normalizedValue) {
            setValue("timezone", timezone || "");
        }
    }, [timezone]);

    const authorIds = author ? [author] : [];
    const { data: authorUsers } = useUsersByIds(authorIds);

    const selectedAuthors: SelectedUser[] = authorUsers?.map((user) => ({
        id: user.id,
        name: user.name,
        image: user.image,
    })) || [];

    const activeFilterCount = [author, status, timezone].filter(Boolean).length;

    const handleAuthorChange = (users: SelectedUser[]) => {
        onChange({ author: users.length > 0 ? users[0].id : undefined, status, timezone });
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant={activeFilterCount > 0 ? "default" : "outline"}
                    size="sm"
                    className="gap-2"
                >
                    <Settings2 className="h-4 w-4" />
                    <span className="hidden sm:inline">More</span>
                    {activeFilterCount > 0 && (
                        <Badge variant="secondary" className="ml-1 px-1.5 py-0 h-5 text-xs">
                            {activeFilterCount}
                        </Badge>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm">Advanced Filters</h4>
                    </div>

                    {/* Author Filter */}
                    <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <User className="h-3 w-3" />
                            Event Author
                        </Label>
                        <UserSearch
                            selectedUsers={selectedAuthors}
                            onSelectionChange={handleAuthorChange}
                            maxSelections={1}
                            label=""
                            placeholder="Search by name or user ID..."
                            description=""
                        />
                    </div>

                    <Separator />

                    {/* Status Filter */}
                    <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Event Status</Label>
                        <Select
                            value={status || "__all__"}
                            onValueChange={(value) =>
                                onChange({ author, status: value === "__all__" ? undefined : value, timezone })
                            }
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="All statuses" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__all__">All statuses</SelectItem>
                                {EVENT_STATUSES.map((s) => (
                                    <SelectItem key={s.value} value={s.value}>
                                        {s.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <Separator />

                    {/* Timezone Filter */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs text-muted-foreground">Timezone</Label>
                            {timezone && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onChange({ author, status, timezone: undefined })}
                                    className="h-auto py-0 px-2 text-xs"
                                >
                                    Clear
                                </Button>
                            )}
                        </div>
                        <TimezoneSelector
                            control={control}
                            name="timezone"
                            label=""
                        />
                        <p className="text-xs text-muted-foreground">
                            Filter events by their timezone
                        </p>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
