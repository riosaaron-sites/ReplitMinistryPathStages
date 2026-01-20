# MinistryPath Testing Checklist

This checklist validates all critical flows before publishing to production.

---

## 0) Pre-Test Setup (5 minutes)

### Required Test Data

| Item | Details | How to Create |
|------|---------|---------------|
| Ministry: Worship | Test ministry for leader workflows | Admin Panel → Ministries tab → Add Ministry |
| Ministry: Men's | Optional second ministry for join flow | Admin Panel → Ministries tab → Add Ministry |
| Leader A | Leader of Worship ministry | Admin Panel → Users → Create user with "leader" role, assign to Worship |
| Member 1 | Assigned to Worship ministry | Complete onboarding, select Worship ministry |
| Member 2 | Optional, assigned to Men's | For team join notification test |

### System Status Check

Navigate to: **Admin Panel → System Status tab**

| Service | Expected Status | If Failing |
|---------|----------------|------------|
| Database | ✅ Connected | Check DATABASE_URL secret |
| Email (Mailgun) | ✅ Connected OR "Fallback mode" | Can still test in-app notifications; email uses fallback mailto links |
| Outlook 365 | ✅ Connected OR "Not configured" | Optional for testing |

---

## 1) Critical Loop: Training Lifecycle (15 minutes)

### Test: Training Submission Flow

**Location:** `/trainings` → Select any training that requires approval

#### Step 1A: Member Submits Training

| Step | Action | UI Location |
|------|--------|-------------|
| 1 | Log in as **Member 1** | Login page |
| 2 | Navigate to Training Hub | Sidebar → "Trainings" |
| 3 | Select a training that requires approval | Training card with approval badge |
| 4 | Complete Lesson section | "Lesson" tab |
| 5 | Complete Study Questions section | "Study Questions" tab |
| 6 | Take Quiz and **PASS** | "Assessment" tab |

#### Expected Results After Quiz Submission

| Check | Expected | Status Label |
|-------|----------|--------------|
| Training status | `SUBMITTED FOR REVIEW` | NOT "Completed" |
| XP awarded | **No** - XP only awarded after approval | - |
| CoachBubble message | "Your training has been submitted for leader review" | - |
| Continue button | Shows "Continue to Next Training" (can browse other content) | - |

**FAIL CONDITIONS:**
- ❌ Status shows "Completed" immediately
- ❌ XP is awarded before approval
- ❌ Language says "you're cleared" or "keep going"

#### Step 1B: Leader Receives Notification

| Step | Action | UI Location |
|------|--------|-------------|
| 1 | Log in as **Leader A** | Login page |
| 2 | Check notification bell | Top navigation bar |
| 3 | Verify in-app notification | Click bell icon |
| 4 | Check email inbox | Leader's email |

#### Expected Notifications

| Type | Content | Test |
|------|---------|------|
| In-app notification | "Member 1 submitted training for review" | Clicking goes to pending approvals |
| Email notification | Subject includes member name + ministry name | Email received within 1-2 minutes |

#### Step 1C: Leader Approves Training

| Step | Action | UI Location |
|------|--------|-------------|
| 1 | Navigate to Training Management | Leadership sidebar → "Training Management" |
| 2 | Click "Pending Approvals" tab | Tab in Training Management |
| 3 | Find Member 1's submission | Pending approvals list |
| 4 | Click "Affirm Readiness" | Approval button |

#### Step 1D: Member Sees Completion

| Step | Action | UI Location |
|------|--------|-------------|
| 1 | Log back in as **Member 1** | Login page |
| 2 | Navigate to Training Hub | Sidebar → "Trainings" |
| 3 | Check training status | Training card |

#### Expected Results After Approval

| Check | Expected |
|-------|----------|
| Training status | `COMPLETED` |
| XP awarded | **Yes** - check XP log |
| Badge (if applicable) | Awarded |

### Test: Training Rejection Flow

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Member submits another training | Status: "Submitted" |
| 2 | Leader clicks "Needs Follow-up" | - |
| 3 | Member checks training | Status: "Needs Follow-up" or "Rejected" |
| 4 | CoachBubble | Explains what to do next |
| 5 | Training cannot be completed | Must resubmit + get approved |

---

## 2) Leader Awareness Loop: Team Join (10 minutes)

### Test: New Member Joins Team

**Location:** Admin Panel → Invitations OR Member completes onboarding

#### Steps

| Step | Action | UI Location |
|------|--------|-------------|
| 1 | Invite Member 2 to Worship ministry | Admin Panel → Invitations → Send Invite |
| 2 | Accept invite as Member 2 | Email link or direct registration |
| 3 | Complete onboarding | Onboarding flow |

#### Expected Notifications for Leader A

| Type | Content | Verification |
|------|---------|--------------|
| Email | "New person joined your team (Worship)" | Check Leader A's inbox |
| In-app | Bell notification with link | Click notification |

#### My Team View Check

| Step | Action | UI Location |
|------|--------|-------------|
| 1 | Log in as Leader A | Login page |
| 2 | Navigate to My Team | Leadership sidebar → "My Team" |
| 3 | Find Member 2 | Team member list |

#### Expected My Team View

| Check | Expected |
|-------|----------|
| Member 2 appears | Yes |
| Onboarding status shown | Progress indicator |
| Training status counts | "0/X trainings completed" or similar |
| CoachBubble | Not spamming, no overlap with other bubbles |

---

## 3) Outlook Category Round-Trip (15 minutes)

### Test: Create and Filter by New Category

**Location:** Admin Panel → Calendar Categories

#### Steps

| Step | Action | UI Location |
|------|--------|-------------|
| 1 | Create new category "Outreach Night" | Admin Panel → Calendar Categories → Add |
| 2 | Navigate to Ministry Calendar | Leadership sidebar → "Calendar" |
| 3 | Check category filter | Filter dropdown |
| 4 | Create new event | Calendar → Add Event |
| 5 | Apply "Outreach Night" category | Event form → Category field |
| 6 | Save event | Submit button |

#### Expected Results

| Check | Expected |
|-------|----------|
| Category appears in filter immediately | Yes |
| Event displays category | Category badge on event |
| Filter by "Outreach Night" | Event appears in filtered view |
| Refresh page | Event still has category |

### Test: Non-MP Category Preservation (CRITICAL)

This test ensures MinistryPath doesn't wipe Outlook categories that weren't created by MinistryPath.

| Step | Action |
|------|--------|
| 1 | In Outlook, add a normal Outlook category (not prefixed with MP:) to the test event |
| 2 | In MinistryPath, edit the event and change the title |
| 3 | Save the event |
| 4 | In Outlook, verify the non-MP category is still present |

**FAIL CONDITION:**
- ❌ Non-MP categories are removed when MinistryPath updates the event

---

## 4) Room Booking Conflict Detection (10 minutes)

### Test: Overlapping Reservation Blocked

**Location:** Leadership → Rooms OR Event creation with room

#### Steps

| Step | Action | UI Location |
|------|--------|-------------|
| 1 | Book a room for 10:00–11:00 | Room reservation form |
| 2 | Try booking same room for 10:30–11:30 | Same form |

#### Expected Results

| Check | Expected |
|-------|----------|
| Second booking fails | HTTP 409 Conflict |
| Response includes conflict details | JSON with conflicting reservation info |
| UI message | Human-readable: "Conflicts with [Event Name] from 10:00-11:00" |

### Test: Conflict Check at Approval Time

If room reservations require leader approval:

| Step | Action | Expected |
|------|--------|----------|
| 1 | Submit two overlapping requests | Both show "Pending" |
| 2 | Approve first request | Approved successfully |
| 3 | Try to approve second request | Blocked with conflict message |

---

## Publish Recommendation

### All Tests Pass ✅

If all 4 flows pass:

1. **Publish** the application
2. Start with a pilot:
   - 2 leaders
   - 5-10 members
   - 2 ministries
   - 1 week duration

### Any Test Fails ❌

1. Document the failing step
2. Capture screenshot/error message
3. Fix the issue
4. Re-run the failing test
5. Do not publish until all tests pass

---

## Quick Reference: Status Labels

### Training Statuses

| Status | Meaning | UI Color |
|--------|---------|----------|
| `not-started` | Training not begun | Gray |
| `in-progress` | Currently working on training | Blue |
| `submitted` | Awaiting leader approval | Yellow/Amber |
| `approved` / `completed` | Leader approved, XP awarded | Green |
| `rejected` / `needs-follow-up` | Leader requested changes | Red |

### Room Reservation Statuses

| Status | Meaning |
|--------|---------|
| `pending` | Awaiting approval |
| `approved` | Reservation confirmed |
| `declined` | Reservation rejected |
| `cancelled` | Cancelled by requester |

---

## Key UI Locations

| Feature | Path |
|---------|------|
| Training Hub | `/trainings` |
| Training Management (Leaders) | `/leadership/training-management` |
| My Team (Leaders) | `/leadership/my-team` |
| Admin Panel | `/admin` |
| System Status | Admin Panel → System Status tab |
| Calendar Categories | Admin Panel → Calendar Categories |
| Ministry Calendar | `/leadership/calendar` |
| Room Reservations | Event creation or dedicated rooms page |
| Notifications | Bell icon in top navigation |
