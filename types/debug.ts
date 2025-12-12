/**
 * Debug Mode Types
 * 
 * Centralized types for debug mode functionality
 */

/**
 * Debug mode configuration
 */
export interface DebugConfig {
    /** Whether debug mode is enabled */
    enabled: boolean;
    /** Whether the debug toggle is available */
    available: boolean;
}

/**
 * Debug view state
 */
export interface DebugViewState {
    /** Whether raw data view is currently shown */
    showRawData: boolean;
    /** Toggle raw data view */
    toggleRawData: () => void;
}
