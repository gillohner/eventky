# Eventky Test Cases

Comprehensive end-to-end test scenarios for validating Eventky functionality.

**Testing Approach:**
- Each test should be executed with a clean browser session
- Use at least 2-3 different user accounts (User A, User B, User C)
- Verify data persistence after browser refresh
- Check Nexus indexing delays (wait 2-3 seconds after writes)
- Validate both UI state and underlying data

---

## 1. Calendar Management

### 1.1 Calendar CRUD Operations

| Test ID | Test Case | Steps | Expected Result | Priority |
|---------|-----------|-------|-----------------|----------|
| CAL-001 | Create calendar as owner | 1. Login as User A<br>2. Navigate to Calendars<br>3. Click "New Calendar"<br>4. Fill name, description, color<br>5. Save | Calendar created, appears in "My Calendars" list, User A is owner | High |
| CAL-002 | Create calendar with authors | 1. Login as User A<br>2. Create calendar<br>3. Add User B and User C as authors<br>4. Save | Calendar created with 3 authors (A, B, C), all listed in calendar details | High |
| CAL-003 | Edit calendar metadata | 1. User A creates calendar<br>2. Edit name, description, color<br>3. Save | Changes reflected immediately, persisted after refresh | High |
| CAL-004 | Delete calendar as owner | 1. User A creates calendar<br>2. Click delete, confirm<br>3. Refresh page | Calendar removed from list, events show as "Calendar deleted" | High |
| CAL-005 | View calendar as non-author | 1. User A creates public calendar with events<br>2. Login as User B (not author)<br>3. Navigate to calendar URL | Calendar visible, events from current authors shown, no edit buttons for User B | Medium |
| CAL-006 | Calendar name validation | 1. Try creating calendar with empty name (0 chars)<br>2. Try 101+ character name<br>3. Try name with only whitespace | Error shown for empty/whitespace, name truncated to 100 chars, special characters allowed | Medium |
| CAL-007 | Calendar with maximum authors | 1. Create calendar<br>2. Try adding 11+ authors (max is 10)<br>3. Save | Error shown OR only first 10 authors saved | Medium |
| CAL-008 | Calendar with description | 1. Create calendar<br>2. Add 500 character description<br>3. Save<br>4. Try 501+ chars | Description shown in calendar detail, truncated/error for >500 chars | Medium |

### 1.2 Calendar Author Management

| Test ID | Test Case | Steps | Expected Result | Priority |
|---------|-----------|-------|-----------------|----------|
| CAL-101 | Add author to existing calendar | 1. User A creates calendar<br>2. Edit calendar<br>3. Add User B as author<br>4. Save | User B appears in authors list, can now create events in calendar | High |
| CAL-102 | Remove author from calendar | 1. Calendar with User A (owner) and User B (author)<br>2. User B creates event in calendar<br>3. User A removes User B as author<br>4. Check calendar view | User B's events no longer appear in calendar view (events are de-indexed from calendar) | High |
| CAL-103 | Removed author's events still exist | 1. User B creates event in Calendar X<br>2. User A removes User B as author<br>3. Navigate to event directly (URL or User B's event stream) | Event still exists and accessible, but no longer shown in Calendar X | High |
| CAL-104 | Author cannot edit calendar | 1. User B (author, not owner) of Calendar X<br>2. Edit Button not displayed | Edit button not shown | High |
| CAL-105 | Author cannot edit other's events | 1. User B (author) creates event in Calendar X<br>2. Login as User C (also author)<br>3. Try to edit User B's event | Edit button not shown on User B's event | High |
| CAL-106 | Multiple authors add events | 1. Calendar with authors A, B, C (all current authors)<br>2. Each creates unique event<br>3. View calendar | All 3 events visible, each shows correct author (A, B, C still authors) | High |

---

## 2. Event Management

### 2.1 Event CRUD Operations

| Test ID | Test Case | Steps | Expected Result | Priority |
|---------|-----------|-------|-----------------|----------|
| EVT-001 | Create basic event | 1. Login as User A<br>2. Click "New Event"<br>3. Fill summary, start/end times<br>4. Save | Event created, visible in events list | High |
| EVT-002 | Create event with end time | 1. Create event<br>2. Set start time (dtstart)<br>3. Set end time (dtend)<br>4. Save | Event created with start and end times, shown correctly in calendar view | High |
| EVT-003 | Create event with duration | 1. Create event<br>2. Set start time (dtstart)<br>3. Set duration (e.g., "PT2H" for 2 hours) instead of end time<br>4. Save | Event created with duration, end time calculated from start + duration | High |
| EVT-004 | Create event with description | 1. Create event<br>2. Add multi-line description with formatting<br>3. Save | Description preserved with line breaks, shown in detail view | Medium |
| EVT-005 | Create event with location | 1. Create event<br>2. Add location field<br>3. Save | Location shown in event details and list view | Medium |
| EVT-006 | Edit existing event | 1. Create event<br>2. Edit summary, time, location<br>3. Save | Changes reflected immediately, sequence number incremented | High |
| EVT-007 | Delete event | 1. Create event<br>2. Click delete, confirm | Event removed from all views, returns 404 on direct access | High |
| EVT-008 | Event validation - past date | 1. Create event with start date in past<br>2. Try to save | Allowed to create like normal  | Low |
| EVT-009 | Event validation - end before start | 1. Create event<br>2. Try to set end time before start time<br>3. Should not work | Should not be able to work | High |
| EVT-010 | Event with very long summary | 1. Enter 500+ character summary<br>2. Save | Truncated or scrollable display, data preserved | Low |
| EVT-011 | Event with both dtend and duration | 1. Create event via API<br>2. Set both dtend and duration fields<br>3. Try to save | UI should not allow this (mutually exclusive fields) | Medium |
| EVT-012 | Create TENTATIVE event | 1. Create event<br>2. Set status to TENTATIVE<br>3. Save and view | Event shows "Tentative" badge or visual indicator | Medium |
| EVT-013 | Create CANCELLED event | 1. Create event<br>2. Set status to CANCELLED<br>3. View in list and detail | Event shows strikethrough or "Cancelled" badge, still visible | Medium |
| EVT-014 | Change event status | 1. Create CONFIRMED event<br>2. Edit and change to CANCELLED<br>3. Save | Status updates, UI reflects change | Medium |
| EVT-015 | Event with geo coordinates | 1. Create event<br>2. Add geo field "47.3769;8.5417"<br>3. Save | Coordinates stored, shown in event detail (map link or display) | Low |
| EVT-016 | Invalid geo format | 1. Try to create event via API<br>2. Set geo to "invalid" or "91;181"<br>3. Check validation | Validation error from pubky-app-specs | Low |
| EVT-017 | Rich HTML description | 1. Create event<br>2. Add description with `<b>bold</b>`, `<a href="...">link</a>`<br>3. Save and view | HTML rendered correctly, links clickable | Medium |
| EVT-018 | XSS prevention in description | 1. Create event via API<br>2. Add `<script>alert(1)</script>` in description<br>3. View event | Script NOT executed, sanitized or escaped | High |

### 2.2 Event-Calendar Association

| Test ID | Test Case | Steps | Expected Result | Priority |
|---------|-----------|-------|-----------------|----------|
| EVT-101 | Create event linked to calendar | 1. User A (author of Calendar X)<br>2. Create event, select Calendar X<br>3. Save | Event appears in Calendar X, shows calendar association | High |
| EVT-102 | Create event without calendar | 1. Create event<br>2. Leave calendar field empty<br>3. Save | Event created, appears in "General Events" or personal stream, no calendar link | High |
| EVT-103 | Non-author adds event to calendar | 1. User B (not author of Calendar X)<br>2. Try to create event referencing Calendar X using Pubky Observer<br>3. Save | Event will be indexed and displayed but not referencing Calendar | High |
| EVT-104 | Event in multiple calendars | 1. User A is author of Calendar X and Y<br>2. Create event, select both calendars<br>3. Save | Event will be displayed in both Calendars. Both calendar-colors will be shown in Event-Overview | High |
| EVT-105 | Change event calendar association | 1. Create event linked to Calendar X<br>2. Edit event<br>3. Change to Calendar Y<br>4. Save | Event moves to Calendar Y, removed from X | Medium |
| EVT-106 | Event calendar deleted | 1. Create event in Calendar X<br>2. Delete Calendar X<br>3. View event | Event still exists but Calendar view not existing | Medium |
| EVT-107 | Event with maximum calendars | 1. User A is author of 11 calendars<br>2. Create event, select all 11 calendars<br>3. Save | Error shown OR only first 10 calendars saved (max is 10) | Medium |

### 2.3 Event Discovery & Visibility

| Test ID | Test Case | Steps | Expected Result | Priority |
|---------|-----------|-------|-----------------|----------|
| EVT-201 | Author's events in stream | 1. User A creates 5 events<br>2. Navigate to User A's Dashboard | All 5 events visible | High |
| EVT-202 | Calendar events view | 1. Calendar X with events by Users A, B, C (all current authors)<br>2. Open Calendar X<br>3. View events list | All events from current authors shown (A, B, C events visible) | High |
| EVT-203 | Global event discovery | 1. Create events with tags<br>2. Browse global event feed | Events discoverable via tags, search, or trending | Medium |

---

## 3. Tagging System

### 3.1 Event Tags

| Test ID | Test Case | Steps | Expected Result | Priority |
|---------|-----------|-------|-----------------|----------|
| TAG-001 | Add tag to own event | 1. User A creates event<br>2. Add tag "conference"<br>3. Save | Tag visible on event, clickable, searchable | High |
| TAG-002 | Add tag to another user's event | 1. User A creates event<br>2. Login as User B<br>3. Add tag "interesting" to User A's event | Tag added successfully, shows both users' tags on event | High |
| TAG-003 | View all events with tag | 1. Multiple events tagged "conference"<br>2. Click tag "conference" | Shows all events with that tag across all users | High |
| TAG-004 | Remove own tag | 1. User A adds tag to event<br>2. User A removes tag<br>3. Save | Tag removed, no longer shown | Medium |
| TAG-005 | Remove another user's tag | 1. User A adds tag to event<br>2. Login as User B<br>3. Try to remove User A's tag | UI should not allow this | Medium |
| TAG-006 | Multiple tags on one event | 1. Add tags: "conference", "networking", "tech"<br>2. Save | All tags visible, each independently clickable | Medium |
| TAG-007 | Click existing tag to add | 1. Event has tag "conference" (by User A)<br>2. Login as User B<br>3. Click "conference" tag to add | Tag added from User B as well | Medium |
| TAG-008 | Tag case sensitivity | 1. Add tag "Conference"<br>2. Add tag "conference" | tags always lowercase | Low |

### 3.2 Calendar Tags

| Test ID | Test Case | Steps | Expected Result | Priority |
|---------|-----------|-------|-----------------|----------|
| TAG-101 | Add tag to calendar | 1. User A creates calendar<br>2. Add tag "community"<br>3. Save | Tag visible on calendar, searchable | High |
| TAG-102 | Other user tags calendar | 1. User A creates public calendar<br>2. User B adds tag "helpful"<br>3. View calendar | Tag added, both users' tags shown | High |
| TAG-103 | Search calendars by tag | 1. Tag multiple calendars with "community"<br>2. Search or filter by tag | All matching calendars shown | Medium |

---

## 4. RSVP & Attendance

### 4.1 RSVP Operations

| Test ID | Test Case | Steps | Expected Result | Priority |
|---------|-----------|-------|-----------------|----------|
| RSV-001 | RSVP as "Accepted" | 1. User B views User A's event<br>2. Click "Accept" RSVP<br>3. Save | RSVP recorded, User B shown as attending, count updated | High |
| RSV-002 | RSVP as "Declined" | 1. User B declines event<br>2. Check event details | User B shown as declined, visible to event owner | High |
| RSV-003 | RSVP as "Tentative" | 1. User B marks tentative<br>2. View attendees list | Status shown as "Maybe" or "Tentative" | Medium |
| RSV-004 | Change RSVP status | 1. User B accepts event<br>2. Later changes to declined<br>3. View attendees | Status updated, count adjusted | High |
| RSV-005 | RSVP to own event | 1. User A (event creator) tries to RSVP<br> | Creator RSVP treated the same way as any other User | Low |
| RSV-006 | View attendees list | 1. Event with 5 RSVPs<br>2. View attendees tab | All attendees shown with names, avatars, status | High |
| RSV-007 | RSVP count display | 1. Event with 3 accepted, 2 declined, 1 tentative<br>2. View event card | Count shows "3 attending" or detailed breakdown | Medium |

### 4.2 Recurrence & RSVP

**Behavior:** 
- Attendee object without `recurrence_id` applies to ALL instances of recurring event
- Attendee object WITH `recurrence_id` applies only to that specific instance (overrides series-level RSVP)
- **UI always creates per-instance attendee objects** when user views/RSVPs from an instance view

| Test ID | Test Case | Steps | Expected Result | Priority |
|---------|-----------|-------|-----------------|----------|
| RSV-101 | RSVP at series level applies to all | 1. Create weekly recurring event (4 instances)<br>2. Manually create attendee object without recurrence_id via API<br>3. View all 4 instances | RSVP status shown on all 4 instances | High |
| RSV-102 | UI creates per-instance RSVP | 1. Create weekly recurring event (4 instances)<br>2. User B views specific instance (e.g., Week 2)<br>3. User B clicks "Accept" RSVP<br>4. Check attendee object | Attendee object created WITH recurrence_id for that specific instance | High |
| RSV-103 | Per-instance RSVP overrides series | 1. Create series-level attendee (status: ACCEPTED, no recurrence_id)<br>2. Create instance-specific attendee (status: DECLINED, with recurrence_id for Week 2)<br>3. View Week 2 instance | Week 2 shows DECLINED (instance override), other weeks show ACCEPTED (series default) | High |
| RSV-104 | Change RSVP on recurring instance | 1. User B accepts Week 2 instance<br>2. User B views Week 3 and accepts<br>3. User B changes Week 2 to declined<br>4. Check all instances | Week 2: DECLINED, Week 3: ACCEPTED, other weeks: no RSVP (each instance tracked separately) | High |
| RSV-105 | Multiple users RSVP to instances | 1. Weekly event (4 instances)<br>2. User B accepts Week 1<br>3. User C accepts Week 2<br>4. User D accepts all weeks via API (no recurrence_id)<br>5. View attendees for each week | Week 1: B+D, Week 2: C+D, Week 3: D only, Week 4: D only | Medium |

### 4.3 Orphaned RSVP Handling

**Behavior:** Attendee objects can exist on homeserver but are hidden in UI if the referenced event or instance no longer exists.

| Test ID | Test Case | Steps | Expected Result | Priority |
|---------|-----------|-------|-----------------|----------|
| RSV-201 | RSVP to deleted event | 1. User B RSVPs to User A's event<br>2. User A deletes event<br>3. View User B's RSVPs/dashboard | RSVP not shown in UI (orphaned), homeserver still has attendee record | High |
| RSV-202 | RSVP with invalid recurrence_id | 1. User B RSVPs to instance (recurrence_id: 2026-01-15T10:00:00)<br>2. User A edits RRULE (changes occurrences, 2026-01-15 no longer valid)<br>3. View event attendees | Orphaned RSVP not displayed, only RSVPs matching current occurrences shown | High |
| RSV-203 | Orphaned RSVP cleanup visibility | 1. Create multiple orphaned RSVPs (deleted events, invalid instances)<br>2. Check user's RSVP list | Only valid RSVPs shown, no broken entries | Medium |

---

## 5. Recurrence Patterns

### 5.1 Basic Recurrence

| Test ID | Test Case | Steps | Expected Result | Priority |
|---------|-----------|-------|-----------------|----------|
| REC-001 | Daily recurrence | 1. Create event<br>2. Set "Repeat: Daily" for 7 days<br>3. View calendar | Event appears every day for 7 days | High |
| REC-002 | Weekly recurrence | 1. Create event on Monday<br>2. Set "Repeat: Weekly" for 4 weeks<br>3. View calendar | Event appears every Monday for 4 weeks | High |
| REC-003 | Monthly recurrence | 1. Create event on 15th<br>2. Set "Repeat: Monthly" for 6 months<br>3. View calendar | Event appears on 15th of each month | High |
| REC-004 | Yearly recurrence | 1. Create birthday event<br>2. Set "Repeat: Yearly"<br>3. View next year | Event appears same date next year | Medium |
| REC-005 | Recurrence with end date | 1. Weekly event<br>2. Set end date 3 months from now<br>3. Check instances | Recurrence stops at end date, no events after | High |
| REC-006 | Recurrence with count | 1. Weekly event<br>2. Set "Repeat 10 times"<br>3. Count instances | Exactly 10 instances created | High |
| REC-007 | Infinite recurrence | 1. Weekly event<br>2. No end date or count<br>3. View calendar | Event continues indefinitely (with UI limit, e.g., 1 year ahead) | Medium |

### 5.2 Advanced Recurrence

| Test ID | Test Case | Steps | Expected Result | Priority |
|---------|-----------|-------|-----------------|----------|
| REC-101 | Weekly on specific days | 1. Create event<br>2. Set "Weekly on Mon, Wed, Fri"<br>3. View calendar | Events only on Mon, Wed, Fri each week | High |
| REC-102 | Monthly by day of month | 1. Event on 31st<br>2. Set monthly recurrence<br>3. Check Feb, Apr | Skips months without 31st OR adjusts to last day | Medium |
| REC-103 | Monthly by weekday | 1. Set "2nd Tuesday of month"<br>2. Check multiple months<br>3. View instances | Event on correct weekday position each month | Medium |
| REC-104 | Biweekly recurrence | 1. Event every 2 weeks<br>2. Set interval: 2<br>3. View calendar | Event every other week | Medium |
| REC-105 | Complex RRULE pattern | 1. Custom RRULE (e.g., last Friday of month)<br>2. Save event<br>3. Validate instances | Matches RFC 5545 specification | Low |

### 5.3 Recurrence Exceptions

**Supported:** RDATE (add dates) and EXDATE (exclude dates) on top of RRULE
**Not Supported:** Editing individual instances to have different properties

| Test ID | Test Case | Steps | Expected Result | Priority |
|---------|-----------|-------|-----------------|----------|
| REC-201 | Add exception date (RDATE) | 1. Weekly recurring event (every Monday)<br>2. Add RDATE for a specific Tuesday<br>3. View calendar | Event appears on Mondays AND the specific Tuesday (additional occurrence) | High |
| REC-202 | Exclude date (EXDATE) | 1. Daily event series for 7 days<br>2. Add EXDATE for day 3<br>3. View series | Event appears on days 1,2,4,5,6,7 - day 3 excluded (gap in series) | High |
| REC-203 | Multiple EXDATE entries | 1. Weekly event for 10 weeks<br>2. Add multiple EXDATE values (weeks 3, 5, 8)<br>3. View calendar | Event appears on weeks 1,2,4,6,7,9,10 - weeks 3,5,8 excluded | High |
| REC-204 | RDATE and EXDATE combined | 1. Weekly Monday event<br>2. Add EXDATE (skip one Monday)<br>3. Add RDATE (add a Friday)<br>4. View calendar | Specified Monday excluded, Friday added, other Mondays shown | Medium |
| REC-205 | Edit recurring event (all instances) | 1. Create weekly recurring event<br>2. Edit the base event (change time or summary)<br>3. Save | All future instances reflect the change (no per-instance editing) | Medium |

---

## 6. ICS Export & Import

### 6.1 ICS Export

| Test ID | Test Case | Steps | Expected Result | Priority |
|---------|-----------|-------|-----------------|----------|
| ICS-001 | Export single event | 1. Create event<br>2. Click "Export as ICS"<br>3. Download file<br>4. Open in calendar app | Event imports correctly with all fields | High |
| ICS-002 | Export recurring event | 1. Weekly recurring event<br>2. Export as ICS<br>3. Import to Google/Apple Calendar | All instances appear correctly | High |
| ICS-003 | Export calendar feed | 1. Calendar with 20 events<br>2. Get ICS feed URL<br>3. Subscribe in external client | All events synced, updates reflected | High |
| ICS-004 | ICS with complex RRULE | 1. Event with advanced recurrence<br>2. Export ICS<br>3. Validate file | RRULE matches RFC 5545 format | Medium |
| ICS-005 | ICS timezone handling | 1. Event in specific timezone<br>2. Export ICS<br>3. Import in different timezone | Time converts correctly | High |
| ICS-006 | ICS with special characters | 1. Event with emoji, unicode in title<br>2. Export ICS<br>3. Check file | Properly escaped, imports correctly | Low |

---

## 7. Search & Filtering

### 7.1 Event Search

| Test ID | Test Case | Steps | Expected Result | Priority |
|---------|-----------|-------|-----------------|----------|
| SRC-001 | Search by keyword | 1. Search "conference"<br>2. View results | Events with "conference" in title/description shown | High |
| SRC-002 | Search by date range | 1. Filter events: Jan 1 - Jan 31<br>2. Apply filter | Only events in January shown | High |
| SRC-003 | Search by author | 1. Filter by User A<br>2. View results | Only User A's events shown | Medium |
| SRC-004 | Combined filters | 1. Search: "tech" + Jan<br>2. Apply all filters | Events matching ALL criteria shown | High |
| SRC-005 | Empty search results | 1. Search nonsense string<br>2. View results | "No results found" message, clear filters option | Low |
| SRC-006 | Filter by event status | 1. Create CONFIRMED and CANCELLED events<br>2. Filter by status=CONFIRMED<br>3. View results | Only CONFIRMED events shown | Medium |
| SRC-007 | URL filter synchronization | 1. Apply filters (tags, date, status)<br>2. Copy URL<br>3. Open in new browser/incognito | Same filters applied, same results shown | High |
| SRC-008 | Max tags in filter | 1. Try filtering with 6+ tags<br>2. Check URL and results | Only first 5 tags applied (max 5 per query) | Low |

### 7.2 Calendar Filtering

| Test ID | Test Case | Steps | Expected Result | Priority |
|---------|-----------|-------|-----------------|----------|
| SRC-101 | Filter calendar by tag | 1. Click tag "community"<br>2. View calendars | Only calendars with that tag shown | Medium |

### 7.3 Calendar View Filters

| Test ID | Test Case | Steps | Expected Result | Priority |
|---------|-----------|-------|-----------------|----------|
| SRC-201 | Month view navigation | 1. Open calendar view<br>2. Navigate to next/previous month<br>3. Check dates | Correct month shown, events on proper dates | High |
| SRC-202 | Week view | 1. Switch to week view<br>2. View events | Events in 7-day grid | Medium |
| SRC-203 | Day view | 1. Switch to day view<br>2. View events | Agenda with events | Medium |
| SRC-204 | Today button | 1. Navigate to different month<br>2. Click "Today"<br>3. Check view | Returns to current date | Low |
| SRC-205 | Filter by calendar | 1. Toggle calendar visibility checkboxes<br>2. View calendar | Only selected calendars' events shown | High |

---

## 8. Access Control & Permissions

### 8.1 Calendar Permissions

| Test ID | Test Case | Steps | Expected Result | Priority |
|---------|-----------|-------|-----------------|----------|
| ACC-001 | Non-author cannot edit calendar | 1. User B views User A's calendar<br>2. Look for edit button | No edit button shown | High |
| ACC-002 | Non-author cannot add events | 1. User B (not author) on Calendar X<br>2. Try to create event in Calendar X | Calendar not in dropdown OR error on save | High |
| ACC-004 | Owner can delete calendar | 1. User A (owner) deletes calendar<br>2. User B (author) checks | Calendar deleted for everyone | High |
| ACC-005 | Author cannot delete calendar | 1. User B (author, not owner)<br>2. Try to delete calendar | Delete button not shown OR permission error | High |

### 8.2 Event Permissions

| Test ID | Test Case | Steps | Expected Result | Priority |
|---------|-----------|-------|-----------------|----------|
| ACC-101 | Non-author cannot edit event | 1. User A creates event<br>2. User B views event<br>3. Look for edit button | No edit button shown | High |
| ACC-102 | Author can edit own event | 1. User A creates event<br>2. User A edits event | Edit succeeds | High |
| ACC-103 | Anyone can RSVP | 1. User A creates event<br>2. User B, C, D can RSVP | All RSVPs recorded | High |
| ACC-104 | Anyone can tag | 1. Any user views event<br>2. Add tag | Tag added successfully | High |

### 8.3 Data Integrity Tests

| Test ID | Test Case | Steps | Expected Result | Priority |
|---------|-----------|-------|-----------------|----------|
| ACC-201 | Invalid calendar reference (manual) | 1. Use Pubky observer/API<br>2. Create event with fake calendarId<br>3. Try to fetch event | Event exists but calendar link broken/ignored | High |
| ACC-203 | Tampered data validation | 1. Modify event JSON directly (invalid date)<br>2. Try to sync to Nexus<br>3. View in UI | Validation error OR data sanitized | Medium |
| ACC-204 | Missing required fields | 1. Create event via API without summary<br>2. Try to index | Rejected OR defaults applied | Low |

---

## 9. Profile & User Data

### 9.1 Profile Display

| Test ID | Test Case | Steps | Expected Result | Priority |
|---------|-----------|-------|-----------------|----------|
| PRF-001 | View own profile | 1. Login<br>2. View dashboard profile widget | Name, avatar, bio, links shown | High |
| PRF-002 | Profile with missing avatar | 1. User with no avatar image<br>2. View profile | Initials shown in avatar fallback | Low |
| PRF-003 | View other user's profile | 1. Click on event author name<br>2. View their profile | Opens Profile in pubky.app | Medium |

---

## 10. UI/UX & Workflows

### 10.1 Navigation

| Test ID | Test Case | Steps | Expected Result | Priority |
|---------|-----------|-------|-----------------|----------|
| NAV-001 | Dashboard navigation | 1. Login<br>2. View dashboard<br>3. Check widgets | Upcoming events, my calendars, quick stats visible | High |
| NAV-002 | Back navigation | 1. Create event<br>2. Click back button<br>3. Check state | Returns to previous page, no data loss | Medium |
| NAV-003 | Deep linking event-view | 1. Create event feed<br>2. Copy URL<br>3. Open in other browser | Event stream page has filters applied | Low |
| NAV-004 | Deep linking calendar-view | 1. Create calendar feed<br>2. Copy URL<br>3. Open in other browser | Calendar stream page has filters applied | Low |
| NAV-005 | Deep linking | 1. Share event URL<br>2. Open in new browser<br>3. Check if loads | Event details page loads directly | High |
| NAV-006 | 404 handling | 1. Navigate to non-existent event ID<br>2. View error page | Friendly 404 message | Low |

### 10.2 Forms & Validation

| Test ID | Test Case | Steps | Expected Result | Priority |
|---------|-----------|-------|-----------------|----------|
| FRM-001 | Form validation real-time | 1. Create event<br>2. Enter invalid date<br>3. Tab out of field | Unable to enter invalid data in UI | Medium |
| FRM-002 | Required field indicators | 1. Open event form<br>2. Check for asterisks/labels | Required fields clearly marked | Low |
| FRM-003 | Form persistence on error | 1. Fill event form<br>2. Submit with validation error<br>3. Check fields | Data preserved, not lost | High |
| FRM-004 | Date picker usability | 1. Open date picker<br>2. Select date<br>3. Check format | Easy to use, correct format applied | Medium |

### 10.3 Loading & Error States

| Test ID | Test Case | Steps | Expected Result | Priority |
|---------|-----------|-------|-----------------|----------|
| UX-001 | Loading spinner | 1. Navigate to slow-loading page<br>2. Observe | Spinner or skeleton shown while loading | Medium |
| UX-002 | Optimistic updates | 1. Create event<br>2. Observe UI | Event appears immediately, updates in background | High |
| UX-003 | Network error handling | 1. Disconnect internet<br>2. Try to create event | Clear error message | High |
| UX-004 | Session expiry | 1. Wait for session timeout<br>2. Try to perform action | Redirect to login with return URL | Medium |

### 10.4 Mobile Responsiveness

| Test ID | Test Case | Steps | Expected Result | Priority |
|---------|-----------|-------|-----------------|----------|
| MOB-001 | Mobile navigation | 1. Open on mobile device<br>2. Navigate app | Hamburger menu, touch-friendly navigation | High |
| MOB-002 | Mobile forms | 1. Create event on mobile<br>2. Fill form<br>3. Save | Form usable, keyboard doesn't obscure fields | High |
| MOB-003 | Mobile calendar view | 1. View calendar on mobile<br>2. Swipe/navigate | Touch gestures work, readable layout | Medium |

---

## 11. Timezone Handling

| Test ID | Test Case | Steps | Expected Result | Priority |
|---------|-----------|-------|-----------------|----------|
| TZ-001 | Event in different timezone | 1. Create event in "America/New_York"<br>2. View in "Europe/London"<br>3. Check time | Time converted correctly for viewer's timezone | High |
| TZ-002 | Timezone display | 1. Event with explicit timezone<br>2. View event details | Timezone shown (e.g., "5:00 PM EST") | Medium |
| TZ-003 | Date-only event handling | 1. Create event with date in dtstart (e.g., "2026-01-15" without time)<br>2. View in different timezones | Event shown consistently across timezones (treated as local date, not time-shifted) | High |
| TZ-004 | Recurring event DST | 1. Weekly event spanning DST change<br>2. Check instances before/after DST | Times handled correctly across DST boundary | Medium |
| TZ-005 | Export ICS timezone | 1. Event with timezone<br>2. Export ICS<br>3. Import to other calendar | Timezone preserved in VTIMEZONE component | Medium |

---

## 12. Authentication & Security

| Test ID | Test Case | Steps | Expected Result | Priority |
|---------|-----------|-------|-----------------|----------|
| AUTH-001 | Login with recovery file | 1. Upload recovery file<br>2. Enter passphrase<br>3. Submit | Successfully logged in, session established | High |
| AUTH-002 | Invalid passphrase | 1. Upload recovery file<br>2. Enter wrong passphrase<br>3. Submit | Error shown, not logged in | High |
| AUTH-003 | Logout | 1. Click logout<br>2. Try to access protected page | Session cleared, redirected to login | High |
| AUTH-004 | Session persistence | 1. Login<br>2. Close browser<br>3. Reopen and navigate to app | Still logged in (if session not expired) | Medium |
| AUTH-005 | Protected routes | 1. Without login, navigate to /events/new<br>2. Check behavior | Redirected to login, return URL preserved | High |
| AUTH-006 | QR code login (Pubky Ring) | 1. Click QR login option<br>2. Scan with Pubky Ring<br>3. Complete authentication | Session established, logged in | Medium |
| AUTH-007 | Testnet signup | 1. Click signup (testnet only)<br>2. Generate new account<br>3. Download .pkarr file | Account created, recovery file downloaded automatically | Medium |

---

## Priority Guidelines

- **High Priority:** Core functionality, data integrity, security, user-blocking issues
- **Medium Priority:** Important features, UX issues, edge cases
- **Low Priority:** Nice-to-have features, minor UI issues, rare edge cases

---

## Notes for Testers

1. **Nexus Indexing:** Most writes have 2-3 second delay before appearing in Nexus. Wait and refresh if data seems missing.

2. **Optimistic Updates:** UI shows changes immediately (optimistic updates) but data might rollback if write fails. Verify persistence.

3. **Cache Behavior:** React Query caches data. Hard refresh (Ctrl+Shift+R) bypasses cache. Understand difference between cache and source data.

4. **Cross-User Testing:** Many tests require multiple logged-in users. Use different browsers or incognito windows.

---

