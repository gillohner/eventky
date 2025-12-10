/**
 * Cache Sync Provider
 *
 * Background service that:
 * - Monitors pending syncs via TanStack Query
 * - Provides cache status context
 * - Handles cache clearing
 *
 * Note: TanStack Query now handles cache persistence via localStorage persister.
 */

"use client";

import {
    createContext,
    useContext,
    useCallback,
    type ReactNode,
} from "react";
import { useQueryClient, useIsFetching, useIsMutating } from "@tanstack/react-query";

interface CacheSyncContextValue {
    /** Number of items pending sync with Nexus */
    pendingSyncCount: number;
    /** Clear all cache data */
    clearCache: () => void;
    /** Whether any items are currently syncing */
    isSyncing: boolean;
}

const CacheSyncContext = createContext<CacheSyncContextValue | null>(null);

interface CacheSyncProviderProps {
    children: ReactNode;
}

export function CacheSyncProvider({
    children,
}: CacheSyncProviderProps) {
    const queryClient = useQueryClient();

    // Track pending operations via TanStack Query
    const fetchingCount = useIsFetching();
    const mutatingCount = useIsMutating();
    const pendingSyncCount = fetchingCount + mutatingCount;

    const clearCache = useCallback(() => {
        queryClient.clear();
    }, [queryClient]);

    const value: CacheSyncContextValue = {
        pendingSyncCount,
        clearCache,
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
