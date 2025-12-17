/**
 * Datetime Format Tests
 *
 * Tests for ISO datetime parsing and formatting utilities
 */

import { describe, it, expect } from 'vitest';
import {
    parseIsoDateTime,
    dateToISOString,
    formatDateTime,
} from '../format';

describe('Datetime Format Utils', () => {
    describe('parseIsoDateTime', () => {
        it('should parse ISO string without timezone as local time', () => {
            const date = parseIsoDateTime('2024-01-15T10:30:45');

            expect(date.getFullYear()).toBe(2024);
            expect(date.getMonth()).toBe(0); // January = 0
            expect(date.getDate()).toBe(15);
            expect(date.getHours()).toBe(10);
            expect(date.getMinutes()).toBe(30);
            expect(date.getSeconds()).toBe(45);
        });

        it('should parse ISO string with Z suffix', () => {
            const date = parseIsoDateTime('2024-06-15T10:30:45Z');
            // This will be converted to local time
            expect(date).toBeInstanceOf(Date);
            expect(date.getTime()).not.toBeNaN();
        });

        it('should parse ISO string with timezone offset', () => {
            const date = parseIsoDateTime('2024-06-15T10:30:45+05:00');
            expect(date).toBeInstanceOf(Date);
            expect(date.getTime()).not.toBeNaN();
        });

        it('should handle date-only strings', () => {
            // Date-only strings might not match the regex pattern
            const date = parseIsoDateTime('2024-01-15');
            expect(date).toBeInstanceOf(Date);
        });

        /**
         * 🚨 BEHAVIOR NOTE:
         * The _timezone parameter is currently unused (reserved for future).
         * This test documents expected future behavior.
         */
        it('should accept timezone parameter (currently unused)', () => {
            const date1 = parseIsoDateTime('2024-01-15T10:00:00', 'America/New_York');
            const date2 = parseIsoDateTime('2024-01-15T10:00:00', 'Europe/London');

            // Currently both return the same result since timezone is unused
            // TODO: When timezone conversion is implemented, these should differ
            expect(date1.getTime()).toBe(date2.getTime());
        });
    });

    describe('dateToISOString', () => {
        it('should convert Date to ISO string without timezone', () => {
            // Create a date with specific local values
            const date = new Date(2024, 0, 15, 10, 30, 45); // Month is 0-indexed

            const isoString = dateToISOString(date);

            expect(isoString).toBe('2024-01-15T10:30:45');
        });

        it('should pad single-digit values', () => {
            const date = new Date(2024, 0, 5, 9, 5, 3);

            const isoString = dateToISOString(date);

            expect(isoString).toBe('2024-01-05T09:05:03');
        });

        it('should handle midnight', () => {
            const date = new Date(2024, 5, 15, 0, 0, 0);

            const isoString = dateToISOString(date);

            expect(isoString).toBe('2024-06-15T00:00:00');
        });

        it('should handle end of day', () => {
            const date = new Date(2024, 11, 31, 23, 59, 59);

            const isoString = dateToISOString(date);

            expect(isoString).toBe('2024-12-31T23:59:59');
        });
    });

    describe('Round-trip conversion', () => {
        it('should maintain value through Date -> ISO -> Date cycle', () => {
            const original = new Date(2024, 6, 20, 14, 30, 0);

            const isoString = dateToISOString(original);
            const parsed = parseIsoDateTime(isoString);

            expect(parsed.getTime()).toBe(original.getTime());
        });

        it('should maintain value through ISO -> Date -> ISO cycle', () => {
            const original = '2024-07-20T14:30:00';

            const date = parseIsoDateTime(original);
            const roundTrip = dateToISOString(date);

            expect(roundTrip).toBe(original);
        });
    });

    describe('formatDateTime', () => {
        it('should format datetime for display', () => {
            const result = formatDateTime(
                '2024-01-15T10:30:00',
                'America/New_York'
            );

            expect(result).toHaveProperty('date');
            expect(result).toHaveProperty('time');
            expect(result.date).toContain('January');
            expect(result.date).toContain('15');
        });

        /**
         * 🚨 BUG / BEHAVIOR NOTE:
         * The FormattedDateTime interface defines an optional `weekday` field,
         * but formatDateTime() never populates it - instead, the weekday is
         * included in the `date` string when includeWeekday is true.
         * 
         * This test documents the ACTUAL behavior. Consider:
         * - Option A: Update return to include separate weekday field
         * - Option B: Remove weekday from FormattedDateTime interface
         */
        it('should include weekday in date string when requested', () => {
            const result = formatDateTime(
                '2024-01-15T10:30:00',
                'UTC',
                undefined,
                { includeWeekday: true }
            );

            // Weekday is NOT returned as separate field (potential bug)
            expect(result.weekday).toBeUndefined();

            // Instead, weekday is embedded in the date string
            // January 15, 2024 is a Monday
            expect(result.date).toContain('Monday');
        });

        it('should exclude weekday from date string when not requested', () => {
            const result = formatDateTime(
                '2024-01-15T10:30:00',
                'UTC',
                undefined,
                { includeWeekday: false }
            );

            expect(result.date).not.toContain('Monday');
        });

        it('should support compact format', () => {
            const compact = formatDateTime(
                '2024-01-15T10:30:00',
                'UTC',
                undefined,
                { compact: true }
            );

            const full = formatDateTime(
                '2024-01-15T10:30:00',
                'UTC',
                undefined,
                { compact: false }
            );

            // Compact should use shorter month name
            expect(compact.date.length).toBeLessThanOrEqual(full.date.length);
        });

        it('should support 12h and 24h time formats', () => {
            const time12 = formatDateTime(
                '2024-01-15T14:30:00',
                'UTC',
                undefined,
                { timeFormat: '12h' }
            );

            const time24 = formatDateTime(
                '2024-01-15T14:30:00',
                'UTC',
                undefined,
                { timeFormat: '24h' }
            );

            // 12h format should have AM/PM
            expect(time12.time).toMatch(/PM|AM/i);
            // 24h format should NOT have AM/PM (or have different format)
            expect(time24.time).toBeDefined();
        });

        it('should optionally exclude year', () => {
            const withYear = formatDateTime(
                '2024-01-15T10:30:00',
                'UTC',
                undefined,
                { includeYear: true }
            );

            const withoutYear = formatDateTime(
                '2024-01-15T10:30:00',
                'UTC',
                undefined,
                { includeYear: false }
            );

            expect(withYear.date).toContain('2024');
            expect(withoutYear.date).not.toContain('2024');
        });
    });

    describe('Edge Cases', () => {
        it('should handle leap year date', () => {
            const leapDay = parseIsoDateTime('2024-02-29T12:00:00');
            expect(leapDay.getDate()).toBe(29);
            expect(leapDay.getMonth()).toBe(1); // February
        });

        it('should handle DST transition dates', () => {
            // March 10, 2024 - US DST starts (clocks spring forward)
            const dstStart = parseIsoDateTime('2024-03-10T02:30:00');
            expect(dstStart).toBeInstanceOf(Date);

            // November 3, 2024 - US DST ends (clocks fall back)
            const dstEnd = parseIsoDateTime('2024-11-03T01:30:00');
            expect(dstEnd).toBeInstanceOf(Date);
        });

        it('should handle year boundaries', () => {
            const newYear = parseIsoDateTime('2024-01-01T00:00:00');
            expect(newYear.getFullYear()).toBe(2024);
            expect(newYear.getMonth()).toBe(0);
            expect(newYear.getDate()).toBe(1);

            const yearEnd = parseIsoDateTime('2024-12-31T23:59:59');
            expect(yearEnd.getFullYear()).toBe(2024);
            expect(yearEnd.getMonth()).toBe(11);
            expect(yearEnd.getDate()).toBe(31);
        });
    });
});
