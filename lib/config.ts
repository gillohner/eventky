/**
 * Centralized configuration for Pubky services
 * All environment-specific settings are managed here
 */

export type PubkyEnvironment = "testnet" | "staging" | "production";

interface PubkyConfig {
    isDevelopment: boolean;

    // App Configuration
    app: {
        name: string;
        version: string;
        githubRepo?: string;
    };

    // Debug Configuration
    debug: {
        /** Whether debug mode toggle is available */
        available: boolean;
    };

    // Environment
    env: PubkyEnvironment;
    environment: PubkyEnvironment;

    // Homeserver Configuration
    homeserver: {
        publicKey: string;
        url: string; // HTTP URL for direct file access
    };

    // HTTP Relay Configuration (for QR code authentication)
    relay: {
        url: string;
    };

    // Gateway Configuration (for resolving pubky:// URLs)
    gateway: {
        url: string;
        baseFilePath: string;
        baseAvatarPath: string;
    };

    // Profile Configuration
    profile: {
        path: string;
    };

    // Pubky App URLs (for linking to profiles, etc.)
    pubkyApp: {
        profileUrl: string; // Base URL for profile links (e.g., https://pubky.app/profile)
    };
}

/**
 * Default homeserver public keys for each environment
 */
const DEFAULT_HOMESERVERS: Record<PubkyEnvironment, string> = {
    testnet: "8pinxxgqs41n4aididenw5apqp1urfmzdztr8jt4abrkdn435ewo", // Testnet homeserver
    staging: "ufibwbmed6jeq9k4p583go95wofakh9fwpp4k734trq79pd9u1uy", // Staging homeserver
    production: "ufibwbmed6jeq9k4p583go95wofakh9fwpp4k734trq79pd9u1uy", // Production homeserver (same as staging for now)
};

/**
 * Default HTTP relay URLs for each environment
 */
const DEFAULT_RELAYS: Record<PubkyEnvironment, string> = {
    testnet: "http://localhost:15412/link",
    staging: "https://httprelay.staging.pubky.app/link/",
    production: "https://httprelay.pubky.app/link/",
};

/**
 * Default gateway URLs for each environment
 */
const DEFAULT_GATEWAYS: Record<PubkyEnvironment, string> = {
    testnet: "http://localhost:8080",
    staging: "https://nexus.staging.pubky.app",
    production: "https://nexus.pubky.app",
};

/**
 * Default homeserver HTTP URLs for each environment
 * Used for direct file access when Nexus hasn't indexed yet
 */
const DEFAULT_HOMESERVER_URLS: Record<PubkyEnvironment, string> = {
    testnet: "http://localhost:6286",
    staging: "https://homeserver.staging.pubky.app",
    production: "https://homeserver.pubky.app",
};

/**
 * Default Pubky App URLs for each environment
 * Used for linking to user profiles
 */
const DEFAULT_PUBKY_APP_URLS: Record<PubkyEnvironment, string> = {
    testnet: "http://localhost:3000", // Local pubky-app instance
    staging: "https://staging.pubky.app",
    production: "https://pubky.app",
};

/**
 * Get the current environment from env variables
 */
function getEnvironment(): PubkyEnvironment {
    const env = process.env.NEXT_PUBLIC_PUBKY_ENV?.toLowerCase();

    if (env === "testnet" || env === "staging" || env === "production") {
        return env;
    }

    // Default to staging
    return "staging";
}

/**
 * Build the configuration from environment variables
 */
function buildConfig(): PubkyConfig {
    const environment = getEnvironment();

    return {
        isDevelopment: process.env.NODE_ENV === "development",

        app: {
            name: process.env.NEXT_PUBLIC_APP_NAME || "Eventky",
            version: process.env.NEXT_PUBLIC_APP_VERSION || "0.1.0",
            githubRepo: process.env.NEXT_PUBLIC_GITHUB_REPO,
        },

        debug: {
            available: process.env.NEXT_PUBLIC_DEBUG_AVAILABLE !== "false",
        },

        env: environment,
        environment,

        homeserver: {
            publicKey: process.env.NEXT_PUBLIC_PUBKY_HOMESERVER || DEFAULT_HOMESERVERS[environment],
            url: process.env.NEXT_PUBLIC_PUBKY_HOMESERVER_URL || DEFAULT_HOMESERVER_URLS[environment],
        },

        relay: {
            url: process.env.NEXT_PUBLIC_PUBKY_RELAY || DEFAULT_RELAYS[environment],
        },

        gateway: {
            url: process.env.NEXT_PUBLIC_PUBKY_GATEWAY || DEFAULT_GATEWAYS[environment],
            baseFilePath: process.env.NEXT_PUBLIC_PUBKY_GATEWAY_BASE_FILE_PATH || "/static/files",
            baseAvatarPath: process.env.NEXT_PUBLIC_PUBKY_GATEWAY_BASE_AVATAR_PATH || "/static/avatar",
        },

        profile: {
            path: process.env.NEXT_PUBLIC_PUBKY_PROFILE_PATH || "/pub/pubky.app/profile.json",
        },

        pubkyApp: {
            profileUrl: process.env.NEXT_PUBLIC_PUBKY_APP_PROFILE_URL || `${DEFAULT_PUBKY_APP_URLS[environment]}/profile`,
        },
    };
}

/**
 * Singleton configuration instance
 */
export const config: PubkyConfig = buildConfig();

/**
 * Helper to check if running in testnet mode
 */
export const isTestnet = config.environment === "testnet";

/**
 * Helper to check if running in production mode
 */
export const isProduction = config.environment === "production";

/**
 * Helper to check if running in staging mode
 */
export const isStaging = config.environment === "staging";
