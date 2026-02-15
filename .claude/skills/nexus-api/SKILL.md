---
name: nexus-api
description: Guide for querying the Pubky Nexus REST API from Eventky. Use when building or modifying TanStack Query hooks, debugging API responses, adding new data fetching, or working with the Nexus client in lib/nexus/.
---

# Nexus API Integration

## API Access
- Local dev: http://localhost:8080
- Staging: https://nexus.staging.pubky.app
- Production: https://nexus.pubky.app
- Swagger docs: `{base_url}/swagger-ui/` (explore endpoints and schemas here)
- API prefix: `/v0` (unstable, expect changes)

## Client Pattern
API client lives in `lib/nexus/`. All fetching goes through TanStack Query hooks in `hooks/`.

```typescript
// hooks pattern
import { useQuery } from '@tanstack/react-query';
import { nexusClient } from '@/lib/nexus';

export function useCalendarEvents(calendarUri: string) {
  return useQuery({
    queryKey: ['events', 'calendar', calendarUri],
    queryFn: () => nexusClient.getCalendarEvents(calendarUri),
    staleTime: 30_000,
  });
}
```

## Query Key Conventions
- Always namespace: `['events', ...]`, `['calendars', ...]`, `['users', ...]`
- Include all filter params in the key for proper cache invalidation
- Mutations should invalidate related query keys via `queryClient.invalidateQueries`

## Response Handling
- Nexus returns data already indexed from homeservers
- Responses may lag behind recent writes (eventual consistency)
- Merge Nexus responses with optimistic cache from `lib/cache/`

## Error States
- 404: Entity not yet indexed by Nexus, or doesn't exist
- 500: Nexus service error — show retry UI
- Network error: Offline — serve from TanStack Query cache if available

## Important Notes
- The Nexus API serves READ-ONLY indexed data
- ALL writes go through the Pubky SDK directly to homeservers
- Nexus does NOT require authentication for read endpoints
- For the full list of available endpoints, always check Swagger UI
