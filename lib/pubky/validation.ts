/**
 * Validation utilities for Eventky.
 */

const EVENT_STATUSES = ["CONFIRMED", "TENTATIVE", "CANCELLED"];
const RSVP_STATUSES = ["NEEDS-ACTION", "ACCEPTED", "DECLINED", "TENTATIVE"];

export function validateDuration(duration: string): boolean {
    return /^P(?=.+)(\d+D)?(T(\d+H)?(\d+M)?(\d+S)?)?$/.test(duration);
}

export function validateRrule(rrule: string): boolean {
    if (!rrule || typeof rrule !== "string") return false;
    const parts = rrule.split(";").filter(Boolean);
    const map = new Map<string, string>();
    for (const p of parts) {
        const [k, v] = p.split("=");
        if (!k || !v) return false;
        map.set(k, v);
    }
    const freq = map.get("FREQ");
    if (!freq || !["DAILY", "WEEKLY", "MONTHLY", "YEARLY"].includes(freq)) return false;
    if (map.has("COUNT") && map.has("UNTIL")) return false;
    const interval = map.get("INTERVAL");
    if (interval) {
        const n = Number(interval);
        if (!Number.isInteger(n) || n < 1 || n > 999) return false;
    }

    const byDay = map.get("BYDAY");
    if (byDay) {
        const dayPattern = /^([+-]?\d{1,2})?(MO|TU|WE|TH|FR|SA|SU)$/;
        const allValid = byDay.split(",").every((d) => {
            const value = d.trim();
            const m = value.match(dayPattern);
            if (!m) return false;
            if (!m[1]) return true;
            const ord = Number(m[1]);
            return Number.isInteger(ord) && ord !== 0 && ord >= -53 && ord <= 53;
        });
        if (!allValid) return false;
    }

    const byMonthDay = map.get("BYMONTHDAY");
    if (byMonthDay) {
        const allValid = byMonthDay.split(",").every((v) => {
            const n = Number(v.trim());
            return Number.isInteger(n) && n !== 0 && n >= -31 && n <= 31;
        });
        if (!allValid) return false;
    }

    return true;
}

export function validateTimezone(tz: string): boolean {
    if (!tz) return false;
    if (tz === "UTC") return true;
    if (/^UTC[+-]\d{1,2}$/.test(tz)) return true;
    return /^([A-Za-z_]+)\/([A-Za-z_]+)$/.test(tz);
}

export function validateGeoCoordinates(lat: number, lon: number): boolean {
    return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

export function validateColor(color: string): boolean {
    return /^#[0-9a-fA-F]{6}$/.test(color);
}

export function getValidEventStatuses(): string[] {
    return [...EVENT_STATUSES];
}

export function getValidRsvpStatuses(): string[] {
    return [...RSVP_STATUSES];
}
