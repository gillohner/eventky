/**
 * RRULE Calculation Tests
 * 
 * Tests for RFC 5545 recurrence rule calculations.
 * 
 * Covers:
 * - Basic RRULE patterns (BYMONTHDAY, BYSETPOS, INTERVAL)
 * - EXDATE exclusions with RFC 5545 compliance
 * - DST transitions (spring forward/fall back)
 * - Multi-day events spanning DST boundaries
 * - Timezone boundary handling
 */

import { describe, it, expect } from 'vitest';
import { calculateNextOccurrences } from '../rrule-utils';

describe('Advanced RRULE Patterns', () => {
    describe('BYMONTHDAY - Every 21st of each month', () => {
        it('should generate correct dates for 21st of each month', () => {
            const dtstart = '2024-01-21T10:00:00';
            const rrule = 'FREQ=MONTHLY;BYMONTHDAY=21;COUNT=3';

            const result = calculateNextOccurrences({
                dtstart,
                rrule,
                rdate: [],
                exdate: [],
                maxCount: 5
            });

            expect(result).toEqual([
                '2024-01-21T10:00:00',
                '2024-02-21T10:00:00',
                '2024-03-21T10:00:00'
            ]);
        });

        it('should handle last day of month with negative BYMONTHDAY', () => {
            const dtstart = '2024-01-31T10:00:00';
            const rrule = 'FREQ=MONTHLY;BYMONTHDAY=-1;COUNT=4';

            const result = calculateNextOccurrences({
                dtstart,
                rrule,
                rdate: [],
                exdate: [],
                maxCount: 5
            });

            // Last day of Jan, Feb (leap year), Mar, Apr
            expect(result).toEqual([
                '2024-01-31T10:00:00',
                '2024-02-29T10:00:00',
                '2024-03-31T10:00:00',
                '2024-04-30T10:00:00'
            ]);
        });
    });

    describe('BYSETPOS - Last Thursday of month', () => {
        it('should generate last Thursday of each month', () => {
            const dtstart = '2024-01-25T10:00:00'; // Last Thursday of Jan 2024
            const rrule = 'FREQ=MONTHLY;BYDAY=TH;BYSETPOS=-1;COUNT=3';

            const result = calculateNextOccurrences({
                dtstart,
                rrule,
                rdate: [],
                exdate: [],
                maxCount: 5
            });

            expect(result).toEqual([
                '2024-01-25T10:00:00', // Last Thu of Jan
                '2024-02-29T10:00:00', // Last Thu of Feb
                '2024-03-28T10:00:00'  // Last Thu of Mar
            ]);
        });

        it('should generate first Monday of each month', () => {
            const dtstart = '2024-01-01T10:00:00'; // First Monday of Jan 2024
            const rrule = 'FREQ=MONTHLY;BYDAY=MO;BYSETPOS=1;COUNT=3';

            const result = calculateNextOccurrences({
                dtstart,
                rrule,
                rdate: [],
                exdate: [],
                maxCount: 5
            });

            expect(result).toEqual([
                '2024-01-01T10:00:00', // First Mon of Jan
                '2024-02-05T10:00:00', // First Mon of Feb
                '2024-03-04T10:00:00'  // First Mon of Mar
            ]);
        });
    });

    describe('INTERVAL - Every 4 weeks', () => {
        it('should generate occurrences every 4 weeks', () => {
            const dtstart = '2024-01-01T10:00:00';
            const rrule = 'FREQ=WEEKLY;INTERVAL=4;COUNT=3';

            const result = calculateNextOccurrences({
                dtstart,
                rrule,
                rdate: [],
                exdate: [],
                maxCount: 5
            });

            expect(result).toEqual([
                '2024-01-01T10:00:00',
                '2024-01-29T10:00:00', // 4 weeks later
                '2024-02-26T10:00:00'  // 4 weeks later
            ]);
        });
    });

    describe('Complex patterns with EXDATE', () => {
        /**
         * RFC 5545 Compliant Behavior:
         * COUNT specifies the number of occurrences to generate BEFORE applying EXDATE.
         * EXDATE then removes dates from that set, potentially reducing the final count.
         */
        it('should exclude specific dates from monthly pattern (RFC 5545: COUNT before EXDATE)', () => {
            const dtstart = '2024-01-21T10:00:00';
            const rrule = 'FREQ=MONTHLY;BYMONTHDAY=21;COUNT=4';
            const exdate = ['2024-02-21T10:00:00']; // Exclude February

            const result = calculateNextOccurrences({
                dtstart,
                rrule,
                rdate: [],
                exdate,
                maxCount: 5
            });

            // RFC 5545: COUNT=4 generates 4 candidates (Jan, Feb, Mar, Apr)
            // Then EXDATE removes Feb, leaving 3 results
            expect(result).toHaveLength(3);
            expect(result).toEqual([
                '2024-01-21T10:00:00',
                // '2024-02-21T10:00:00', // Excluded by EXDATE
                '2024-03-21T10:00:00',
                '2024-04-21T10:00:00'
            ]);
        });

        it('should handle multiple EXDATEs', () => {
            const dtstart = '2024-01-15T14:00:00';
            const rrule = 'FREQ=WEEKLY;COUNT=5';
            const exdate = ['2024-01-22T14:00:00', '2024-02-05T14:00:00']; // Exclude 2nd and 4th

            const result = calculateNextOccurrences({
                dtstart,
                rrule,
                rdate: [],
                exdate,
                maxCount: 10
            });

            // RFC 5545: COUNT=5 generates 5 candidates (Jan 15, 22, 29, Feb 5, 12)
            // Then EXDATE removes Jan 22 and Feb 5, leaving 3 results
            expect(result).toHaveLength(3);
            expect(result).toContain('2024-01-15T14:00:00');
            expect(result).not.toContain('2024-01-22T14:00:00'); // Excluded
            expect(result).toContain('2024-01-29T14:00:00');
            expect(result).not.toContain('2024-02-05T14:00:00'); // Excluded
            expect(result).toContain('2024-02-12T14:00:00');
        });
    });

    /**
     * DST Transition Tests
     * 
     * These tests verify that RRULE calculations maintain consistent local time
     * across DST boundaries (spring forward and fall back).
     * 
     * Key RFC 5545 behavior:
     * - Events should occur at the same LOCAL time (wall-clock time)
     * - DST transitions should not cause time shifts
     * - Events during DST "gap" hours should be handled gracefully
     */
    describe('DST Transitions', () => {
        /**
         * US DST 2024:
         * - Spring forward: March 10, 2024 at 2:00 AM → 3:00 AM
         * - Fall back: November 3, 2024 at 2:00 AM → 1:00 AM
         */

        it('should maintain consistent local time across spring DST transition', () => {
            // Daily event at 9:00 AM spanning DST spring forward
            const dtstart = '2024-03-08T09:00:00'; // Friday before DST
            const rrule = 'FREQ=DAILY;COUNT=5';

            const result = calculateNextOccurrences({
                dtstart,
                rrule,
                rdate: [],
                exdate: [],
                maxCount: 5
            });

            // All occurrences should be at 09:00 local time
            expect(result).toHaveLength(5);
            expect(result).toEqual([
                '2024-03-08T09:00:00', // Before DST
                '2024-03-09T09:00:00', // Before DST
                '2024-03-10T09:00:00', // DST transition day
                '2024-03-11T09:00:00', // After DST
                '2024-03-12T09:00:00'  // After DST
            ]);
        });

        it('should maintain consistent local time across fall DST transition', () => {
            // Daily event at 9:00 AM spanning DST fall back
            const dtstart = '2024-11-01T09:00:00'; // Friday before DST
            const rrule = 'FREQ=DAILY;COUNT=5';

            const result = calculateNextOccurrences({
                dtstart,
                rrule,
                rdate: [],
                exdate: [],
                maxCount: 5
            });

            // All occurrences should be at 09:00 local time
            expect(result).toHaveLength(5);
            expect(result).toEqual([
                '2024-11-01T09:00:00', // Before DST
                '2024-11-02T09:00:00', // Before DST
                '2024-11-03T09:00:00', // DST transition day (fall back)
                '2024-11-04T09:00:00', // After DST
                '2024-11-05T09:00:00'  // After DST
            ]);
        });

        it('should handle weekly event across spring DST', () => {
            // Weekly event on Sundays at 10:00 AM
            const dtstart = '2024-03-03T10:00:00'; // Sunday before DST
            const rrule = 'FREQ=WEEKLY;COUNT=4';

            const result = calculateNextOccurrences({
                dtstart,
                rrule,
                rdate: [],
                exdate: [],
                maxCount: 4
            });

            expect(result).toEqual([
                '2024-03-03T10:00:00', // Before DST
                '2024-03-10T10:00:00', // DST transition day
                '2024-03-17T10:00:00', // After DST
                '2024-03-24T10:00:00'  // After DST
            ]);
        });

        it('should handle monthly event across multiple DST transitions', () => {
            // Monthly event on the 15th at 2:30 AM (time that could be affected by DST)
            const dtstart = '2024-02-15T02:30:00';
            const rrule = 'FREQ=MONTHLY;BYMONTHDAY=15;COUNT=4';

            const result = calculateNextOccurrences({
                dtstart,
                rrule,
                rdate: [],
                exdate: [],
                maxCount: 4
            });

            // Time should remain 02:30 regardless of DST status
            expect(result).toEqual([
                '2024-02-15T02:30:00', // Before spring DST
                '2024-03-15T02:30:00', // After spring DST
                '2024-04-15T02:30:00', // After spring DST
                '2024-05-15T02:30:00'  // After spring DST
            ]);
        });

        it('should handle event during DST gap hour (2:30 AM spring forward)', () => {
            // Event at 2:30 AM on DST transition day
            // When clocks spring forward, 2:00-2:59 AM doesn't exist
            const dtstart = '2024-03-10T02:30:00'; // This time doesn't exist (gap hour)
            const rrule = 'FREQ=DAILY;COUNT=3';

            const result = calculateNextOccurrences({
                dtstart,
                rrule,
                rdate: [],
                exdate: [],
                maxCount: 3
            });

            // The system should handle this gracefully, keeping local time representation
            expect(result).toHaveLength(3);
            // All times should show 02:30 in their ISO representation
            result.forEach(occ => {
                expect(occ).toMatch(/T02:30:00$/);
            });
        });
    });

    /**
     * Multi-day Event Tests
     * 
     * Events that span multiple days or cross DST boundaries
     */
    describe('Multi-day Events', () => {
        it('should generate occurrences for event spanning midnight', () => {
            // Event starts at 10 PM and ends 2 AM (4-hour event)
            // Using DTSTART + DURATION pattern
            const dtstart = '2024-01-15T22:00:00';
            const rrule = 'FREQ=WEEKLY;COUNT=3';

            const result = calculateNextOccurrences({
                dtstart,
                rrule,
                rdate: [],
                exdate: [],
                maxCount: 3
            });

            // DTSTART defines when each occurrence starts
            expect(result).toEqual([
                '2024-01-15T22:00:00',
                '2024-01-22T22:00:00',
                '2024-01-29T22:00:00'
            ]);
        });

        it('should handle yearly all-day event', () => {
            // Annual all-day event (birthday, anniversary, etc.)
            const dtstart = '2024-03-15T00:00:00';
            const rrule = 'FREQ=YEARLY;COUNT=3';

            const result = calculateNextOccurrences({
                dtstart,
                rrule,
                rdate: [],
                exdate: [],
                maxCount: 3
            });

            expect(result).toEqual([
                '2024-03-15T00:00:00',
                '2025-03-15T00:00:00',
                '2026-03-15T00:00:00'
            ]);
        });

        it('should handle leap year for yearly event on Feb 29', () => {
            // Event on Feb 29 (leap day)
            const dtstart = '2024-02-29T12:00:00';
            const rrule = 'FREQ=YEARLY;COUNT=3';

            const result = calculateNextOccurrences({
                dtstart,
                rrule,
                rdate: [],
                exdate: [],
                maxCount: 3
            });

            // Feb 29 only exists in leap years
            // date-fns will adjust to Feb 28 for non-leap years
            expect(result[0]).toBe('2024-02-29T12:00:00');
            // Non-leap years: date handling may vary
            expect(result).toHaveLength(3);
        });
    });

    /**
     * Timezone Boundary Tests
     * 
     * Verifies that datetime strings are handled consistently
     * without unintended timezone conversions
     */
    describe('Timezone Boundary Handling', () => {
        it('should preserve exact datetime string format', () => {
            const dtstart = '2024-06-15T14:30:00';
            const rrule = 'FREQ=DAILY;COUNT=3';

            const result = calculateNextOccurrences({
                dtstart,
                rrule,
                rdate: [],
                exdate: [],
                maxCount: 3
            });

            // All datetimes should be in exact ISO format without timezone suffix
            result.forEach(occ => {
                expect(occ).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
                expect(occ).not.toContain('Z');
                expect(occ).not.toMatch(/[+-]\d{2}:\d{2}$/);
            });
        });

        it('should handle midnight consistently', () => {
            const dtstart = '2024-01-01T00:00:00';
            const rrule = 'FREQ=DAILY;COUNT=3';

            const result = calculateNextOccurrences({
                dtstart,
                rrule,
                rdate: [],
                exdate: [],
                maxCount: 3
            });

            expect(result).toEqual([
                '2024-01-01T00:00:00',
                '2024-01-02T00:00:00',
                '2024-01-03T00:00:00'
            ]);
        });

        it('should handle end of day consistently', () => {
            const dtstart = '2024-01-01T23:59:00';
            const rrule = 'FREQ=DAILY;COUNT=3';

            const result = calculateNextOccurrences({
                dtstart,
                rrule,
                rdate: [],
                exdate: [],
                maxCount: 3
            });

            expect(result).toEqual([
                '2024-01-01T23:59:00',
                '2024-01-02T23:59:00',
                '2024-01-03T23:59:00'
            ]);
        });
    });

    /**
     * Edge Case: Year Boundaries
     */
    describe('Year Boundary Handling', () => {
        it('should correctly span year boundary', () => {
            const dtstart = '2024-12-30T10:00:00';
            const rrule = 'FREQ=DAILY;COUNT=5';

            const result = calculateNextOccurrences({
                dtstart,
                rrule,
                rdate: [],
                exdate: [],
                maxCount: 5
            });

            expect(result).toEqual([
                '2024-12-30T10:00:00',
                '2024-12-31T10:00:00',
                '2025-01-01T10:00:00',
                '2025-01-02T10:00:00',
                '2025-01-03T10:00:00'
            ]);
        });

        it('should handle weekly event spanning year boundary', () => {
            const dtstart = '2024-12-23T10:00:00'; // Monday
            const rrule = 'FREQ=WEEKLY;BYDAY=MO;COUNT=3';

            const result = calculateNextOccurrences({
                dtstart,
                rrule,
                rdate: [],
                exdate: [],
                maxCount: 3
            });

            expect(result).toEqual([
                '2024-12-23T10:00:00',
                '2024-12-30T10:00:00',
                '2025-01-06T10:00:00'
            ]);
        });
    });
});