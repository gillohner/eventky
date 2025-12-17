# Flagged Issues - Testing Integration

Issues discovered during test implementation that may need attention.

---

## 🚨 Critical Issues

### 1. Test File Used Wrong Property Names
**File:** `lib/pubky/__tests__/rrule-advanced.test.ts` (original)
**Status:** ✅ Fixed

The original test file used incorrect property names:
- `startDate` instead of `dtstart`
- `rdates` instead of `rdate`
- `exdates` instead of `exdate`

This indicates the test was never actually run, or the API changed without updating tests.

---

## ⚠️ Behavioral Issues (May Need Decision)

### 2. RRULE COUNT + EXDATE Behavior
**File:** `lib/pubky/rrule-utils.ts`
**Status:** Documented in tests

**Current behavior:** When `COUNT=4` and `EXDATE` excludes 1 occurrence, the function returns **4 results** (not 3).

**How it works:**
- Generator compensates for excluded dates by generating extras
- `COUNT` effectively means "return N non-excluded occurrences"

**RFC 5545 interpretation options:**
- **A)** COUNT=4 means "generate 4 candidates, then apply EXDATE" → 3 results
- **B)** COUNT=4 means "return 4 results after EXDATE" → 4 results (current)

**Recommendation:** Current behavior (B) is more user-friendly for calendar UIs but may differ from strict RFC 5545 compliance. Document this behavior and decide if change is needed.

---

### 3. FormattedDateTime.weekday Never Populated
**File:** `lib/datetime/format.ts`
**Status:** Documented in tests

**Issue:** The `FormattedDateTime` interface includes an optional `weekday` field:
```typescript
export interface FormattedDateTime {
    date: string;
    time: string;
    weekday?: string;  // ← Never set
}
```

But `formatDateTime()` never populates it - instead, the weekday is included in the `date` string.

**Options:**
- **A)** Update function to return weekday as separate field
- **B)** Remove `weekday` from interface (it's unused)
- **C)** Keep as-is (weekday is in date string, interface is for potential future use)

---

### 4. parseIsoDateTime Timezone Parameter Unused
**File:** `lib/datetime/format.ts`
**Status:** Documented in tests

**Issue:** The `_timezone` parameter in `parseIsoDateTime()` is marked as unused:
```typescript
export function parseIsoDateTime(isoString: string, _timezone?: string): Date {
    void _timezone; // Explicitly marked as intentionally unused
```

This is noted as "reserved for future use" but could be confusing. Consider:
- Implementing timezone conversion
- Or removing the parameter until needed

---

## ✅ Verified Good Behaviors

### Cache Utils Version Comparison
- `isNexusVersionCurrent()` correctly compares sequence numbers first, then lastModified
- Merged data sources correctly use local details + nexus social data (tags, attendees)
- Exponential backoff with jitter works correctly

### Duration Parsing
- ISO 8601 duration parsing handles all standard formats (PT1H30M, P1D, etc.)
- Round-trip conversion (parse → format → parse) maintains values

### RRULE Generation
- BYMONTHDAY works correctly including negative values (-1 for last day)
- BYSETPOS + BYDAY combinations work (e.g., "last Thursday of month")
- INTERVAL respected for weekly patterns

---

## Test Coverage Summary

| Area | Tests | Status |
|------|-------|--------|
| RRULE Utils | 7 | ✅ All passing |
| Cache Utils | 22 | ✅ All passing |
| Duration Utils | 24 | ✅ All passing |
| Format Utils | 24 | ✅ All passing |
| **Total** | **77** | **✅ All passing** |

---

## Files Created/Modified

### New Files
- `vitest.config.ts` - Vitest configuration
- `lib/test-utils/setup.ts` - Test setup (mocks, cleanup)
- `lib/test-utils/index.tsx` - Test utilities and custom render
- `lib/cache/__tests__/utils.test.ts` - Cache utils tests
- `lib/datetime/__tests__/duration.test.ts` - Duration tests
- `lib/datetime/__tests__/format.test.ts` - Format tests

### Modified Files
- `package.json` - Added test scripts and dependencies
- `lib/pubky/__tests__/rrule-advanced.test.ts` - Fixed and expanded

---

## Next Steps

1. **Decide on flagged behaviors** (RRULE COUNT+EXDATE, weekday field)
2. **Add more edge case tests** for RRULE (DST transitions, timezone boundaries)
3. **Add hook tests** (use-event-hooks, use-calendar-hooks)
4. **Add store tests** (auth-store, event-form-store)
5. **Set up integration test infrastructure** (Docker Compose for isolated testing)
