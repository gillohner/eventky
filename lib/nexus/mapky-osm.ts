import { getErrorMessage, nexusClient } from "./client";

export interface MapkyOsmSearchResult {
    display_name: string;
    lat?: string;
    lon?: string;
    osm_type?: string;
    osm_id?: number;
}

export interface MapkyOsmLookupResult {
    display_name: string;
    lat?: string;
    lon?: string;
    osm_type?: string;
    osm_id?: number;
}

export async function searchOsm(query: string): Promise<MapkyOsmSearchResult[]> {
    try {
        const response = await nexusClient.get<MapkyOsmSearchResult[]>("/v0/mapky/osm/search", {
            params: { q: query },
        });
        return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
        throw new Error(`Failed to search OSM locations: ${getErrorMessage(error)}`);
    }
}

export async function lookupOsm(osmIds: string): Promise<MapkyOsmLookupResult[]> {
    try {
        const response = await nexusClient.get<MapkyOsmLookupResult[]>("/v0/mapky/osm/lookup", {
            params: { osm_ids: osmIds },
        });
        return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
        throw new Error(`Failed to lookup OSM location: ${getErrorMessage(error)}`);
    }
}
