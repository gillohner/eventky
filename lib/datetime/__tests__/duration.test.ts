/**
 * Datetime Duration Tests
 *
 * Tests for ISO 8601 duration parsing and formatting
 */

import { describe, it, expect } from 'vitest';
import {
    parseDuration,
    formatDuration,
    formatDurationMs,
    calculateDuration,
    durationToISO,
    parseDurationComponents,
} from '../duration';

describe('Duration Utils', () => {
    describe('parseDuration (ISO 8601)', () => {
        it('should parse hours and minutes', () => {
            expect(parseDuration('PT1H30M')).toBe(90 * 60 * 1000); // 90 minutes in ms
        });

        it('should parse hours only', () => {
            expect(parseDuration('PT2H')).toBe(2 * 60 * 60 * 1000);
        });

        it('should parse minutes only', () => {
            expect(parseDuration('PT45M')).toBe(45 * 60 * 1000);
        });

        it('should parse days', () => {
            expect(parseDuration('P1D')).toBe(24 * 60 * 60 * 1000);
        });

        it('should parse complex durations', () => {
            // 1 day, 2 hours, 30 minutes, 15 seconds
            expect(parseDuration('P1DT2H30M15S')).toBe(
                (1 * 24 * 60 * 60 + 2 * 60 * 60 + 30 * 60 + 15) * 1000
            );
        });

        it('should parse seconds', () => {
            expect(parseDuration('PT30S')).toBe(30 * 1000);
        });

        it('should return 0 for invalid duration', () => {
            expect(parseDuration('invalid')).toBe(0);
            expect(parseDuration('')).toBe(0);
        });

        /**
         * 🚨 POTENTIAL ISSUE: Edge case handling
         * The regex might not handle all edge cases correctly
         */
        it('should handle edge cases', () => {
            // Just P with no values - should this be 0 or error?
            expect(parseDuration('P')).toBe(0);
            // Just T - should this be 0?
            expect(parseDuration('PT')).toBe(0);
        });
    });

    describe('parseDurationComponents', () => {
        it('should extract all components', () => {
            const components = parseDurationComponents('P2DT3H45M30S');
            expect(components).toEqual({
                days: 2,
                hours: 3,
                minutes: 45,
                seconds: 30,
            });
        });

        it('should handle missing components', () => {
            const components = parseDurationComponents('PT1H');
            expect(components).toEqual({
                days: 0,
                hours: 1,
                minutes: 0,
                seconds: 0,
            });
        });

        it('should handle days only', () => {
            const components = parseDurationComponents('P5D');
            expect(components).toEqual({
                days: 5,
                hours: 0,
                minutes: 0,
                seconds: 0,
            });
        });
    });

    describe('formatDuration', () => {
        it('should format hours and minutes', () => {
            expect(formatDuration('PT1H30M')).toBe('1h 30m');
        });

        it('should format hours only', () => {
            expect(formatDuration('PT1H')).toBe('1 hour');
            expect(formatDuration('PT2H')).toBe('2 hours');
        });

        it('should format minutes only', () => {
            expect(formatDuration('PT45M')).toBe('45 min');
        });
    });

    describe('formatDurationMs', () => {
        it('should format milliseconds to human readable', () => {
            expect(formatDurationMs(90 * 60 * 1000)).toBe('1h 30m');
            expect(formatDurationMs(60 * 60 * 1000)).toBe('1 hour');
            expect(formatDurationMs(2 * 60 * 60 * 1000)).toBe('2 hours');
            expect(formatDurationMs(30 * 60 * 1000)).toBe('30 min');
        });

        it('should handle zero duration', () => {
            expect(formatDurationMs(0)).toBe('0 min');
        });
    });

    describe('calculateDuration', () => {
        it('should calculate duration between two dates', () => {
            const start = new Date('2024-01-15T10:00:00');
            const end = new Date('2024-01-15T11:30:00');

            expect(calculateDuration(start, end)).toBe(90 * 60 * 1000);
        });

        it('should handle same date (zero duration)', () => {
            const date = new Date('2024-01-15T10:00:00');
            expect(calculateDuration(date, date)).toBe(0);
        });

        it('should handle negative duration (end before start)', () => {
            const start = new Date('2024-01-15T11:00:00');
            const end = new Date('2024-01-15T10:00:00');

            // Returns negative value - is this expected behavior?
            expect(calculateDuration(start, end)).toBe(-60 * 60 * 1000);
        });
    });

    describe('durationToISO', () => {
        it('should convert hours and minutes to ISO', () => {
            expect(durationToISO(1, 30)).toBe('PT1H30M');
        });

        it('should handle hours only', () => {
            expect(durationToISO(2, 0)).toBe('PT2H');
        });

        it('should handle minutes only', () => {
            expect(durationToISO(0, 45)).toBe('PT45M');
        });

        it('should return empty string for zero duration', () => {
            expect(durationToISO(0, 0)).toBe('');
        });
    });

    describe('Round-trip conversion', () => {
        it('should maintain value through parse -> format -> parse cycle', () => {
            const original = 'PT2H30M';
            const ms = parseDuration(original);

            // Convert back to ISO
            const hours = Math.floor(ms / (1000 * 60 * 60));
            const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
            const roundTrip = durationToISO(hours, minutes);

            expect(roundTrip).toBe(original);
        });
    });
});
