import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/auth/auth-provider";
import { pubkyClient } from "@/lib/pubky/client";

/**
 * Hook to fetch user profile from Pubky storage (read-only)
 */
export function useProfile() {
  const { auth } = useAuth();

  const profileQuery = useQuery({
    queryKey: ["profile", auth.publicKey],
    queryFn: async () => {
      if (!auth.session) {
        throw new Error("No active session");
      }
      return await pubkyClient.getProfile(auth.session);
    },
    enabled: !!auth.session && !!auth.publicKey,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    profile: profileQuery.data,
    isLoading: profileQuery.isLoading,
    isError: profileQuery.isError,
    error: profileQuery.error,
  };
}
