/**
 * RRULE Calculation Tests
 * 
 * Tests for RFC 5545 recurrence rule calculations.
 * 
 * 🚨 FLAGGED ISSUES:
 * - Original test file used incorrect property names (startDate vs dtstart, rdates vs rdate)
 *   This indicates a mismatch between test expectations and actual API
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
         * 🚨 POTENTIAL BUG / BEHAVIOR NOTE:
         * 
         * Current behavior: When EXDATE excludes an occurrence, the generator produces
         * EXTRA occurrences to compensate, so COUNT results are returned regardless.
         * 
         * With COUNT=4 and 1 EXDATE:
         * - Generator creates: Feb, Mar, Apr, May (4 non-excluded after skipping Feb)
         * - Plus start date Jan = 5 candidates  
         * - Feb excluded = 4 final results
         * 
         * RFC 5545 interpretation options:
         * A) COUNT=4 means "generate 4 candidates, then apply EXDATE" → 3 results
         * B) COUNT=4 means "return 4 results after EXDATE" → 4 results (current)
         * 
         * Current implementation uses interpretation B (user-friendly for UI)
         * but may differ from strict RFC 5545 compliance.
         * 
         * TODO: Decide which behavior is correct for Eventky use case.
         */
        it('should exclude specific dates from monthly pattern (current behavior: COUNT after exclusions)', () => {
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

            // Current behavior: COUNT applies to non-excluded occurrences
            // So we still get 4 results (Jan, Mar, Apr, May) even with 1 exclusion
            expect(result).toHaveLength(4);
            expect(result).toEqual([
                '2024-01-21T10:00:00',
                // '2024-02-21T10:00:00', // Excluded by EXDATE
                '2024-03-21T10:00:00',
                '2024-04-21T10:00:00',
                '2024-05-21T10:00:00'  // Extra generated to compensate for exclusion
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

            // With current behavior (COUNT after exclusions), we get 5 results
            // Generator compensates for 2 exclusions
            expect(result).toContain('2024-01-15T14:00:00');
            expect(result).not.toContain('2024-01-22T14:00:00'); // Excluded
            expect(result).toContain('2024-01-29T14:00:00');
            expect(result).not.toContain('2024-02-05T14:00:00'); // Excluded
            expect(result).toContain('2024-02-12T14:00:00');
        });
    });
});