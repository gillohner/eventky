/**
 * PubkyService — singleton Pubky SDK instance.
 * Mirrors pubky-app's HomeserverService.getPubkySdk() pattern.
 *
 * Key difference from previous implementation:
 * - ONE instance created on first use, reused everywhere
 * - For non-testnet: uses Pubky.withClient(new Client({pkarr: {relays: ...}}))
 *   just like pubky-app does — this is CRITICAL for session restoration
 * - For testnet: uses Pubky.testnet()
 */
import { Pubky, Client } from "@synonymdev/pubky";
import { config } from "@/lib/config";

// Default Pkarr relays — same as pubky-app's defaults
const DEFAULT_PKARR_RELAYS = [
    "https://pkarr.pubky.app",
    "https://pkarr.pubky.org",
];

let pubkySdkInstance: Pubky | null = null;

export class PubkyService {
    private constructor() { } // Prevent instantiation

    /**
     * Get the singleton Pubky SDK instance.
     * Identical to pubky-app's HomeserverService.getPubkySdk()
     */
    static getInstance(): Pubky {
        if (!pubkySdkInstance) {
            if (config.env === "testnet") {
                pubkySdkInstance = Pubky.testnet();
            } else {
                // For staging/production: configure with Pkarr relays
                // This is CRITICAL — bare `new Pubky()` cannot resolve homeservers
                const client = new Client({ pkarr: { relays: DEFAULT_PKARR_RELAYS } });
                pubkySdkInstance = Pubky.withClient(client);
            }
        }
        return pubkySdkInstance;
    }

    /**
     * Reset the singleton (used in tests or if config changes)
     */
    static reset(): void {
        pubkySdkInstance = null;
    }
}
