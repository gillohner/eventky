/**
 * Session utilities for detecting and handling session-related errors
 */

import { toast } from "sonner";

/**
 * Check if an error indicates a resource was not found (404)
 * This is useful for delete operations where "not found" means success
 * @param error - The error to check
 * @returns true if the error indicates resource not found
 */
export function isNotFoundError(error: unknown): boolean {
    if (!error) return false;

    const errorMessage = error instanceof Error ? error.message : String(error);
    const lowerMessage = errorMessage.toLowerCase();

    // Check for HTTP 404 status
    if (lowerMessage.includes("404") || lowerMessage.includes("not found")) {
        return true;
    }

    // Check for "does not exist" type messages
    if (
        lowerMessage.includes("does not exist") ||
        lowerMessage.includes("no such file") ||
        lowerMessage.includes("file not found") ||
        lowerMessage.includes("resource not found")
    ) {
        return true;
    }

    // Check if error has a status property (e.g., fetch Response-like errors)
    if (typeof error === "object" && error !== null) {
        const statusError = error as { status?: number; statusCode?: number };
        if (statusError.status === 404 || statusError.statusCode === 404) {
            return true;
        }
    }

    return false;
}

/**
 * Check if an error indicates a session has expired or is invalid
 * @param error - The error to check
 * @returns true if the error indicates session expiry
 */
export function isSessionExpiredError(error: unknown): boolean {
    if (!error) return false;

    // Check for common session expiry indicators
    const errorMessage = error instanceof Error ? error.message : String(error);
    const lowerMessage = errorMessage.toLowerCase();

    // Check for HTTP 401 status
    if (lowerMessage.includes("401") || lowerMessage.includes("unauthorized")) {
        return true;
    }

    // Check for session-related error messages
    if (
        lowerMessage.includes("session expired") ||
        lowerMessage.includes("not authenticated") ||
        lowerMessage.includes("authentication required") ||
        lowerMessage.includes("invalid session") ||
        lowerMessage.includes("no storage available")
    ) {
        return true;
    }

    // Check if error has a status property (e.g., fetch Response-like errors)
    if (typeof error === "object" && error !== null) {
        const statusError = error as { status?: number; statusCode?: number };
        if (statusError.status === 401 || statusError.statusCode === 401) {
            return true;
        }
    }

    return false;
}

/**
 * Get a user-friendly message for session expiry
 * @param authMethod - The authentication method used ('recovery' or 'qr')
 * @returns A helpful message for the user
 */
export function getSessionExpiredMessage(authMethod?: "recovery" | "qr" | null): string {
    if (authMethod === "qr") {
        return "Your session has expired. Please scan the QR code with Pubky Ring to log in again.";
    }
    return "Your session has expired. Please log in again.";
}

/**
 * Handle mutation errors with session expiry detection
 * Shows appropriate toast and clears auth if session expired
 * 
 * @param error - The error from the mutation
 * @param fallbackMessage - Message to show if not a session error
 * @param options - Options for error handling
 * @returns true if error was a session expiry (caller should not show additional toasts)
 */
export function handleMutationError(
    error: unknown,
    fallbackMessage: string,
    options?: { showToasts?: boolean; logout?: () => void }
): boolean {
    const { showToasts = true, logout } = options ?? {};

    if (isSessionExpiredError(error)) {
        if (showToasts) {
            toast.error("Session expired. Please log in again.", {
                duration: 5000,
                action: {
                    label: "Log in",
                    onClick: () => {
                        // Clear auth state
                        logout?.();
                        // Redirect to login (use window.location for full refresh)
                        window.location.href = "/login";
                    },
                },
            });
        } else {
            // Still logout even if not showing toasts
            logout?.();
        }
        return true;
    }

    // Not a session error, show the fallback message
    if (showToasts) {
        const message = error instanceof Error ? error.message : fallbackMessage;
        toast.error(`${fallbackMessage}: ${message}`);
    }
    return false;
}
