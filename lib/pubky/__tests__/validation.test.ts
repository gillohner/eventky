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
    validateGeoUri,
    validateLocationType,
    validateConferenceFeatures,
    getValidEventStatuses,
    getValidRsvpStatuses,
} from 'pubky-app-specs';

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

    // =====================================================
    // RFC 5870 / RFC 4589 / RFC 7986 - Location Tests
    // =====================================================

    describe('Geo URI Validation (RFC 5870)', () => {
        describe('Valid Geo URIs', () => {
            it('should accept basic geo URIs', () => {
                expect(validateGeoUri('geo:47.3769,8.5417')).toBe(true);   // Zurich
                expect(validateGeoUri('geo:0,0')).toBe(true);              // Null Island
                expect(validateGeoUri('geo:-90,-180')).toBe(true);         // Min bounds
                expect(validateGeoUri('geo:90,180')).toBe(true);           // Max bounds
            });

            it('should accept geo URIs with uncertainty parameter', () => {
                expect(validateGeoUri('geo:47.3769,8.5417;u=10')).toBe(true);
                expect(validateGeoUri('geo:47.3769,8.5417;u=100')).toBe(true);
            });

            it('should accept geo URIs for major cities', () => {
                expect(validateGeoUri('geo:-33.8688,151.2093')).toBe(true); // Sydney
                expect(validateGeoUri('geo:35.6762,139.6503')).toBe(true);  // Tokyo
                expect(validateGeoUri('geo:40.7128,-74.0060')).toBe(true);  // New York
            });
        });

        describe('Invalid Geo URIs', () => {
            it('should reject URIs missing geo: prefix', () => {
                expect(validateGeoUri('47.3769,8.5417')).toBe(false);
            });

            it('should reject URIs with wrong prefix case', () => {
                expect(validateGeoUri('GEO:47.3769,8.5417')).toBe(false);
            });

            it('should reject URIs missing coordinates', () => {
                expect(validateGeoUri('geo:')).toBe(false);
                expect(validateGeoUri('geo:47.3769')).toBe(false);
            });

            it('should reject out-of-bounds coordinates', () => {
                expect(validateGeoUri('geo:91,0')).toBe(false);    // Lat > 90
                expect(validateGeoUri('geo:-91,0')).toBe(false);   // Lat < -90
                expect(validateGeoUri('geo:0,181')).toBe(false);   // Lon > 180
                expect(validateGeoUri('geo:0,-181')).toBe(false);  // Lon < -180
            });

            it('should reject non-numeric coordinates', () => {
                expect(validateGeoUri('geo:invalid,coords')).toBe(false);
            });

            it('should reject empty string', () => {
                expect(validateGeoUri('')).toBe(false);
            });
        });
    });

    describe('Location Type Validation (RFC 4589)', () => {
        describe('Valid Location Types', () => {
            it('should accept common venue types', () => {
                expect(validateLocationType('venue')).toBe(true);
                expect(validateLocationType('parking')).toBe(true);
                expect(validateLocationType('restaurant')).toBe(true);
                expect(validateLocationType('hotel')).toBe(true);
            });

            it('should accept transportation types', () => {
                expect(validateLocationType('airport')).toBe(true);
                expect(validateLocationType('train-station')).toBe(true);
                expect(validateLocationType('bus-station')).toBe(true);
            });

            it('should accept entertainment venue types', () => {
                expect(validateLocationType('stadium')).toBe(true);
                expect(validateLocationType('theater')).toBe(true);
                expect(validateLocationType('arena')).toBe(true);
            });

            it('should accept generic types', () => {
                expect(validateLocationType('office')).toBe(true);
                expect(validateLocationType('residence')).toBe(true);
                expect(validateLocationType('other')).toBe(true);
            });

            it('should handle case-insensitive input', () => {
                expect(validateLocationType('VENUE')).toBe(true);
                expect(validateLocationType('Parking')).toBe(true);
                expect(validateLocationType('RESTAURANT')).toBe(true);
            });
        });

        describe('Invalid Location Types', () => {
            it('should reject unknown types', () => {
                expect(validateLocationType('invalid_type')).toBe(false);
                expect(validateLocationType('custom-location')).toBe(false);
                expect(validateLocationType('unknown')).toBe(false);
            });

            it('should reject empty string', () => {
                expect(validateLocationType('')).toBe(false);
            });
        });
    });

    describe('Conference Features Validation (RFC 7986)', () => {
        describe('Valid Features', () => {
            it('should accept individual features', () => {
                expect(validateConferenceFeatures(['AUDIO'])).toBe(true);
                expect(validateConferenceFeatures(['VIDEO'])).toBe(true);
                expect(validateConferenceFeatures(['CHAT'])).toBe(true);
                expect(validateConferenceFeatures(['PHONE'])).toBe(true);
                expect(validateConferenceFeatures(['SCREEN'])).toBe(true);
                expect(validateConferenceFeatures(['MODERATOR'])).toBe(true);
                expect(validateConferenceFeatures(['FEED'])).toBe(true);
            });

            it('should accept multiple features', () => {
                expect(validateConferenceFeatures(['AUDIO', 'VIDEO'])).toBe(true);
                expect(validateConferenceFeatures(['VIDEO', 'CHAT', 'SCREEN'])).toBe(true);
                expect(validateConferenceFeatures(['AUDIO', 'VIDEO', 'MODERATOR'])).toBe(true);
            });

            it('should accept all features combined', () => {
                expect(validateConferenceFeatures([
                    'AUDIO', 'VIDEO', 'CHAT', 'PHONE', 'SCREEN', 'MODERATOR', 'FEED'
                ])).toBe(true);
            });

            it('should accept empty array (no features specified)', () => {
                expect(validateConferenceFeatures([])).toBe(true);
            });
        });

        describe('Invalid Features', () => {
            it('should reject unknown features', () => {
                expect(validateConferenceFeatures(['INVALID'])).toBe(false);
                expect(validateConferenceFeatures(['WEBCAM'])).toBe(false);
                expect(validateConferenceFeatures(['RECORDING'])).toBe(false);
            });

            it('should reject arrays with any invalid feature', () => {
                expect(validateConferenceFeatures(['AUDIO', 'INVALID'])).toBe(false);
                expect(validateConferenceFeatures(['VIDEO', 'UNKNOWN', 'CHAT'])).toBe(false);
            });

            // Note: lowercase features ARE valid (normalized to uppercase)
            it('should accept lowercase features (case-insensitive)', () => {
                expect(validateConferenceFeatures(['audio'])).toBe(true);
                expect(validateConferenceFeatures(['video'])).toBe(true);
                expect(validateConferenceFeatures(['Audio', 'Video'])).toBe(true);
            });
        });
    });
});
