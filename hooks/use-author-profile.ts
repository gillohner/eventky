/**
 * Author Profile Hook
 *
 * Fetches and caches author profile data from Nexus API
 * Uses React Query for efficient caching with 5-minute stale time
 */

import { useQuery, useQueries } from "@tanstack/react-query";
import { fetchUserFromNexus, type NexusUserDetails } from "@/lib/nexus/users";
import { getPubkyAvatarUrl } from "@/lib/pubky/utils";

/**
 * Author profile data structure
 */
export interface AuthorProfile {
    id: string;
    name: string;
    avatarUrl: string | null;
    bio?: string;
    status?: string;
    links?: Array<{ title: string; url: string }>;
}

/**
 * Result type for useAuthorProfile hook
 */
export interface UseAuthorProfileResult {
    author: AuthorProfile | null;
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
}

/**
 * Query key factory for author profiles
 * Following existing pattern from lib/cache/utils.ts
 */
export const authorProfileKeys = {
    all: ["nexus", "author"] as const,
    detail: (authorId: string) => ["nexus", "author", authorId] as const,
};

/**
 * Stale time for author profile queries (5 minutes)
 * Matches other hooks in the app
 */
const STALE_TIME = 5 * 60 * 1000;

/**
 * Transform Nexus user data to AuthorProfile format
 */
function toAuthorProfile(user: NexusUserDetails): AuthorProfile {
    return {
        id: user.id,
        name: user.name,
        avatarUrl: getPubkyAvatarUrl(user.id),
        bio: user.bio,
        status: user.status,
        links: user.links,
    };
}

/**
 * Fetch author profile from Nexus
 * @param authorId - The author's public key
 * @returns Author profile data or null if not found
 */
async function fetchAuthorProfile(authorId: string): Promise<AuthorProfile | null> {
    const userView = await fetchUserFromNexus(authorId);
    if (!userView?.details) {
        return null;
    }
    return toAuthorProfile(userView.details);
}

/**
 * Hook to fetch a single author's profile
 *
 * @param authorId - The author's public key
 * @returns Author profile with loading/error states
 *
 * @example
 * const { author, isLoading } = useAuthorProfile(event.author);
 * // author?.name, author?.avatarUrl
 */
export function useAuthorProfile(authorId: string | undefined): UseAuthorProfileResult {
    const query = useQuery({
        queryKey: authorProfileKeys.detail(authorId ?? ""),
        queryFn: () => fetchAuthorProfile(authorId!),
        enabled: !!authorId,
        staleTime: STALE_TIME,
        gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    });

    return {
        author: query.data ?? null,
        isLoading: query.isLoading,
        isError: query.isError,
        error: query.error,
    };
}

/**
 * Hook to fetch multiple authors' profiles in parallel
 * Useful for list views with multiple authors
 *
 * @param authorIds - Array of author public keys
 * @returns Map of authorId -> AuthorProfile with combined loading state
 *
 * @example
 * const { authors, isLoading } = useAuthorProfiles(events.map(e => e.author));
 * // authors.get(authorId)?.name
 */
export function useAuthorProfiles(authorIds: string[]): {
    authors: Map<string, AuthorProfile>;
    isLoading: boolean;
    isError: boolean;
} {
    // Deduplicate author IDs
    const uniqueIds = [...new Set(authorIds.filter(Boolean))];

    const queries = useQueries({
        queries: uniqueIds.map((authorId) => ({
            queryKey: authorProfileKeys.detail(authorId),
            queryFn: () => fetchAuthorProfile(authorId),
            staleTime: STALE_TIME,
            gcTime: 10 * 60 * 1000,
        })),
    });

    const authors = new Map<string, AuthorProfile>();
    queries.forEach((query, index) => {
        if (query.data) {
            authors.set(uniqueIds[index], query.data);
        }
    });

    return {
        authors,
        isLoading: queries.some((q) => q.isLoading),
        isError: queries.some((q) => q.isError),
    };
}
