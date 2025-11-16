import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/auth/auth-provider";
import { pubkyClient } from "@/lib/pubky/client";

/**
 * Hook to fetch user profile from Pubky storage (read-only)
 * Works with or without an active session by using public storage
 */
export function useProfile() {
    const { auth } = useAuth();

    const profileQuery = useQuery({
        queryKey: ["profile", auth.publicKey],
        queryFn: async () => {
            if (!auth.publicKey) {
                throw new Error("No public key available");
            }
            return await pubkyClient.getProfile(auth.publicKey, auth.session || undefined);
        },
        enabled: !!auth.publicKey,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    return {
        profile: profileQuery.data,
        isLoading: profileQuery.isLoading,
        isError: profileQuery.isError,
        error: profileQuery.error,
    };
}
