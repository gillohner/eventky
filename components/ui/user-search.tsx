"use client";

import * as React from "react";
import { useState, useRef, useMemo, useCallback } from "react";
import { Search, X, Loader2, User, Key } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useUserSearch, type SelectedUser } from "@/hooks/use-user-search";
import { getPubkyAvatarUrl, getInitials, validatePubkyId, looksLikePubkyId, truncatePublicKey } from "@/lib/pubky/utils";
import type { NexusUserDetails } from "@/lib/nexus/users";

interface UserSearchProps {
    /** Currently selected users */
    selectedUsers: SelectedUser[];
    /** Callback when users selection changes */
    onSelectionChange: (users: SelectedUser[]) => void;
    /** Maximum number of users that can be selected */
    maxSelections?: number;
    /** Placeholder text for the search input */
    placeholder?: string;
    /** User IDs to exclude from search results (e.g., calendar owner) */
    excludeUserIds?: string[];
    /** Disabled state */
    disabled?: boolean;
    /** Label for the component */
    label?: string;
    /** Description text */
    description?: string;
}

/**
 * User search component with multi-select capability
 * Uses Nexus API to search users by name or ID prefix
 */
export function UserSearch({
    selectedUsers,
    onSelectionChange,
    maxSelections = 20,
    placeholder = "Search users...",
    excludeUserIds = [],
    disabled = false,
    label,
    description,
}: UserSearchProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const {
        searchTerm,
        setSearchTerm,
        users,
        isLoading,
        isSearching,
    } = useUserSearch();

    // Check if the current input is a valid public key
    const pubkyValidation = useMemo(() => {
        return validatePubkyId(searchTerm);
    }, [searchTerm]);

    // Check if input looks like a public key (for UI hints)
    const inputLooksLikePubky = useMemo(() => {
        return looksLikePubkyId(searchTerm);
    }, [searchTerm]);

    // Filter out excluded and already selected users from results
    const filteredUsers = users.filter(
        (user) =>
            !excludeUserIds.includes(user.id) &&
            !selectedUsers.some((selected) => selected.id === user.id)
    );

    // Check if the valid pubky ID is already selected or excluded
    const pubkyIdAlreadySelected = pubkyValidation.isValid && (
        excludeUserIds.includes(pubkyValidation.pubkyId) ||
        selectedUsers.some((selected) => selected.id === pubkyValidation.pubkyId)
    );

    // Show "add public key" option if valid and not already selected
    const showAddPubkyOption = pubkyValidation.isValid && !pubkyIdAlreadySelected;

    // Calculate total selectable items for keyboard nav
    const totalItems = (showAddPubkyOption ? 1 : 0) + filteredUsers.length;

    const handleSelect = useCallback((user: NexusUserDetails) => {
        if (selectedUsers.length >= maxSelections) {
            return;
        }
        const newUser: SelectedUser = {
            id: user.id,
            name: user.name,
            image: user.image,
        };
        onSelectionChange([...selectedUsers, newUser]);
        setSearchTerm("");
        setHighlightedIndex(-1);
    }, [selectedUsers, maxSelections, onSelectionChange, setSearchTerm]);

    // Handle adding a raw public key (not from search results)
    const handleAddPubkyId = useCallback(() => {
        if (!pubkyValidation.isValid || pubkyIdAlreadySelected) {
            return;
        }
        if (selectedUsers.length >= maxSelections) {
            return;
        }
        const newUser: SelectedUser = {
            id: pubkyValidation.pubkyId,
            name: truncatePublicKey(pubkyValidation.pubkyId, 8), // Use truncated ID as display name
            image: undefined, // No image for unindexed users
        };
        onSelectionChange([...selectedUsers, newUser]);
        setSearchTerm("");
        setHighlightedIndex(-1);
    }, [pubkyValidation, pubkyIdAlreadySelected, selectedUsers, maxSelections, onSelectionChange, setSearchTerm]);

    const handleRemove = (userId: string) => {
        onSelectionChange(selectedUsers.filter((user) => user.id !== userId));
    };

    // Keyboard navigation handler
    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!isOpen || totalItems === 0) return;

        switch (e.key) {
            case "ArrowDown":
                e.preventDefault();
                setHighlightedIndex((prev) => {
                    const next = prev < totalItems - 1 ? prev + 1 : 0;
                    // Scroll highlighted item into view
                    setTimeout(() => {
                        const item = listRef.current?.querySelector(`[data-index="${next}"]`);
                        item?.scrollIntoView({ block: "nearest" });
                    }, 0);
                    return next;
                });
                break;
            case "ArrowUp":
                e.preventDefault();
                setHighlightedIndex((prev) => {
                    const next = prev > 0 ? prev - 1 : totalItems - 1;
                    setTimeout(() => {
                        const item = listRef.current?.querySelector(`[data-index="${next}"]`);
                        item?.scrollIntoView({ block: "nearest" });
                    }, 0);
                    return next;
                });
                break;
            case "Enter":
                e.preventDefault();
                if (highlightedIndex >= 0) {
                    if (showAddPubkyOption && highlightedIndex === 0) {
                        handleAddPubkyId();
                        setIsOpen(false);
                    } else {
                        const userIndex = showAddPubkyOption ? highlightedIndex - 1 : highlightedIndex;
                        if (filteredUsers[userIndex]) {
                            handleSelect(filteredUsers[userIndex]);
                            setIsOpen(false);
                        }
                    }
                }
                break;
            case "Escape":
                e.preventDefault();
                setIsOpen(false);
                setHighlightedIndex(-1);
                break;
        }
    }, [isOpen, totalItems, highlightedIndex, showAddPubkyOption, filteredUsers, handleAddPubkyId, handleSelect]);

    const canAddMore = selectedUsers.length < maxSelections;

    return (
        <div className="space-y-2">
            {label && (
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    {label}
                </label>
            )}

            {/* Selected users chips */}
            {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                    {selectedUsers.map((user) => (
                        <UserChip
                            key={user.id}
                            user={user}
                            onRemove={() => handleRemove(user.id)}
                            disabled={disabled}
                        />
                    ))}
                </div>
            )}

            {/* Search input with popover */}
            {canAddMore && (
                <Popover open={isOpen} onOpenChange={setIsOpen}>
                    <PopoverTrigger asChild>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                ref={inputRef}
                                type="text"
                                placeholder={placeholder}
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setHighlightedIndex(-1); // Reset highlight when typing
                                    if (e.target.value.length >= 2) {
                                        setIsOpen(true);
                                    }
                                }}
                                onFocus={() => {
                                    if (searchTerm.length >= 2) {
                                        setIsOpen(true);
                                    }
                                }}
                                onKeyDown={handleKeyDown}
                                disabled={disabled}
                                className="pl-9 pr-4"
                                role="combobox"
                                aria-expanded={isOpen}
                                aria-haspopup="listbox"
                                aria-autocomplete="list"
                            />
                            {isSearching && (
                                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                            )}
                        </div>
                    </PopoverTrigger>
                    <PopoverContent
                        className="w-[var(--radix-popover-trigger-width)] p-0 overflow-hidden"
                        align="start"
                        onOpenAutoFocus={(e) => e.preventDefault()}
                        sideOffset={4}
                    >
                        <UserSearchResults
                            ref={listRef}
                            users={filteredUsers}
                            isLoading={isLoading}
                            searchTerm={searchTerm}
                            onSelect={(user) => {
                                handleSelect(user);
                                setIsOpen(false);
                            }}
                            pubkyValidation={pubkyValidation}
                            inputLooksLikePubky={inputLooksLikePubky}
                            onAddPubkyId={() => {
                                handleAddPubkyId();
                                setIsOpen(false);
                            }}
                            highlightedIndex={highlightedIndex}
                            showAddPubkyOption={showAddPubkyOption}
                        />
                    </PopoverContent>
                </Popover>
            )}

            {description && (
                <p className="text-sm text-muted-foreground">{description}</p>
            )}

            {selectedUsers.length >= maxSelections && (
                <p className="text-sm text-muted-foreground">
                    Maximum of {maxSelections} admins reached
                </p>
            )}
        </div>
    );
}

/**
 * Individual user chip for selected users
 */
function UserChip({
    user,
    onRemove,
    disabled,
}: {
    user: SelectedUser;
    onRemove: () => void;
    disabled?: boolean;
}) {
    // Get proper avatar URL from user ID
    const avatarUrl = user.image ? getPubkyAvatarUrl(user.id) : null;
    const initials = getInitials(user.name);

    return (
        <div className="inline-flex items-center gap-2 px-2 py-1 bg-secondary rounded-full text-sm">
            <Avatar className="h-5 w-5">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={user.name} />}
                <AvatarFallback className="text-xs">
                    {initials || <User className="h-3 w-3" />}
                </AvatarFallback>
            </Avatar>
            <span className="max-w-[150px] truncate">{user.name}</span>
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0 hover:bg-secondary-foreground/10"
                onClick={onRemove}
                disabled={disabled}
            >
                <X className="h-3 w-3" />
                <span className="sr-only">Remove {user.name}</span>
            </Button>
        </div>
    );
}

/**
 * Search results dropdown content
 */
const UserSearchResults = React.forwardRef<
    HTMLDivElement,
    {
        users: NexusUserDetails[];
        isLoading: boolean;
        searchTerm: string;
        onSelect: (user: NexusUserDetails) => void;
        pubkyValidation: { isValid: boolean; pubkyId: string };
        inputLooksLikePubky: boolean;
        onAddPubkyId: () => void;
        highlightedIndex: number;
        showAddPubkyOption: boolean;
    }
>(function UserSearchResults(
    {
        users,
        isLoading,
        searchTerm,
        onSelect,
        pubkyValidation,
        inputLooksLikePubky,
        onAddPubkyId,
        highlightedIndex,
        showAddPubkyOption,
    },
    ref
) {
    if (searchTerm.length < 2) {
        return (
            <div className="p-4 text-center text-sm text-muted-foreground">
                Type at least 2 characters to search, or paste a public key (with or without pk: prefix)
            </div>
        );
    }

    if (isLoading && !showAddPubkyOption) {
        return (
            <div className="p-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching...
            </div>
        );
    }

    // No results and no valid pubky ID
    if (users.length === 0 && !showAddPubkyOption) {
        // Show hint if input looks like a public key but isn't valid yet
        if (inputLooksLikePubky && !pubkyValidation.isValid) {
            return (
                <div className="p-4 text-center text-sm text-muted-foreground">
                    <p>Public key must be exactly 52 characters</p>
                    <p className="text-xs mt-1">Current: {pubkyValidation.pubkyId.length} characters</p>
                </div>
            );
        }
        return (
            <div className="p-4 text-center text-sm text-muted-foreground">
                No users found for &quot;{searchTerm}&quot;
            </div>
        );
    }

    return (
        <div
            ref={ref}
            className="max-h-[200px] overflow-y-auto overscroll-contain"
            role="listbox"
        >
            <div className="p-1">
                {/* Add public key option */}
                {showAddPubkyOption && (
                    <button
                        type="button"
                        data-index={0}
                        className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 rounded-sm text-left",
                            "hover:bg-accent hover:text-accent-foreground",
                            "focus:bg-accent focus:text-accent-foreground focus:outline-none",
                            "border-b border-border mb-1",
                            highlightedIndex === 0 && "bg-accent text-accent-foreground"
                        )}
                        onClick={onAddPubkyId}
                        role="option"
                        aria-selected={highlightedIndex === 0}
                    >
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Key className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0 overflow-hidden">
                            <div className="font-medium">Add by Public Key</div>
                            <div className="text-xs text-muted-foreground truncate">
                                {pubkyValidation.pubkyId.slice(0, 8)}...{pubkyValidation.pubkyId.slice(-8)}
                            </div>
                        </div>
                    </button>
                )}

                {/* Search results */}
                {users.map((user, index) => {
                    const avatarUrl = user.image ? getPubkyAvatarUrl(user.id) : null;
                    const initials = getInitials(user.name);
                    const itemIndex = showAddPubkyOption ? index + 1 : index;
                    const isHighlighted = highlightedIndex === itemIndex;

                    return (
                        <button
                            key={user.id}
                            type="button"
                            data-index={itemIndex}
                            className={cn(
                                "w-full flex items-center gap-3 px-3 py-2 rounded-sm text-left",
                                "hover:bg-accent hover:text-accent-foreground",
                                "focus:bg-accent focus:text-accent-foreground focus:outline-none",
                                isHighlighted && "bg-accent text-accent-foreground"
                            )}
                            onClick={() => onSelect(user)}
                            role="option"
                            aria-selected={isHighlighted}
                        >
                            <Avatar className="h-8 w-8 flex-shrink-0">
                                {avatarUrl && <AvatarImage src={avatarUrl} alt={user.name} />}
                                <AvatarFallback>
                                    {initials || <User className="h-4 w-4" />}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0 overflow-hidden">
                                <div className="font-medium truncate">{user.name}</div>
                                <div className="text-xs text-muted-foreground truncate">
                                    {user.id.slice(0, 8)}...{user.id.slice(-8)}
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
});
