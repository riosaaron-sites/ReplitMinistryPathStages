# MinistryPath Beta Testing Guide

This guide provides step-by-step walkthroughs for testing MinistryPath with multiple user personas. Each tester should document any issues, confusion points, or bugs they encounter.

---

## Quick Links

- **App URL**: Your published MinistryPath URL
- **Help Center**: `/help`
- **Issue Tracking**: Note issues on this document or designated tracker

---

## Test User Personas

Create these test accounts to simulate different user experiences:

| Persona | Role | Description |
|---------|------|-------------|
| **New Member** | attendee | First-time user going through onboarding |
| **Returning Member** | member | Completed onboarding, active in ministry |
| **Ministry Leader** | leader | Leads a ministry team |
| **Pastor** | pastor | Pastoral oversight and care |
| **Administrator** | admin | Full system access |

---

## PERSONA 1: New Member Journey

**Goal**: Test the complete new user experience from signup through dashboard access.

### Phase 1: Landing & Authentication

1. **Visit Landing Page**
   - [ ] Page loads without errors
   - [ ] "Get Started" or login button is visible
   - [ ] Mobile responsiveness works
   - [ ] Dark/light mode toggle works

2. **Sign In with Replit Auth**
   - [ ] Click login button
   - [ ] Replit OAuth flow completes
   - [ ] Redirected to onboarding

### Phase 2: Onboarding (7 Steps)

**Step 1: Welcome**
- [ ] Welcome message displays correctly
- [ ] Church branding visible
- [ ] "Let's Get Started" button works
- [ ] Progress indicator shows Step 1 of 7

**Step 2: Profile**
- [ ] First name, last name fields work
- [ ] Phone number field accepts valid format
- [ ] Birth date picker works
- [ ] All required fields are validated
- [ ] "Next" button disabled until form valid
- [ ] Can go back to previous step

**Step 3: Leadership Identification**
- [ ] Question about current leadership role appears
- [ ] If "Yes" selected, ministry dropdown appears
- [ ] If "No" selected, proceeds normally
- [ ] Selection is saved correctly

**Step 4: Ministry Selection**
- [ ] List of available ministries displays
- [ ] Can select ministries of interest
- [ ] Descriptions are helpful
- [ ] Can select multiple ministries

**Step 5: Faith Commitment**
- [ ] Faith agreement content loads (from database)
- [ ] Scripture references display correctly
- [ ] All 11 steps of agreement are accessible
- [ ] "I Agree" and "I Have Questions" options work
- [ ] If "I Have Questions" selected, shows pastoral follow-up message

**Step 6: Photo Upload**
- [ ] Photo upload button works
- [ ] Cropping tool appears
- [ ] Can adjust crop area
- [ ] Photo saves successfully
- [ ] Can skip this step

**Step 7: Classes**
- [ ] Class status questions appear
- [ ] Can indicate completion status
- [ ] Submission works correctly

**Step 8: Completion**
- [ ] Celebration/completion message shows
- [ ] "Go to Dashboard" button works
- [ ] Redirected to Member Dashboard

### Phase 3: Member Dashboard

- [ ] Dashboard loads without errors
- [ ] Welcome message with user's name
- [ ] My Path progress visible
- [ ] Ministry connections shown
- [ ] Quick actions work (if applicable)

### Checkpoint Questions for Testers:
1. Was the onboarding flow clear and intuitive?
2. How long did onboarding take (approximately)?
3. Were there any confusing steps?
4. Did any buttons not respond?
5. Was the mobile experience good?

---

## PERSONA 2: Active Member Experience

**Goal**: Test daily member activities after onboarding is complete.

### Setup
Use a test account that has completed onboarding.

### Test: Dashboard Overview

1. **Member Dashboard (`/`)**
   - [ ] Dashboard loads with personalized content
   - [ ] "My Path" discipleship progress visible
   - [ ] Upcoming trainings or tasks shown
   - [ ] Quick action buttons work

2. **My Path / Discipleship Journey (`/my-path`)**
   - [ ] WORSHIP → NEXT NIGHT → LEARN → LOVE → LEAD pathway visible
   - [ ] Progress tracking works
   - [ ] Clicking on steps provides details
   - [ ] Completion status accurate

### Test: Spiritual Gifts Survey

1. **Navigate to Survey (`/survey`)**
   - [ ] Survey introduction displays
   - [ ] 123 questions load properly
   - [ ] Likert scale (1-5) works
   - [ ] Progress bar updates
   - [ ] Can pause and resume survey
   - [ ] Submit button works at end

2. **View Results (`/results`)**
   - [ ] Results page loads after survey
   - [ ] Top spiritual gifts identified
   - [ ] DISC profile results shown
   - [ ] Ministry recommendations display
   - [ ] PDF download works (if available)

### Test: Training System

1. **Training Hub (`/trainings`)**
   - [ ] List of available trainings displays
   - [ ] Filter/search works (if available)
   - [ ] Training cards show title, description, status

2. **Take a Training (`/trainings/:moduleId`)**
   - [ ] Training content loads
   - [ ] Video plays (if applicable)
   - [ ] Lesson content is readable
   - [ ] Study questions appear
   - [ ] Quiz questions work
   - [ ] Multiple choice options selectable
   - [ ] Scenario-based questions clear
   - [ ] Submit quiz works
   - [ ] Results/feedback shown

### Test: Profile Management

1. **My Profile (`/profile`)**
   - [ ] Profile information displays
   - [ ] Can edit personal info
   - [ ] Photo upload/change works
   - [ ] Save changes works

### Test: Team & Communication

1. **Team Connection (`/teams`)**
   - [ ] Ministry team members visible
   - [ ] Leader information shown
   - [ ] Contact options work

2. **Messages (`/messages`)**
   - [ ] Message inbox loads
   - [ ] Can read messages
   - [ ] Encouragement notes from leaders visible

### Test: Resources

1. **Resources Library (`/resources`)**
   - [ ] Categories display
   - [ ] Documents/manuals accessible
   - [ ] Filtering works

2. **Help Center (`/help`)**
   - [ ] Articles searchable
   - [ ] Categories organized
   - [ ] Content helpful

### Test: Calendar

1. **Calendar (`/calendar`)**
   - [ ] Calendar view loads
   - [ ] Events display correctly
   - [ ] Filtering by type works
   - [ ] Can view event details

### Checkpoint Questions for Testers:
1. Could you find everything you needed?
2. Was navigation intuitive?
3. Did the training experience make sense?
4. Were there any broken links or errors?

---

## PERSONA 3: Ministry Leader Experience

**Goal**: Test leadership tools and team management.

### Setup
Use a test account with `leader` role assigned to at least one ministry.

### Test: Leadership Portal Access

1. **Access Leadership Portal**
   - [ ] "Leadership Portal" button visible in header
   - [ ] Clicking navigates to `/leadership`
   - [ ] Leadership dashboard loads

### Test: Leadership Dashboard (`/leadership`)

- [ ] Overview statistics display
- [ ] Quick actions available
- [ ] Ministry-specific info shown

### Test: My Team (`/leadership/my-team`)

1. **Team Overview**
   - [ ] Team members list displays
   - [ ] Health indicators visible (green/yellow/red)
   - [ ] Onboarding status shown
   - [ ] Training completion tracked

2. **Team Member Details**
   - [ ] Can click on team member
   - [ ] Profile details visible
   - [ ] Training progress shown
   - [ ] Can send encouragement note

### Test: Training Approvals

1. **Navigate to Training Management (`/leadership/trainings`)**
   - [ ] Pending approvals visible
   - [ ] Can review quiz submissions
   - [ ] Approve/reject buttons work
   - [ ] XP awarded on approval

### Test: Weekly Metrics (`/leadership/weekly-metrics`)

1. **Submit Weekly Metrics**
   - [ ] Form loads for your ministry
   - [ ] Fields: attendance, volunteers, first-timers, altar responses, follow-ups
   - [ ] Qualitative notes section (wins, concerns, next steps)
   - [ ] Submit works
   - [ ] Historical view (8 weeks) accessible

### Test: Meetings & Workboards (`/leadership/meetings`)

1. **Meeting Management**
   - [ ] Can create meeting
   - [ ] Agenda items addable
   - [ ] Action items with assignees work
   - [ ] Priority and due dates work
   - [ ] Meeting notes saveable

2. **Workboards (`/leadership/workboards`)**
   - [ ] Board displays
   - [ ] Can add/edit items
   - [ ] Comments work
   - [ ] Status changes work

### Test: Room Reservations (`/leadership/rooms`)

1. **Request a Room**
   - [ ] Room request form loads
   - [ ] Date/time picker works
   - [ ] Room selection works
   - [ ] Equipment/resources selectable
   - [ ] Submit works

2. **Approve Requests** (if you have approval rights)
   - [ ] Pending requests visible
   - [ ] Can approve/deny
   - [ ] Conflict detection works

### Checkpoint Questions for Testers:
1. Were team management tools intuitive?
2. Could you easily find pending approvals?
3. Was the metrics submission straightforward?
4. Any leadership features that seemed missing?

---

## PERSONA 4: Administrator Experience

**Goal**: Test full admin capabilities and system management.

### Setup
Use a test account with `admin` role.

### Test: Admin Panel (`/leadership/admin`)

1. **Admin Dashboard**
   - [ ] System status panel visible
   - [ ] Database health shown
   - [ ] Email service status shown
   - [ ] Outlook integration status (if configured)

2. **User Management**
   - [ ] User list displays
   - [ ] Can search/filter users
   - [ ] Role assignment works
   - [ ] User details accessible

3. **Impersonation** (Careful - this is for support)
   - [ ] Impersonate button visible for users
   - [ ] Requires reason field
   - [ ] Creates audit log entry
   - [ ] Can end impersonation

### Test: Training Studio (`/leadership/training-studio`)

1. **Create New Training**
   - [ ] 5-step workflow visible
   - [ ] Step 1: Manual selection works
   - [ ] Step 2: Metadata (title, description) works
   - [ ] Step 3: AI content generation works
   - [ ] Step 4: Review/Edit with TipTap editor works
   - [ ] Step 5: Publish works

2. **Edit Existing Training**
   - [ ] Select existing module
   - [ ] Content loads for editing
   - [ ] Changes save correctly
   - [ ] Status changes work (draft/live/archived)

3. **Publish Flow**
   - [ ] Auto-save triggers if changes unsaved
   - [ ] Publish button works on first try
   - [ ] Status updates to "LIVE"

### Test: Faith Agreements Editor (`/leadership/agreements`)

1. **View Agreement Content**
   - [ ] All 11 steps display
   - [ ] Content editable
   - [ ] Scripture references editable

2. **Edit & Save**
   - [ ] Make a text change
   - [ ] Save button works
   - [ ] Change persists after refresh

3. **Verify in Onboarding**
   - [ ] Changes appear in member onboarding flow

### Test: People & Roles (`/leadership/people`)

1. **User Management**
   - [ ] User list loads
   - [ ] Role changes work
   - [ ] Ministry assignments work

### Test: Ministry Management (`/leadership/ministries`)

1. **Ministry Configuration**
   - [ ] Ministry list displays
   - [ ] Can edit ministry details
   - [ ] Leader assignments work
   - [ ] Expectations editable

### Test: Invite System (`/leadership/invites`)

1. **Bulk Invites**
   - [ ] Single invite works
   - [ ] Bulk paste parsing works
   - [ ] Duplicate detection works
   - [ ] Email sending works (if Mailgun configured)

### Test: Pastoral Care (`/leadership/pastoral-care`)

1. **Follow-up Queue**
   - [ ] "I Have Questions" submissions visible
   - [ ] Can mark as followed-up
   - [ ] Notes saveable

### Checkpoint Questions for Testers:
1. Were admin tools powerful enough?
2. Any missing admin functionality?
3. Was the Training Studio easy to use?
4. Did the agreement editor work correctly?

---

## PERSONA 5: Edge Cases & Error Handling

**Goal**: Test how the system handles unusual situations.

### Test: Session & Authentication

1. **Session Timeout**
   - [ ] After inactivity, session expires gracefully
   - [ ] Redirect to login with message
   - [ ] No data loss

2. **Multiple Tabs**
   - [ ] Can use app in multiple tabs
   - [ ] State syncs between tabs

### Test: Form Validation

1. **Invalid Data**
   - [ ] Submit empty required fields - error shown
   - [ ] Invalid phone format - error shown
   - [ ] Invalid email format - error shown
   - [ ] Future birth date - error shown

2. **Long Content**
   - [ ] Very long names handled
   - [ ] Long text in notes/comments handled

### Test: Mobile Responsiveness

1. **Phone Size (375px)**
   - [ ] Navigation works
   - [ ] Forms usable
   - [ ] Content readable
   - [ ] Buttons tappable

2. **Tablet Size (768px)**
   - [ ] Layout adapts
   - [ ] Sidebar behavior correct

### Test: Offline/Network Issues

1. **Slow Connection**
   - [ ] Loading states visible
   - [ ] No blank screens

2. **Network Error**
   - [ ] Error messages helpful
   - [ ] Retry options available

---

## Issue Reporting Template

When you find an issue, document it like this:

```
### Issue: [Brief Title]

**Persona**: [Which user type]
**Page/Route**: [Where it happened]
**Steps to Reproduce**:
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected**: [What should happen]
**Actual**: [What actually happened]
**Screenshots**: [If applicable]
**Severity**: [Critical / Major / Minor / Cosmetic]
```

---

## Testing Checklist Summary

### Must-Test Areas (Critical Path)

- [ ] User registration and login
- [ ] Complete onboarding flow (all 7 steps)
- [ ] Spiritual gifts survey (123 questions)
- [ ] Training module completion
- [ ] Leadership portal access
- [ ] Admin panel functionality
- [ ] Training Studio creation and publishing
- [ ] Agreement content editing

### Should-Test Areas (Important)

- [ ] Team management features
- [ ] Weekly metrics submission
- [ ] Room reservations
- [ ] Meeting management
- [ ] Messages and communication
- [ ] Profile photo upload
- [ ] Calendar views

### Nice-to-Test Areas (Enhancement)

- [ ] Dark mode throughout
- [ ] Mobile experience
- [ ] Accessibility (keyboard navigation)
- [ ] Performance under load
- [ ] Browser compatibility

---

## Test Data Recommendations

### Create Test Users:
1. `test.newmember@example.com` - New user, never logged in
2. `test.member@example.com` - Completed onboarding, no survey
3. `test.surveyed@example.com` - Completed survey, assigned to ministry
4. `test.leader@example.com` - Leader role, manages team
5. `test.admin@example.com` - Admin role, full access

### Assign Test Users to Ministries:
- Assign at least 3 members to one ministry for team testing
- Assign test leader as Primary Leader of that ministry

---

## Contact & Support

For testing support or to report critical issues:
- Document in this guide
- Contact the development team

**Happy Testing!**
