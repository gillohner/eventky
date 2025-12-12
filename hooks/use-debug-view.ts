/**
 * Debug Mode Hook
 * 
 * Centralized hook for debug mode functionality
 * Provides consistent debug UI state management across pages
 */

import { useState, useCallback } from "react";
import { useDebugStore } from "@/stores/debug-store";
import { config } from "@/lib/config";

export interface UseDebugViewOptions {
    /** Initial state for raw data view (default: false) */
    initialShowRawData?: boolean;
}

export interface UseDebugViewResult {
    /** Whether debug mode is available (based on config) */
    debugAvailable: boolean;
    /** Whether debug mode is currently enabled */
    debugEnabled: boolean;
    /** Whether raw data view is currently shown */
    showRawData: boolean;
    /** Toggle raw data view */
    toggleRawData: () => void;
    /** Enable debug mode globally */
    enableDebug: () => void;
    /** Disable debug mode globally */
    disableDebug: () => void;
    /** Toggle debug mode globally */
    toggleDebug: () => void;
}

/**
 * Hook for managing debug view state on a page
 * 
 * @example
 * ```tsx
 * const { debugEnabled, showRawData, toggleRawData } = useDebugView();
 * 
 * return (
 *   <>
 *     {debugEnabled && (
 *       <Button onClick={toggleRawData}>
 *         {showRawData ? "Show UI" : "Show Raw Data"}
 *       </Button>
 *     )}
 *     {showRawData ? <DevJsonView data={data} /> : <UIComponent data={data} />}
 *   </>
 * );
 * ```
 */
export function useDebugView(options?: UseDebugViewOptions): UseDebugViewResult {
    const { initialShowRawData = false } = options || {};

    const [showRawData, setShowRawData] = useState(initialShowRawData);
    const { enabled: debugEnabled, enable, disable, toggle } = useDebugStore();

    const toggleRawData = useCallback(() => {
        setShowRawData((prev) => !prev);
    }, []);

    return {
        debugAvailable: config.debug.available,
        debugEnabled: debugEnabled && config.debug.available,
        showRawData: showRawData && debugEnabled && config.debug.available,
        toggleRawData,
        enableDebug: enable,
        disableDebug: disable,
        toggleDebug: toggle,
    };
}
