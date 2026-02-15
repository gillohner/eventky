# Eventky — Decentralized Calendar & Event Platform

Next.js 16 app (App Router + Turbopack) built on the Pubky protocol.
Users write data to Pubky homeservers; Nexus indexes it into a social graph.

## Architecture

- `app/` — Next.js App Router pages and layouts
- `components/` — React components (shadcn/ui based)
- `hooks/` — TanStack Query hooks for Nexus API + Pubky operations
- `lib/nexus/` — Nexus REST API client (reads indexed data)
- `lib/pubky/` — Pubky SDK wrappers (writes to homeservers)
- `lib/cache/` — Optimistic cache layer bridging writes and reads
- `lib/datetime/` — Date/time utilities (RFC 5545 compliant)
- `stores/` — Zustand state management
- `types/` — TypeScript type definitions

## Critical Concepts

### Dual Data Flow
- **Writes** go through `lib/pubky/` → Pubky homeserver (user-owned storage)
- **Reads** go through `lib/nexus/` → Nexus REST API (indexed social graph)
- After a write, use optimistic caching (`lib/cache/`) until Nexus indexes the change

### Data Models
Types in `types/` MUST match `pubky-app-specs` Rust models exactly.
The WASM package validates data before writes. See @docs/DATA_MODEL.md
Eventky-specific models use the `eventky.app` namespace, NOT `pubky.app`:
- Calendars: `/pub/eventky.app/calendars/:calendar_id`
- Events: `/pub/eventky.app/events/:event_id`
- Attendees: `/pub/eventky.app/attendees/:attendee_id`

### URI Conventions
All content is addressed by `pubky://` URIs:
- `pubky://<user_public_key>/pub/eventky.app/events/<timestamp_id>`
- IDs use Crockford Base32 encoded timestamps or Blake3 hashes

## Commands
- `npm run dev` — dev server on :3000
- `npm run build` — production build
- `npm run lint` — ESLint
- `npm test` — Vitest

## Code Style
- TypeScript strict mode, prefer type imports (`import type { }`)
- Functional components with hooks only
- shadcn/ui components from `components/ui/`; Tailwind CSS v4 for styling
- Use TanStack Query for all server state; Zustand only for client state
- Prefer `async/await` over `.then()` chains

## IMPORTANT Rules
- NEVER create mock/fake pubky:// URIs in production code — always derive from real user keys
- NEVER bypass WASM validation when writing data — always use pubky-app-specs validators
- When modifying types, check if pubky-app-specs needs a corresponding change
- Dates in events use ISO 8601 (YYYY-MM-DDTHH:MM:SS) NOT Unix timestamps for display
- Unix microseconds (not milliseconds) for `dtstamp`, `created`, `last_modified`
- Duration strings follow RFC 5545: "PT1H30M" not "1h30m" or "90m"
- RRULE format follows RFC 5545: "FREQ=MONTHLY;COUNT=12"
- After modifying types, always run: `npm run build && npm test`
- Always create a feature branch before making changes: `git checkout -b feat/<description>`
- See @docs/AUTH.md for the authentication flow
- See @docs/RECURRENCE.md for recurring event handling
- See @docs/CACHING.md for the optimistic caching strategy
- See @docs/LOCATIONS.md for BTCMap integration
- See @docs/DATETIME.md for date/time handling strategy
