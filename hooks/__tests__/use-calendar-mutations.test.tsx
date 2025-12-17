/**
 * Tests for Calendar Mutation Hooks
 * 
 * Tests the TanStack Query-based mutation hooks for calendar operations:
 * - useCreateCalendar: Create calendar with optimistic updates
 * - useUpdateCalendar: Update calendar with optimistic updates
 * - useDeleteCalendar: Delete calendar with rollback support
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import {
    useCreateCalendar,
    useUpdateCalendar,
    useDeleteCalendar,
} from '../use-calendar-mutations'
import type { CachedCalendar } from '@/types/nexus'

// Mock PubkyAppCalendar type - the real one is a WASM class with methods
type MockPubkyAppCalendar = {
    name: string
    description?: string
    color?: string
    sequence?: number
    created?: number
    last_modified?: number
}

// Helper to cast mock calendar to expected type for mutation calls
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const asCalendar = (calendar: MockPubkyAppCalendar): any => calendar

// =============================================================================
// Mock Setup
// =============================================================================

// Mock the auth provider
const mockAuth = vi.fn()
vi.mock('@/components/providers/auth-provider', () => ({
    useAuth: () => mockAuth(),
}))

// Mock the pubky calendars module
vi.mock('@/lib/pubky/calendars', () => ({
    saveCalendar: vi.fn(),
    deleteCalendar: vi.fn(),
}))

// Mock the nexus ingest module
vi.mock('@/lib/nexus/ingest', () => ({
    ingestUserIntoNexus: vi.fn(),
}))

// Mock sonner toast
vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}))

// Mock cache module - keep real implementations for query keys
vi.mock('@/lib/cache', async () => {
    const actual = await vi.importActual('@/lib/cache')
    return {
        ...actual,
        setPendingCalendar: vi.fn(),
        clearPendingCalendar: vi.fn(),
    }
})

// Import mocked modules
import { saveCalendar, deleteCalendar } from '@/lib/pubky/calendars'
import { ingestUserIntoNexus } from '@/lib/nexus/ingest'
import { toast } from 'sonner'
import { queryKeys, setPendingCalendar, clearPendingCalendar } from '@/lib/cache'

// Type the mocks
const mockSaveCalendar = saveCalendar as ReturnType<typeof vi.fn>
const mockDeleteCalendar = deleteCalendar as ReturnType<typeof vi.fn>
const mockIngestUserIntoNexus = ingestUserIntoNexus as ReturnType<typeof vi.fn>
const mockToastSuccess = toast.success as ReturnType<typeof vi.fn>
const mockToastError = toast.error as ReturnType<typeof vi.fn>
const mockSetPendingCalendar = setPendingCalendar as ReturnType<typeof vi.fn>
const mockClearPendingCalendar = clearPendingCalendar as ReturnType<typeof vi.fn>

// =============================================================================
// Test Fixtures
// =============================================================================

const TEST_AUTHOR_ID = 'pk:author123'
const TEST_CALENDAR_ID = 'CAL001'
const TEST_SESSION = { id: 'session-123', token: 'test-token' }
const TEST_TIMESTAMP = 1704067200 // 2024-01-01T00:00:00Z

function createMockPubkyAppCalendar(): MockPubkyAppCalendar {
    return {
        name: 'Test Calendar',
        description: 'Test calendar description',
        color: '#3B82F6',
        sequence: 1,
        created: TEST_TIMESTAMP,
        last_modified: TEST_TIMESTAMP + 50,
    }
}

function createMockCachedCalendar(): CachedCalendar {
    return {
        details: {
            id: TEST_CALENDAR_ID,
            uri: `pubky://${TEST_AUTHOR_ID}/pub/pubky.app/calendars/${TEST_CALENDAR_ID}`,
            author: TEST_AUTHOR_ID,
            indexed_at: TEST_TIMESTAMP + 100,
            name: 'Test Calendar',
            timezone: 'America/New_York',
            description: 'Test calendar description',
            color: '#3B82F6',
            sequence: 1,
            created: TEST_TIMESTAMP,
            last_modified: TEST_TIMESTAMP + 50,
        },
        tags: [],
        events: [],
    }
}

// =============================================================================
// Test Wrapper
// =============================================================================

let queryClient: QueryClient

function createWrapper() {
    queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
                staleTime: Infinity,
            },
            mutations: {
                retry: false,
            },
        },
    })

    return function Wrapper({ children }: { children: ReactNode }) {
        return (
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        )
    }
}

// =============================================================================
// Tests: useCreateCalendar
// =============================================================================

describe('useCreateCalendar', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockAuth.mockReturnValue({
            auth: {
                session: TEST_SESSION,
                publicKey: TEST_AUTHOR_ID,
            },
        })
    })

    it('should successfully create a calendar', async () => {
        mockSaveCalendar.mockResolvedValueOnce(undefined)
        mockIngestUserIntoNexus.mockResolvedValueOnce(undefined)

        const { result } = renderHook(() => useCreateCalendar(), {
            wrapper: createWrapper(),
        })

        const mockCalendar = createMockPubkyAppCalendar()

        await act(async () => {
            result.current.mutate({ calendar: asCalendar(mockCalendar), calendarId: TEST_CALENDAR_ID })
        })

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true)
        })

        expect(mockSaveCalendar).toHaveBeenCalledWith(
            TEST_SESSION,
            mockCalendar,
            TEST_CALENDAR_ID,
            TEST_AUTHOR_ID
        )
        expect(mockToastSuccess).toHaveBeenCalledWith('Calendar created successfully!')
        expect(mockIngestUserIntoNexus).toHaveBeenCalledWith(TEST_AUTHOR_ID)
    })

    it('should return correct result on success', async () => {
        mockSaveCalendar.mockResolvedValueOnce(undefined)
        mockIngestUserIntoNexus.mockResolvedValueOnce(undefined)

        const { result } = renderHook(() => useCreateCalendar(), {
            wrapper: createWrapper(),
        })

        const mockCalendar = createMockPubkyAppCalendar()

        await act(async () => {
            result.current.mutate({ calendar: asCalendar(mockCalendar), calendarId: TEST_CALENDAR_ID })
        })

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true)
        })

        expect(result.current.data).toEqual({
            calendarId: TEST_CALENDAR_ID,
            authorId: TEST_AUTHOR_ID,
        })
    })

    it('should call onSuccess callback when provided', async () => {
        mockSaveCalendar.mockResolvedValueOnce(undefined)
        mockIngestUserIntoNexus.mockResolvedValueOnce(undefined)

        const onSuccess = vi.fn()

        const { result } = renderHook(() => useCreateCalendar({ onSuccess }), {
            wrapper: createWrapper(),
        })

        const mockCalendar = createMockPubkyAppCalendar()

        await act(async () => {
            result.current.mutate({ calendar: asCalendar(mockCalendar), calendarId: TEST_CALENDAR_ID })
        })

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true)
        })

        expect(onSuccess).toHaveBeenCalledWith({
            calendarId: TEST_CALENDAR_ID,
            authorId: TEST_AUTHOR_ID,
        })
    })

    it('should set pending calendar during optimistic update', async () => {
        mockSaveCalendar.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

        const { result } = renderHook(() => useCreateCalendar(), {
            wrapper: createWrapper(),
        })

        const mockCalendar = createMockPubkyAppCalendar()

        await act(async () => {
            result.current.mutate({ calendar: asCalendar(mockCalendar), calendarId: TEST_CALENDAR_ID })
        })

        // Check pending calendar was set
        expect(mockSetPendingCalendar).toHaveBeenCalledWith(
            TEST_AUTHOR_ID,
            TEST_CALENDAR_ID,
            expect.objectContaining({
                details: expect.objectContaining({
                    id: TEST_CALENDAR_ID,
                    author: TEST_AUTHOR_ID,
                }),
            }),
            expect.any(Number)
        )
    })

    it('should throw error when not authenticated', async () => {
        mockAuth.mockReturnValue({ auth: null })

        const { result } = renderHook(() => useCreateCalendar(), {
            wrapper: createWrapper(),
        })

        const mockCalendar = createMockPubkyAppCalendar()

        await act(async () => {
            result.current.mutate({ calendar: asCalendar(mockCalendar), calendarId: TEST_CALENDAR_ID })
        })

        await waitFor(() => {
            expect(result.current.isError).toBe(true)
        })

        expect(result.current.error?.message).toContain('Authentication required')
    })

    it('should show error toast on failure', async () => {
        const testError = new Error('Network error')
        mockSaveCalendar.mockRejectedValueOnce(testError)

        const { result } = renderHook(() => useCreateCalendar(), {
            wrapper: createWrapper(),
        })

        const mockCalendar = createMockPubkyAppCalendar()

        await act(async () => {
            result.current.mutate({ calendar: asCalendar(mockCalendar), calendarId: TEST_CALENDAR_ID })
        })

        await waitFor(() => {
            expect(result.current.isError).toBe(true)
        })

        expect(mockToastError).toHaveBeenCalledWith('Failed to create calendar: Network error')
    })

    it('should clear pending calendar on error', async () => {
        mockSaveCalendar.mockRejectedValueOnce(new Error('Network error'))

        const { result } = renderHook(() => useCreateCalendar(), {
            wrapper: createWrapper(),
        })

        const mockCalendar = createMockPubkyAppCalendar()

        await act(async () => {
            result.current.mutate({ calendar: asCalendar(mockCalendar), calendarId: TEST_CALENDAR_ID })
        })

        await waitFor(() => {
            expect(result.current.isError).toBe(true)
        })

        expect(mockClearPendingCalendar).toHaveBeenCalledWith(TEST_AUTHOR_ID, TEST_CALENDAR_ID)
    })

    it('should call onError callback when provided', async () => {
        const testError = new Error('Network error')
        mockSaveCalendar.mockRejectedValueOnce(testError)

        const onError = vi.fn()

        const { result } = renderHook(() => useCreateCalendar({ onError }), {
            wrapper: createWrapper(),
        })

        const mockCalendar = createMockPubkyAppCalendar()

        await act(async () => {
            result.current.mutate({ calendar: asCalendar(mockCalendar), calendarId: TEST_CALENDAR_ID })
        })

        await waitFor(() => {
            expect(result.current.isError).toBe(true)
        })

        expect(onError).toHaveBeenCalledWith(testError)
    })

    it('should not show toast when showToasts is false', async () => {
        mockSaveCalendar.mockResolvedValueOnce(undefined)
        mockIngestUserIntoNexus.mockResolvedValueOnce(undefined)

        const { result } = renderHook(() => useCreateCalendar({ showToasts: false }), {
            wrapper: createWrapper(),
        })

        const mockCalendar = createMockPubkyAppCalendar()

        await act(async () => {
            result.current.mutate({ calendar: asCalendar(mockCalendar), calendarId: TEST_CALENDAR_ID })
        })

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true)
        })

        expect(mockToastSuccess).not.toHaveBeenCalled()
    })
})

// =============================================================================
// Tests: useUpdateCalendar
// =============================================================================

describe('useUpdateCalendar', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockAuth.mockReturnValue({
            auth: {
                session: TEST_SESSION,
                publicKey: TEST_AUTHOR_ID,
            },
        })
    })

    it('should successfully update a calendar', async () => {
        mockSaveCalendar.mockResolvedValueOnce(undefined)
        mockIngestUserIntoNexus.mockResolvedValueOnce(undefined)

        const { result } = renderHook(() => useUpdateCalendar(), {
            wrapper: createWrapper(),
        })

        const mockCalendar = createMockPubkyAppCalendar()

        await act(async () => {
            result.current.mutate({ calendar: asCalendar(mockCalendar), calendarId: TEST_CALENDAR_ID })
        })

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true)
        })

        expect(mockSaveCalendar).toHaveBeenCalledWith(
            TEST_SESSION,
            mockCalendar,
            TEST_CALENDAR_ID,
            TEST_AUTHOR_ID
        )
        expect(mockToastSuccess).toHaveBeenCalledWith('Calendar updated successfully!')
    })

    it('should return correct result on update success', async () => {
        mockSaveCalendar.mockResolvedValueOnce(undefined)
        mockIngestUserIntoNexus.mockResolvedValueOnce(undefined)

        const { result } = renderHook(() => useUpdateCalendar(), {
            wrapper: createWrapper(),
        })

        const mockCalendar = createMockPubkyAppCalendar()

        await act(async () => {
            result.current.mutate({ calendar: asCalendar(mockCalendar), calendarId: TEST_CALENDAR_ID })
        })

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true)
        })

        expect(result.current.data).toEqual({
            calendarId: TEST_CALENDAR_ID,
            authorId: TEST_AUTHOR_ID,
        })
    })

    it('should call onSuccess callback when provided', async () => {
        mockSaveCalendar.mockResolvedValueOnce(undefined)
        mockIngestUserIntoNexus.mockResolvedValueOnce(undefined)

        const onSuccess = vi.fn()

        const { result } = renderHook(() => useUpdateCalendar({ onSuccess }), {
            wrapper: createWrapper(),
        })

        const mockCalendar = createMockPubkyAppCalendar()

        await act(async () => {
            result.current.mutate({ calendar: asCalendar(mockCalendar), calendarId: TEST_CALENDAR_ID })
        })

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true)
        })

        expect(onSuccess).toHaveBeenCalledWith({
            calendarId: TEST_CALENDAR_ID,
            authorId: TEST_AUTHOR_ID,
        })
    })

    it('should throw error when not authenticated', async () => {
        mockAuth.mockReturnValue({ auth: null })

        const { result } = renderHook(() => useUpdateCalendar(), {
            wrapper: createWrapper(),
        })

        const mockCalendar = createMockPubkyAppCalendar()

        await act(async () => {
            result.current.mutate({ calendar: asCalendar(mockCalendar), calendarId: TEST_CALENDAR_ID })
        })

        await waitFor(() => {
            expect(result.current.isError).toBe(true)
        })

        expect(result.current.error?.message).toContain('Authentication required')
    })

    it('should show error toast on update failure', async () => {
        const testError = new Error('Update failed')
        mockSaveCalendar.mockRejectedValueOnce(testError)

        const { result } = renderHook(() => useUpdateCalendar(), {
            wrapper: createWrapper(),
        })

        const mockCalendar = createMockPubkyAppCalendar()

        await act(async () => {
            result.current.mutate({ calendar: asCalendar(mockCalendar), calendarId: TEST_CALENDAR_ID })
        })

        await waitFor(() => {
            expect(result.current.isError).toBe(true)
        })

        expect(mockToastError).toHaveBeenCalledWith('Failed to update calendar: Update failed')
    })

    it('should clear pending calendar on update error', async () => {
        mockSaveCalendar.mockRejectedValueOnce(new Error('Update failed'))

        const { result } = renderHook(() => useUpdateCalendar(), {
            wrapper: createWrapper(),
        })

        const mockCalendar = createMockPubkyAppCalendar()

        await act(async () => {
            result.current.mutate({ calendar: asCalendar(mockCalendar), calendarId: TEST_CALENDAR_ID })
        })

        await waitFor(() => {
            expect(result.current.isError).toBe(true)
        })

        expect(mockClearPendingCalendar).toHaveBeenCalledWith(TEST_AUTHOR_ID, TEST_CALENDAR_ID)
    })

    it('should set pending calendar during update', async () => {
        mockSaveCalendar.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

        const { result } = renderHook(() => useUpdateCalendar(), {
            wrapper: createWrapper(),
        })

        const mockCalendar = createMockPubkyAppCalendar()

        await act(async () => {
            result.current.mutate({ calendar: asCalendar(mockCalendar), calendarId: TEST_CALENDAR_ID })
        })

        expect(mockSetPendingCalendar).toHaveBeenCalledWith(
            TEST_AUTHOR_ID,
            TEST_CALENDAR_ID,
            expect.objectContaining({
                details: expect.objectContaining({
                    id: TEST_CALENDAR_ID,
                    author: TEST_AUTHOR_ID,
                }),
            }),
            expect.any(Number)
        )
    })

    it('should trigger Nexus ingest after successful update', async () => {
        mockSaveCalendar.mockResolvedValueOnce(undefined)
        mockIngestUserIntoNexus.mockResolvedValueOnce(undefined)

        const { result } = renderHook(() => useUpdateCalendar(), {
            wrapper: createWrapper(),
        })

        const mockCalendar = createMockPubkyAppCalendar()

        await act(async () => {
            result.current.mutate({ calendar: asCalendar(mockCalendar), calendarId: TEST_CALENDAR_ID })
        })

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true)
        })

        expect(mockIngestUserIntoNexus).toHaveBeenCalledWith(TEST_AUTHOR_ID)
    })
})

// =============================================================================
// Tests: useDeleteCalendar
// =============================================================================

describe('useDeleteCalendar', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockAuth.mockReturnValue({
            auth: {
                session: TEST_SESSION,
                publicKey: TEST_AUTHOR_ID,
            },
        })
    })

    it('should successfully delete a calendar', async () => {
        mockDeleteCalendar.mockResolvedValueOnce(undefined)
        mockIngestUserIntoNexus.mockResolvedValueOnce(undefined)

        const { result } = renderHook(() => useDeleteCalendar(), {
            wrapper: createWrapper(),
        })

        await act(async () => {
            result.current.mutate({ calendarId: TEST_CALENDAR_ID })
        })

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true)
        })

        expect(mockDeleteCalendar).toHaveBeenCalledWith(
            TEST_SESSION,
            TEST_CALENDAR_ID,
            TEST_AUTHOR_ID
        )
        expect(mockToastSuccess).toHaveBeenCalledWith('Calendar deleted successfully!')
    })

    it('should call onSuccess callback when provided', async () => {
        mockDeleteCalendar.mockResolvedValueOnce(undefined)
        mockIngestUserIntoNexus.mockResolvedValueOnce(undefined)

        const onSuccess = vi.fn()

        const { result } = renderHook(() => useDeleteCalendar({ onSuccess }), {
            wrapper: createWrapper(),
        })

        await act(async () => {
            result.current.mutate({ calendarId: TEST_CALENDAR_ID })
        })

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true)
        })

        expect(onSuccess).toHaveBeenCalled()
    })

    it('should throw error when not authenticated', async () => {
        mockAuth.mockReturnValue({ auth: null })

        const { result } = renderHook(() => useDeleteCalendar(), {
            wrapper: createWrapper(),
        })

        await act(async () => {
            result.current.mutate({ calendarId: TEST_CALENDAR_ID })
        })

        await waitFor(() => {
            expect(result.current.isError).toBe(true)
        })

        expect(result.current.error?.message).toContain('Authentication required')
    })

    it('should show error toast on delete failure', async () => {
        const testError = new Error('Delete failed')
        mockDeleteCalendar.mockRejectedValueOnce(testError)

        const { result } = renderHook(() => useDeleteCalendar(), {
            wrapper: createWrapper(),
        })

        await act(async () => {
            result.current.mutate({ calendarId: TEST_CALENDAR_ID })
        })

        await waitFor(() => {
            expect(result.current.isError).toBe(true)
        })

        expect(mockToastError).toHaveBeenCalledWith('Failed to delete calendar: Delete failed')
    })

    it('should call onError callback when provided', async () => {
        const testError = new Error('Delete failed')
        mockDeleteCalendar.mockRejectedValueOnce(testError)

        const onError = vi.fn()

        const { result } = renderHook(() => useDeleteCalendar({ onError }), {
            wrapper: createWrapper(),
        })

        await act(async () => {
            result.current.mutate({ calendarId: TEST_CALENDAR_ID })
        })

        await waitFor(() => {
            expect(result.current.isError).toBe(true)
        })

        expect(onError).toHaveBeenCalledWith(testError)
    })

    it('should trigger Nexus ingest after successful deletion', async () => {
        mockDeleteCalendar.mockResolvedValueOnce(undefined)
        mockIngestUserIntoNexus.mockResolvedValueOnce(undefined)

        const { result } = renderHook(() => useDeleteCalendar(), {
            wrapper: createWrapper(),
        })

        await act(async () => {
            result.current.mutate({ calendarId: TEST_CALENDAR_ID })
        })

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true)
        })

        expect(mockIngestUserIntoNexus).toHaveBeenCalledWith(TEST_AUTHOR_ID)
    })

    it('should not show toast when showToasts is false', async () => {
        mockDeleteCalendar.mockResolvedValueOnce(undefined)
        mockIngestUserIntoNexus.mockResolvedValueOnce(undefined)

        const { result } = renderHook(() => useDeleteCalendar({ showToasts: false }), {
            wrapper: createWrapper(),
        })

        await act(async () => {
            result.current.mutate({ calendarId: TEST_CALENDAR_ID })
        })

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true)
        })

        expect(mockToastSuccess).not.toHaveBeenCalled()
    })

    it('should optimistically remove from cache', async () => {
        mockDeleteCalendar.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

        const wrapper = createWrapper()
        const cachedCalendar = createMockCachedCalendar()

        // Pre-populate cache
        const calendarKey = queryKeys.calendars.detail(TEST_AUTHOR_ID, TEST_CALENDAR_ID, {})
        queryClient.setQueryData(calendarKey, cachedCalendar)

        const { result } = renderHook(() => useDeleteCalendar(), { wrapper })

        await act(async () => {
            result.current.mutate({ calendarId: TEST_CALENDAR_ID })
        })

        // Cache should be cleared immediately (optimistic)
        await waitFor(() => {
            const currentData = queryClient.getQueryData(calendarKey)
            expect(currentData).toBeUndefined()
        })
    })

    it('should rollback cache on delete failure', async () => {
        mockDeleteCalendar.mockRejectedValueOnce(new Error('Delete failed'))

        const wrapper = createWrapper()
        const cachedCalendar = createMockCachedCalendar()

        // Pre-populate cache
        const calendarKey = queryKeys.calendars.detail(TEST_AUTHOR_ID, TEST_CALENDAR_ID, {})
        queryClient.setQueryData(calendarKey, cachedCalendar)

        const { result } = renderHook(() => useDeleteCalendar(), { wrapper })

        await act(async () => {
            result.current.mutate({ calendarId: TEST_CALENDAR_ID })
        })

        await waitFor(() => {
            expect(result.current.isError).toBe(true)
        })

        // Cache should be restored on rollback
        const restoredData = queryClient.getQueryData(calendarKey)
        expect(restoredData).toEqual(cachedCalendar)
    })
})

// =============================================================================
// Tests: Cache Invalidation
// =============================================================================

describe('Cache Invalidation', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockAuth.mockReturnValue({
            auth: {
                session: TEST_SESSION,
                publicKey: TEST_AUTHOR_ID,
            },
        })
    })

    it('should invalidate calendars queries after create', async () => {
        mockSaveCalendar.mockResolvedValueOnce(undefined)
        mockIngestUserIntoNexus.mockResolvedValueOnce(undefined)

        const wrapper = createWrapper()

        // Set up spy on invalidateQueries
        const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

        const { result } = renderHook(() => useCreateCalendar(), { wrapper })

        const mockCalendar = createMockPubkyAppCalendar()

        await act(async () => {
            result.current.mutate({ calendar: asCalendar(mockCalendar), calendarId: TEST_CALENDAR_ID })
        })

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true)
        })

        expect(invalidateSpy).toHaveBeenCalledWith({
            queryKey: queryKeys.calendars.all,
        })
    })

    it('should invalidate calendars queries after update', async () => {
        mockSaveCalendar.mockResolvedValueOnce(undefined)
        mockIngestUserIntoNexus.mockResolvedValueOnce(undefined)

        const wrapper = createWrapper()

        const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

        const { result } = renderHook(() => useUpdateCalendar(), { wrapper })

        const mockCalendar = createMockPubkyAppCalendar()

        await act(async () => {
            result.current.mutate({ calendar: asCalendar(mockCalendar), calendarId: TEST_CALENDAR_ID })
        })

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true)
        })

        expect(invalidateSpy).toHaveBeenCalledWith({
            queryKey: queryKeys.calendars.all,
        })
    })

    it('should invalidate calendars queries after delete', async () => {
        mockDeleteCalendar.mockResolvedValueOnce(undefined)
        mockIngestUserIntoNexus.mockResolvedValueOnce(undefined)

        const wrapper = createWrapper()

        const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

        const { result } = renderHook(() => useDeleteCalendar(), { wrapper })

        await act(async () => {
            result.current.mutate({ calendarId: TEST_CALENDAR_ID })
        })

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true)
        })

        expect(invalidateSpy).toHaveBeenCalledWith({
            queryKey: queryKeys.calendars.all,
        })
    })
})

// =============================================================================
// Tests: Optimistic Updates
// =============================================================================

describe('Optimistic Updates', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockAuth.mockReturnValue({
            auth: {
                session: TEST_SESSION,
                publicKey: TEST_AUTHOR_ID,
            },
        })
    })

    it('should optimistically add calendar to cache on create', async () => {
        // Delay the server response so we can check optimistic update
        mockSaveCalendar.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

        const wrapper = createWrapper()
        const { result } = renderHook(() => useCreateCalendar(), { wrapper })

        const mockCalendar = createMockPubkyAppCalendar()

        await act(async () => {
            result.current.mutate({ calendar: asCalendar(mockCalendar), calendarId: TEST_CALENDAR_ID })
        })

        // Check optimistic data is in cache
        const calendarKey = queryKeys.calendars.detail(TEST_AUTHOR_ID, TEST_CALENDAR_ID, {})

        await waitFor(() => {
            const cachedData = queryClient.getQueryData<CachedCalendar>(calendarKey)
            expect(cachedData).toBeDefined()
            expect(cachedData?.details.id).toBe(TEST_CALENDAR_ID)
            expect(cachedData?.details.name).toBe('Test Calendar')
        })
    })

    it('should optimistically update calendar in cache', async () => {
        mockSaveCalendar.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

        const wrapper = createWrapper()
        const initialCalendar = createMockCachedCalendar()

        // Pre-populate cache
        const calendarKey = queryKeys.calendars.detail(TEST_AUTHOR_ID, TEST_CALENDAR_ID, {})
        queryClient.setQueryData(calendarKey, initialCalendar)

        const { result } = renderHook(() => useUpdateCalendar(), { wrapper })

        const updatedCalendar = {
            ...createMockPubkyAppCalendar(),
            name: 'Updated Calendar Name',
        }

        await act(async () => {
            result.current.mutate({ calendar: asCalendar(updatedCalendar), calendarId: TEST_CALENDAR_ID })
        })

        // Check optimistic update happened
        await waitFor(() => {
            const cachedData = queryClient.getQueryData<CachedCalendar>(calendarKey)
            expect(cachedData?.details.name).toBe('Updated Calendar Name')
        })
    })

    it('should rollback on create failure', async () => {
        mockSaveCalendar.mockRejectedValueOnce(new Error('Network error'))

        const wrapper = createWrapper()
        const { result } = renderHook(() => useCreateCalendar(), { wrapper })

        const mockCalendar = createMockPubkyAppCalendar()

        await act(async () => {
            result.current.mutate({ calendar: asCalendar(mockCalendar), calendarId: TEST_CALENDAR_ID })
        })

        await waitFor(() => {
            expect(result.current.isError).toBe(true)
        })

        // Pending calendar should be cleared
        expect(mockClearPendingCalendar).toHaveBeenCalledWith(TEST_AUTHOR_ID, TEST_CALENDAR_ID)
    })

    it('should rollback on update failure', async () => {
        mockSaveCalendar.mockRejectedValueOnce(new Error('Network error'))

        const wrapper = createWrapper()
        const initialCalendar = createMockCachedCalendar()

        // Pre-populate cache
        const calendarKey = queryKeys.calendars.detail(TEST_AUTHOR_ID, TEST_CALENDAR_ID, {})
        queryClient.setQueryData(calendarKey, initialCalendar)

        const { result } = renderHook(() => useUpdateCalendar(), { wrapper })

        const updatedCalendar = {
            ...createMockPubkyAppCalendar(),
            name: 'Updated Calendar Name',
        }

        await act(async () => {
            result.current.mutate({ calendar: asCalendar(updatedCalendar), calendarId: TEST_CALENDAR_ID })
        })

        await waitFor(() => {
            expect(result.current.isError).toBe(true)
        })

        // Pending should be cleared
        expect(mockClearPendingCalendar).toHaveBeenCalledWith(TEST_AUTHOR_ID, TEST_CALENDAR_ID)
    })
})
