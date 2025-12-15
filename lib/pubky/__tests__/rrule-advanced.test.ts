import { describe, it, expect } from '@jest/globals';
import { calculateNextOccurrences } from '../rrule-utils';

describe('Advanced RRULE Patterns', () => {
    describe('BYMONTHDAY - Every 21st of each month', () => {
        it('should generate correct dates for 21st of each month', () => {
            const startDate = '2024-01-21T10:00:00';
            const rrule = 'FREQ=MONTHLY;BYMONTHDAY=21;COUNT=3';
            
            const result = calculateNextOccurrences({
                startDate,
                rrule,
                rdates: [],
                exdates: [],
                maxCount: 5
            });

            expect(result).toEqual([
                '2024-01-21T10:00:00',
                '2024-02-21T10:00:00',
                '2024-03-21T10:00:00'
            ]);
        });

        it('should handle last day of month with negative BYMONTHDAY', () => {
            const startDate = '2024-01-31T10:00:00';
            const rrule = 'FREQ=MONTHLY;BYMONTHDAY=-1;COUNT=4';
            
            const result = calculateNextOccurrences({
                startDate,
                rrule,
                rdates: [],
                exdates: [],
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
            const startDate = '2024-01-25T10:00:00'; // Last Thursday of Jan 2024
            const rrule = 'FREQ=MONTHLY;BYDAY=TH;BYSETPOS=-1;COUNT=3';
            
            const result = calculateNextOccurrences({
                startDate,
                rrule,
                rdates: [],
                exdates: [],
                maxCount: 5
            });

            expect(result).toEqual([
                '2024-01-25T10:00:00', // Last Thu of Jan
                '2024-02-29T10:00:00', // Last Thu of Feb
                '2024-03-28T10:00:00'  // Last Thu of Mar
            ]);
        });

        it('should generate first Monday of each month', () => {
            const startDate = '2024-01-01T10:00:00'; // First Monday of Jan 2024
            const rrule = 'FREQ=MONTHLY;BYDAY=MO;BYSETPOS=1;COUNT=3';
            
            const result = calculateNextOccurrences({
                startDate,
                rrule,
                rdates: [],
                exdates: [],
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
            const startDate = '2024-01-01T10:00:00';
            const rrule = 'FREQ=WEEKLY;INTERVAL=4;COUNT=3';
            
            const result = calculateNextOccurrences({
                startDate,
                rrule,
                rdates: [],
                exdates: [],
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
        it('should exclude specific dates from monthly pattern', () => {
            const startDate = '2024-01-21T10:00:00';
            const rrule = 'FREQ=MONTHLY;BYMONTHDAY=21;COUNT=4';
            const exdates = ['2024-02-21T10:00:00']; // Exclude February
            
            const result = calculateNextOccurrences({
                startDate,
                rrule,
                rdates: [],
                exdates,
                maxCount: 5
            });

            expect(result).toEqual([
                '2024-01-21T10:00:00',
                // '2024-02-21T10:00:00', // Excluded
                '2024-03-21T10:00:00',
                '2024-04-21T10:00:00'
            ]);
        });
    });
});
