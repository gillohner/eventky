# Eventky Shared-Nexus Release Plan

This release moves Eventky reads to `/v0/eventky/*` on a Nexus instance that also runs Mapky.

## Scope

- Eventky data namespace: `/pub/eventky.app/*`
- Legacy compatibility migration:
  - OSM location URL canonicalization on Eventky events
  - tag move from `/pub/pubky.app/tags/*` to `/pub/eventky.app/tags/*` for Eventky resources
- Optional Eventky enrichment via Mapky endpoints:
  - `/v0/mapky/osm/search`
  - `/v0/mapky/osm/lookup`
  - `/v0/mapky/place/{osm_type}/{osm_id}` for BTC flags

## Legacy data policy

The Eventky plugin indexes only `/pub/eventky.app/*` records.

Legacy Eventky-like objects under `/pub/pubky.app/*` are not indexed by the Eventky plugin and must be migrated to the Eventky namespace for plugin-backed reads.

## Migration behavior requirements

- Migration is user-triggered at login and remains non-blocking for auth/navigation.
- Migration is only marked complete when:
  - no pending OSM canonicalization remains, and
  - no pending legacy Eventky tags remain, and
  - no per-record migration failures occurred.
- On partial completion/failure, migration is retried on a later login.

## Shared Nexus runtime requirements

Run `nexusd` with both plugin features:

```bash
cargo run -p nexusd --features "mapky eventky"
```

## Deployment sequence

1. Deploy `eventky-nexus-plugin` and `mapky-nexus-plugin` compatible builds.
2. Deploy `pubky-nexus` with both features enabled.
3. Verify health:
   - `/v0/eventky/health`
   - `/v0/mapky/btc/status`
4. Deploy Eventky frontend.
5. Monitor migration and degraded-mapky fallback behavior.

## Production verification checklist

- Event detail and calendar detail resolve via `/v0/eventky/*`.
- Legacy users receive migration prompt only when needed.
- Failed migrations are retried and do not get marked complete.
- Eventky remains usable if Mapky endpoints are unavailable (enrichment may degrade).
- Tag/attendee endpoints and stream endpoints return expected shapes.
