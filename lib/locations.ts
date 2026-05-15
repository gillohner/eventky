import type { NexusLocation } from "@/types/nexus";

export interface NormalizedLocation {
    label: string;
    description?: string;
    kind: "PHYSICAL" | "VIRTUAL";
    uri?: string;
}

const OSM_PATH_RE = /^\/(node|way|relation)\/(\d+)\/?$/;

export function canonicalizeOpenStreetMapUri(uri: string | undefined): string | undefined {
    if (!uri) return uri;
    const trimmed = uri.trim();
    if (!trimmed) return undefined;

    let parsed: URL;
    try {
        parsed = new URL(trimmed);
    } catch {
        return trimmed;
    }

    const host = parsed.hostname.toLowerCase();
    const isOsmHost =
        host === "openstreetmap.org" ||
        host === "www.openstreetmap.org" ||
        host.endsWith(".openstreetmap.org");

    if (!isOsmHost) {
        return trimmed;
    }

    const match = parsed.pathname.match(OSM_PATH_RE);
    if (!match) {
        return trimmed;
    }

    const [, osmType, osmId] = match;
    return `https://www.openstreetmap.org/${osmType}/${osmId}`;
}



export type ParsedOsmReference =
    | { kind: "osm-ref"; osmType: "node" | "way" | "relation"; osmId: number }
    | { kind: "coords"; lat: number; lon: number };

function toFiniteNumber(value: string | null): number | null {
    if (!value) return null;
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
}

export function parseOpenStreetMapReference(uri: string | undefined): ParsedOsmReference | null {
    if (!uri) return null;

    let parsed: URL;
    try {
        parsed = new URL(uri);
    } catch {
        return null;
    }

    const host = parsed.hostname.toLowerCase();
    const isOsmHost =
        host === "openstreetmap.org" ||
        host === "www.openstreetmap.org" ||
        host.endsWith(".openstreetmap.org");

    if (!isOsmHost) return null;

    const pathMatch = parsed.pathname.match(OSM_PATH_RE);
    if (pathMatch) {
        const osmType = pathMatch[1] as "node" | "way" | "relation";
        const osmId = Number.parseInt(pathMatch[2], 10);
        if (Number.isFinite(osmId)) {
            return { kind: "osm-ref", osmType, osmId };
        }
    }

    const mlat = toFiniteNumber(parsed.searchParams.get("mlat"));
    const mlon = toFiniteNumber(parsed.searchParams.get("mlon"));
    if (mlat !== null && mlon !== null) {
        return { kind: "coords", lat: mlat, lon: mlon };
    }

    const mapMatch = parsed.hash.match(/^#map=\d+\/(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)/);
    if (mapMatch) {
        const lat = Number.parseFloat(mapMatch[1]);
        const lon = Number.parseFloat(mapMatch[2]);
        if (Number.isFinite(lat) && Number.isFinite(lon)) {
            return { kind: "coords", lat, lon };
        }
    }

    return null;
}
export function canonicalizeLocationUris(locations: NormalizedLocation[]): NormalizedLocation[] {
    return locations.map((location) => ({
        ...location,
        uri: canonicalizeOpenStreetMapUri(location.uri),
    }));
}

type LegacyLocation = {
    name?: unknown;
    description?: unknown;
    location_type?: unknown;
    structured_data?: unknown;
};

type CanonicalLocation = {
    label?: unknown;
    description?: unknown;
    kind?: unknown;
    uri?: unknown;
};

function asString(value: unknown): string | undefined {
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function normalizeKind(kind: string | undefined): "PHYSICAL" | "VIRTUAL" {
    return kind === "VIRTUAL" || kind === "ONLINE" ? "VIRTUAL" : "PHYSICAL";
}

export function normalizeLocation(input: unknown): NormalizedLocation | null {
    if (!input || typeof input !== "object") return null;

    const value = input as LegacyLocation & CanonicalLocation;
    const label = asString(value.label) ?? asString(value.name);
    if (!label) return null;

    const kind = normalizeKind(asString(value.kind) ?? asString(value.location_type));
    const uri = canonicalizeOpenStreetMapUri(
        asString(value.uri) ?? asString(value.structured_data)
    );
    const description = asString(value.description);

    return { label, description, kind, uri };
}

export function normalizeLocations(input: unknown): NormalizedLocation[] {
    if (!Array.isArray(input)) return [];
    return input
        .map(normalizeLocation)
        .filter((location): location is NormalizedLocation => location !== null);
}

export function toLegacyLocation(location: NormalizedLocation): NexusLocation {
    return {
        name: location.label,
        description: location.description,
        location_type: location.kind === "VIRTUAL" ? "ONLINE" : "PHYSICAL",
        structured_data: location.uri,
    };
}

export function toCanonicalLocation(location: NexusLocation): NormalizedLocation {
    return {
        label: location.name,
        description: location.description,
        kind: location.location_type === "ONLINE" ? "VIRTUAL" : "PHYSICAL",
        uri: location.structured_data,
    };
}
