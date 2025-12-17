/**
 * Tests for Event Hooks
 * 
 * Tests the TanStack Query-based hooks for event operations:
 * - useEvent: Fetch single event with optimistic caching
 * - useEventsStream: Fetch events stream
 * - usePrefetchEvent: Prefetch event data
 * - useInvalidateEvents: Invalidate event queries
 * - useSetEventCache: Set event data in cache
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import {
    useEvent,
    useEventsStream,
    usePrefetchEvent,
    useInvalidateEvents,
    useSetEventCache,
} from '../use-event-hooks'
import type { NexusEventResponse, CachedEvent, NexusEventStreamItem } from '@/types/nexus'

// =============================================================================
// Mock Setup
// =============================================================================

// Mock the nexus module
vi.mock('@/lib/nexus', () => ({
    fetchEventFromNexus: vi.fn(),
    fetchEventsStream: vi.fn(),
}))

// Mock the cache module - only mock the parts we need to control
vi.mock('@/lib/cache', async () => {
    const actual = await vi.importActual('@/lib/cache')
    return {
        ...actual,
        getPendingEvent: vi.fn(() => null),
    }
})

// Import mocked modules
import { fetchEventFromNexus, fetchEventsStream } from '@/lib/nexus'
import { queryKeys } from '@/lib/cache'

// Type the mocks
const mockFetchEventFromNexus = fetchEventFromNexus as ReturnType<typeof vi.fn>
const mockFetchEventsStream = fetchEventsStream as ReturnType<typeof vi.fn>

// =============================================================================
// Test Fixtures
// =============================================================================

const TEST_AUTHOR_ID = 'pk:author123'
const TEST_EVENT_ID = 'EVT001'
const TEST_TIMESTAMP = 1704067200 // 2024-01-01T00:00:00Z

function createMockNexusEvent(overrides?: Partial<NexusEventResponse['details']>): NexusEventResponse {
    return {
        details: {
            id: TEST_EVENT_ID,
            uri: `pubky://${TEST_AUTHOR_ID}/pub/pubky.app/events/${TEST_EVENT_ID}`,
            author: TEST_AUTHOR_ID,
            indexed_at: TEST_TIMESTAMP + 100,
            uid: `uid-${TEST_EVENT_ID}`,
            dtstamp: TEST_TIMESTAMP,
            dtstart: '2024-06-15T14:00:00',
            summary: 'Test Event',
            dtend: '2024-06-15T16:00:00',
            dtstart_tzid: 'America/New_York',
            dtend_tzid: 'America/New_York',
            description: 'Test event description',
            status: 'CONFIRMED',
            location: 'Test Location',
            sequence: 1,
            created: TEST_TIMESTAMP,
            last_modified: TEST_TIMESTAMP + 50,
            ...overrides,
        },
        tags: [
            { label: 'test', taggers: ['user1'], taggers_count: 1, relationship: false }
        ],
        attendees: [
            {
                id: 'att1',
                indexed_at: TEST_TIMESTAMP,
                author: 'pk:attendee1',
                uri: 'pubky://pk:attendee1/rsvp1',
                partstat: 'ACCEPTED',
                x_pubky_event_uri: `pubky://${TEST_AUTHOR_ID}/pub/pubky.app/events/${TEST_EVENT_ID}`,
                created_at: TEST_TIMESTAMP,
            }
        ],
    }
}

function createMockCachedEvent(overrides?: Partial<CachedEvent>): CachedEvent {
    const nexusEvent = createMockNexusEvent()
    return {
        details: nexusEvent.details,
        tags: nexusEvent.tags,
        attendees: nexusEvent.attendees,
        _syncMeta: {
            source: 'nexus',
            fetchedAt: Date.now(),
            syncedAt: Date.now(),
        },
        ...overrides,
    }
}

function createMockStreamEvents(count: number = 3): NexusEventStreamItem[] {
    return Array.from({ length: count }, (_, i) => ({
        id: `EVT00${i + 1}`,
        uri: `pubky://${TEST_AUTHOR_ID}/pub/pubky.app/events/EVT00${i + 1}`,
        author: TEST_AUTHOR_ID,
        indexed_at: TEST_TIMESTAMP + i * 100,
        uid: `uid-EVT00${i + 1}`,
        dtstamp: TEST_TIMESTAMP,
        dtstart: `2024-06-${15 + i}T14:00:00`,
        summary: `Test Event ${i + 1}`,
        status: 'CONFIRMED',
    }))
}

// =============================================================================
// Test Utilities
// =============================================================================

function createTestQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
                gcTime: Infinity,
                staleTime: Infinity,
            },
            mutations: {
                retry: false,
            },
        },
        logger: {
            log: () => { },
            warn: () => { },
            error: () => { },
        },
    })
}

interface WrapperProps {
    children: ReactNode
}

function createWrapper(queryClient?: QueryClient) {
    const client = queryClient ?? createTestQueryClient()
    return function Wrapper({ children }: WrapperProps) {
        return (
            <QueryClientProvider client={client}>
                {children}
            </QueryClientProvider>
        )
    }
}

// =============================================================================
// useEvent Tests
// =============================================================================

describe('useEvent', () => {
    let queryClient: QueryClient

    beforeEach(() => {
        vi.clearAllMocks()
        queryClient = createTestQueryClient()
    })

    describe('basic fetching', () => {
        it('fetches event from Nexus successfully', async () => {
            const mockEvent = createMockNexusEvent()
            mockFetchEventFromNexus.mockResolvedValueOnce(mockEvent)

            const { result } = renderHook(
                () => useEvent(TEST_AUTHOR_ID, TEST_EVENT_ID),
                { wrapper: createWrapper(queryClient) }
            )

            // Initially loading
            expect(result.current.isLoading).toBe(true)

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false)
            })

            // Data should be loaded
            expect(result.current.data).toBeDefined()
            expect(result.current.data?.details.id).toBe(TEST_EVENT_ID)
            expect(result.current.data?.details.summary).toBe('Test Event')
            expect(result.current.error).toBeNull()
        })

        it('returns null when event not found (404)', async () => {
            mockFetchEventFromNexus.mockResolvedValueOnce(null)

            const { result } = renderHook(
                () => useEvent(TEST_AUTHOR_ID, TEST_EVENT_ID),
                { wrapper: createWrapper(queryClient) }
            )

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false)
            })

            expect(result.current.data).toBeNull()
            expect(result.current.error).toBeNull()
        })

        it('calls fetch function with correct params', async () => {
            mockFetchEventFromNexus.mockResolvedValueOnce(createMockNexusEvent())

            renderHook(
                () => useEvent(TEST_AUTHOR_ID, TEST_EVENT_ID),
                { wrapper: createWrapper(queryClient) }
            )

            await waitFor(() => {
                expect(mockFetchEventFromNexus).toHaveBeenCalledWith(
                    TEST_AUTHOR_ID,
                    TEST_EVENT_ID,
                    undefined,
                    undefined,
                    undefined
                )
            })
        })

        it('passes limit options to fetch function', async () => {
            mockFetchEventFromNexus.mockResolvedValueOnce(createMockNexusEvent())

            renderHook(
                () => useEvent(TEST_AUTHOR_ID, TEST_EVENT_ID, {
                    limitTags: 10,
                    limitTaggers: 5,
                    limitAttendees: 20,
                }),
                { wrapper: createWrapper(queryClient) }
            )

            await waitFor(() => {
                expect(mockFetchEventFromNexus).toHaveBeenCalledWith(
                    TEST_AUTHOR_ID,
                    TEST_EVENT_ID,
                    10, // limitTags
                    5,  // limitTaggers
                    20  // limitAttendees
                )
            })
        })
    })

    describe('sync status', () => {
        it('returns synced status for Nexus data', async () => {
            mockFetchEventFromNexus.mockResolvedValueOnce(createMockNexusEvent())

            const { result } = renderHook(
                () => useEvent(TEST_AUTHOR_ID, TEST_EVENT_ID),
                { wrapper: createWrapper(queryClient) }
            )

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false)
            })

            // After successful fetch, status should be synced
            expect(result.current.syncStatus).toBe('synced')
            expect(result.current.isOptimistic).toBe(false)
        })
    })

    describe('refetch', () => {
        it('provides refetch function', async () => {
            mockFetchEventFromNexus.mockResolvedValue(createMockNexusEvent())

            const { result } = renderHook(
                () => useEvent(TEST_AUTHOR_ID, TEST_EVENT_ID),
                { wrapper: createWrapper(queryClient) }
            )

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false)
            })

            // refetch should be a function
            expect(typeof result.current.refetch).toBe('function')

            // Call refetch
            await act(async () => {
                await result.current.refetch()
            })

            // Should have fetched again
            expect(mockFetchEventFromNexus).toHaveBeenCalledTimes(2)
        })
    })
})

// =============================================================================
// useEventsStream Tests
// =============================================================================

describe('useEventsStream', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('fetches events stream successfully', async () => {
        const mockEvents = createMockStreamEvents(3)
        mockFetchEventsStream.mockResolvedValueOnce(mockEvents)

        const queryClient = createTestQueryClient()
        const { result } = renderHook(
            () => useEventsStream(),
            { wrapper: createWrapper(queryClient) }
        )

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false)
        })

        expect(result.current.data).toHaveLength(3)
        expect(result.current.data?.[0].summary).toBe('Test Event 1')
    })

    it('passes params to fetch function', async () => {
        mockFetchEventsStream.mockResolvedValueOnce([])

        const queryClient = createTestQueryClient()
        const params = {
            limit: 10,
            skip: 5,
            status: 'CONFIRMED',
            author: TEST_AUTHOR_ID,
            tags: ['tech', 'meetup'],
        }

        renderHook(
            () => useEventsStream(params),
            { wrapper: createWrapper(queryClient) }
        )

        await waitFor(() => {
            expect(mockFetchEventsStream).toHaveBeenCalledWith(params)
        })
    })

    it('passes date range filters', async () => {
        mockFetchEventsStream.mockResolvedValueOnce([])

        const queryClient = createTestQueryClient()
        const params = {
            start_date: 1704067200,
            end_date: 1704153600,
            timezone: 'America/New_York',
        }

        renderHook(
            () => useEventsStream(params),
            { wrapper: createWrapper(queryClient) }
        )

        await waitFor(() => {
            expect(mockFetchEventsStream).toHaveBeenCalledWith(params)
        })
    })

    it('returns empty array when no events', async () => {
        mockFetchEventsStream.mockResolvedValueOnce([])

        const queryClient = createTestQueryClient()
        const { result } = renderHook(
            () => useEventsStream(),
            { wrapper: createWrapper(queryClient) }
        )

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false)
        })

        expect(result.current.data).toEqual([])
    })
})

// =============================================================================
// usePrefetchEvent Tests
// =============================================================================

describe('usePrefetchEvent', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('prefetches event data into cache', async () => {
        const mockEvent = createMockNexusEvent()
        mockFetchEventFromNexus.mockResolvedValueOnce(mockEvent)

        const queryClient = createTestQueryClient()
        const { result } = renderHook(
            () => usePrefetchEvent(),
            { wrapper: createWrapper(queryClient) }
        )

        // Trigger prefetch
        act(() => {
            result.current(TEST_AUTHOR_ID, TEST_EVENT_ID)
        })

        await waitFor(() => {
            expect(mockFetchEventFromNexus).toHaveBeenCalledWith(
                TEST_AUTHOR_ID,
                TEST_EVENT_ID,
                undefined,
                undefined,
                undefined
            )
        })

        // Verify data is in cache (using event detail key)
        await waitFor(() => {
            const cachedData = queryClient.getQueryData(
                queryKeys.events.detail(TEST_AUTHOR_ID, TEST_EVENT_ID, {})
            )
            expect(cachedData).toBeDefined()
        })
    })

    it('prefetches with limit options', async () => {
        mockFetchEventFromNexus.mockResolvedValueOnce(createMockNexusEvent())

        const queryClient = createTestQueryClient()
        const { result } = renderHook(
            () => usePrefetchEvent(),
            { wrapper: createWrapper(queryClient) }
        )

        act(() => {
            result.current(TEST_AUTHOR_ID, TEST_EVENT_ID, {
                limitTags: 5,
                limitTaggers: 3,
                limitAttendees: 10,
            })
        })

        await waitFor(() => {
            expect(mockFetchEventFromNexus).toHaveBeenCalledWith(
                TEST_AUTHOR_ID,
                TEST_EVENT_ID,
                5,  // limitTags
                3,  // limitTaggers
                10  // limitAttendees
            )
        })
    })

    it('returns stable callback function', () => {
        const queryClient = createTestQueryClient()
        const { result, rerender } = renderHook(
            () => usePrefetchEvent(),
            { wrapper: createWrapper(queryClient) }
        )

        const firstCallback = result.current
        rerender()
        const secondCallback = result.current

        expect(firstCallback).toBe(secondCallback)
    })
})

// =============================================================================
// useInvalidateEvents Tests
// =============================================================================

describe('useInvalidateEvents', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('invalidates specific event by authorId and eventId', async () => {
        const queryClient = createTestQueryClient()
        const mockEvent = createMockCachedEvent()

        // Pre-populate cache
        queryClient.setQueryData(['nexus', 'event', TEST_AUTHOR_ID, TEST_EVENT_ID], mockEvent)

        const { result } = renderHook(
            () => useInvalidateEvents(),
            { wrapper: createWrapper(queryClient) }
        )

        await act(async () => {
            await result.current(TEST_AUTHOR_ID, TEST_EVENT_ID)
        })

        // Query should be invalidated (marked as stale)
        const queryState = queryClient.getQueryState(['nexus', 'event', TEST_AUTHOR_ID, TEST_EVENT_ID])
        expect(queryState?.isInvalidated).toBe(true)
    })

    it('returns stable callback function', () => {
        const queryClient = createTestQueryClient()
        const { result, rerender } = renderHook(
            () => useInvalidateEvents(),
            { wrapper: createWrapper(queryClient) }
        )

        const firstCallback = result.current
        rerender()
        const secondCallback = result.current

        expect(firstCallback).toBe(secondCallback)
    })
})

// =============================================================================
// useSetEventCache Tests
// =============================================================================

describe('useSetEventCache', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('sets event data in cache', () => {
        const queryClient = createTestQueryClient()
        const mockEvent = createMockCachedEvent()

        const { result } = renderHook(
            () => useSetEventCache(),
            { wrapper: createWrapper(queryClient) }
        )

        act(() => {
            result.current(TEST_AUTHOR_ID, TEST_EVENT_ID, mockEvent)
        })

        // Check that data is set in the cache
        const cachedData = queryClient.getQueryData(
            queryKeys.events.detail(TEST_AUTHOR_ID, TEST_EVENT_ID, {})
        )
        expect(cachedData).toEqual(mockEvent)
    })

    it('sets data in both query key formats', () => {
        const queryClient = createTestQueryClient()
        const mockEvent = createMockCachedEvent()

        const { result } = renderHook(
            () => useSetEventCache(),
            { wrapper: createWrapper(queryClient) }
        )

        act(() => {
            result.current(TEST_AUTHOR_ID, TEST_EVENT_ID, mockEvent)
        })

        // Check structured query key
        const structuredData = queryClient.getQueryData(
            queryKeys.events.detail(TEST_AUTHOR_ID, TEST_EVENT_ID, {})
        )
        expect(structuredData).toEqual(mockEvent)

        // Check simple query key (for simpler lookups)
        const simpleData = queryClient.getQueryData(
            ['nexus', 'event', TEST_AUTHOR_ID, TEST_EVENT_ID]
        )
        expect(simpleData).toEqual(mockEvent)
    })

    it('overwrites existing cache data', () => {
        const queryClient = createTestQueryClient()
        const oldEvent = createMockCachedEvent({ details: createMockNexusEvent({ summary: 'Old' }).details })
        const newEvent = createMockCachedEvent({ details: createMockNexusEvent({ summary: 'New' }).details })

        // Pre-populate
        queryClient.setQueryData(
            queryKeys.events.detail(TEST_AUTHOR_ID, TEST_EVENT_ID, {}),
            oldEvent
        )

        const { result } = renderHook(
            () => useSetEventCache(),
            { wrapper: createWrapper(queryClient) }
        )

        act(() => {
            result.current(TEST_AUTHOR_ID, TEST_EVENT_ID, newEvent)
        })

        const cachedData = queryClient.getQueryData<CachedEvent>(
            queryKeys.events.detail(TEST_AUTHOR_ID, TEST_EVENT_ID, {})
        )
        expect(cachedData?.details.summary).toBe('New')
    })

    it('returns stable callback function', () => {
        const queryClient = createTestQueryClient()
        const { result, rerender } = renderHook(
            () => useSetEventCache(),
            { wrapper: createWrapper(queryClient) }
        )

        const firstCallback = result.current
        rerender()
        const secondCallback = result.current

        expect(firstCallback).toBe(secondCallback)
    })
})

// =============================================================================
// Integration Tests
// =============================================================================

describe('Event Hooks Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('prefetch then fetch uses cached data', async () => {
        const mockEvent = createMockNexusEvent()
        mockFetchEventFromNexus.mockResolvedValue(mockEvent)

        const queryClient = createTestQueryClient()
        const wrapper = createWrapper(queryClient)

        // First: prefetch
        const { result: prefetchResult } = renderHook(
            () => usePrefetchEvent(),
            { wrapper }
        )

        act(() => {
            prefetchResult.current(TEST_AUTHOR_ID, TEST_EVENT_ID)
        })

        await waitFor(() => {
            expect(mockFetchEventFromNexus).toHaveBeenCalledTimes(1)
        })

        // Wait for prefetch to complete
        await waitFor(() => {
            const cached = queryClient.getQueryData(
                queryKeys.events.detail(TEST_AUTHOR_ID, TEST_EVENT_ID, {})
            )
            expect(cached).toBeDefined()
        })

        // Second: useEvent should have data (may refetch due to test config)
        const { result: eventResult } = renderHook(
            () => useEvent(TEST_AUTHOR_ID, TEST_EVENT_ID),
            { wrapper }
        )

        // Should have data from cache
        await waitFor(() => {
            expect(eventResult.current.data).toBeDefined()
        })
    })

    it('setCache then useEvent uses cached data', async () => {
        const mockEvent = createMockCachedEvent()

        const queryClient = createTestQueryClient()
        const wrapper = createWrapper(queryClient)

        // First: set cache directly
        const { result: setCacheResult } = renderHook(
            () => useSetEventCache(),
            { wrapper }
        )

        act(() => {
            setCacheResult.current(TEST_AUTHOR_ID, TEST_EVENT_ID, mockEvent)
        })

        // Second: useEvent should have the cached data
        const { result: eventResult } = renderHook(
            () => useEvent(TEST_AUTHOR_ID, TEST_EVENT_ID),
            { wrapper }
        )

        // Data should be available immediately from cache
        expect(eventResult.current.data).toBeDefined()
        expect(eventResult.current.data?.details.summary).toBe('Test Event')
    })
})
