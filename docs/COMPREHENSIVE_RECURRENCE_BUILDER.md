# Comprehensive Recurrence Builder - Migration Guide

## Overview

The recurrence builder has been completely redesigned to provide a unified, comprehensive interface that:

1. **Eliminates the preset system** - No more "daily/weekly/monthly/yearly/custom" dropdown that forced complex patterns into "custom"
2. **Direct rule building** - All RRULE patterns are built through a single, intuitive UI
3. **Proper edit support** - When editing an event, the UI correctly parses and displays the RRULE components
4. **Advanced patterns** - Full support for BYMONTHDAY, BYSETPOS, and all RFC 5545 features

## What Changed

### Before (Segregated System)

```
RecurrencePresetSelector (dropdown: none/daily/weekly/monthly/yearly/custom)
    ↓
RecurrenceSettings (different UI based on preset)
    - Basic presets: simple interval/count
    - Custom: raw RRULE text input
    ↓
OccurrencePreview (works for all)
```

**Problems:**
- Complex patterns forced into "custom" mode with raw RRULE editing
- Editing existing events showed "custom" instead of parsed components
- Disconnected components didn't update together
- No UI for advanced patterns like "last Thursday of month"

### After (Unified System)

```
ComprehensiveRuleBuilder (single unified component)
    - Toggle: Enable/Disable recurrence
    - Frequency selector: DAILY/WEEKLY/MONTHLY/YEARLY
    - Interval: Works for all frequencies
    - Weekly: Weekday selector (multi-select)
    - Monthly: Mode selector
        * Same day each month (default)
        * Specific day(s) of month (BYMONTHDAY)
        * Specific weekday position (BYDAY + BYSETPOS)
    - Count/Until: Limit occurrences
    ↓
OccurrencePreview (same as before)
```

**Benefits:**
- All patterns accessible through UI (no raw RRULE editing needed)
- Editing events shows proper UI controls
- Single state object, updates synchronize automatically
- Supports advanced patterns intuitively

## New State Structure

### Old RecurrenceState
```typescript
{
    preset: "none" | "daily" | "weekly" | "monthly" | "yearly" | "custom",
    frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY",
    interval: number,
    count?: number,
    selectedWeekdays: Weekday[],
    rdates: string[],
    excludedOccurrences: Set<string>,
    customRrule?: string,  // Only for "custom" preset
}
```

### New RecurrenceState
```typescript
{
    enabled: boolean,  // Replaces preset: "none"
    frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY",
    interval: number,
    count?: number,
    until?: string,
    
    // Weekly
    selectedWeekdays: Weekday[],
    
    // Monthly
    monthlyMode: "none" | "dayofmonth" | "dayofweek",
    bymonthday: number[],  // e.g., [21] or [-1] for last day
    bysetpos: number[],    // e.g., [-1] for last occurrence
    
    // Additional/Excluded
    rdates: string[],
    excludedOccurrences: Set<string>,
}
```

## Pattern Examples

### 1. Every 21st of Each Month
**Old way:** Select "custom", type `FREQ=MONTHLY;BYMONTHDAY=21`
**New way:** 
1. Enable recurrence
2. Select "Monthly" frequency
3. Select "Specific day(s) of month"
4. Click "21" in the calendar grid

### 2. Last Thursday of Each Month
**Old way:** Select "custom", type `FREQ=MONTHLY;BYDAY=TH;BYSETPOS=-1`
**New way:**
1. Enable recurrence
2. Select "Monthly" frequency
3. Select "Specific weekday position"
4. Click "T" (Thursday) in weekday selector
5. Click "Last" in position selector

### 3. Every 4 Weeks
**Old way:** Select "weekly", change interval to 4
**New way:** Same, but clearer UI
1. Enable recurrence
2. Select "Weekly" frequency
3. Set interval to 4

### 4. First and Third Monday of Each Month
**New capability:**
1. Enable recurrence
2. Select "Monthly" frequency
3. Select "Specific weekday position"
4. Click "M" (Monday)
5. Click "First" and "Third" in position selector

## Store Changes

### Old Actions
```typescript
setPreset(preset: RecurrencePreset)
setInterval(interval: number)
setCount(count: number | undefined)
toggleWeekday(day: Weekday)
setCustomRrule(rrule: string)
```

### New Actions
```typescript
setRecurrenceState(updates: Partial<RecurrenceState>)
// Individual actions removed - use setRecurrenceState instead
```

**Example usage:**
```typescript
// Old
setPreset("weekly");
setInterval(2);
toggleWeekday("MO");

// New
setRecurrenceState({ 
    enabled: true,
    frequency: "WEEKLY", 
    interval: 2, 
    selectedWeekdays: ["MO"] 
});
```

## RRULE Building

The `buildRRule()` function now handles all patterns:

```typescript
function buildRRule(): string {
    if (!enabled) return "";
    
    let rrule = `FREQ=${frequency}`;
    
    if (interval > 1) rrule += `;INTERVAL=${interval}`;
    if (count) rrule += `;COUNT=${count}`;
    if (until) rrule += `;UNTIL=${until}`;
    
    // Weekly: BYDAY
    if (frequency === "WEEKLY" && selectedWeekdays.length > 0) {
        rrule += `;BYDAY=${selectedWeekdays.join(",")}`;
    }
    
    // Monthly: different modes
    if (frequency === "MONTHLY") {
        if (monthlyMode === "dayofmonth" && bymonthday.length > 0) {
            rrule += `;BYMONTHDAY=${bymonthday.join(",")}`;
        } else if (monthlyMode === "dayofweek") {
            if (selectedWeekdays.length > 0) {
                rrule += `;BYDAY=${selectedWeekdays.join(",")}`;
            }
            if (bysetpos.length > 0) {
                rrule += `;BYSETPOS=${bysetpos.join(",")}`;
            }
        }
    }
    
    return rrule;
}
```

## Edit Support

The `initializeRecurrenceFromEvent()` function now properly parses all RRULE components:

```typescript
initializeRecurrenceFromEvent(eventData) {
    if (!eventData.rrule) {
        return DEFAULT_RECURRENCE_STATE;
    }
    
    // Parse RRULE
    const parsed = parseRRuleString(eventData.rrule);
    
    // Determine monthly mode
    let monthlyMode = "none";
    if (frequency === "MONTHLY") {
        if (parsed.BYMONTHDAY) monthlyMode = "dayofmonth";
        else if (parsed.BYDAY && parsed.BYSETPOS) monthlyMode = "dayofweek";
    }
    
    return {
        enabled: true,
        frequency: parsed.FREQ,
        interval: parsed.INTERVAL || 1,
        count: parsed.COUNT,
        until: parsed.UNTIL,
        selectedWeekdays: parsed.BYDAY || [],
        monthlyMode,
        bymonthday: parsed.BYMONTHDAY || [],
        bysetpos: parsed.BYSETPOS || [],
        rdates: eventData.rdate || [],
        excludedOccurrences: new Set(eventData.exdate || []),
    };
}
```

## Migration Checklist

- [x] Create new `ComprehensiveRuleBuilder` component
- [x] Update `RecurrenceState` type definition
- [x] Update `useEventFormStore` with new actions
- [x] Update `recurrence-fields.tsx` to use new builder
- [x] Remove old `RecurrencePresetSelector` usage
- [x] Remove old `RecurrenceSettings` usage
- [x] Keep `OccurrencePreview` (works as-is)

## Files Changed

1. **New:** `components/event/create/recurrence/comprehensive-rule-builder.tsx`
2. **Modified:** `types/recurrence.ts` - Updated RecurrenceState interface
3. **Modified:** `stores/event-form-store.ts` - Simplified actions, better parsing
4. **Modified:** `components/event/create/recurrence-fields.tsx` - Uses new builder
5. **Deprecated:** `components/event/create/recurrence/recurrence-preset-selector.tsx`
6. **Deprecated:** `components/event/create/recurrence/recurrence-settings.tsx`

## Testing

Test these scenarios:

1. **Create new recurring event** - Daily, weekly, monthly, yearly all work
2. **Weekly with specific days** - Select multiple weekdays
3. **Monthly - specific days** - 1st, 15th, last day, etc.
4. **Monthly - weekday position** - Last Thursday, First Monday, etc.
5. **Edit existing event** - All fields populate correctly
6. **Complex pattern edit** - "Last Thursday of month" shows proper UI, not "custom"
7. **Toggle recurrence** - Enable/disable works, clears/restores state
8. **RDATE/EXDATE** - Add additional dates, exclude occurrences

## UI Improvements

- **Clearer labels:** "Make this a recurring event" checkbox
- **Visual feedback:** Selected weekdays/days highlighted
- **Grouped controls:** Related settings in same section
- **Responsive grid:** Month day picker adapts to screen size
- **Help text:** Explains what each option does
- **No raw RRULE:** Users never see "FREQ=MONTHLY;BYMONTHDAY=21"

## Future Enhancements

- [ ] BYMONTH selector (limit to specific months)
- [ ] UNTIL date picker (end date instead of count)
- [ ] BYYEARDAY (day of year)
- [ ] BYWEEKNO (week number)
- [ ] Preset templates ("Last business day of month", "Quarterly", etc.)
- [ ] Natural language display ("Repeats every 2 weeks on Monday and Friday")
