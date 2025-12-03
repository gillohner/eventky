import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/providers/auth-provider";
import { pubkyClient } from "@/lib/pubky/client";

/**
 * Hook to fetch user profile from Pubky storage (read-only)
 * SDK's cookie-based session management handles authentication automatically
 */
export function useProfile() {
    const { auth } = useAuth();

    const profileQuery = useQuery({
        queryKey: ["profile", auth.publicKey],
        queryFn: async () => {
            if (!auth.publicKey) {
                throw new Error("No public key available");
            }
            // SDK handles session via cookies - no need to pass session object
            return await pubkyClient.getProfile(auth.publicKey);
        },
        enabled: !!auth.publicKey && !!auth.session, // Only fetch when authenticated
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: false,
    });

    return {
        profile: profileQuery.data,
        isLoading: profileQuery.isLoading,
        isError: profileQuery.isError,
        error: profileQuery.error,
    };
}
