/**
 * Validation utilities using pubky-app-specs WASM bindings
 * Re-exports validation functions for consistent usage across the app
 */

export {
    validateTimezone,
    validateGeoCoordinates,
    validateRrule,
    validateColor,
    validateDuration,
    getValidEventStatuses,
    getValidRsvpStatuses,
} from "@eventky/pubky-app-specs";

