"use client";

import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { ReactNode, useState, useMemo } from "react";
import { SYNC_CONFIG } from "@/lib/cache/sync";

/**
 * Create localStorage persister for query cache
 * Only created on client-side to avoid SSR issues
 */
function createPersister() {
    if (typeof window === "undefined") return undefined;

    return createSyncStoragePersister({
        storage: window.localStorage,
        key: "eventky-query-cache",
        // Only persist queries that have _syncMeta with source: 'local'
        // This ensures we only persist optimistic updates, not all Nexus data
        serialize: (data) => {
            // Filter to only keep local/pending data
            const filtered = {
                ...data,
                clientState: {
                    ...data.clientState,
                    queries: data.clientState.queries.filter((query) => {
                        const queryData = query.state.data;
                        // Keep queries with local sync metadata
                        if (queryData && typeof queryData === "object" && "_syncMeta" in queryData) {
                            const meta = (queryData as { _syncMeta?: { source?: string } })._syncMeta;
                            return meta?.source === "local";
                        }
                        return false;
                    }),
                },
            };
            return JSON.stringify(filtered);
        },
        deserialize: (data) => JSON.parse(data),
    });
}

export function QueryProvider({ children }: { children: ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: SYNC_CONFIG.NORMAL_STALE_TIME,
                        gcTime: SYNC_CONFIG.GC_TIME,
                        refetchOnWindowFocus: false,
                        retry: (failureCount, error) => {
                            // Don't retry 404s
                            if (error instanceof Error && error.message.includes("404")) {
                                return false;
                            }
                            return failureCount < 2;
                        },
                    },
                },
            })
    );

    // Create persister once on mount (client-side only via useMemo)
    // useMemo runs during render, not in an effect, avoiding the cascading render issue
    const persister = useMemo(() => createPersister(), []);

    // If no persister (SSR), still render with undefined persister
    // PersistQueryClientProvider handles this gracefully
    if (!persister) {
        return (
            <PersistQueryClientProvider
                client={queryClient}
                persistOptions={{ persister: undefined as unknown as ReturnType<typeof createSyncStoragePersister> }}
            >
                {children}
            </PersistQueryClientProvider>
        );
    }

    return (
        <PersistQueryClientProvider
            client={queryClient}
            persistOptions={{
                persister,
                maxAge: 24 * 60 * 60 * 1000, // 24 hours
                buster: "v1", // Increment to invalidate cache on breaking changes
            }}
        >
            {children}
        </PersistQueryClientProvider>
    );
}
