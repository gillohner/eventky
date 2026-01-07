/**
 * WASM Initialization utility for pubky-app-specs
 * 
 * This module handles lazy-loading and initialization of the WASM module
 * to prevent errors during SSR and ensure the module is ready before use.
 */

let wasmInitialized = false;
let wasmInitPromise: Promise<typeof import("pubky-app-specs")> | null = null;

/**
 * Initialize the pubky-app-specs WASM module
 * Safe to call multiple times - will only initialize once
 * 
 * @returns The initialized pubky-app-specs module
 */
export async function initWasm(): Promise<typeof import("pubky-app-specs")> {
    // Return cached promise if already initializing/initialized
    if (wasmInitPromise) {
        return wasmInitPromise;
    }

    wasmInitPromise = (async () => {
        try {
            // Dynamically import the module
            const wasm = await import("pubky-app-specs");

            // Call the default export (init function) if not already initialized
            if (!wasmInitialized && typeof wasm.default === "function") {
                await wasm.default();
                wasmInitialized = true;
            }

            return wasm;
        } catch (error) {
            // Reset promise on failure to allow retry
            wasmInitPromise = null;
            throw error;
        }
    })();

    return wasmInitPromise;
}

/**
 * Check if WASM is initialized
 */
export function isWasmInitialized(): boolean {
    return wasmInitialized;
}

/**
 * Get the WASM module if already initialized, or null if not
 * Useful for synchronous checks without triggering initialization
 */
export async function getWasmModule(): Promise<typeof import("pubky-app-specs") | null> {
    if (!wasmInitPromise) {
        return null;
    }
    try {
        return await wasmInitPromise;
    } catch {
        return null;
    }
}
