/**
 * Validation Tests - pubky-app-specs Integration
 * 
 * Tests that verify eventky correctly uses pubky-app-specs validation functions
 * for RRULE, datetime, duration, and other RFC 5545 components.
 */

import { describe, it, expect } from 'vitest';
import {
    validateRrule,
    validateDuration,
    validateTimezone,
    getValidEventStatuses,
    getValidRsvpStatuses,
} from '@eventky/pubky-app-specs';

describe('pubky-app-specs Validation Integration', () => {
    describe('RRULE Validation', () => {
        describe('Valid RRULEs', () => {
            it('should accept basic frequency rules', () => {
                expect(validateRrule('FREQ=DAILY')).toBe(true);
                expect(validateRrule('FREQ=WEEKLY')).toBe(true);
                expect(validateRrule('FREQ=MONTHLY')).toBe(true);
                expect(validateRrule('FREQ=YEARLY')).toBe(true);
            });

            it('should accept rules with INTERVAL', () => {
                expect(validateRrule('FREQ=DAILY;INTERVAL=2')).toBe(true);
                expect(validateRrule('FREQ=WEEKLY;INTERVAL=4')).toBe(true);
            });

            it('should accept rules with COUNT', () => {
                expect(validateRrule('FREQ=DAILY;COUNT=10')).toBe(true);
                expect(validateRrule('FREQ=WEEKLY;COUNT=52')).toBe(true);
            });

            it('should accept rules with UNTIL', () => {
                expect(validateRrule('FREQ=DAILY;UNTIL=2024-12-31T23:59:59')).toBe(true);
            });

            it('should accept rules with BYDAY', () => {
                expect(validateRrule('FREQ=WEEKLY;BYDAY=MO')).toBe(true);
                expect(validateRrule('FREQ=WEEKLY;BYDAY=MO,WE,FR')).toBe(true);
                expect(validateRrule('FREQ=MONTHLY;BYDAY=-1TH')).toBe(true); // Last Thursday
                expect(validateRrule('FREQ=MONTHLY;BYDAY=2FR')).toBe(true); // Second Friday
            });

            it('should accept rules with BYMONTHDAY', () => {
                expect(validateRrule('FREQ=MONTHLY;BYMONTHDAY=15')).toBe(true);
                expect(validateRrule('FREQ=MONTHLY;BYMONTHDAY=-1')).toBe(true); // Last day
                expect(validateRrule('FREQ=MONTHLY;BYMONTHDAY=1,15')).toBe(true);
            });

            it('should accept rules with BYSETPOS', () => {
                expect(validateRrule('FREQ=MONTHLY;BYDAY=TH;BYSETPOS=-1')).toBe(true); // Last Thursday
                expect(validateRrule('FREQ=MONTHLY;BYDAY=MO;BYSETPOS=1')).toBe(true); // First Monday
            });

            it('should accept complex rules', () => {
                expect(validateRrule('FREQ=MONTHLY;BYDAY=TH;BYSETPOS=-1;COUNT=12')).toBe(true);
                expect(validateRrule('FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE,FR;COUNT=26')).toBe(true);
            });
        });

        describe('Invalid RRULEs', () => {
            it('should reject empty string', () => {
                expect(validateRrule('')).toBe(false);
            });

            it('should reject missing FREQ', () => {
                expect(validateRrule('INTERVAL=2')).toBe(false);
                expect(validateRrule('COUNT=10')).toBe(false);
            });

            it('should reject invalid frequency', () => {
                expect(validateRrule('FREQ=HOURLY')).toBe(false);
                expect(validateRrule('FREQ=INVALID')).toBe(false);
            });

            it('should reject invalid INTERVAL', () => {
                expect(validateRrule('FREQ=DAILY;INTERVAL=0')).toBe(false);
                expect(validateRrule('FREQ=DAILY;INTERVAL=1000')).toBe(false);
            });

            it('should reject having both COUNT and UNTIL', () => {
                expect(validateRrule('FREQ=DAILY;COUNT=10;UNTIL=2024-12-31T23:59:59')).toBe(false);
            });

            it('should reject invalid BYDAY', () => {
                expect(validateRrule('FREQ=WEEKLY;BYDAY=XX')).toBe(false);
                expect(validateRrule('FREQ=MONTHLY;BYDAY=100MO')).toBe(false);
            });

            it('should reject invalid BYMONTHDAY', () => {
                expect(validateRrule('FREQ=MONTHLY;BYMONTHDAY=32')).toBe(false);
                expect(validateRrule('FREQ=MONTHLY;BYMONTHDAY=0')).toBe(false);
                expect(validateRrule('FREQ=MONTHLY;BYMONTHDAY=-32')).toBe(false);
            });
        });
    });

    describe('Duration Validation', () => {
        describe('Valid Durations', () => {
            it('should accept ISO 8601 durations', () => {
                expect(validateDuration('PT1H')).toBe(true);       // 1 hour
                expect(validateDuration('PT30M')).toBe(true);      // 30 minutes
                expect(validateDuration('PT1H30M')).toBe(true);    // 1 hour 30 minutes
                expect(validateDuration('P1D')).toBe(true);        // 1 day
                expect(validateDuration('P1DT2H')).toBe(true);     // 1 day 2 hours
                expect(validateDuration('PT1H30M45S')).toBe(true); // 1h 30m 45s
            });
        });

        describe('Invalid Durations', () => {
            it('should reject missing P prefix', () => {
                expect(validateDuration('T1H')).toBe(false);
                expect(validateDuration('1H')).toBe(false);
            });

            it('should reject invalid characters', () => {
                expect(validateDuration('P1X')).toBe(false);
            });
        });
    });

    describe('Timezone Validation', () => {
        describe('Valid Timezones', () => {
            it('should accept IANA timezone names', () => {
                expect(validateTimezone('Europe/Zurich')).toBe(true);
                expect(validateTimezone('America/New_York')).toBe(true);
                expect(validateTimezone('Asia/Tokyo')).toBe(true);
                expect(validateTimezone('Pacific/Auckland')).toBe(true);
            });

            it('should accept UTC and UTC offsets', () => {
                expect(validateTimezone('UTC')).toBe(true);
                expect(validateTimezone('UTC+5')).toBe(true);
                expect(validateTimezone('UTC-8')).toBe(true);
            });
        });

        describe('Invalid Timezones', () => {
            it('should reject invalid timezone formats', () => {
                expect(validateTimezone('')).toBe(false);
                expect(validateTimezone('Invalid')).toBe(false); // No slash
            });
        });
    });

    describe('Event Status Values', () => {
        it('should return valid RFC 5545 event statuses', () => {
            const statuses = getValidEventStatuses();
            expect(statuses).toContain('CONFIRMED');
            expect(statuses).toContain('TENTATIVE');
            expect(statuses).toContain('CANCELLED');
        });
    });

    describe('RSVP Status Values', () => {
        it('should return valid RFC 5545 RSVP statuses', () => {
            const statuses = getValidRsvpStatuses();
            expect(statuses).toContain('NEEDS-ACTION');
            expect(statuses).toContain('ACCEPTED');
            expect(statuses).toContain('DECLINED');
            expect(statuses).toContain('TENTATIVE');
        });
    });
});
