/**
 * Cache Sync Provider
 *
 * Background service that:
 * - Clears stale cache entries periodically
 * - Monitors pending syncs
 * - Handles cache hydration from localStorage
 * - Provides cache status context
 */

"use client";

import {
    createContext,
    useContext,
    useEffect,
    useCallback,
    type ReactNode,
} from "react";
import {
    useOptimisticCache,
    usePendingSyncCount,
} from "@/stores/optimistic-cache-store";
import { SYNC_CONFIG } from "@/lib/cache";

interface CacheSyncContextValue {
    /** Number of items pending sync with Nexus */
    pendingSyncCount: number;
    /** Clear all cache data */
    clearCache: () => void;
    /** Clear only stale entries */
    clearStaleEntries: () => void;
    /** Whether any items are currently syncing */
    isSyncing: boolean;
}

const CacheSyncContext = createContext<CacheSyncContextValue | null>(null);

interface CacheSyncProviderProps {
    children: ReactNode;
    /**
     * Interval for cleaning stale entries (ms)
     * Default: 5 minutes
     */
    cleanupInterval?: number;
    /**
     * Max age for stale entries (ms)
     * Default: 24 hours
     */
    maxStaleAge?: number;
}

export function CacheSyncProvider({
    children,
    cleanupInterval = 5 * 60 * 1000, // 5 minutes
    maxStaleAge = 24 * 60 * 60 * 1000, // 24 hours
}: CacheSyncProviderProps) {
    const clearAll = useOptimisticCache((state) => state.clearAll);
    const clearStaleEntries = useOptimisticCache((state) => state.clearStaleEntries);
    const pendingSyncCount = usePendingSyncCount();

    // Periodic cleanup of stale entries
    useEffect(() => {
        const cleanup = () => {
            clearStaleEntries(maxStaleAge);
        };

        // Initial cleanup on mount
        cleanup();

        // Set up periodic cleanup
        const intervalId = setInterval(cleanup, cleanupInterval);

        return () => clearInterval(intervalId);
    }, [cleanupInterval, maxStaleAge, clearStaleEntries]);

    // Clear cache on window unload if there are too many entries
    useEffect(() => {
        const handleBeforeUnload = () => {
            // Clean up very old entries before page unload
            clearStaleEntries(SYNC_CONFIG.MAX_SYNC_TIME * 2);
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [clearStaleEntries]);

    const clearCache = useCallback(() => {
        clearAll();
    }, [clearAll]);

    const handleClearStaleEntries = useCallback(() => {
        clearStaleEntries(maxStaleAge);
    }, [clearStaleEntries, maxStaleAge]);

    const value: CacheSyncContextValue = {
        pendingSyncCount,
        clearCache,
        clearStaleEntries: handleClearStaleEntries,
        isSyncing: pendingSyncCount > 0,
    };

    return (
        <CacheSyncContext.Provider value={value}>
            {children}
        </CacheSyncContext.Provider>
    );
}

/**
 * Hook to access cache sync status and actions
 */
export function useCacheSync(): CacheSyncContextValue {
    const context = useContext(CacheSyncContext);
    if (!context) {
        throw new Error("useCacheSync must be used within a CacheSyncProvider");
    }
    return context;
}

/**
 * Optional: Global sync indicator that shows when items are pending
 */
export function GlobalSyncIndicator() {
    const { pendingSyncCount, isSyncing } = useCacheSync();

    if (!isSyncing) {
        return null;
    }

    return (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-blue-500 px-3 py-1.5 text-white text-sm shadow-lg animate-pulse">
            <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
            Syncing {pendingSyncCount} item{pendingSyncCount !== 1 ? "s" : ""}...
        </div>
    );
}
