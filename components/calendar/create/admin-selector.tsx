"use client";

import { Control, Controller } from "react-hook-form";
import type { CalendarFormData } from "@/types/calendar";
import { UserSearch } from "@/components/ui/user-search";
import { useUsersByIds, type SelectedUser } from "@/hooks/use-user-search";
import { useEffect, useState } from "react";

interface AdminSelectorProps {
    control: Control<CalendarFormData>;
    /** The calendar owner's user ID - will be excluded from search and always has admin rights */
    ownerUserId?: string;
}

/**
 * Admin selector component for calendar settings
 * Allows selecting multiple users as calendar admins
 * 
 * Admins are stored as x_pubky_admins in the calendar data as per pubky-app-specs
 */
export function AdminSelector({ control, ownerUserId }: AdminSelectorProps) {
    return (
        <Controller
            name="x_pubky_admins"
            control={control}
            render={({ field }) => (
                <AdminSelectorInner
                    value={field.value || []}
                    onChange={field.onChange}
                    ownerUserId={ownerUserId}
                />
            )}
        />
    );
}

interface AdminSelectorInnerProps {
    value: string[];
    onChange: (value: string[]) => void;
    ownerUserId?: string;
}

/**
 * Inner component that handles the conversion between string[] (user IDs) 
 * and SelectedUser[] (UI representation)
 */
function AdminSelectorInner({
    value,
    onChange,
    ownerUserId,
}: AdminSelectorInnerProps) {
    const [selectedUsers, setSelectedUsers] = useState<SelectedUser[]>([]);

    // Fetch existing admin user details when value changes
    const { data: existingUsers, isLoading } = useUsersByIds(value);

    // Sync existing users to selected users state when data loads
    useEffect(() => {
        if (existingUsers && existingUsers.length > 0) {
            const users: SelectedUser[] = existingUsers.map((user) => ({
                id: user.id,
                name: user.name,
                image: user.image,
            }));
            setSelectedUsers(users);
        } else if (value.length === 0) {
            setSelectedUsers([]);
        }
    }, [existingUsers, value.length]);

    const handleSelectionChange = (users: SelectedUser[]) => {
        setSelectedUsers(users);
        // Update form value with just the user IDs
        onChange(users.map((user) => user.id));
    };

    // Build exclusion list - owner should not be selectable as admin (they're implicitly admin)
    const excludeUserIds = ownerUserId ? [ownerUserId] : [];

    return (
        <UserSearch
            selectedUsers={selectedUsers}
            onSelectionChange={handleSelectionChange}
            excludeUserIds={excludeUserIds}
            maxSelections={20} // MAX_ADMINS from pubky-app-specs
            label="Calendar Admins"
            placeholder="Search users by name or ID..."
            description={
                isLoading
                    ? "Loading existing admins..."
                    : "Add users who can manage this calendar. The calendar owner always has admin rights."
            }
        />
    );
}
