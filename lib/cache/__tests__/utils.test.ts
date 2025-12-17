/**
 * Cache Utils Tests
 *
 * Tests for optimistic caching utilities including:
 * - Query key factories
 * - Version comparison
 * - Data source decisions
 * - Sync configuration
 */

import { describe, it, expect } from 'vitest';
import {
    queryKeys,
    extractEventVersion,
    isNexusVersionCurrent,
    decideEventDataSource,
    calculateSyncDelay,
    isNetworkError,
    isNotFoundError,
    SYNC_CONFIG,
    pubkyEventToNexusFormat,
    pubkyCalendarToNexusFormat,
} from '../utils';
import type { NexusEventResponse } from '@/lib/nexus/events';
import type { PubkyAppEvent, PubkyAppCalendar } from 'pubky-app-specs';

describe('Cache Utils', () => {
    describe('Query Key Factories', () => {
        it('should generate consistent event list keys', () => {
            const key1 = queryKeys.events.list({ authorId: 'abc' });
            const key2 = queryKeys.events.list({ authorId: 'abc' });
            expect(key1).toEqual(key2);
        });

        it('should generate unique keys for different params', () => {
            const key1 = queryKeys.events.list({ authorId: 'abc' });
            const key2 = queryKeys.events.list({ authorId: 'xyz' });
            expect(key1).not.toEqual(key2);
        });

        it('should generate hierarchical event detail keys', () => {
            const key = queryKeys.events.detail('author123', 'event456');
            expect(key).toContain('author123');
            expect(key).toContain('event456');
        });

        it('should include options in detail keys', () => {
            const keyWithOptions = queryKeys.events.detail('a', 'e', { limitTags: 10 });
            const keyWithoutOptions = queryKeys.events.detail('a', 'e');
            expect(keyWithOptions).not.toEqual(keyWithoutOptions);
        });

        it('should generate calendar keys consistently', () => {
            const key = queryKeys.calendars.detail('author', 'calendar');
            expect(key).toContain('calendar');
        });
    });

    describe('Version Extraction', () => {
        it('should extract event version info', () => {
            const event: NexusEventResponse = {
                details: {
                    id: 'test',
                    uri: 'pubky://test/event/test',
                    author: 'author',
                    indexed_at: 1000,
                    uid: 'uid',
                    dtstamp: 900,
                    dtstart: '2024-01-01T10:00:00',
                    summary: 'Test Event',
                    sequence: 5,
                    last_modified: 800,
                },
                tags: [],
                attendees: [],
            };

            const version = extractEventVersion(event);
            expect(version.sequence).toBe(5);
            expect(version.lastModified).toBe(800);
            expect(version.indexedAt).toBe(1000);
        });

        it('should handle missing optional fields', () => {
            const event: NexusEventResponse = {
                details: {
                    id: 'test',
                    uri: 'pubky://test/event/test',
                    author: 'author',
                    indexed_at: 1000,
                    uid: 'uid',
                    dtstamp: 900,
                    dtstart: '2024-01-01T10:00:00',
                    summary: 'Test Event',
                    // sequence, last_modified are undefined
                },
                tags: [],
                attendees: [],
            };

            const version = extractEventVersion(event);
            expect(version.sequence).toBe(0);
            expect(version.lastModified).toBe(0);
        });
    });

    describe('Version Comparison - isNexusVersionCurrent', () => {
        it('should return true when nexus sequence is higher', () => {
            const local = { sequence: 1, lastModified: 100, indexedAt: 50 };
            const nexus = { sequence: 2, lastModified: 100, indexedAt: 60 };
            expect(isNexusVersionCurrent(local, nexus)).toBe(true);
        });

        it('should return false when local sequence is higher', () => {
            const local = { sequence: 3, lastModified: 100, indexedAt: 50 };
            const nexus = { sequence: 2, lastModified: 100, indexedAt: 60 };
            expect(isNexusVersionCurrent(local, nexus)).toBe(false);
        });

        it('should compare lastModified when sequences are equal', () => {
            const local = { sequence: 1, lastModified: 100, indexedAt: 50 };
            const nexusNewer = { sequence: 1, lastModified: 200, indexedAt: 60 };
            const nexusOlder = { sequence: 1, lastModified: 50, indexedAt: 60 };

            expect(isNexusVersionCurrent(local, nexusNewer)).toBe(true);
            expect(isNexusVersionCurrent(local, nexusOlder)).toBe(false);
        });

        it('should return true when versions are exactly equal', () => {
            const local = { sequence: 1, lastModified: 100, indexedAt: 50 };
            const nexus = { sequence: 1, lastModified: 100, indexedAt: 60 };
            expect(isNexusVersionCurrent(local, nexus)).toBe(true);
        });
    });

    describe('Data Source Decision', () => {
        const createMockEvent = (
            sequence: number,
            lastModified: number,
            indexedAt: number
        ): NexusEventResponse => ({
            details: {
                id: 'test',
                uri: 'pubky://test/event/test',
                author: 'author',
                indexed_at: indexedAt,
                uid: 'uid',
                dtstamp: 900,
                dtstart: '2024-01-01T10:00:00',
                summary: 'Test Event',
                sequence,
                last_modified: lastModified,
            },
            tags: [{ label: 'nexus-tag', taggers: [], taggers_count: 0, relationship: false }],
            attendees: [{
                id: 'attendee1',
                indexed_at: 100,
                author: 'attendee1',
                uri: 'pubky://attendee1/rsvp',
                partstat: 'ACCEPTED',
                x_pubky_event_uri: 'pubky://test/event/test',
                created_at: 100,
            }],
        });

        it('should return nexus source when only nexus data available', () => {
            const nexusData = createMockEvent(1, 100, 50);
            const decision = decideEventDataSource(undefined, nexusData, false);

            expect(decision.source).toBe('nexus');
            expect(decision.data).toBe(nexusData);
            expect(decision.needsRefresh).toBe(false);
        });

        it('should return local source when only local data available', () => {
            const localData = createMockEvent(1, 100, 50);
            const decision = decideEventDataSource(localData, undefined, false);

            expect(decision.source).toBe('local');
            expect(decision.data).toBe(localData);
            expect(decision.needsRefresh).toBe(true); // Should try to fetch from Nexus
        });

        it('should return local source with no refresh when synced', () => {
            const localData = createMockEvent(1, 100, 50);
            const decision = decideEventDataSource(localData, undefined, true);

            expect(decision.source).toBe('local');
            expect(decision.needsRefresh).toBe(false); // Already synced
        });

        it('should return nexus source when nexus version is current', () => {
            const localData = createMockEvent(1, 100, 50);
            const nexusData = createMockEvent(2, 200, 60); // Higher sequence

            const decision = decideEventDataSource(localData, nexusData, false);

            expect(decision.source).toBe('nexus');
            expect(decision.data).toBe(nexusData);
        });

        it('should return merged source when local is newer', () => {
            const localData = createMockEvent(3, 300, 50);  // Higher sequence
            const nexusData = createMockEvent(1, 100, 60);

            const decision = decideEventDataSource(localData, nexusData, false);

            expect(decision.source).toBe('merged');
            expect(decision.data?.details).toEqual(localData.details);
            // Should use Nexus social data
            expect(decision.data?.tags).toEqual(nexusData.tags);
            expect(decision.data?.attendees).toEqual(nexusData.attendees);
            expect(decision.needsRefresh).toBe(true);
        });

        it('should return undefined data when both are undefined', () => {
            const decision = decideEventDataSource(undefined, undefined, false);

            expect(decision.source).toBe('nexus');
            expect(decision.data).toBeUndefined();
            expect(decision.isStale).toBe(true);
            expect(decision.needsRefresh).toBe(true);
        });
    });

    describe('Sync Configuration', () => {
        it('should have reasonable sync config values', () => {
            expect(SYNC_CONFIG.INITIAL_SYNC_DELAY).toBeGreaterThan(0);
            expect(SYNC_CONFIG.SYNC_INTERVAL).toBeGreaterThan(SYNC_CONFIG.INITIAL_SYNC_DELAY);
            expect(SYNC_CONFIG.MAX_SYNC_ATTEMPTS).toBeGreaterThan(0);
            expect(SYNC_CONFIG.MAX_SYNC_TIME).toBeGreaterThan(SYNC_CONFIG.SYNC_INTERVAL);
        });

        it('should calculate exponential backoff delay', () => {
            const delay0 = calculateSyncDelay(0);
            const delay1 = calculateSyncDelay(1);
            const delay2 = calculateSyncDelay(2);

            // Each delay should be roughly double the previous (with jitter)
            expect(delay1).toBeGreaterThan(delay0 * 1.5);
            expect(delay2).toBeGreaterThan(delay1 * 1.5);
        });

        it('should cap delay at 15 seconds', () => {
            const highAttemptDelay = calculateSyncDelay(100);
            // With 20% jitter, max should be 15000 * 1.1 = 16500
            expect(highAttemptDelay).toBeLessThanOrEqual(16500);
        });
    });

    describe('Error Type Guards', () => {
        it('should identify network errors', () => {
            expect(isNetworkError(new Error('Network Error'))).toBe(true);
            expect(isNetworkError(new Error('ECONNREFUSED'))).toBe(true);
            expect(isNetworkError(new Error('Request timeout'))).toBe(true);
            expect(isNetworkError(new Error('Something else'))).toBe(false);
        });

        it('should identify 404 errors', () => {
            expect(isNotFoundError(new Error('404 Not Found'))).toBe(true);
            expect(isNotFoundError(new Error('Resource not found'))).toBe(true);
            expect(isNotFoundError(new Error('Something else'))).toBe(false);
        });

        it('should handle non-Error objects', () => {
            expect(isNetworkError('string error')).toBe(false);
            expect(isNotFoundError({ message: '404' })).toBe(false);
        });
    });

    describe('Pubky to Nexus Format Conversion', () => {
        it('should convert PubkyAppEvent to NexusEventResponse', () => {
            // Create a mock that satisfies the data fields needed by the conversion function
            const pubkyEvent = {
                uid: 'test-uid',
                dtstamp: BigInt(Date.now() * 1000),
                dtstart: '2024-01-15T10:00:00',
                summary: 'Test Event',
                duration: 'PT1H',
                sequence: 1,
            } as unknown as PubkyAppEvent;

            const result = pubkyEventToNexusFormat(pubkyEvent, 'author123', 'event456');

            expect(result.details.id).toBe('event456');
            expect(result.details.author).toBe('author123');
            expect(result.details.uid).toBe('test-uid');
            expect(result.details.summary).toBe('Test Event');
            expect(result.details.duration).toBe('PT1H');
            expect(result.details.sequence).toBe(1);
            expect(result.tags).toEqual([]);
            expect(result.attendees).toEqual([]);
        });

        it('should handle optional fields', () => {
            const minimalEvent = {
                uid: 'uid',
                dtstamp: BigInt(1000000),
                dtstart: '2024-01-01T00:00:00',
                summary: 'Minimal',
            } as unknown as PubkyAppEvent;

            const result = pubkyEventToNexusFormat(minimalEvent, 'a', 'e');

            expect(result.details.dtend).toBeUndefined();
            expect(result.details.duration).toBeUndefined();
            expect(result.details.rrule).toBeUndefined();
            expect(result.details.location).toBeUndefined();
        });

        it('should convert PubkyAppCalendar to NexusCalendarResponse', () => {
            const pubkyCalendar = {
                name: 'My Calendar',
                timezone: 'America/New_York',
                color: '#ff0000',
                description: 'Test calendar',
            } as unknown as PubkyAppCalendar;

            const result = pubkyCalendarToNexusFormat(pubkyCalendar, 'author', 'cal123');

            expect(result.details.id).toBe('cal123');
            expect(result.details.author).toBe('author');
            expect(result.details.name).toBe('My Calendar');
            expect(result.details.timezone).toBe('America/New_York');
            expect(result.details.color).toBe('#ff0000');
            expect(result.tags).toEqual([]);
            expect(result.events).toEqual([]);
        });
    });
});
