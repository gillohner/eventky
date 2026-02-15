---
name: cross-repo-sync
description: Check and sync data model consistency across eventky, pubky-app-specs, and pubky-nexus repositories. Use when modifying types, adding new fields to models, or when data validation errors occur between repos.
---

# Cross-Repo Data Model Sync

When modifying data models in the Eventky ecosystem, changes must propagate across all three repositories.

## Sync Workflow

1. **Start in pubky-app-specs** — it is the source of truth
   - Modify Rust structs in `src/`
   - Update validation rules
   - Run `cargo test`
   - Run `wasm-pack build --target bundler`

2. **Update pubky-nexus** (if the field is indexed/served)
   - Update models in `nexus-common/src/`
   - Update watcher handlers in `nexus-watcher/` for indexing
   - Update API responses in `nexus-webapi/` if field is served
   - Update Neo4j Cypher queries if graph structure changes
   - Update Redis key structures if cached
   - Update mock data in `docker/test-graph/mocks/`
   - Run tests: `cargo nextest run -p nexus-common --no-fail-fast`

3. **Update eventky**
   - Run `npm install` to pick up new WASM build
   - Update TypeScript types in `types/`
   - Update TanStack Query hooks in `hooks/` if API responses changed
   - Update Zustand stores in `stores/` if client state affected
   - Update components that render the changed fields
   - Run `npm run build` to verify no type errors

## Common Pitfalls
- Forgetting to rebuild WASM after pubky-app-specs changes
- TypeScript types diverging from Rust structs (especially optional vs required fields)
- Redis cache not being invalidated for updated fields in nexus
- Neo4j indexes not covering new queryable fields
- Timestamp precision mismatch (must be microseconds everywhere)
- Using `pubky.app` namespace instead of `eventky.app` for calendar/event/attendee paths
