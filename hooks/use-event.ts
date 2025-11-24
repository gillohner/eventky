import { useQuery } from "@tanstack/react-query";
import { getEvent } from "@/lib/pubky/events";

export function useEvent(authorId: string, eventId: string) {
  return useQuery({
    queryKey: ["event", authorId, eventId],
    queryFn: () => getEvent(authorId, eventId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
