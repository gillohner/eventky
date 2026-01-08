/**
 * RRULE display utilities
 * Parse recurrence rules to human-readable labels
 */

/**
 * Format weekday code to display name
 */
export function formatWeekday(code: string, format: "short" | "long" = "short"): string {
    const shortMap: Record<string, string> = {
        MO: "Mon",
        TU: "Tue",
        WE: "Wed",
        TH: "Thu",
        FR: "Fri",
        SA: "Sat",
        SU: "Sun",
    };

    const longMap: Record<string, string> = {
        MO: "Monday",
        TU: "Tuesday",
        WE: "Wednesday",
        TH: "Thursday",
        FR: "Friday",
        SA: "Saturday",
        SU: "Sunday",
    };

    const map = format === "long" ? longMap : shortMap;
    return map[code] || code;
}

/**
 * Check if RRULE represents indefinite recurrence (no COUNT or UNTIL)
 */
export function isIndefiniteRecurrence(rrule: string): boolean {
    return !rrule.includes('COUNT=') && !rrule.includes('UNTIL=');
}

/**
 * Parse RRULE to human-readable label
 */
export function parseRRuleToLabel(rrule: string): string {
    const parts = rrule.split(";").reduce((acc, part) => {
        const [key, value] = part.split("=");
        acc[key] = value;
        return acc;
    }, {} as Record<string, string>);

    const freq = parts["FREQ"];
    const interval = parseInt(parts["INTERVAL"] || "1");
    const byday = parts["BYDAY"];
    const count = parts["COUNT"];
    const until = parts["UNTIL"];

    let label = "";

    switch (freq) {
        case "DAILY":
            label = interval === 1 ? "Daily" : `Every ${interval} days`;
            break;
        case "WEEKLY":
            if (byday) {
                const days = byday.split(",").map(d => formatWeekday(d)).join(", ");
                label = interval === 1 ? `Weekly on ${days}` : `Every ${interval} weeks on ${days}`;
            } else {
                label = interval === 1 ? "Weekly" : `Every ${interval} weeks`;
            }
            break;
        case "MONTHLY":
            label = interval === 1 ? "Monthly" : `Every ${interval} months`;
            break;
        case "YEARLY":
            label = interval === 1 ? "Yearly" : `Every ${interval} years`;
            break;
        default:
            label = "Recurring";
    }

    if (count) {
        label += ` (${count} times)`;
    } else if (until) {
        // Format UNTIL date
        try {
            const untilDate = new Date(
                `${until.slice(0, 4)}-${until.slice(4, 6)}-${until.slice(6, 8)}`
            );
            label += ` until ${untilDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
        } catch {
            // Ignore format errors
        }
    } else {
        // No COUNT or UNTIL - indefinite recurrence
        label += ' ∞';
    }

    return label;
}

/**
 * Get recurrence type from RRULE
 */
export function getRecurrenceType(rrule: string): "daily" | "weekly" | "monthly" | "yearly" | "custom" {
    const match = rrule.match(/FREQ=(\w+)/);
    if (!match) return "custom";

    const freq = match[1].toLowerCase();
    if (freq === "daily" || freq === "weekly" || freq === "monthly" || freq === "yearly") {
        return freq;
    }
    return "custom";
}

/**
 * Get interval from RRULE
 */
export function getRecurrenceInterval(rrule: string): number {
    const match = rrule.match(/INTERVAL=(\d+)/);
    return match ? parseInt(match[1]) : 1;
}
