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
});