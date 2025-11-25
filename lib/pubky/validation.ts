/**
 * Validation utilities using pubky-app-specs WASM bindings
 * Re-exports validation functions for consistent usage across the app
 */

import {
    validateTimezone,
    validateGeoCoordinates,
    validateRrule,
    validateColor,
    validateDuration,
    getValidEventStatuses,
    getValidRsvpStatuses,
} from "pubky-app-specs";

// Re-export WASM validation functions
export {
    validateTimezone,
    validateGeoCoordinates,
    validateRrule,
    validateColor,
    validateDuration,
    getValidEventStatuses,
    getValidRsvpStatuses,
};

/**
 * Validate URL format
 */
export function validateUrl(url: string): boolean {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

/**
 * Get validation error message for a field
 */
export function getFieldValidationError(
    field: string,
    value: any
): string | undefined {
    switch (field) {
        case "geo":
            if (value && !validateGeoCoordinates(value)) {
                return "Invalid coordinates format (expected: lat;lon)";
            }
            break;
        case "url":
        case "image_uri":
            if (value && !validateUrl(value)) {
                return "Invalid URL format";
            }
            break;
        case "duration":
            if (value && !validateDuration(value)) {
                return "Invalid duration format (expected: PT2H30M)";
            }
            break;
        case "rrule":
            if (value && !validateRrule(value)) {
                return "Invalid recurrence rule format";
            }
            break;
        case "dtstart_tzid":
        case "dtend_tzid":
            if (value && !validateTimezone(value)) {
                return "Invalid timezone (use IANA timezone format)";
            }
            break;
        case "status":
            if (value && !getValidEventStatuses().includes(value)) {
                return `Invalid status (must be one of: ${getValidEventStatuses().join(", ")})`;
            }
            break;
    }
    return undefined;
}
