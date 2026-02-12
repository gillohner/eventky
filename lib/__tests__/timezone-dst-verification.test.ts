/**
 * DST Transition Verification Test
 * Verifies that recurring events maintain wall-clock time across DST boundaries
 */

import { describe, it, expect } from "vitest";
import { calculateNextOccurrences } from "@/lib/pubky/rrule-utils";
import { parseIsoInTimezone } from "@/lib/datetime";

describe("DST Transition Deep Verification", () => {
    it("should maintain 10:00 AM wall-clock time across spring DST in NYC", () => {
        // DST starts March 9, 2026 at 2:00 AM in America/New_York
        // Weekly event starting March 2 (before DST) at 10:00 AM
        const dtstart = "2026-03-02T10:00:00";
        const dtstartTzid = "America/New_York";
        const rrule = "FREQ=WEEKLY;COUNT=3";

        const occurrences = calculateNextOccurrences({
            rrule,
            dtstart,
            dtstartTzid,
            maxCount: 3,
        });

        expect(occurrences).toHaveLength(3);

        // All should maintain 10:00 wall-clock time
        expect(occurrences[0]).toBe("2026-03-02T10:00:00"); // Before DST (EST)
        expect(occurrences[1]).toBe("2026-03-09T10:00:00"); // After DST (EDT)
        expect(occurrences[2]).toBe("2026-03-16T10:00:00"); // After DST (EDT)

        // Verify UTC times are correct
        const date0 = parseIsoInTimezone(occurrences[0], dtstartTzid);
        const date1 = parseIsoInTimezone(occurrences[1], dtstartTzid);
        const date2 = parseIsoInTimezone(occurrences[2], dtstartTzid);

        // Before DST: 10:00 EST = 15:00 UTC
        expect(date0.getUTCHours()).toBe(15);

        // After DST: 10:00 EDT = 14:00 UTC (one hour less because clock moved forward)
        expect(date1.getUTCHours()).toBe(14);
        expect(date2.getUTCHours()).toBe(14);

        // The UTC time difference should account for DST
        const weekInMs = 7 * 24 * 60 * 60 * 1000;
        const diff0to1 = date1.getTime() - date0.getTime();
        const diff1to2 = date2.getTime() - date1.getTime();

        // First week crosses DST (loses an hour), so only 6 days 23 hours worth of milliseconds
        expect(diff0to1).toBe(weekInMs - 60 * 60 * 1000); // One hour less

        // Second week is after DST, should be exactly 7 days
        expect(diff1to2).toBe(weekInMs);
    });

    it("should maintain 10:00 AM wall-clock time across fall DST in NYC", () => {
        // DST ends November 1, 2026 at 2:00 AM in America/New_York
        // Weekly event starting October 25 (before end of DST) at 10:00 AM
        const dtstart = "2026-10-25T10:00:00";
        const dtstartTzid = "America/New_York";
        const rrule = "FREQ=WEEKLY;COUNT=3";

        const occurrences = calculateNextOccurrences({
            rrule,
            dtstart,
            dtstartTzid,
            maxCount: 3,
        });

        expect(occurrences).toHaveLength(3);

        // All should maintain 10:00 wall-clock time
        expect(occurrences[0]).toBe("2026-10-25T10:00:00"); // EDT
        expect(occurrences[1]).toBe("2026-11-01T10:00:00"); // EST (DST ended)
        expect(occurrences[2]).toBe("2026-11-08T10:00:00"); // EST

        // Verify UTC times
        const date0 = parseIsoInTimezone(occurrences[0], dtstartTzid);
        const date1 = parseIsoInTimezone(occurrences[1], dtstartTzid);
        const date2 = parseIsoInTimezone(occurrences[2], dtstartTzid);

        // Before DST ends: 10:00 EDT = 14:00 UTC
        expect(date0.getUTCHours()).toBe(14);

        // After DST ends: 10:00 EST = 15:00 UTC (one hour more because clock moved back)
        expect(date1.getUTCHours()).toBe(15);
        expect(date2.getUTCHours()).toBe(15);

        // The UTC time difference should account for DST
        const weekInMs = 7 * 24 * 60 * 60 * 1000;
        const diff0to1 = date1.getTime() - date0.getTime();
        const diff1to2 = date2.getTime() - date1.getTime();

        // First week crosses DST end (gains an hour), so 7 days 1 hour worth of milliseconds
        expect(diff0to1).toBe(weekInMs + 60 * 60 * 1000); // One hour more

        // Second week is after DST, should be exactly 7 days
        expect(diff1to2).toBe(weekInMs);
    });

    it("should verify calendar grouping with timezone edge case", () => {
        // Event at 23:00 Tokyo (Jan 20) should appear on correct day for different viewers
        const dtstart = "2026-01-20T23:00:00";
        const dtstartTzid = "Asia/Tokyo";

        const eventDate = parseIsoInTimezone(dtstart, dtstartTzid);

        // Tokyo 23:00 Jan 20 = 14:00 UTC Jan 20
        expect(eventDate.toISOString()).toBe("2026-01-20T14:00:00.000Z");

        // In NYC (UTC-5): 14:00 UTC = 09:00 EST = Jan 20
        // In London (UTC+0): 14:00 UTC = 14:00 GMT = Jan 20
        // In Sydney (UTC+11): 14:00 UTC = 01:00 AEDT = Jan 21

        // Browser's format() will show different days for different local timezones
        // This is CORRECT - calendar should show events on the day they occur in YOUR timezone
    });
});
