"use client";

import { Control, Controller } from "react-hook-form";
import type { CalendarFormData } from "@/types/calendar";
import { UserSearch } from "@/components/ui/user-search";
import { useUsersByIds, type SelectedUser } from "@/hooks/use-user-search";
import { useMemo } from "react";

interface AuthorSelectorProps {
    control: Control<CalendarFormData>;
    /** The calendar owner's user ID - will be excluded from search and always has full edit rights */
    ownerUserId?: string;
}

/**
 * Author selector component for calendar settings
 * Allows selecting multiple users as calendar authors (users who can add events)
 * 
 * Authors are stored as x_pubky_authors in the calendar data as per pubky-app-specs
 * Only the owner can edit the calendar itself, authors can only add events to it
 */
export function AuthorSelector({ control, ownerUserId }: AuthorSelectorProps) {
    return (
        <Controller
            name="x_pubky_authors"
            control={control}
            render={({ field }) => (
                <AuthorSelectorInner
                    value={field.value || []}
                    onChange={field.onChange}
                    ownerUserId={ownerUserId}
                />
            )}
        />
    );
}

interface AuthorSelectorInnerProps {
    value: string[];
    onChange: (value: string[]) => void;
    ownerUserId?: string;
}

/**
 * Inner component that handles the conversion between string[] (user IDs) 
 * and SelectedUser[] (UI representation)
 */
function AuthorSelectorInner({
    value,
    onChange,
    ownerUserId,
}: AuthorSelectorInnerProps) {
    // Fetch existing author user details when value changes
    const { data: existingUsers, isLoading } = useUsersByIds(value);

    // Derive selected users from fetched data (no useState needed)
    const selectedUsers: SelectedUser[] = useMemo(() => {
        if (existingUsers && existingUsers.length > 0) {
            return existingUsers.map((user) => ({
                id: user.id,
                name: user.name,
                image: user.image,
            }));
        }
        return [];
    }, [existingUsers]);

    const handleSelectionChange = (users: SelectedUser[]) => {
        // Update form value with just the user IDs
        onChange(users.map((user) => user.id));
    };

    // Build exclusion list - owner should not be selectable as author (they're implicitly the owner)
    const excludeUserIds = ownerUserId ? [ownerUserId] : [];

    return (
        <UserSearch
            selectedUsers={selectedUsers}
            onSelectionChange={handleSelectionChange}
            excludeUserIds={excludeUserIds}
            maxSelections={20} // MAX_AUTHORS from pubky-app-specs
            label="Calendar Authors"
            placeholder="Search users by name or ID..."
            description={
                isLoading
                    ? "Loading existing authors..."
                    : "Add users who can add events to this calendar. Only the owner can edit the calendar itself."
            }
        />
    );
}
