import { describe, it, expect } from "vitest";
import {
    canonicalizeOpenStreetMapUri,
    normalizeLocations,
    parseOpenStreetMapReference,
    toLegacyLocation,
} from "@/lib/locations";

describe("location normalization", () => {
    it("normalizes canonical location shape", () => {
        const normalized = normalizeLocations([
            {
                label: "Main Hall",
                kind: "PHYSICAL",
                uri: "https://www.openstreetmap.org/node/123",
                description: "Level 2",
            },
        ]);

        expect(normalized).toHaveLength(1);
        expect(normalized[0]).toEqual({
            label: "Main Hall",
            kind: "PHYSICAL",
            uri: "https://www.openstreetmap.org/node/123",
            description: "Level 2",
        });
    });

    it("normalizes legacy location shape", () => {
        const normalized = normalizeLocations([
            {
                name: "Zoom Room",
                location_type: "ONLINE",
                structured_data: "https://meet.example.com/room",
            },
        ]);

        expect(normalized).toHaveLength(1);
        expect(normalized[0]).toEqual({
            label: "Zoom Room",
            kind: "VIRTUAL",
            uri: "https://meet.example.com/room",
            description: undefined,
        });
    });

    it("maps normalized location back to legacy display shape", () => {
        const normalized = normalizeLocations([
            {
                label: "Town Square",
                kind: "PHYSICAL",
                uri: "https://www.openstreetmap.org/way/456",
            },
        ]);

        const legacy = toLegacyLocation(normalized[0]);

        expect(legacy).toEqual({
            name: "Town Square",
            location_type: "PHYSICAL",
            structured_data: "https://www.openstreetmap.org/way/456",
            description: undefined,
        });
    });

    it("canonicalizes old OSM host variants", () => {
        expect(canonicalizeOpenStreetMapUri("https://openstreetmap.org/node/123")).toBe(
            "https://www.openstreetmap.org/node/123"
        );
        expect(canonicalizeOpenStreetMapUri("https://www.openstreetmap.org/way/456/")).toBe(
            "https://www.openstreetmap.org/way/456"
        );
    });

    it("canonicalizes OSM links during normalization", () => {
        const normalized = normalizeLocations([
            {
                name: "Legacy Place",
                location_type: "PHYSICAL",
                structured_data: "https://openstreetmap.org/relation/789/",
            },
        ]);

        expect(normalized).toHaveLength(1);
        expect(normalized[0]?.uri).toBe("https://www.openstreetmap.org/relation/789");
    });
});


describe("parseOpenStreetMapReference", () => {
    it("parses OSM node/way/relation URLs", () => {
        expect(parseOpenStreetMapReference("https://www.openstreetmap.org/node/1573053883")).toEqual({
            kind: "osm-ref",
            osmType: "node",
            osmId: 1573053883,
        });
    });

    it("parses canonical mlat/mlon OSM URLs", () => {
        expect(parseOpenStreetMapReference("https://www.openstreetmap.org/?mlat=40.7128&mlon=-74.0060")).toEqual({
            kind: "coords",
            lat: 40.7128,
            lon: -74.006,
        });
    });

    it("parses #map fragment URLs", () => {
        expect(parseOpenStreetMapReference("https://www.openstreetmap.org/#map=17/48.8566/2.3522")).toEqual({
            kind: "coords",
            lat: 48.8566,
            lon: 2.3522,
        });
    });
});
