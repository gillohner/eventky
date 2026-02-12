/**
 * Test for timezone-aware recurrence calculation
 * Verifies fix for issue where recurring events were calculated in local browser time
 * instead of the event's timezone
 */

import { describe, it, expect } from "vitest";
import { calculateNextOccurrences } from "../rrule-utils";

describe("Timezone-aware recurrence calculation", () => {
    it("should calculate occurrences in event timezone, not browser timezone", () => {
        // Event from user's bug report:
        // Weekly standup starting Jan 20, 2026 at 09:00:21 in Europe/Berlin
        // Should repeat weekly for 4 occurrences
        const dtstart = "2026-01-20T09:00:21";
        const dtstartTzid = "Europe/Berlin";
        const rrule = "FREQ=WEEKLY;COUNT=4";

        const occurrences = calculateNextOccurrences({
            rrule,
            dtstart,
            dtstartTzid,
            maxCount: 4,
        });

        // Expected occurrences (all at 09:00:21 Europe/Berlin time):
        // 1. Jan 20, 2026 (Monday)
        // 2. Jan 27, 2026 (Monday)
        // 3. Feb 3, 2026 (Monday)
        // 4. Feb 10, 2026 (Monday)
        expect(occurrences).toHaveLength(4);
        expect(occurrences[0]).toBe("2026-01-20T09:00:21");
        expect(occurrences[1]).toBe("2026-01-27T09:00:21");
        expect(occurrences[2]).toBe("2026-02-03T09:00:21");
        expect(occurrences[3]).toBe("2026-02-10T09:00:21");

        // These dates should NOT be in the results (they were incorrectly calculated before the fix):
        expect(occurrences).not.toContain("2026-02-17T09:00:21");
        expect(occurrences).not.toContain("2026-02-24T09:00:21");
        expect(occurrences).not.toContain("2026-03-03T09:00:21");
    });

    it("should handle recurring events without timezone (backward compatibility)", () => {
        // When no timezone is provided, should use local time (old behavior)
        const dtstart = "2026-01-20T09:00:21";
        const rrule = "FREQ=WEEKLY;COUNT=4";

        const occurrences = calculateNextOccurrences({
            rrule,
            dtstart,
            // No dtstartTzid provided
            maxCount: 4,
        });

        // Should still generate 4 occurrences
        expect(occurrences).toHaveLength(4);
        expect(occurrences[0]).toBe("2026-01-20T09:00:21");
        // Subsequent occurrences depend on local timezone, but should be one week apart
        const date1 = new Date(occurrences[0]);
        const date2 = new Date(occurrences[1]);
        const diffDays = (date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24);
        expect(diffDays).toBe(7);
    });

    it("should calculate occurrences correctly in Tokyo timezone", () => {
        // Test with an event in Tokyo (no DST transitions)
        const dtstart = "2026-01-20T14:00:00";
        const dtstartTzid = "Asia/Tokyo";
        const rrule = "FREQ=WEEKLY;COUNT=3";

        const occurrences = calculateNextOccurrences({
            rrule,
            dtstart,
            dtstartTzid,
            maxCount: 3,
        });

        expect(occurrences).toHaveLength(3);
        expect(occurrences[0]).toBe("2026-01-20T14:00:00");
        expect(occurrences[1]).toBe("2026-01-27T14:00:00");
        expect(occurrences[2]).toBe("2026-02-03T14:00:00");

        // All occurrences should maintain the same wall-clock time (14:00:00)
        occurrences.forEach(occ => {
            expect(occ).toMatch(/T14:00:00$/);
        });
    });
});
