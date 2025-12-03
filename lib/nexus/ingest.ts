import { config } from "@/lib/config";

/**
 * Ingest a user into Nexus for indexing
 * This should be called after user signup or login
 */
export async function ingestUserIntoNexus(publicKey: string): Promise<boolean> {
    try {
        const response = await fetch(`${config.gateway.url}/v0/ingest/${publicKey}`, {
            method: "PUT",
        });

        if (!response.ok) {
            console.error(`Failed to ingest user into Nexus: ${response.status} ${response.statusText}`);
            return false;
        }

        console.log(`Successfully ingested user ${publicKey} into Nexus`);
        return true;
    } catch (error) {
        console.error("Error ingesting user into Nexus:", error);
        return false;
    }
}
