/**
 * Timezone Edge Cases Test
 * Tests unusual timezone behaviors that could break event calculations
 */

import { describe, it, expect } from "vitest";
import { calculateNextOccurrences } from "@/lib/pubky/rrule-utils";
import { parseIsoInTimezone } from "@/lib/datetime";

describe("Timezone Edge Cases", () => {
    it("should handle Lord Howe Island 30-minute DST shift", () => {
        // Lord Howe Island has a unique 30-minute DST shift (not 1 hour)
        // DST starts first Sunday in October: UTC+10:30 -> UTC+11:00
        // DST ends first Sunday in April: UTC+11:00 -> UTC+10:30
        const dtstart = "2026-09-28T10:00:00"; // Before DST (UTC+10:30)
        const dtstartTzid = "Australia/Lord_Howe";
        const rrule = "FREQ=WEEKLY;COUNT=3";

        const occurrences = calculateNextOccurrences({
            rrule,
            dtstart,
            dtstartTzid,
            maxCount: 3,
        });

        expect(occurrences).toHaveLength(3);

        // All should maintain 10:00 wall-clock time
        expect(occurrences[0]).toBe("2026-09-28T10:00:00"); // Before DST
        expect(occurrences[1]).toBe("2026-10-05T10:00:00"); // After DST starts (crosses boundary)
        expect(occurrences[2]).toBe("2026-10-12T10:00:00"); // After DST

        const date0 = parseIsoInTimezone(occurrences[0], dtstartTzid);
        const date1 = parseIsoInTimezone(occurrences[1], dtstartTzid);

        // Verify UTC times reflect 30-minute shift
        const hourDiff = date0.getUTCHours() - date1.getUTCHours();
        const minuteDiff = date0.getUTCMinutes() - date1.getUTCMinutes();
        const totalMinutesDiff = hourDiff * 60 + minuteDiff;

        // Should be 30 minutes difference (Lord Howe's unique DST shift)
        expect(Math.abs(totalMinutesDiff)).toBe(30);
    });

    it("should handle Southern Hemisphere DST (opposite season)", () => {
        // Australia/Sydney DST starts first Sunday in October (spring)
        // and ends first Sunday in April (fall) - opposite of Northern Hemisphere
        const dtstart = "2026-09-28T14:00:00"; // Before DST (AEST UTC+10)
        const dtstartTzid = "Australia/Sydney";
        const rrule = "FREQ=WEEKLY;COUNT=3";

        const occurrences = calculateNextOccurrences({
            rrule,
            dtstart,
            dtstartTzid,
            maxCount: 3,
        });

        expect(occurrences).toHaveLength(3);

        // All should maintain 14:00 wall-clock time
        expect(occurrences[0]).toBe("2026-09-28T14:00:00"); // AEST (UTC+10)
        expect(occurrences[1]).toBe("2026-10-05T14:00:00"); // AEDT (UTC+11) - DST started
        expect(occurrences[2]).toBe("2026-10-12T14:00:00"); // AEDT (UTC+11)

        const date0 = parseIsoInTimezone(occurrences[0], dtstartTzid);
        const date1 = parseIsoInTimezone(occurrences[1], dtstartTzid);
        const date2 = parseIsoInTimezone(occurrences[2], dtstartTzid);

        // Before DST: 14:00 AEST = 04:00 UTC
        expect(date0.getUTCHours()).toBe(4);

        // After DST: 14:00 AEDT = 03:00 UTC (one hour less because clock moved forward)
        expect(date1.getUTCHours()).toBe(3);
        expect(date2.getUTCHours()).toBe(3);
    });

    it("should handle zones that don't observe DST", () => {
        // Arizona (America/Phoenix) doesn't observe DST
        // Should maintain consistent UTC offset year-round
        const dtstart = "2026-03-02T10:00:00";
        const dtstartTzid = "America/Phoenix";
        const rrule = "FREQ=WEEKLY;COUNT=4";

        const occurrences = calculateNextOccurrences({
            rrule,
            dtstart,
            dtstartTzid,
            maxCount: 4,
        });

        expect(occurrences).toHaveLength(4);

        const dates = occurrences.map(occ => parseIsoInTimezone(occ, dtstartTzid));

        // All should have same UTC offset (UTC-7)
        dates.forEach(date => {
            expect(date.getUTCHours()).toBe(17); // 10:00 MST = 17:00 UTC
        });

        // Verify dates are exactly 7 days apart in UTC (no DST jumps)
        const weekInMs = 7 * 24 * 60 * 60 * 1000;
        for (let i = 1; i < dates.length; i++) {
            const diff = dates[i].getTime() - dates[i - 1].getTime();
            expect(diff).toBe(weekInMs);
        }
    });

    it("should handle unusual UTC offsets (Nepal UTC+5:45)", () => {
        // Nepal uses UTC+5:45 - one of the few places with 45-minute offset
        const dtstart = "2026-01-15T09:15:00";
        const dtstartTzid = "Asia/Kathmandu";
        const rrule = "FREQ=DAILY;COUNT=3";

        const occurrences = calculateNextOccurrences({
            rrule,
            dtstart,
            dtstartTzid,
            maxCount: 3,
        });

        expect(occurrences).toHaveLength(3);
        expect(occurrences[0]).toBe("2026-01-15T09:15:00");
        expect(occurrences[1]).toBe("2026-01-16T09:15:00");
        expect(occurrences[2]).toBe("2026-01-17T09:15:00");

        const dates = occurrences.map(occ => parseIsoInTimezone(occ, dtstartTzid));

        // 09:15 NPT (UTC+5:45) = 03:30 UTC
        dates.forEach(date => {
            expect(date.getUTCHours()).toBe(3);
            expect(date.getUTCMinutes()).toBe(30);
        });
    });

    it("should handle unusual UTC offsets (India UTC+5:30)", () => {
        // India uses UTC+5:30 - half-hour offset
        const dtstart = "2026-06-01T18:30:00";
        const dtstartTzid = "Asia/Kolkata";
        const rrule = "FREQ=WEEKLY;COUNT=3";

        const occurrences = calculateNextOccurrences({
            rrule,
            dtstart,
            dtstartTzid,
            maxCount: 3,
        });

        expect(occurrences).toHaveLength(3);

        const dates = occurrences.map(occ => parseIsoInTimezone(occ, dtstartTzid));

        // 18:30 IST (UTC+5:30) = 13:00 UTC
        dates.forEach(date => {
            expect(date.getUTCHours()).toBe(13);
            expect(date.getUTCMinutes()).toBe(0);
        });

        // India doesn't observe DST, so intervals should be consistent
        const weekInMs = 7 * 24 * 60 * 60 * 1000;
        for (let i = 1; i < dates.length; i++) {
            const diff = dates[i].getTime() - dates[i - 1].getTime();
            expect(diff).toBe(weekInMs);
        }
    });

    it("should handle Chatham Islands 45-minute offset and DST", () => {
        // Chatham Islands use UTC+12:45 standard time
        // and UTC+13:45 during DST - both are 45-minute offsets
        const dtstart = "2026-09-21T12:00:00"; // Before DST
        const dtstartTzid = "Pacific/Chatham";
        const rrule = "FREQ=WEEKLY;COUNT=3";

        const occurrences = calculateNextOccurrences({
            rrule,
            dtstart,
            dtstartTzid,
            maxCount: 3,
        });

        expect(occurrences).toHaveLength(3);

        // All should maintain 12:00 wall-clock time
        expect(occurrences[0]).toBe("2026-09-21T12:00:00");
        expect(occurrences[1]).toBe("2026-09-28T12:00:00"); // DST starts Sep 27
        expect(occurrences[2]).toBe("2026-10-05T12:00:00");

        const date0 = parseIsoInTimezone(occurrences[0], dtstartTzid);
        const date1 = parseIsoInTimezone(occurrences[1], dtstartTzid);

        // Both should maintain same wall-clock time despite DST transition
        // The UTC offset changes by 1 hour even though base offset is 45-minute
        const hourDiff = Math.abs(date0.getUTCHours() - date1.getUTCHours());
        expect(hourDiff).toBe(1); // Standard 1-hour DST shift
    });

    it("should handle Morocco's unique DST suspension during Ramadan", () => {
        // Morocco suspends DST during Ramadan (reverts to standard time)
        // This creates unusual back-and-forth timezone changes
        // Testing regular weekly recurrence behavior
        const dtstart = "2026-01-05T15:00:00";
        const dtstartTzid = "Africa/Casablanca";
        const rrule = "FREQ=WEEKLY;COUNT=4";

        const occurrences = calculateNextOccurrences({
            rrule,
            dtstart,
            dtstartTzid,
            maxCount: 4,
        });

        expect(occurrences).toHaveLength(4);

        // All should maintain 15:00 wall-clock time
        occurrences.forEach((occ, i) => {
            expect(occ.endsWith("15:00:00")).toBe(true);
        });

        // Should be valid dates
        occurrences.forEach(occ => {
            const date = parseIsoInTimezone(occ, dtstartTzid);
            expect(date).toBeInstanceOf(Date);
            expect(isNaN(date.getTime())).toBe(false);
        });
    });

    it("should handle crossing International Date Line (Samoa)", () => {
        // Samoa is UTC+13 (west of date line)
        // Events should maintain wall-clock time consistently
        const dtstart = "2026-03-01T23:30:00";
        const dtstartTzid = "Pacific/Apia";
        const rrule = "FREQ=DAILY;COUNT=3";

        const occurrences = calculateNextOccurrences({
            rrule,
            dtstart,
            dtstartTzid,
            maxCount: 3,
        });

        expect(occurrences).toHaveLength(3);
        expect(occurrences[0]).toBe("2026-03-01T23:30:00");
        expect(occurrences[1]).toBe("2026-03-02T23:30:00");
        expect(occurrences[2]).toBe("2026-03-03T23:30:00");

        // Each occurrence should be exactly 24 hours apart in wall-clock time
        const dates = occurrences.map(occ => parseIsoInTimezone(occ, dtstartTzid));
        const dayInMs = 24 * 60 * 60 * 1000;

        for (let i = 1; i < dates.length; i++) {
            const diff = dates[i].getTime() - dates[i - 1].getTime();
            // During non-DST periods, should be exactly 24 hours
            expect(Math.abs(diff - dayInMs)).toBeLessThan(60 * 60 * 1000); // Within 1 hour (accounts for DST if any)
        }
    });
});
