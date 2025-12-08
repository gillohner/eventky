/**
 * Nexus API - User operations
 * Functions for searching and fetching user data from the Pubky Nexus API
 */

import { nexusClient, getErrorMessage, isAxiosError } from "./client";

/**
 * Response structure from Nexus API for user search
 * Returns array of user IDs matching the search criteria
 */
export type UserSearchResponse = string[];

/**
 * User details structure from Nexus API
 */
export interface NexusUserDetails {
    id: string;
    name: string;
    bio?: string;
    status?: string;
    image?: string;
    links?: Array<{
        title: string;
        url: string;
    }>;
    indexed_at: number;
}

/**
 * Full user view with counts and relationships
 */
export interface NexusUserView {
    details: NexusUserDetails;
    counts?: {
        posts: number;
        followers: number;
        following: number;
        friends: number;
        tagged: number;
    };
    relationship?: {
        followed_by: boolean;
        following: boolean;
        muted: boolean;
    };
}

/**
 * Search users by username prefix
 * @param prefix - Username prefix to search for
 * @param skip - Number of results to skip (pagination)
 * @param limit - Maximum number of results to return
 * @returns Array of user IDs matching the prefix
 */
export async function searchUsersByName(
    prefix: string,
    skip?: number,
    limit?: number
): Promise<UserSearchResponse> {
    try {
        const params = new URLSearchParams();
        if (skip !== undefined) params.append("skip", skip.toString());
        if (limit !== undefined) params.append("limit", limit.toString());

        const url = `/v0/search/users/by_name/${encodeURIComponent(prefix)}${params.toString() ? `?${params.toString()}` : ""}`;

        const response = await nexusClient.get<UserSearchResponse>(url);
        return response.data || [];
    } catch (error) {
        // 404 is expected when no users match - return empty array silently
        if (isAxiosError(error) && error.response?.status === 404) {
            return [];
        }
        // Only log unexpected errors
        console.error("Error searching users by name:", {
            prefix,
            error: getErrorMessage(error),
        });
        return [];
    }
}

/**
 * Search users by ID prefix
 * @param prefix - User ID prefix to search for (minimum 3 characters)
 * @param skip - Number of results to skip (pagination)
 * @param limit - Maximum number of results to return
 * @returns Array of user IDs matching the prefix
 */
export async function searchUsersById(
    prefix: string,
    skip?: number,
    limit?: number
): Promise<UserSearchResponse> {
    // Nexus requires minimum 3 characters for ID search
    if (prefix.length < 3) {
        return [];
    }

    try {
        const params = new URLSearchParams();
        if (skip !== undefined) params.append("skip", skip.toString());
        if (limit !== undefined) params.append("limit", limit.toString());

        const url = `/v0/search/users/by_id/${encodeURIComponent(prefix)}${params.toString() ? `?${params.toString()}` : ""}`;

        const response = await nexusClient.get<UserSearchResponse>(url);
        return response.data || [];
    } catch (error) {
        // 404 is expected when no users match - return empty array silently
        if (isAxiosError(error) && error.response?.status === 404) {
            return [];
        }
        // Only log unexpected errors
        console.error("Error searching users by ID:", {
            prefix,
            error: getErrorMessage(error),
        });
        return [];
    }
}

/**
 * Fetch user details by ID
 * @param userId - The user's public key
 * @returns User view with details, counts, and relationships
 */
export async function fetchUserFromNexus(
    userId: string,
    viewerId?: string
): Promise<NexusUserView | null> {
    try {
        const params = new URLSearchParams();
        if (viewerId) params.append("viewer_id", viewerId);

        const url = `/v0/user/${userId}${params.toString() ? `?${params.toString()}` : ""}`;

        const response = await nexusClient.get<NexusUserView>(url);
        return response.data || null;
    } catch (error) {
        console.error("Error fetching user from Nexus:", {
            userId,
            error: getErrorMessage(error),
        });
        return null;
    }
}

/**
 * Fetch multiple users' details by their IDs
 * Uses the stream/users/by_ids endpoint for batch fetching
 * @param userIds - Array of user public keys
 * @returns Array of user details
 */
export async function fetchUsersByIds(
    userIds: string[]
): Promise<NexusUserDetails[]> {
    if (userIds.length === 0) {
        return [];
    }

    try {
        // API expects { user_ids: [...] } and returns UserView[]
        const response = await nexusClient.post<NexusUserView[]>(
            "/v0/stream/users/by_ids",
            { user_ids: userIds }
        );
        // Extract just the details from each UserView
        return (response.data || []).map(view => view.details);
    } catch (error) {
        console.error("Error fetching users by IDs:", {
            userIds,
            error: getErrorMessage(error),
        });
        return [];
    }
}
