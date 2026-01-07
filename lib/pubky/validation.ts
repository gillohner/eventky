/**
 * Validation utilities using pubky-app-specs WASM bindings
 * 
 * IMPORTANT: These functions use lazy-loading via initWasm to ensure
 * WASM is properly initialized before use.
 */

import { initWasm } from "@/lib/pubky/wasm-init";

// Type for the validation functions we need
type ValidationFn = (value: string) => boolean;
type GetStatusesFn = () => string[];

/**
 * Safe wrapper for WASM validation functions with lazy loading
 * Returns true on WASM initialization errors to allow form submission
 * (server-side validation will catch actual errors)
 */
async function safeValidateAsync(
    validatorName: string,
    value: string
): Promise<boolean> {
    try {
        const wasm = await initWasm();
        const validator = (wasm as Record<string, unknown>)[validatorName] as ValidationFn | undefined;
        if (typeof validator === "function") {
            return validator(value);
        }
        return true;
    } catch (error) {
        // WASM not initialized - allow value, server will validate
        console.warn(`WASM validation (${validatorName}) skipped:`, error);
        return true;
    }
}

/**
 * Synchronous safe wrapper that returns true if WASM fails
 * Uses a cached module reference if available
 */
let wasmModule: Record<string, unknown> | null = null;

// Initialize module reference asynchronously
if (typeof window !== "undefined") {
    initWasm().then((mod) => {
        wasmModule = mod as unknown as Record<string, unknown>;
    }).catch(() => {
        // Ignore init errors - validation will fall back to true
    });
}

function safeValidate(validatorName: string, value: string): boolean {
    try {
        if (!wasmModule) {
            // WASM not loaded yet - allow value
            return true;
        }
        const validator = wasmModule[validatorName] as ValidationFn | undefined;
        if (typeof validator === "function") {
            return validator(value);
        }
        return true;
    } catch (error) {
        console.warn(`WASM validation (${validatorName}) skipped:`, error);
        return true;
    }
}

/**
 * Validate timezone string (IANA format)
 */
export function validateTimezone(tz: string): boolean {
    return safeValidate("validateTimezone", tz);
}

/**
 * Validate geo coordinates in "lat;lon" format
 */
export function validateGeoCoordinates(geo: string): boolean {
    return safeValidate("validateGeoCoordinates", geo);
}

/**
 * Validate RRULE string (RFC 5545)
 */
export function validateRrule(rrule: string): boolean {
    return safeValidate("validateRrule", rrule);
}

/**
 * Validate hex color (#RRGGBB format)
 */
export function validateColor(color: string): boolean {
    return safeValidate("validateColor", color);
}

/**
 * Validate ISO 8601 duration (PT1H30M format)
 */
export function validateDuration(duration: string): boolean {
    return safeValidate("validateDuration", duration);
}

/**
 * Get valid RFC 5545 event status values
 */
export function getValidEventStatuses(): string[] {
    try {
        if (!wasmModule) return ["CONFIRMED", "TENTATIVE", "CANCELLED"];
        const fn = wasmModule.getValidEventStatuses as GetStatusesFn | undefined;
        if (typeof fn === "function") {
            return fn();
        }
    } catch {
        // Fall through to default
    }
    return ["CONFIRMED", "TENTATIVE", "CANCELLED"];
}

/**
 * Get valid RFC 5545 RSVP status values
 */
export function getValidRsvpStatuses(): string[] {
    try {
        if (!wasmModule) return ["NEEDS-ACTION", "ACCEPTED", "DECLINED", "TENTATIVE"];
        const fn = wasmModule.getValidRsvpStatuses as GetStatusesFn | undefined;
        if (typeof fn === "function") {
            return fn();
        }
    } catch {
        // Fall through to default
    }
    return ["NEEDS-ACTION", "ACCEPTED", "DECLINED", "TENTATIVE"];
}

/**
 * Async versions for when you need guaranteed WASM validation
 */
export const validateTimezoneAsync = (tz: string) => safeValidateAsync("validateTimezone", tz);
export const validateGeoCoordinatesAsync = (geo: string) => safeValidateAsync("validateGeoCoordinates", geo);
export const validateRruleAsync = (rrule: string) => safeValidateAsync("validateRrule", rrule);
export const validateColorAsync = (color: string) => safeValidateAsync("validateColor", color);
export const validateDurationAsync = (duration: string) => safeValidateAsync("validateDuration", duration);

