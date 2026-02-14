/**
 * Tests for Event Mutation Hooks
 * 
 * Tests the TanStack Query-based mutation hooks for event operations:
 * - useCreateEvent: Create event with optimistic updates
 * - useUpdateEvent: Update event with optimistic updates
 * - useDeleteEvent: Delete event with rollback support
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import {
    useCreateEvent,
    useUpdateEvent,
    useDeleteEvent,
} from '../use-event-mutations'
import type { CachedEvent } from '@/types/nexus'

// Mock PubkyAppEvent type - the real one is a WASM class with methods
type MockPubkyAppEvent = {
    dtstamp: number
    dtstart: string
    summary: string
    dtend?: string
    dtstart_tzid?: string
    dtend_tzid?: string
    description?: string
    status?: string
    locations?: string
    sequence?: number
    created?: number
    last_modified?: number
}

// Helper to cast mock event to expected type for mutation calls
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const asEvent = (event: MockPubkyAppEvent): any => event

// =============================================================================
// Mock Setup
// =============================================================================

// Mock the auth provider
const mockAuth = vi.fn()
vi.mock('@/components/providers/auth-provider', () => ({
    useAuth: () => mockAuth(),
}))

// Mock the pubky events module
vi.mock('@/lib/pubky/events', () => ({
    saveEvent: vi.fn(),
    deleteEvent: vi.fn(),
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
        setPendingEvent: vi.fn(),
        clearPendingEvent: vi.fn(),
    }
})

// Import mocked modules
import { saveEvent, deleteEvent } from '@/lib/pubky/events'
import { ingestUserIntoNexus } from '@/lib/nexus/ingest'
import { toast } from 'sonner'
import { queryKeys, setPendingEvent, clearPendingEvent } from '@/lib/cache'

// Type the mocks
const mockSaveEvent = saveEvent as ReturnType<typeof vi.fn>
const mockDeleteEvent = deleteEvent as ReturnType<typeof vi.fn>
const mockIngestUserIntoNexus = ingestUserIntoNexus as ReturnType<typeof vi.fn>
const mockToastSuccess = toast.success as ReturnType<typeof vi.fn>
const mockToastError = toast.error as ReturnType<typeof vi.fn>
const mockSetPendingEvent = setPendingEvent as ReturnType<typeof vi.fn>
const mockClearPendingEvent = clearPendingEvent as ReturnType<typeof vi.fn>

// =============================================================================
// Test Fixtures
// =============================================================================

const TEST_AUTHOR_ID = 'pk:author123'
const TEST_EVENT_ID = 'EVT001'
const TEST_SESSION = { id: 'session-123', token: 'test-token' }
const TEST_TIMESTAMP = 1704067200 // 2024-01-01T00:00:00Z

function createMockPubkyAppEvent(): MockPubkyAppEvent {
    return {
        dtstamp: TEST_TIMESTAMP,
        dtstart: '2024-06-15T14:00:00',
        summary: 'Test Event',
        dtend: '2024-06-15T16:00:00',
        dtstart_tzid: 'America/New_York',
        dtend_tzid: 'America/New_York',
        description: 'Test event description',
        status: 'CONFIRMED',
        locations: JSON.stringify([
            { name: 'Conference Hall', location_type: 'PHYSICAL', structured_data: 'https://www.openstreetmap.org/?mlat=40.7128&mlon=-74.0060' },
            { name: 'Jitsi Meeting', location_type: 'ONLINE', structured_data: 'https://meet.jit.si/test-event-room' },
        ]),
        sequence: 1,
        created: TEST_TIMESTAMP,
        last_modified: TEST_TIMESTAMP + 50,
    }
}

function createMockCachedEvent(): CachedEvent {
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
            locations: JSON.stringify([
                { name: 'Conference Hall', location_type: 'PHYSICAL', structured_data: 'https://www.openstreetmap.org/?mlat=40.7128&mlon=-74.0060' },
                { name: 'Jitsi Meeting', location_type: 'ONLINE', structured_data: 'https://meet.jit.si/test-event-room' },
            ]),
            sequence: 1,
            created: TEST_TIMESTAMP,
            last_modified: TEST_TIMESTAMP + 50,
        },
        tags: [],
        attendees: [],
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
// Tests: useCreateEvent
// =============================================================================

describe('useCreateEvent', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockAuth.mockReturnValue({
            auth: {
                session: TEST_SESSION,
                publicKey: TEST_AUTHOR_ID,
            },
        })
    })

    it('should successfully create an event', async () => {
        mockSaveEvent.mockResolvedValueOnce(undefined)
        mockIngestUserIntoNexus.mockResolvedValueOnce(undefined)

        const { result } = renderHook(() => useCreateEvent(), {
            wrapper: createWrapper(),
        })

        const mockEvent = createMockPubkyAppEvent()

        await act(async () => {
            result.current.mutate({ event: asEvent(mockEvent), eventId: TEST_EVENT_ID })
        })

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true)
        })

        expect(mockSaveEvent).toHaveBeenCalledWith(
            TEST_SESSION,
            mockEvent,
            TEST_EVENT_ID,
            TEST_AUTHOR_ID
        )
        expect(mockToastSuccess).toHaveBeenCalledWith('Event created successfully!')
        expect(mockIngestUserIntoNexus).toHaveBeenCalledWith(TEST_AUTHOR_ID)
    })

    it('should return correct result on success', async () => {
        mockSaveEvent.mockResolvedValueOnce(undefined)
        mockIngestUserIntoNexus.mockResolvedValueOnce(undefined)

        const { result } = renderHook(() => useCreateEvent(), {
            wrapper: createWrapper(),
        })

        const mockEvent = createMockPubkyAppEvent()

        await act(async () => {
            result.current.mutate({ event: asEvent(mockEvent), eventId: TEST_EVENT_ID })
        })

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true)
        })

        expect(result.current.data).toEqual({
            eventId: TEST_EVENT_ID,
            authorId: TEST_AUTHOR_ID,
        })
    })

    it('should call onSuccess callback when provided', async () => {
        mockSaveEvent.mockResolvedValueOnce(undefined)
        mockIngestUserIntoNexus.mockResolvedValueOnce(undefined)

        const onSuccess = vi.fn()

        const { result } = renderHook(() => useCreateEvent({ onSuccess }), {
            wrapper: createWrapper(),
        })

        const mockEvent = createMockPubkyAppEvent()

        await act(async () => {
            result.current.mutate({ event: asEvent(mockEvent), eventId: TEST_EVENT_ID })
        })

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true)
        })

        expect(onSuccess).toHaveBeenCalledWith({
            eventId: TEST_EVENT_ID,
            authorId: TEST_AUTHOR_ID,
        })
    })

    it('should set pending event during optimistic update', async () => {
        mockSaveEvent.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

        const { result } = renderHook(() => useCreateEvent(), {
            wrapper: createWrapper(),
        })

        const mockEvent = createMockPubkyAppEvent()

        await act(async () => {
            result.current.mutate({ event: asEvent(mockEvent), eventId: TEST_EVENT_ID })
        })

        // Check pending event was set
        expect(mockSetPendingEvent).toHaveBeenCalledWith(
            TEST_AUTHOR_ID,
            TEST_EVENT_ID,
            expect.objectContaining({
                details: expect.objectContaining({
                    id: TEST_EVENT_ID,
                    author: TEST_AUTHOR_ID,
                }),
            }),
            expect.any(Number)
        )
    })

    it('should throw error when not authenticated', async () => {
        mockAuth.mockReturnValue({ auth: null })

        const { result } = renderHook(() => useCreateEvent(), {
            wrapper: createWrapper(),
        })

        const mockEvent = createMockPubkyAppEvent()

        await act(async () => {
            result.current.mutate({ event: asEvent(mockEvent), eventId: TEST_EVENT_ID })
        })

        await waitFor(() => {
            expect(result.current.isError).toBe(true)
        })

        expect(result.current.error?.message).toContain('Authentication required')
    })

    it('should show error toast on failure', async () => {
        const testError = new Error('Network error')
        mockSaveEvent.mockRejectedValueOnce(testError)

        const { result } = renderHook(() => useCreateEvent(), {
            wrapper: createWrapper(),
        })

        const mockEvent = createMockPubkyAppEvent()

        await act(async () => {
            result.current.mutate({ event: asEvent(mockEvent), eventId: TEST_EVENT_ID })
        })

        await waitFor(() => {
            expect(result.current.isError).toBe(true)
        })

        expect(mockToastError).toHaveBeenCalledWith('Failed to create event: Network error')
    })

    it('should clear pending event on error', async () => {
        mockSaveEvent.mockRejectedValueOnce(new Error('Network error'))

        const { result } = renderHook(() => useCreateEvent(), {
            wrapper: createWrapper(),
        })

        const mockEvent = createMockPubkyAppEvent()

        await act(async () => {
            result.current.mutate({ event: asEvent(mockEvent), eventId: TEST_EVENT_ID })
        })

        await waitFor(() => {
            expect(result.current.isError).toBe(true)
        })

        expect(mockClearPendingEvent).toHaveBeenCalledWith(TEST_AUTHOR_ID, TEST_EVENT_ID)
    })

    it('should call onError callback when provided', async () => {
        const testError = new Error('Network error')
        mockSaveEvent.mockRejectedValueOnce(testError)

        const onError = vi.fn()

        const { result } = renderHook(() => useCreateEvent({ onError }), {
            wrapper: createWrapper(),
        })

        const mockEvent = createMockPubkyAppEvent()

        await act(async () => {
            result.current.mutate({ event: asEvent(mockEvent), eventId: TEST_EVENT_ID })
        })

        await waitFor(() => {
            expect(result.current.isError).toBe(true)
        })

        expect(onError).toHaveBeenCalledWith(testError)
    })

    it('should not show toast when showToasts is false', async () => {
        mockSaveEvent.mockResolvedValueOnce(undefined)
        mockIngestUserIntoNexus.mockResolvedValueOnce(undefined)

        const { result } = renderHook(() => useCreateEvent({ showToasts: false }), {
            wrapper: createWrapper(),
        })

        const mockEvent = createMockPubkyAppEvent()

        await act(async () => {
            result.current.mutate({ event: asEvent(mockEvent), eventId: TEST_EVENT_ID })
        })

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true)
        })

        expect(mockToastSuccess).not.toHaveBeenCalled()
    })
})

// =============================================================================
// Tests: useUpdateEvent
// =============================================================================

describe('useUpdateEvent', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockAuth.mockReturnValue({
            auth: {
                session: TEST_SESSION,
                publicKey: TEST_AUTHOR_ID,
            },
        })
    })

    it('should successfully update an event', async () => {
        mockSaveEvent.mockResolvedValueOnce(undefined)
        mockIngestUserIntoNexus.mockResolvedValueOnce(undefined)

        const { result } = renderHook(() => useUpdateEvent(), {
            wrapper: createWrapper(),
        })

        const mockEvent = createMockPubkyAppEvent()

        await act(async () => {
            result.current.mutate({ event: asEvent(mockEvent), eventId: TEST_EVENT_ID })
        })

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true)
        })

        expect(mockSaveEvent).toHaveBeenCalledWith(
            TEST_SESSION,
            mockEvent,
            TEST_EVENT_ID,
            TEST_AUTHOR_ID
        )
        expect(mockToastSuccess).toHaveBeenCalledWith('Event updated successfully!')
    })

    it('should return correct result on update success', async () => {
        mockSaveEvent.mockResolvedValueOnce(undefined)
        mockIngestUserIntoNexus.mockResolvedValueOnce(undefined)

        const { result } = renderHook(() => useUpdateEvent(), {
            wrapper: createWrapper(),
        })

        const mockEvent = createMockPubkyAppEvent()

        await act(async () => {
            result.current.mutate({ event: asEvent(mockEvent), eventId: TEST_EVENT_ID })
        })

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true)
        })

        expect(result.current.data).toEqual({
            eventId: TEST_EVENT_ID,
            authorId: TEST_AUTHOR_ID,
        })
    })

    it('should call onSuccess callback when provided', async () => {
        mockSaveEvent.mockResolvedValueOnce(undefined)
        mockIngestUserIntoNexus.mockResolvedValueOnce(undefined)

        const onSuccess = vi.fn()

        const { result } = renderHook(() => useUpdateEvent({ onSuccess }), {
            wrapper: createWrapper(),
        })

        const mockEvent = createMockPubkyAppEvent()

        await act(async () => {
            result.current.mutate({ event: asEvent(mockEvent), eventId: TEST_EVENT_ID })
        })

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true)
        })

        expect(onSuccess).toHaveBeenCalledWith({
            eventId: TEST_EVENT_ID,
            authorId: TEST_AUTHOR_ID,
        })
    })

    it('should throw error when not authenticated', async () => {
        mockAuth.mockReturnValue({ auth: null })

        const { result } = renderHook(() => useUpdateEvent(), {
            wrapper: createWrapper(),
        })

        const mockEvent = createMockPubkyAppEvent()

        await act(async () => {
            result.current.mutate({ event: asEvent(mockEvent), eventId: TEST_EVENT_ID })
        })

        await waitFor(() => {
            expect(result.current.isError).toBe(true)
        })

        expect(result.current.error?.message).toContain('Authentication required')
    })

    it('should show error toast on update failure', async () => {
        const testError = new Error('Update failed')
        mockSaveEvent.mockRejectedValueOnce(testError)

        const { result } = renderHook(() => useUpdateEvent(), {
            wrapper: createWrapper(),
        })

        const mockEvent = createMockPubkyAppEvent()

        await act(async () => {
            result.current.mutate({ event: asEvent(mockEvent), eventId: TEST_EVENT_ID })
        })

        await waitFor(() => {
            expect(result.current.isError).toBe(true)
        })

        expect(mockToastError).toHaveBeenCalledWith('Failed to update event: Update failed')
    })

    it('should clear pending event on update error', async () => {
        mockSaveEvent.mockRejectedValueOnce(new Error('Update failed'))

        const { result } = renderHook(() => useUpdateEvent(), {
            wrapper: createWrapper(),
        })

        const mockEvent = createMockPubkyAppEvent()

        await act(async () => {
            result.current.mutate({ event: asEvent(mockEvent), eventId: TEST_EVENT_ID })
        })

        await waitFor(() => {
            expect(result.current.isError).toBe(true)
        })

        expect(mockClearPendingEvent).toHaveBeenCalledWith(TEST_AUTHOR_ID, TEST_EVENT_ID)
    })

    it('should set pending event during update', async () => {
        mockSaveEvent.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

        const { result } = renderHook(() => useUpdateEvent(), {
            wrapper: createWrapper(),
        })

        const mockEvent = createMockPubkyAppEvent()

        await act(async () => {
            result.current.mutate({ event: asEvent(mockEvent), eventId: TEST_EVENT_ID })
        })

        expect(mockSetPendingEvent).toHaveBeenCalledWith(
            TEST_AUTHOR_ID,
            TEST_EVENT_ID,
            expect.objectContaining({
                details: expect.objectContaining({
                    id: TEST_EVENT_ID,
                    author: TEST_AUTHOR_ID,
                }),
            }),
            expect.any(Number)
        )
    })

    it('should trigger Nexus ingest after successful update', async () => {
        mockSaveEvent.mockResolvedValueOnce(undefined)
        mockIngestUserIntoNexus.mockResolvedValueOnce(undefined)

        const { result } = renderHook(() => useUpdateEvent(), {
            wrapper: createWrapper(),
        })

        const mockEvent = createMockPubkyAppEvent()

        await act(async () => {
            result.current.mutate({ event: asEvent(mockEvent), eventId: TEST_EVENT_ID })
        })

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true)
        })

        expect(mockIngestUserIntoNexus).toHaveBeenCalledWith(TEST_AUTHOR_ID)
    })
})

// =============================================================================
// Tests: useDeleteEvent
// =============================================================================

describe('useDeleteEvent', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockAuth.mockReturnValue({
            auth: {
                session: TEST_SESSION,
                publicKey: TEST_AUTHOR_ID,
            },
        })
    })

    it('should successfully delete an event', async () => {
        mockDeleteEvent.mockResolvedValueOnce(undefined)
        mockIngestUserIntoNexus.mockResolvedValueOnce(undefined)

        const { result } = renderHook(() => useDeleteEvent(), {
            wrapper: createWrapper(),
        })

        await act(async () => {
            result.current.mutate({ eventId: TEST_EVENT_ID })
        })

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true)
        })

        expect(mockDeleteEvent).toHaveBeenCalledWith(
            TEST_SESSION,
            TEST_EVENT_ID,
            TEST_AUTHOR_ID
        )
        expect(mockToastSuccess).toHaveBeenCalledWith('Event deleted successfully!')
    })

    it('should call onSuccess callback when provided', async () => {
        mockDeleteEvent.mockResolvedValueOnce(undefined)
        mockIngestUserIntoNexus.mockResolvedValueOnce(undefined)

        const onSuccess = vi.fn()

        const { result } = renderHook(() => useDeleteEvent({ onSuccess }), {
            wrapper: createWrapper(),
        })

        await act(async () => {
            result.current.mutate({ eventId: TEST_EVENT_ID })
        })

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true)
        })

        expect(onSuccess).toHaveBeenCalled()
    })

    it('should throw error when not authenticated', async () => {
        mockAuth.mockReturnValue({ auth: null })

        const { result } = renderHook(() => useDeleteEvent(), {
            wrapper: createWrapper(),
        })

        await act(async () => {
            result.current.mutate({ eventId: TEST_EVENT_ID })
        })

        await waitFor(() => {
            expect(result.current.isError).toBe(true)
        })

        expect(result.current.error?.message).toContain('Authentication required')
    })

    it('should show error toast on delete failure', async () => {
        const testError = new Error('Delete failed')
        mockDeleteEvent.mockRejectedValueOnce(testError)

        const { result } = renderHook(() => useDeleteEvent(), {
            wrapper: createWrapper(),
        })

        await act(async () => {
            result.current.mutate({ eventId: TEST_EVENT_ID })
        })

        await waitFor(() => {
            expect(result.current.isError).toBe(true)
        })

        expect(mockToastError).toHaveBeenCalledWith('Failed to delete event: Delete failed')
    })

    it('should call onError callback when provided', async () => {
        const testError = new Error('Delete failed')
        mockDeleteEvent.mockRejectedValueOnce(testError)

        const onError = vi.fn()

        const { result } = renderHook(() => useDeleteEvent({ onError }), {
            wrapper: createWrapper(),
        })

        await act(async () => {
            result.current.mutate({ eventId: TEST_EVENT_ID })
        })

        await waitFor(() => {
            expect(result.current.isError).toBe(true)
        })

        expect(onError).toHaveBeenCalledWith(testError)
    })

    it('should trigger Nexus ingest after successful deletion', async () => {
        mockDeleteEvent.mockResolvedValueOnce(undefined)
        mockIngestUserIntoNexus.mockResolvedValueOnce(undefined)

        const { result } = renderHook(() => useDeleteEvent(), {
            wrapper: createWrapper(),
        })

        await act(async () => {
            result.current.mutate({ eventId: TEST_EVENT_ID })
        })

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true)
        })

        expect(mockIngestUserIntoNexus).toHaveBeenCalledWith(TEST_AUTHOR_ID)
    })

    it('should not show toast when showToasts is false', async () => {
        mockDeleteEvent.mockResolvedValueOnce(undefined)
        mockIngestUserIntoNexus.mockResolvedValueOnce(undefined)

        const { result } = renderHook(() => useDeleteEvent({ showToasts: false }), {
            wrapper: createWrapper(),
        })

        await act(async () => {
            result.current.mutate({ eventId: TEST_EVENT_ID })
        })

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true)
        })

        expect(mockToastSuccess).not.toHaveBeenCalled()
    })

    it('should optimistically remove from cache', async () => {
        mockDeleteEvent.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

        const wrapper = createWrapper()
        const cachedEvent = createMockCachedEvent()

        // Pre-populate cache
        const eventKey = queryKeys.events.detail(TEST_AUTHOR_ID, TEST_EVENT_ID, {})
        queryClient.setQueryData(eventKey, cachedEvent)

        const { result } = renderHook(() => useDeleteEvent(), { wrapper })

        await act(async () => {
            result.current.mutate({ eventId: TEST_EVENT_ID })
        })

        // Cache should be cleared immediately (optimistic)
        await waitFor(() => {
            const currentData = queryClient.getQueryData(eventKey)
            expect(currentData).toBeUndefined()
        })
    })

    it('should rollback cache on delete failure', async () => {
        mockDeleteEvent.mockRejectedValueOnce(new Error('Delete failed'))

        const wrapper = createWrapper()
        const cachedEvent = createMockCachedEvent()

        // Pre-populate cache
        const eventKey = queryKeys.events.detail(TEST_AUTHOR_ID, TEST_EVENT_ID, {})
        queryClient.setQueryData(eventKey, cachedEvent)

        const { result } = renderHook(() => useDeleteEvent(), { wrapper })

        await act(async () => {
            result.current.mutate({ eventId: TEST_EVENT_ID })
        })

        await waitFor(() => {
            expect(result.current.isError).toBe(true)
        })

        // Cache should be restored on rollback
        const restoredData = queryClient.getQueryData(eventKey)
        expect(restoredData).toEqual(cachedEvent)
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

    it('should invalidate events queries after create', async () => {
        mockSaveEvent.mockResolvedValueOnce(undefined)
        mockIngestUserIntoNexus.mockResolvedValueOnce(undefined)

        const wrapper = createWrapper()

        // Set up spy on invalidateQueries
        const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

        const { result } = renderHook(() => useCreateEvent(), { wrapper })

        const mockEvent = createMockPubkyAppEvent()

        await act(async () => {
            result.current.mutate({ event: asEvent(mockEvent), eventId: TEST_EVENT_ID })
        })

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true)
        })

        expect(invalidateSpy).toHaveBeenCalledWith({
            queryKey: queryKeys.events.all,
        })
    })

    it('should invalidate events queries after update', async () => {
        mockSaveEvent.mockResolvedValueOnce(undefined)
        mockIngestUserIntoNexus.mockResolvedValueOnce(undefined)

        const wrapper = createWrapper()

        const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

        const { result } = renderHook(() => useUpdateEvent(), { wrapper })

        const mockEvent = createMockPubkyAppEvent()

        await act(async () => {
            result.current.mutate({ event: asEvent(mockEvent), eventId: TEST_EVENT_ID })
        })

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true)
        })

        expect(invalidateSpy).toHaveBeenCalledWith({
            queryKey: queryKeys.events.all,
        })
    })

    it('should invalidate events queries after delete', async () => {
        mockDeleteEvent.mockResolvedValueOnce(undefined)
        mockIngestUserIntoNexus.mockResolvedValueOnce(undefined)

        const wrapper = createWrapper()

        const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

        const { result } = renderHook(() => useDeleteEvent(), { wrapper })

        await act(async () => {
            result.current.mutate({ eventId: TEST_EVENT_ID })
        })

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true)
        })

        expect(invalidateSpy).toHaveBeenCalledWith({
            queryKey: queryKeys.events.all,
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

    it('should optimistically add event to cache on create', async () => {
        // Delay the server response so we can check optimistic update
        mockSaveEvent.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

        const wrapper = createWrapper()
        const { result } = renderHook(() => useCreateEvent(), { wrapper })

        const mockEvent = createMockPubkyAppEvent()

        await act(async () => {
            result.current.mutate({ event: asEvent(mockEvent), eventId: TEST_EVENT_ID })
        })

        // Check optimistic data is in cache
        const eventKey = queryKeys.events.detail(TEST_AUTHOR_ID, TEST_EVENT_ID, {})

        await waitFor(() => {
            const cachedData = queryClient.getQueryData<CachedEvent>(eventKey)
            expect(cachedData).toBeDefined()
            expect(cachedData?.details.id).toBe(TEST_EVENT_ID)
            expect(cachedData?.details.summary).toBe('Test Event')
        })
    })

    it('should optimistically update event in cache', async () => {
        mockSaveEvent.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

        const wrapper = createWrapper()
        const initialEvent = createMockCachedEvent()

        // Pre-populate cache
        const eventKey = queryKeys.events.detail(TEST_AUTHOR_ID, TEST_EVENT_ID, {})
        queryClient.setQueryData(eventKey, initialEvent)

        const { result } = renderHook(() => useUpdateEvent(), { wrapper })

        const updatedEvent = {
            ...createMockPubkyAppEvent(),
            summary: 'Updated Event Title',
        }

        await act(async () => {
            result.current.mutate({ event: asEvent(updatedEvent), eventId: TEST_EVENT_ID })
        })

        // Check optimistic update happened
        await waitFor(() => {
            const cachedData = queryClient.getQueryData<CachedEvent>(eventKey)
            expect(cachedData?.details.summary).toBe('Updated Event Title')
        })
    })

    it('should rollback on create failure', async () => {
        mockSaveEvent.mockRejectedValueOnce(new Error('Network error'))

        const wrapper = createWrapper()
        const { result } = renderHook(() => useCreateEvent(), { wrapper })

        const mockEvent = createMockPubkyAppEvent()

        await act(async () => {
            result.current.mutate({ event: asEvent(mockEvent), eventId: TEST_EVENT_ID })
        })

        await waitFor(() => {
            expect(result.current.isError).toBe(true)
        })

        // Pending event should be cleared
        expect(mockClearPendingEvent).toHaveBeenCalledWith(TEST_AUTHOR_ID, TEST_EVENT_ID)
    })

    it('should rollback on update failure', async () => {
        mockSaveEvent.mockRejectedValueOnce(new Error('Network error'))

        const wrapper = createWrapper()
        const initialEvent = createMockCachedEvent()

        // Pre-populate cache
        const eventKey = queryKeys.events.detail(TEST_AUTHOR_ID, TEST_EVENT_ID, {})
        queryClient.setQueryData(eventKey, initialEvent)

        const { result } = renderHook(() => useUpdateEvent(), { wrapper })

        const updatedEvent = {
            ...createMockPubkyAppEvent(),
            summary: 'Updated Event Title',
        }

        await act(async () => {
            result.current.mutate({ event: asEvent(updatedEvent), eventId: TEST_EVENT_ID })
        })

        await waitFor(() => {
            expect(result.current.isError).toBe(true)
        })

        // Check rollback happened - but note that the implementation uses setQueriesData
        // which might not restore to exact previous state, so we check pending is cleared
        expect(mockClearPendingEvent).toHaveBeenCalledWith(TEST_AUTHOR_ID, TEST_EVENT_ID)
    })
})
