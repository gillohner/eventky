/**
 * Comprehensive Timezone Integration Tests
 * Tests the entire event lifecycle with timezone handling to ensure RFC 5545 compliance
 *
 * These tests verify that events are correctly:
 * 1. Parsed in their event timezone
 * 2. Displayed in the user's local timezone
 * 3. Compared for past/future accurately
 * 4. Grouped by date correctly in calendar views
 * 5. Calculated for recurring events with timezone awareness
 */

import { describe, it, expect } from "vitest";
import { parseIsoInTimezone, parseIsoDateTime, formatDateTime, getLocalTimezone } from "@/lib/datetime";
import { calculateNextOccurrences } from "@/lib/pubky/rrule-utils";

describe("Timezone Integration Tests - RFC 5545 Compliance", () => {
    describe("Event Parsing and Display", () => {
        it("should parse event in Tokyo timezone correctly", () => {
            // Event: Jan 20, 2026 14:00:00 in Tokyo (UTC+9)
            const dtstart = "2026-01-20T14:00:00";
            const dtstartTzid = "Asia/Tokyo";

            const eventDate = parseIsoInTimezone(dtstart, dtstartTzid);

            // The UTC instant should be Jan 20, 2026 05:00:00 UTC
            expect(eventDate.toISOString()).toBe("2026-01-20T05:00:00.000Z");
        });

        it("should parse event in New York timezone correctly", () => {
            // Event: Jan 20, 2026 09:00:00 in New York (UTC-5)
            const dtstart = "2026-01-20T09:00:00";
            const dtstartTzid = "America/New_York";

            const eventDate = parseIsoInTimezone(dtstart, dtstartTzid);

            // The UTC instant should be Jan 20, 2026 14:00:00 UTC
            expect(eventDate.toISOString()).toBe("2026-01-20T14:00:00.000Z");
        });

        it("should parse event in Berlin timezone correctly", () => {
            // Event from user's bug report: Jan 20, 2026 09:00:21 in Berlin (UTC+1)
            const dtstart = "2026-01-20T09:00:21";
            const dtstartTzid = "Europe/Berlin";

            const eventDate = parseIsoInTimezone(dtstart, dtstartTzid);

            // The UTC instant should be Jan 20, 2026 08:00:21 UTC
            expect(eventDate.toISOString()).toBe("2026-01-20T08:00:21.000Z");
        });

        it("should format event time in different display timezone", () => {
            // Event: Jan 20, 2026 14:00:00 in Tokyo
            const dtstart = "2026-01-20T14:00:00";
            const dtstartTzid = "Asia/Tokyo";
            const displayTzid = "America/New_York";

            // Format in New York time (should show Jan 20, 00:00:00)
            const formatted = formatDateTime(dtstart, displayTzid, dtstartTzid);

            expect(formatted.time).toBe("00:00");
            expect(formatted.date).toContain("January 20"); // Same day but different time
        });
    });

    describe("Past/Future Event Comparison", () => {
        it("should correctly identify past events across timezones", () => {
            // Event: Yesterday at 23:00 in Tokyo
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            yesterday.setHours(23, 0, 0, 0);

            const dtstart = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}T23:00:00`;
            const dtstartTzid = "Asia/Tokyo";

            const eventDate = parseIsoInTimezone(dtstart, dtstartTzid);
            const now = new Date();

            // Event in the past should be identified as past
            expect(eventDate < now).toBe(true);
        });

        it("should correctly identify future events across timezones", () => {
            // Event: Tomorrow at 10:00 in New York
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(10, 0, 0, 0);

            const dtstart = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}T10:00:00`;
            const dtstartTzid = "America/New_York";

            const eventDate = parseIsoInTimezone(dtstart, dtstartTzid);
            const now = new Date();

            // Event in the future should be identified as future
            expect(eventDate > now).toBe(true);
        });

        it("should handle midnight correctly across timezones", () => {
            // Event: Today at midnight in Los Angeles
            const today = new Date();
            const dtstart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}T00:00:00`;
            const dtstartTzid = "America/Los_Angeles";

            const eventDate = parseIsoInTimezone(dtstart, dtstartTzid);

            // Should be parseable and comparable
            expect(eventDate).toBeInstanceOf(Date);
            expect(eventDate.getTime()).toBeGreaterThan(0);
        });
    });

    describe("Calendar Date Grouping", () => {
        it("should group events by correct day in calendar month view", () => {
            // Event: Jan 31, 2026 23:30 in Tokyo (UTC+9)
            // In UTC, this is Feb 1, 2026 14:30
            // Should appear on Jan 31 in month view, not Feb 1
            const dtstart = "2026-01-31T23:30:00";
            const dtstartTzid = "Asia/Tokyo";

            const eventDate = parseIsoInTimezone(dtstart, dtstartTzid);
            const localTzid = "America/New_York"; // Simulating NY user

            // Format in local timezone to get calendar day
            const formatted = formatDateTime(dtstart, localTzid, dtstartTzid);

            // The date should maintain the event's wall-clock day
            // When displayed to NY user, should show Jan 31 (different time, but same day)
            expect(formatted.date).toContain("31");
        });

        it("should correctly group multi-timezone events on same day", () => {
            // Multiple events on "Jan 20" in different timezones
            const events = [
                { dtstart: "2026-01-20T09:00:00", dtstartTzid: "America/New_York" },
                { dtstart: "2026-01-20T14:00:00", dtstartTzid: "Europe/London" },
                { dtstart: "2026-01-20T22:00:00", dtstartTzid: "Asia/Tokyo" },
            ];

            // All events should be recognized as Jan 20 in their respective timezones
            events.forEach((event) => {
                const eventDate = parseIsoInTimezone(event.dtstart, event.dtstartTzid);
                expect(eventDate.getDate()).toBe(20);
            });
        });
    });

    describe("Recurring Events - Timezone Awareness", () => {
        it("should calculate weekly recurrence in event timezone", () => {
            // User's reported bug: Weekly standup in Berlin
            const dtstart = "2026-01-20T09:00:21";
            const dtstartTzid = "Europe/Berlin";
            const rrule = "FREQ=WEEKLY;COUNT=4";

            const occurrences = calculateNextOccurrences({
                rrule,
                dtstart,
                dtstartTzid,
                maxCount: 4,
            });

            expect(occurrences).toHaveLength(4);
            expect(occurrences[0]).toBe("2026-01-20T09:00:21");
            expect(occurrences[1]).toBe("2026-01-27T09:00:21");
            expect(occurrences[2]).toBe("2026-02-03T09:00:21");
            expect(occurrences[3]).toBe("2026-02-10T09:00:21");

            // All should maintain the same wall-clock time
            occurrences.forEach(occ => {
                expect(occ).toMatch(/T09:00:21$/);
            });
        });

        it("should calculate daily recurrence across DST transition", () => {
            // Event: Daily 10:00 AM in New York, starting before DST
            const dtstart = "2026-03-08T10:00:00"; // Day before DST (Mar 8, 2026)
            const dtstartTzid = "America/New_York";
            const rrule = "FREQ=DAILY;COUNT=3";

            const occurrences = calculateNextOccurrences({
                rrule,
                dtstart,
                dtstartTzid,
                maxCount: 3,
            });

            expect(occurrences).toHaveLength(3);
            // All should maintain 10:00 AM wall-clock time despite DST
            occurrences.forEach(occ => {
                expect(occ).toMatch(/T10:00:00$/);
            });
        });

        it("should calculate monthly recurrence in different timezone", () => {
            // Monthly meeting on 15th at 14:00 in Tokyo
            const dtstart = "2026-01-15T14:00:00";
            const dtstartTzid = "Asia/Tokyo";
            const rrule = "FREQ=MONTHLY;COUNT=3";

            const occurrences = calculateNextOccurrences({
                rrule,
                dtstart,
                dtstartTzid,
                maxCount: 3,
            });

            expect(occurrences).toHaveLength(3);
            expect(occurrences[0]).toBe("2026-01-15T14:00:00");
            expect(occurrences[1]).toBe("2026-02-15T14:00:00");
            expect(occurrences[2]).toBe("2026-03-15T14:00:00");
        });
    });

    describe("Duration Calculations with Timezone", () => {
        it("should calculate event end time correctly with duration", () => {
            // Event: 2 hours starting at 14:00 Tokyo time
            const dtstart = "2026-01-20T14:00:00";
            const dtstartTzid = "Asia/Tokyo";
            const duration = "PT2H"; // 2 hours

            const startDate = parseIsoInTimezone(dtstart, dtstartTzid);
            // Parse duration (2 hours = 7200000 ms)
            const durationMs = 2 * 60 * 60 * 1000;
            const endDate = new Date(startDate.getTime() + durationMs);

            // End should be 16:00 Tokyo time (07:00 UTC)
            expect(endDate.toISOString()).toBe("2026-01-20T07:00:00.000Z");
        });

        it("should calculate duration across timezone boundaries", () => {
            // Event: Starts 23:00 in NYC, duration 3 hours (ends next day)
            const dtstart = "2026-01-20T23:00:00";
            const dtstartTzid = "America/New_York";
            const durationMs = 3 * 60 * 60 * 1000; // 3 hours

            const startDate = parseIsoInTimezone(dtstart, dtstartTzid);
            const endDate = new Date(startDate.getTime() + durationMs);

            // Should end at Jan 21 02:00 NYC time
            // In UTC: starts at Jan 21 04:00, ends at Jan 21 07:00
            expect(endDate.toISOString()).toBe("2026-01-21T07:00:00.000Z");
        });
    });

    describe("Edge Cases", () => {
        it("should handle events at timezone boundaries", () => {
            // Event at date line: Dec 31, 2025 23:59 in Samoa (UTC-11)
            // This is already Jan 1, 2026 in most of the world
            const dtstart = "2025-12-31T23:59:00";
            const dtstartTzid = "Pacific/Samoa";

            const eventDate = parseIsoInTimezone(dtstart, dtstartTzid);

            // Should be parseable and correct
            expect(eventDate.getFullYear()).toBe(2026); // In UTC, it's Jan 1, 2026
            expect(eventDate.getMonth()).toBe(0); // January
            expect(eventDate.getDate()).toBe(1);
        });

        it("should handle events without timezone (fallback to local)", () => {
            const dtstart = "2026-01-20T09:00:00";
            // No timezone specified

            const eventDate = parseIsoDateTime(dtstart);

            // Should parse as local time (not UTC)
            expect(eventDate).toBeInstanceOf(Date);
            expect(eventDate.getHours()).toBe(9);
            expect(eventDate.getMinutes()).toBe(0);
        });

        it("should handle UTC timezone explicitly", () => {
            const dtstart = "2026-01-20T09:00:00";
            const dtstartTzid = "UTC";

            const eventDate = parseIsoInTimezone(dtstart, dtstartTzid);

            // UTC time should match ISO string
            expect(eventDate.toISOString()).toBe("2026-01-20T09:00:00.000Z");
        });

        it("should handle recurrence with EXDATE in different timezone", () => {
            // Weekly meeting with one exception
            const dtstart = "2026-01-20T09:00:00";
            const dtstartTzid = "Europe/Berlin";
            const rrule = "FREQ=WEEKLY;COUNT=4";
            const exdate = ["2026-02-03T09:00:00"]; // Skip Feb 3

            const occurrences = calculateNextOccurrences({
                rrule,
                dtstart,
                dtstartTzid,
                exdate,
                maxCount: 4,
            });

            // Should have 3 occurrences (4 - 1 excluded)
            expect(occurrences).toHaveLength(3);
            expect(occurrences).not.toContain("2026-02-03T09:00:00");
            expect(occurrences).toContain("2026-01-20T09:00:00");
            expect(occurrences).toContain("2026-01-27T09:00:00");
            expect(occurrences).toContain("2026-02-10T09:00:00");
        });
    });

    describe("Real-World Scenarios", () => {
        it("should handle international conference across multiple timezones", () => {
            // Conference: Keynote at 9 AM in each timezone
            const sessions = [
                { city: "Tokyo", dtstart: "2026-03-15T09:00:00", dtstartTzid: "Asia/Tokyo" },
                { city: "London", dtstart: "2026-03-15T09:00:00", dtstartTzid: "Europe/London" },
                { city: "New York", dtstart: "2026-03-15T09:00:00", dtstartTzid: "America/New_York" },
                { city: "Los Angeles", dtstart: "2026-03-15T09:00:00", dtstartTzid: "America/Los_Angeles" },
            ];

            // Each session should maintain its local 9 AM time
            sessions.forEach(session => {
                const eventDate = parseIsoInTimezone(session.dtstart, session.dtstartTzid);
                const formatted = formatDateTime(session.dtstart, session.dtstartTzid, session.dtstartTzid);
                expect(formatted.time).toBe("09:00");
            });
        });

        it("should correctly sort mixed-timezone events chronologically", () => {
            const events = [
                { id: "1", dtstart: "2026-01-20T15:00:00", dtstartTzid: "America/New_York" },   // 20:00 UTC
                { id: "2", dtstart: "2026-01-20T19:00:00", dtstartTzid: "UTC" },                  // 19:00 UTC
                { id: "3", dtstart: "2026-01-21T02:00:00", dtstartTzid: "Asia/Tokyo" },          // Jan 20 17:00 UTC
            ];

            // Sort by actual UTC time
            const sorted = events.sort((a, b) => {
                const dateA = a.dtstartTzid ? parseIsoInTimezone(a.dtstart, a.dtstartTzid) : parseIsoDateTime(a.dtstart);
                const dateB = b.dtstartTzid ? parseIsoInTimezone(b.dtstart, b.dtstartTzid) : parseIsoDateTime(b.dtstart);
                return dateA.getTime() - dateB.getTime();
            });

            // Correct order: Tokyo (17:00 UTC), London (19:00 UTC), NYC (20:00 UTC)
            expect(sorted[0].id).toBe("3");
            expect(sorted[1].id).toBe("2");
            expect(sorted[2].id).toBe("1");
        });

        it("should handle user viewing events in different timezone than event", () => {
            // Event in Tokyo, user in New York
            const dtstart = "2026-01-20T22:00:00";
            const dtstartTzid = "Asia/Tokyo";
            const userTzid = "America/New_York";

            // Event is 22:00 Tokyo = 08:00 NYC same day
            const formatted = formatDateTime(dtstart, userTzid, dtstartTzid);

            expect(formatted.time).toBe("08:00");
            expect(formatted.date).toContain("January 20"); // Same day!
        });
    });

    describe("RFC 5545 Compliance", () => {
        it("should preserve wall-clock time in local timezone per RFC 5545", () => {
            // RFC 5545: DTSTART without TZID uses "floating" time (local time)
            const dtstart = "2026-01-20T09:00:00";

            const eventDate = parseIsoDateTime(dtstart);

            // Should be parsed as local time, not UTC
            // The hour should match the input
            expect(eventDate.getHours()).toBe(9);
        });

        it("should respect TZID parameter per RFC 5545", () => {
            // RFC 5545: DTSTART with TZID uses that timezone
            const dtstart = "2026-01-20T09:00:00";
            const dtstartTzid = "America/New_York";

            const eventDate = parseIsoInTimezone(dtstart, dtstartTzid);

            // Should be 09:00 in New York = 14:00 UTC
            expect(eventDate.toISOString()).toBe("2026-01-20T14:00:00.000Z");
        });

        it("should handle RRULE COUNT correctly per RFC 5545", () => {
            // RFC 5545: COUNT defines number of occurrences BEFORE EXDATE filtering
            const dtstart = "2026-01-20T09:00:00";
            const dtstartTzid = "Europe/Berlin";
            const rrule = "FREQ=WEEKLY;COUNT=4";

            const occurrences = calculateNextOccurrences({
                rrule,
                dtstart,
                dtstartTzid,
                maxCount: 4,
            });

            // Should generate exactly 4 occurrences
            expect(occurrences).toHaveLength(4);
        });
    });
});
