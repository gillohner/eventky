# Flagged Issues - Testing Integration

Issues discovered during test implementation that have been reviewed and addressed.

---

## ✅ Resolved Issues

### 1. Test File Used Wrong Property Names
**File:** `lib/pubky/__tests__/rrule-advanced.test.ts` (original)
**Status:** ✅ Fixed

The original test file used incorrect property names (`startDate` vs `dtstart`). Fixed during testing setup.

---

### 2. RRULE COUNT + EXDATE Behavior - RFC 5545 Compliance
**File:** `lib/pubky/rrule-utils.ts`
**Status:** ✅ Fixed

**Issue:** RRULE was generating extra occurrences to compensate for excluded dates.

**Fix:** Updated to RFC 5545 compliant behavior:
- COUNT specifies total candidates BEFORE EXDATE filtering
- EXDATE removes dates from that candidate set
- Final result may have fewer than COUNT occurrences

**Example:**
- `COUNT=4` + 1 EXDATE → 3 results (not 4)

---

### 3. FormattedDateTime.weekday Never Populated
**File:** `lib/datetime/format.ts`
**Status:** ✅ Removed

**Issue:** The `weekday` field in `FormattedDateTime` was defined but never populated.

**Resolution:** Removed the unused `weekday` field from the interface. Weekday is already included in the formatted `date` string when the `includeWeekday` option is true.

---

### 4. parseIsoDateTime Timezone Parameter Unused
**File:** `lib/datetime/format.ts`
**Status:** ✅ Removed

**Issue:** The `_timezone` parameter was unused and reserved for "future use".

**Resolution:** Removed the unused parameter to keep the API clean. Can be re-added when timezone conversion is actually implemented.

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
| Format Utils | 19 | ✅ All passing |
| **Total** | **76** | **✅ All passing** |

---

## Files Created/Modified During Testing Setup

### New Files
- `vitest.config.ts` - Vitest configuration
- `lib/test-utils/setup.ts` - Test setup (mocks, cleanup)
- `lib/test-utils/index.tsx` - Test utilities and custom render
- `lib/cache/__tests__/utils.test.ts` - Cache utils tests
- `lib/datetime/__tests__/duration.test.ts` - Duration tests
- `lib/datetime/__tests__/format.test.ts` - Format tests

### Modified Files
- `package.json` - Added test scripts and dependencies
- `lib/pubky/__tests__/rrule-advanced.test.ts` - Fixed prop names and expanded
- `lib/pubky/rrule-utils.ts` - Fixed RFC 5545 EXDATE handling
- `lib/datetime/format.ts` - Removed unused weekday field and timezone param

---

## Next Steps

1. **Add more edge case tests** for RRULE (DST transitions, timezone boundaries)
2. **Add hook tests** (use-event-hooks, use-calendar-hooks)
3. **Add store tests** (auth-store, event-form-store)
4. **Set up integration test infrastructure** (Docker Compose for isolated testing)
