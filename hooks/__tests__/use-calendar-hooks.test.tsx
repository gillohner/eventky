/**
 * Tests for Calendar Hooks
 * 
 * Tests the TanStack Query-based hooks for calendar operations:
 * - useCalendar: Fetch single calendar with optimistic caching
 * - useCalendarsStream: Fetch calendars stream
 * - usePrefetchCalendar: Prefetch calendar data
 * - useInvalidateCalendars: Invalidate calendar queries
 * - useSetCalendarCache: Set calendar data in cache
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import {
    useCalendar,
    useCalendarsStream,
    usePrefetchCalendar,
    useInvalidateCalendars,
    useSetCalendarCache,
} from '../use-calendar-hooks'
import type { NexusCalendarResponse, CachedCalendar, NexusCalendarStreamItem } from '@/types/nexus'

// =============================================================================
// Mock Setup
// =============================================================================

// Mock the nexus module
vi.mock('@/lib/nexus', () => ({
    fetchCalendarFromNexus: vi.fn(),
    fetchCalendarsStream: vi.fn(),
}))

// Mock the cache module - only mock the parts we need to control
vi.mock('@/lib/cache', async () => {
    const actual = await vi.importActual('@/lib/cache')
    return {
        ...actual,
        getPendingCalendar: vi.fn(() => null),
    }
})

// Import mocked modules
import { fetchCalendarFromNexus, fetchCalendarsStream } from '@/lib/nexus'
import { queryKeys } from '@/lib/cache'

// Type the mocks
const mockFetchCalendarFromNexus = fetchCalendarFromNexus as ReturnType<typeof vi.fn>
const mockFetchCalendarsStream = fetchCalendarsStream as ReturnType<typeof vi.fn>

// =============================================================================
// Test Fixtures
// =============================================================================

const TEST_AUTHOR_ID = 'pk:author123'
const TEST_CALENDAR_ID = 'CAL001'
const TEST_TIMESTAMP = 1704067200 // 2024-01-01T00:00:00Z

function createMockNexusCalendar(overrides?: Partial<NexusCalendarResponse['details']>): NexusCalendarResponse {
    return {
        details: {
            id: TEST_CALENDAR_ID,
            uri: `pubky://${TEST_AUTHOR_ID}/pub/pubky.app/calendars/${TEST_CALENDAR_ID}`,
            author: TEST_AUTHOR_ID,
            indexed_at: TEST_TIMESTAMP + 100,
            name: 'Test Calendar',
            timezone: 'America/New_York',
            color: '#3B82F6',
            description: 'Test calendar description',
            url: 'https://example.com/calendar',
            created: TEST_TIMESTAMP,
            sequence: 1,
            last_modified: TEST_TIMESTAMP + 50,
            ...overrides,
        },
        tags: [
            { label: 'personal', taggers: ['user1'], taggers_count: 1, relationship: false }
        ],
        events: [
            `pubky://${TEST_AUTHOR_ID}/pub/pubky.app/events/EVT001`,
            `pubky://${TEST_AUTHOR_ID}/pub/pubky.app/events/EVT002`,
        ],
    }
}

function createMockCachedCalendar(overrides?: Partial<CachedCalendar>): CachedCalendar {
    const nexusCalendar = createMockNexusCalendar()
    return {
        details: nexusCalendar.details,
        tags: nexusCalendar.tags,
        events: nexusCalendar.events,
        _syncMeta: {
            source: 'nexus',
            fetchedAt: Date.now(),
            syncedAt: Date.now(),
        },
        ...overrides,
    }
}

function createMockStreamCalendars(count: number = 3): NexusCalendarStreamItem[] {
    return Array.from({ length: count }, (_, i) => ({
        id: `CAL00${i + 1}`,
        uri: `pubky://${TEST_AUTHOR_ID}/pub/pubky.app/calendars/CAL00${i + 1}`,
        author: TEST_AUTHOR_ID,
        indexed_at: TEST_TIMESTAMP + i * 100,
        name: `Test Calendar ${i + 1}`,
        timezone: 'America/New_York',
        color: i === 0 ? '#3B82F6' : i === 1 ? '#10B981' : '#F59E0B',
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
// useCalendar Tests
// =============================================================================

describe('useCalendar', () => {
    let queryClient: QueryClient

    beforeEach(() => {
        vi.clearAllMocks()
        queryClient = createTestQueryClient()
    })

    describe('basic fetching', () => {
        it('fetches calendar from Nexus successfully', async () => {
            const mockCalendar = createMockNexusCalendar()
            mockFetchCalendarFromNexus.mockResolvedValueOnce(mockCalendar)

            const { result } = renderHook(
                () => useCalendar(TEST_AUTHOR_ID, TEST_CALENDAR_ID),
                { wrapper: createWrapper(queryClient) }
            )

            // Initially loading
            expect(result.current.isLoading).toBe(true)

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false)
            })

            // Data should be loaded
            expect(result.current.data).toBeDefined()
            expect(result.current.data?.details.id).toBe(TEST_CALENDAR_ID)
            expect(result.current.data?.details.name).toBe('Test Calendar')
            expect(result.current.data?.details.timezone).toBe('America/New_York')
            expect(result.current.error).toBeNull()
        })

        it('returns null when calendar not found (404)', async () => {
            mockFetchCalendarFromNexus.mockResolvedValueOnce(null)

            const { result } = renderHook(
                () => useCalendar(TEST_AUTHOR_ID, TEST_CALENDAR_ID),
                { wrapper: createWrapper(queryClient) }
            )

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false)
            })

            expect(result.current.data).toBeNull()
            expect(result.current.error).toBeNull()
        })

        it('calls fetch function with correct params', async () => {
            mockFetchCalendarFromNexus.mockResolvedValueOnce(createMockNexusCalendar())

            renderHook(
                () => useCalendar(TEST_AUTHOR_ID, TEST_CALENDAR_ID),
                { wrapper: createWrapper(queryClient) }
            )

            await waitFor(() => {
                expect(mockFetchCalendarFromNexus).toHaveBeenCalledWith(
                    TEST_AUTHOR_ID,
                    TEST_CALENDAR_ID,
                    undefined,
                    undefined
                )
            })
        })

        it('passes limit options to fetch function', async () => {
            mockFetchCalendarFromNexus.mockResolvedValueOnce(createMockNexusCalendar())

            renderHook(
                () => useCalendar(TEST_AUTHOR_ID, TEST_CALENDAR_ID, {
                    limitTags: 10,
                    limitTaggers: 5,
                }),
                { wrapper: createWrapper(queryClient) }
            )

            await waitFor(() => {
                expect(mockFetchCalendarFromNexus).toHaveBeenCalledWith(
                    TEST_AUTHOR_ID,
                    TEST_CALENDAR_ID,
                    10, // limitTags
                    5   // limitTaggers
                )
            })
        })
    })

    describe('sync status', () => {
        it('returns synced status for Nexus data', async () => {
            mockFetchCalendarFromNexus.mockResolvedValueOnce(createMockNexusCalendar())

            const { result } = renderHook(
                () => useCalendar(TEST_AUTHOR_ID, TEST_CALENDAR_ID),
                { wrapper: createWrapper(queryClient) }
            )

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false)
            })

            expect(result.current.syncStatus).toBe('synced')
            expect(result.current.isOptimistic).toBe(false)
        })
    })

    describe('calendar-specific fields', () => {
        it('includes events array from calendar response', async () => {
            const mockCalendar = createMockNexusCalendar()
            mockFetchCalendarFromNexus.mockResolvedValueOnce(mockCalendar)

            const { result } = renderHook(
                () => useCalendar(TEST_AUTHOR_ID, TEST_CALENDAR_ID),
                { wrapper: createWrapper(queryClient) }
            )

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false)
            })

            expect(result.current.data?.events).toBeDefined()
            expect(result.current.data?.events).toHaveLength(2)
        })

        it('includes color and description fields', async () => {
            const mockCalendar = createMockNexusCalendar({
                color: '#EF4444',
                description: 'Important events',
            })
            mockFetchCalendarFromNexus.mockResolvedValueOnce(mockCalendar)

            const { result } = renderHook(
                () => useCalendar(TEST_AUTHOR_ID, TEST_CALENDAR_ID),
                { wrapper: createWrapper(queryClient) }
            )

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false)
            })

            expect(result.current.data?.details.color).toBe('#EF4444')
            expect(result.current.data?.details.description).toBe('Important events')
        })
    })

    describe('refetch', () => {
        it('provides refetch function', async () => {
            mockFetchCalendarFromNexus.mockResolvedValue(createMockNexusCalendar())

            const { result } = renderHook(
                () => useCalendar(TEST_AUTHOR_ID, TEST_CALENDAR_ID),
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
            expect(mockFetchCalendarFromNexus).toHaveBeenCalledTimes(2)
        })
    })
})

// =============================================================================
// useCalendarsStream Tests
// =============================================================================

describe('useCalendarsStream', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('fetches calendars stream successfully', async () => {
        const mockCalendars = createMockStreamCalendars(3)
        mockFetchCalendarsStream.mockResolvedValueOnce(mockCalendars)

        const queryClient = createTestQueryClient()
        const { result } = renderHook(
            () => useCalendarsStream(),
            { wrapper: createWrapper(queryClient) }
        )

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false)
        })

        expect(result.current.data).toHaveLength(3)
        expect(result.current.data?.[0].name).toBe('Test Calendar 1')
    })

    it('passes params to fetch function', async () => {
        mockFetchCalendarsStream.mockResolvedValueOnce([])

        const queryClient = createTestQueryClient()
        const params = {
            limit: 10,
            skip: 5,
            admin: TEST_AUTHOR_ID,
        }

        renderHook(
            () => useCalendarsStream(params),
            { wrapper: createWrapper(queryClient) }
        )

        await waitFor(() => {
            expect(mockFetchCalendarsStream).toHaveBeenCalledWith(params)
        })
    })

    it('filters by owner', async () => {
        mockFetchCalendarsStream.mockResolvedValueOnce([])

        const queryClient = createTestQueryClient()
        const params = {
            owner: TEST_AUTHOR_ID,
        }

        renderHook(
            () => useCalendarsStream(params),
            { wrapper: createWrapper(queryClient) }
        )

        await waitFor(() => {
            expect(mockFetchCalendarsStream).toHaveBeenCalledWith(params)
        })
    })

    it('returns empty array when no calendars', async () => {
        mockFetchCalendarsStream.mockResolvedValueOnce([])

        const queryClient = createTestQueryClient()
        const { result } = renderHook(
            () => useCalendarsStream(),
            { wrapper: createWrapper(queryClient) }
        )

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false)
        })

        expect(result.current.data).toEqual([])
    })

    it('returns calendars with different timezones', async () => {
        const calendars: NexusCalendarStreamItem[] = [
            { ...createMockStreamCalendars(1)[0], timezone: 'America/New_York' },
            { ...createMockStreamCalendars(1)[0], id: 'CAL002', timezone: 'Europe/London' },
            { ...createMockStreamCalendars(1)[0], id: 'CAL003', timezone: 'Asia/Tokyo' },
        ]
        mockFetchCalendarsStream.mockResolvedValueOnce(calendars)

        const queryClient = createTestQueryClient()
        const { result } = renderHook(
            () => useCalendarsStream(),
            { wrapper: createWrapper(queryClient) }
        )

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false)
        })

        expect(result.current.data?.[0].timezone).toBe('America/New_York')
        expect(result.current.data?.[1].timezone).toBe('Europe/London')
        expect(result.current.data?.[2].timezone).toBe('Asia/Tokyo')
    })
})

// =============================================================================
// usePrefetchCalendar Tests
// =============================================================================

describe('usePrefetchCalendar', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('prefetches calendar data into cache', async () => {
        const mockCalendar = createMockNexusCalendar()
        mockFetchCalendarFromNexus.mockResolvedValueOnce(mockCalendar)

        const queryClient = createTestQueryClient()
        const { result } = renderHook(
            () => usePrefetchCalendar(),
            { wrapper: createWrapper(queryClient) }
        )

        // Trigger prefetch
        act(() => {
            result.current(TEST_AUTHOR_ID, TEST_CALENDAR_ID)
        })

        await waitFor(() => {
            expect(mockFetchCalendarFromNexus).toHaveBeenCalledWith(
                TEST_AUTHOR_ID,
                TEST_CALENDAR_ID,
                undefined,
                undefined
            )
        })

        // Verify data is in cache
        await waitFor(() => {
            const cachedData = queryClient.getQueryData(
                queryKeys.calendars.detail(TEST_AUTHOR_ID, TEST_CALENDAR_ID, {})
            )
            expect(cachedData).toBeDefined()
        })
    })

    it('prefetches with limit options', async () => {
        mockFetchCalendarFromNexus.mockResolvedValueOnce(createMockNexusCalendar())

        const queryClient = createTestQueryClient()
        const { result } = renderHook(
            () => usePrefetchCalendar(),
            { wrapper: createWrapper(queryClient) }
        )

        act(() => {
            result.current(TEST_AUTHOR_ID, TEST_CALENDAR_ID, {
                limitTags: 5,
                limitTaggers: 3,
            })
        })

        await waitFor(() => {
            expect(mockFetchCalendarFromNexus).toHaveBeenCalledWith(
                TEST_AUTHOR_ID,
                TEST_CALENDAR_ID,
                5, // limitTags
                3  // limitTaggers
            )
        })
    })

    it('returns stable callback function', () => {
        const queryClient = createTestQueryClient()
        const { result, rerender } = renderHook(
            () => usePrefetchCalendar(),
            { wrapper: createWrapper(queryClient) }
        )

        const firstCallback = result.current
        rerender()
        const secondCallback = result.current

        expect(firstCallback).toBe(secondCallback)
    })
})

// =============================================================================
// useInvalidateCalendars Tests
// =============================================================================

describe('useInvalidateCalendars', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('invalidates specific calendar by authorId and calendarId', async () => {
        const queryClient = createTestQueryClient()
        const mockCalendar = createMockCachedCalendar()

        // Pre-populate cache
        queryClient.setQueryData(['nexus', 'calendar', TEST_AUTHOR_ID, TEST_CALENDAR_ID], mockCalendar)

        const { result } = renderHook(
            () => useInvalidateCalendars(),
            { wrapper: createWrapper(queryClient) }
        )

        await act(async () => {
            await result.current(TEST_AUTHOR_ID, TEST_CALENDAR_ID)
        })

        // Query should be invalidated (marked as stale)
        const queryState = queryClient.getQueryState(['nexus', 'calendar', TEST_AUTHOR_ID, TEST_CALENDAR_ID])
        expect(queryState?.isInvalidated).toBe(true)
    })

    it('returns stable callback function', () => {
        const queryClient = createTestQueryClient()
        const { result, rerender } = renderHook(
            () => useInvalidateCalendars(),
            { wrapper: createWrapper(queryClient) }
        )

        const firstCallback = result.current
        rerender()
        const secondCallback = result.current

        expect(firstCallback).toBe(secondCallback)
    })
})

// =============================================================================
// useSetCalendarCache Tests
// =============================================================================

describe('useSetCalendarCache', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('sets calendar data in cache', () => {
        const queryClient = createTestQueryClient()
        const mockCalendar = createMockCachedCalendar()

        const { result } = renderHook(
            () => useSetCalendarCache(),
            { wrapper: createWrapper(queryClient) }
        )

        act(() => {
            result.current(TEST_AUTHOR_ID, TEST_CALENDAR_ID, mockCalendar)
        })

        // Check that data is set in the cache
        const cachedData = queryClient.getQueryData(
            queryKeys.calendars.detail(TEST_AUTHOR_ID, TEST_CALENDAR_ID, {})
        )
        expect(cachedData).toEqual(mockCalendar)
    })

    it('sets data in both query key formats', () => {
        const queryClient = createTestQueryClient()
        const mockCalendar = createMockCachedCalendar()

        const { result } = renderHook(
            () => useSetCalendarCache(),
            { wrapper: createWrapper(queryClient) }
        )

        act(() => {
            result.current(TEST_AUTHOR_ID, TEST_CALENDAR_ID, mockCalendar)
        })

        // Check structured query key
        const structuredData = queryClient.getQueryData(
            queryKeys.calendars.detail(TEST_AUTHOR_ID, TEST_CALENDAR_ID, {})
        )
        expect(structuredData).toEqual(mockCalendar)

        // Check simple query key (for simpler lookups)
        const simpleData = queryClient.getQueryData(
            ['nexus', 'calendar', TEST_AUTHOR_ID, TEST_CALENDAR_ID]
        )
        expect(simpleData).toEqual(mockCalendar)
    })

    it('overwrites existing cache data', () => {
        const queryClient = createTestQueryClient()
        const oldCalendar = createMockCachedCalendar({
            details: createMockNexusCalendar({ name: 'Old' }).details
        })
        const newCalendar = createMockCachedCalendar({
            details: createMockNexusCalendar({ name: 'New' }).details
        })

        // Pre-populate
        queryClient.setQueryData(
            queryKeys.calendars.detail(TEST_AUTHOR_ID, TEST_CALENDAR_ID, {}),
            oldCalendar
        )

        const { result } = renderHook(
            () => useSetCalendarCache(),
            { wrapper: createWrapper(queryClient) }
        )

        act(() => {
            result.current(TEST_AUTHOR_ID, TEST_CALENDAR_ID, newCalendar)
        })

        const cachedData = queryClient.getQueryData<CachedCalendar>(
            queryKeys.calendars.detail(TEST_AUTHOR_ID, TEST_CALENDAR_ID, {})
        )
        expect(cachedData?.details.name).toBe('New')
    })

    it('preserves events array when setting cache', () => {
        const queryClient = createTestQueryClient()
        const mockCalendar = createMockCachedCalendar()

        const { result } = renderHook(
            () => useSetCalendarCache(),
            { wrapper: createWrapper(queryClient) }
        )

        act(() => {
            result.current(TEST_AUTHOR_ID, TEST_CALENDAR_ID, mockCalendar)
        })

        const cachedData = queryClient.getQueryData<CachedCalendar>(
            queryKeys.calendars.detail(TEST_AUTHOR_ID, TEST_CALENDAR_ID, {})
        )
        expect(cachedData?.events).toHaveLength(2)
    })

    it('returns stable callback function', () => {
        const queryClient = createTestQueryClient()
        const { result, rerender } = renderHook(
            () => useSetCalendarCache(),
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

describe('Calendar Hooks Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('prefetch then fetch uses cached data', async () => {
        const mockCalendar = createMockNexusCalendar()
        mockFetchCalendarFromNexus.mockResolvedValue(mockCalendar)

        const queryClient = createTestQueryClient()
        const wrapper = createWrapper(queryClient)

        // First: prefetch
        const { result: prefetchResult } = renderHook(
            () => usePrefetchCalendar(),
            { wrapper }
        )

        act(() => {
            prefetchResult.current(TEST_AUTHOR_ID, TEST_CALENDAR_ID)
        })

        await waitFor(() => {
            expect(mockFetchCalendarFromNexus).toHaveBeenCalledTimes(1)
        })

        // Wait for prefetch to complete
        await waitFor(() => {
            const cached = queryClient.getQueryData(
                queryKeys.calendars.detail(TEST_AUTHOR_ID, TEST_CALENDAR_ID, {})
            )
            expect(cached).toBeDefined()
        })

        // Second: useCalendar should have data
        const { result: calendarResult } = renderHook(
            () => useCalendar(TEST_AUTHOR_ID, TEST_CALENDAR_ID),
            { wrapper }
        )

        // Should have data from cache
        await waitFor(() => {
            expect(calendarResult.current.data).toBeDefined()
        })
    })

    it('setCache then useCalendar uses cached data', async () => {
        const mockCalendar = createMockCachedCalendar()

        const queryClient = createTestQueryClient()
        const wrapper = createWrapper(queryClient)

        // First: set cache directly
        const { result: setCacheResult } = renderHook(
            () => useSetCalendarCache(),
            { wrapper }
        )

        act(() => {
            setCacheResult.current(TEST_AUTHOR_ID, TEST_CALENDAR_ID, mockCalendar)
        })

        // Second: useCalendar should have the cached data
        const { result: calendarResult } = renderHook(
            () => useCalendar(TEST_AUTHOR_ID, TEST_CALENDAR_ID),
            { wrapper }
        )

        // Data should be available immediately from cache
        expect(calendarResult.current.data).toBeDefined()
        expect(calendarResult.current.data?.details.name).toBe('Test Calendar')
    })

    it('multiple calendars can be cached independently', () => {
        const queryClient = createTestQueryClient()
        const calendar1 = createMockCachedCalendar({
            details: createMockNexusCalendar({ id: 'CAL001', name: 'Calendar 1' }).details
        })
        const calendar2 = createMockCachedCalendar({
            details: createMockNexusCalendar({ id: 'CAL002', name: 'Calendar 2' }).details
        })

        const wrapper = createWrapper(queryClient)
        const { result } = renderHook(
            () => useSetCalendarCache(),
            { wrapper }
        )

        act(() => {
            result.current(TEST_AUTHOR_ID, 'CAL001', calendar1)
            result.current(TEST_AUTHOR_ID, 'CAL002', calendar2)
        })

        const cached1 = queryClient.getQueryData<CachedCalendar>(
            queryKeys.calendars.detail(TEST_AUTHOR_ID, 'CAL001', {})
        )
        const cached2 = queryClient.getQueryData<CachedCalendar>(
            queryKeys.calendars.detail(TEST_AUTHOR_ID, 'CAL002', {})
        )

        expect(cached1?.details.name).toBe('Calendar 1')
        expect(cached2?.details.name).toBe('Calendar 2')
    })
})
