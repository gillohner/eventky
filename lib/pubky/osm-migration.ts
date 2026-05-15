import { Session } from "@synonymdev/pubky";
import { EventkySpecsBuilder } from "@eventky/pubky-app-specs";

import { canonicalizeLocationUris, normalizeLocations } from "@/lib/locations";

type EventRecord = Record<string, unknown>;
const EVENT_BASE_PATH = "/pub/eventky.app/events/";
const LEGACY_TAG_BASE_PATH = "/pub/pubky.app/tags/";

function isEventkyResourceUri(uri: string): boolean {
  try {
    const parsed = new URL(uri);
    if (parsed.protocol !== "pubky:") return false;

    const segments = parsed.pathname.split("/").filter(Boolean);
    return (
      segments.length >= 4 &&
      segments[0] === "pub" &&
      segments[1] === "eventky.app" &&
      ["events", "calendars", "attendees"].includes(segments[2] || "")
    );
  } catch {
    return false;
  }
}

function parseEventIdFromPath(path: string): string | null {
  const match = path.match(/^\/pub\/eventky\.app\/events\/([^/]+)$/);
  return match?.[1] ?? null;
}

function normalizeEventLocations(event: EventRecord): { changed: boolean; next: EventRecord } {
  const rawLocations = event.locations;
  const parsed =
    typeof rawLocations === "string"
      ? (() => {
          try {
            return JSON.parse(rawLocations);
          } catch {
            return [];
          }
        })()
      : rawLocations;

  const normalized = canonicalizeLocationUris(normalizeLocations(parsed));
  if (normalized.length === 0) {
    return { changed: false, next: event };
  }

  const legacy = normalized.map((loc) => ({
    label: loc.label,
    description: loc.description,
    kind: loc.kind,
    uri: loc.uri,
  }));

  const previous = Array.isArray(parsed) ? parsed : [];
  const changed = JSON.stringify(previous) !== JSON.stringify(legacy);
  if (!changed) {
    return { changed: false, next: event };
  }

  return {
    changed: true,
    next: {
      ...event,
      locations: legacy,
    },
  };
}

async function listOwnPaths(session: Session, basePath: string): Promise<string[]> {
  const storage = session.storage as unknown as {
    list?: (path: string) => Promise<Array<{ path?: string } | string>>;
  };

  if (!storage.list) return [];
  const listed = await storage.list(basePath);
  return listed
    .map((entry) => (typeof entry === "string" ? entry : entry.path || ""))
    .filter((path): path is string => path.startsWith(basePath));
}

async function safeGetJsonObject(session: Session, path: `/pub/${string}`): Promise<Record<string, unknown> | null> {
  try {
    const json = await session.storage.getJson(path);
    if (!json || typeof json !== "object") return null;
    return json as Record<string, unknown>;
  } catch (error) {
    console.warn("Skipping unreadable migration record", { path, error });
    return null;
  }
}

async function listOwnEventPaths(session: Session): Promise<string[]> {
  const listed = await listOwnPaths(session, EVENT_BASE_PATH);
  return listed.filter((path): path is string => Boolean(parseEventIdFromPath(path)));
}

export interface OSMUriMigrationResult {
  inspected: number;
  updated: number;
}

export interface TagNamespaceMigrationResult {
  inspected: number;
  migrated: number;
}

export async function needsOwnTagNamespaceMigration(
  session: Session,
  maxScan: number = 60
): Promise<boolean> {
  const paths = await listOwnPaths(session, LEGACY_TAG_BASE_PATH);
  let scanned = 0;

  for (const path of paths) {
    if (scanned >= maxScan) break;
    scanned += 1;

    const tagJson = await safeGetJsonObject(session, path as `/pub/${string}`);
    if (!tagJson) continue;

    const uri = tagJson.uri;
    if (typeof uri === "string" && isEventkyResourceUri(uri)) {
      return true;
    }
  }

  return false;
}

export async function migrateOwnTagsToEventkyNamespace(
  session: Session,
  userId: string
): Promise<TagNamespaceMigrationResult> {
  const oldTagPaths = await listOwnPaths(session, LEGACY_TAG_BASE_PATH);
  const builder = new EventkySpecsBuilder(userId);

  let inspected = 0;
  let migrated = 0;

  for (const oldPath of oldTagPaths) {
    const tagJson = await safeGetJsonObject(session, oldPath as `/pub/${string}`);
    if (!tagJson) continue;

    inspected += 1;

    const uri = tagJson.uri;
    const label = tagJson.label;
    if (typeof uri !== "string" || typeof label !== "string") continue;
    if (!isEventkyResourceUri(uri)) continue;

    try {
      const nextTag = builder.createTag(uri, label);
      const nextPath = nextTag.meta.path as `/pub/${string}`;

      await session.storage.putJson(nextPath, nextTag.tag.toJson());
      await session.storage.delete(oldPath as `/pub/${string}`);
      migrated += 1;
    } catch (error) {
      console.warn("Tag migration failed for record", { path: oldPath, error });
    }
  }

  return { inspected, migrated };
}

export async function needsOwnEventOsmUriMigration(
  session: Session,
  maxScan: number = 40
): Promise<boolean> {
  const paths = await listOwnEventPaths(session);
  let scanned = 0;

  for (const path of paths) {
    if (scanned >= maxScan) break;
    scanned += 1;

    const eventJson = await safeGetJsonObject(session, path as `/pub/${string}`);
    if (!eventJson) continue;

    const { changed } = normalizeEventLocations(eventJson as EventRecord);
    if (changed) {
      return true;
    }
  }

  return false;
}

export async function migrateOwnEventOsmUris(session: Session): Promise<OSMUriMigrationResult> {
  const paths = await listOwnEventPaths(session);
  let inspected = 0;
  let updated = 0;

  for (const path of paths) {
    const eventJson = await safeGetJsonObject(session, path as `/pub/${string}`);
    if (!eventJson) continue;

    inspected += 1;
    const { changed, next } = normalizeEventLocations(eventJson as EventRecord);
    if (!changed) continue;

    try {
      await session.storage.putJson(path as `/pub/${string}`, next);
      updated += 1;
    } catch (error) {
      console.warn("Event location migration failed for record", { path, error });
    }
  }

  return { inspected, updated };
}
