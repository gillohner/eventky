#!/usr/bin/env node

import axios from "axios";
import { Pubky } from "@synonymdev/pubky";

const OSM_PATH_RE = /^\/(node|way|relation)\/(\d+)\/?$/;

function canonicalizeOpenStreetMapUri(uri) {
  if (!uri || typeof uri !== "string") return uri;
  const trimmed = uri.trim();
  if (!trimmed) return uri;

  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return uri;
  }

  const host = parsed.hostname.toLowerCase();
  const isOsmHost =
    host === "openstreetmap.org" ||
    host === "www.openstreetmap.org" ||
    host.endsWith(".openstreetmap.org");

  if (!isOsmHost) return uri;

  const match = parsed.pathname.match(OSM_PATH_RE);
  if (!match) return uri;

  const [, osmType, osmId] = match;
  return `https://www.openstreetmap.org/${osmType}/${osmId}`;
}

function normalizeLocation(location) {
  if (!location || typeof location !== "object") return null;

  const label = (location.label ?? location.name ?? "").toString().trim();
  if (!label) return null;

  const kindRaw = (location.kind ?? location.location_type ?? "PHYSICAL").toString().toUpperCase();
  const kind = kindRaw === "ONLINE" || kindRaw === "VIRTUAL" ? "VIRTUAL" : "PHYSICAL";
  const uri = canonicalizeOpenStreetMapUri(
    (location.uri ?? location.structured_data ?? "").toString().trim() || undefined
  );

  return {
    label,
    description: typeof location.description === "string" ? location.description.trim() || undefined : undefined,
    kind,
    uri,
  };
}

function normalizeLocations(locations) {
  if (!Array.isArray(locations)) return [];
  return locations.map(normalizeLocation).filter(Boolean);
}

function changedLocations(oldLocations, newLocations) {
  return JSON.stringify(oldLocations ?? null) !== JSON.stringify(newLocations ?? null);
}

async function main() {
  const gateway = process.env.MIGRATION_NEXUS_URL || "http://localhost:8080";
  const sessionSnapshot = process.env.PUBKY_SESSION;
  const dryRun = process.argv.includes("--dry-run") || process.env.DRY_RUN === "1";

  if (!sessionSnapshot) {
    throw new Error("Missing PUBKY_SESSION env var. Export a session snapshot first.");
  }

  const pubky = Pubky.testnet();
  const session = await pubky.restoreSession(sessionSnapshot);
  const userId = session.info.publicKey.z32();

  console.log(`Migrating OSM URIs for user: ${userId}`);
  console.log(`Nexus: ${gateway}`);
  console.log(`Mode: ${dryRun ? "dry-run" : "write"}`);

  const { data: events } = await axios.get(`${gateway}/v0/eventky/stream/events`, {
    params: { author: userId, limit: 500 },
    timeout: 15000,
  });

  let inspected = 0;
  let updated = 0;

  for (const event of events || []) {
    inspected += 1;
    const id = event?.id;
    if (!id) continue;

    const oldLocations = Array.isArray(event.locations)
      ? event.locations
      : typeof event.locations === "string"
      ? (() => {
          try {
            return JSON.parse(event.locations);
          } catch {
            return [];
          }
        })()
      : [];

    const canonicalLocations = normalizeLocations(oldLocations);
    if (!changedLocations(oldLocations, canonicalLocations)) continue;

    updated += 1;
    const path = `/pub/eventky.app/events/${id}`;
    if (dryRun) {
      console.log(`[dry-run] would update ${path}`);
      continue;
    }

    const nextEvent = {
      ...event,
      locations: canonicalLocations,
    };

    delete nextEvent.id;
    delete nextEvent.author;
    delete nextEvent.uri;
    delete nextEvent.indexed_at;
    delete nextEvent.tags;
    delete nextEvent.attendees;

    await session.storage.putJson(path, nextEvent);
    console.log(`updated ${path}`);
  }

  console.log(`Done. inspected=${inspected} updated=${updated}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
