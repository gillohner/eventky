import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { getEvent } from "@/lib/pubky/events";
import { PubkyAppEvent } from "pubky-app-specs";

export function useEvent(
  authorId: string,
  eventId: string,
  options?: Omit<UseQueryOptions<PubkyAppEvent | null>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: ["event", authorId, eventId],
    queryFn: () => getEvent(authorId, eventId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}
