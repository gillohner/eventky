import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/providers/auth-provider";
import { pubkyClient } from "@/lib/pubky/client";

/**
 * Hook to fetch user profile from Pubky storage (read-only)
 * Requires a valid session to fetch the profile
 */
export function useProfile() {
    const { auth } = useAuth();

    const profileQuery = useQuery({
        queryKey: ["profile", auth.publicKey],
        queryFn: async () => {
            if (!auth.publicKey) {
                throw new Error("No public key available");
            }
            // Only fetch if we have a session - without it we can't access the profile
            if (!auth.session) {
                throw new Error("No active session - please re-authenticate");
            }
            return await pubkyClient.getProfile(auth.publicKey, auth.session);
        },
        enabled: !!auth.publicKey && !!auth.session, // Only fetch when both exist
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: false, // Don't retry if there's no session
    });

    return {
        profile: profileQuery.data,
        isLoading: profileQuery.isLoading,
        isError: profileQuery.isError,
        error: profileQuery.error,
    };
}
