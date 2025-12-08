import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useCallback } from "react";
import {
    searchUsersByName,
    searchUsersById,
    fetchUsersByIds,
    type NexusUserDetails,
} from "@/lib/nexus/users";

const DEBOUNCE_DELAY = 300; // ms

/**
 * Hook to search users with debouncing
 * Searches both by username and by ID prefix
 */
export function useUserSearch(minLength = 2) {
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedTerm, setDebouncedTerm] = useState("");

    // Debounce the search term
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedTerm(searchTerm);
        }, DEBOUNCE_DELAY);

        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Search for user IDs (combines name and ID search)
    const searchQuery = useQuery({
        queryKey: ["nexus", "userSearch", debouncedTerm],
        queryFn: async () => {
            if (debouncedTerm.length < minLength) {
                return [];
            }

            // Run both searches in parallel
            const [nameResults, idResults] = await Promise.all([
                searchUsersByName(debouncedTerm, 0, 10),
                // ID search requires minimum 3 characters
                debouncedTerm.length >= 3
                    ? searchUsersById(debouncedTerm, 0, 10)
                    : Promise.resolve([]),
            ]);

            // Combine and deduplicate results
            const combinedIds = [...new Set([...nameResults, ...idResults])];
            return combinedIds;
        },
        enabled: debouncedTerm.length >= minLength,
        staleTime: 30000, // 30 seconds
    });

    // Fetch user details for the found IDs
    const detailsQuery = useQuery({
        queryKey: ["nexus", "userDetails", searchQuery.data],
        queryFn: async () => {
            if (!searchQuery.data || searchQuery.data.length === 0) {
                return [];
            }
            return fetchUsersByIds(searchQuery.data);
        },
        enabled: !!searchQuery.data && searchQuery.data.length > 0,
        staleTime: 60000, // 1 minute
    });

    return {
        searchTerm,
        setSearchTerm,
        userIds: searchQuery.data || [],
        users: detailsQuery.data || [],
        isSearching: searchQuery.isLoading || searchQuery.isFetching,
        isLoadingDetails: detailsQuery.isLoading || detailsQuery.isFetching,
        isLoading: searchQuery.isLoading || detailsQuery.isLoading,
        error: searchQuery.error || detailsQuery.error,
    };
}

/**
 * Hook to fetch user details for a list of user IDs
 * Useful for displaying already-selected admins
 */
export function useUsersByIds(userIds: string[]) {
    return useQuery({
        queryKey: ["nexus", "usersByIds", userIds],
        queryFn: () => fetchUsersByIds(userIds),
        enabled: userIds.length > 0,
        staleTime: 60000, // 1 minute
    });
}

/**
 * Type for a selected user with minimal info
 */
export interface SelectedUser {
    id: string;
    name: string;
    image?: string;
}

/**
 * Convert NexusUserDetails to SelectedUser
 */
export function toSelectedUser(user: NexusUserDetails): SelectedUser {
    return {
        id: user.id,
        name: user.name,
        image: user.image,
    };
}
