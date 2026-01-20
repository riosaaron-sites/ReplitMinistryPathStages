# MinistryPath Overhaul Notes

## Project Structure Inventory

### Entry Points
- **Client entry file**: `client/src/main.tsx`
- **Client router file**: `client/src/App.tsx`
- **Server entry file**: `server/index.ts`
- **Main route registration**: `server/routes.ts`
- **DB schema files**: `shared/schema.ts`

### Key Architecture
- **Frontend**: React 18 + Vite + TypeScript + TanStack Query + Wouter routing
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL via Neon + Drizzle ORM
- **Authentication**: Replit Auth (OpenID Connect) + Local email/password auth
- **UI**: Shadcn/ui + Tailwind CSS

---

## Phase 0: Project Inventory + Safety Net
**Status**: Complete  
**Date**: 2026-01-01

### Changes Made
1. Created `docs/overhaul_notes.md` (this file)
2. Added `/healthz` endpoint - returns `{ ok: true }`
3. Added `/healthz/db` endpoint - checks DB connectivity safely

### Files Changed
- `docs/overhaul_notes.md` (created)
- `server/routes.ts` (added health endpoints)

### Routes Added
- `GET /healthz` - Basic health check
- `GET /healthz/db` - Database connectivity check

---

## Phase 1: Dead Links / Broken Routes
**Status**: Complete  
**Date**: 2026-01-01

### Route Map

#### Client Routes (from App.tsx)
**Public Routes:**
- `/` - LandingPage (unauthenticated) / MemberDashboard (authenticated)
- `/admin` - AdminLogin
- `/invite/:token` - InviteAccept
- `/help` - HelpCenter

**Member Routes (authenticated):**
- `/` - MemberDashboard
- `/profile` - MyProfile
- `/survey` - Survey
- `/results` - Results
- `/trainings` - TrainingHub
- `/trainings/:moduleId` - TrainingViewer
- `/my-discipleship` - MyDiscipleship
- `/journey`, `/progress`, `/discipleship`, `/my-progress` - Redirect to /my-discipleship
- `/my-roles` - MyRoles
- `/teams` - TeamConnection
- `/messages` - Messages
- `/manuals` - ManualsLibrary
- `/resources` - ResourcesLibrary
- `/help` - HelpCenter
- `/requests` - RequestCenter
- `/meetings` - Meetings
- `/about` - AboutUs
- `/calendar` - MinistryCalendar
- `/onboarding/*` - Onboarding wizard steps
- `/join` - OnboardingHub
- `/profile/setup` - ProfileWizard

**Leadership Routes (authenticated + leadership role):**
- `/leadership` - LeadershipDashboard
- `/leadership/people` - PeopleRoles
- `/leadership/ministries` - MinistriesManagement
- `/leadership/trainings` - TrainingManagement
- `/leadership/requests` - RequestCenter
- `/leadership/rooms` - RoomsManagement
- `/leadership/metrics` - MetricsDashboard
- `/leadership/interns` - InternPortal
- `/leadership/meetings` - Meetings
- `/leadership/my-team` - MyTeam
- `/leadership/workboards` - Workboards
- `/leadership/pastoral-care` - PastoralCare
- `/leadership/invites` - InviteManagement
- `/leadership/admin` - AdminPanel

### Route Fixes Applied

#### Route Aliases Added (Server)
- `GET /api/role-assignments/me` - alias for `/api/role-assignments/my`

#### Client Route Aliases Added
- `/dashboard` → `/` (MemberDashboard)

#### Missing Endpoints Implemented
1. `GET /api/training/progress/all` - Leader-only endpoint for viewing all users' training progress
2. `GET /api/training/required` - Returns current user's required trainings based on their ministries
3. `GET /api/user-ministries/invited` - Returns ministries the user has been invited to join

### Files Changed
- `server/routes.ts` - Added missing endpoints and aliases
- `client/src/App.tsx` - Added /dashboard route alias

---

## Phase 2: Permissions Hardening
**Status**: Complete  
**Date**: 2026-01-01

### Changes Made

1. **Centralized Permission Middleware Helpers** (server/replitAuth.ts):
   - `requireLeader` - Requires leadership-level access or above
   - `requireAdmin` - Requires admin-level access or above
   - `requirePastor` - Requires pastoral-level access
   - `requireMinistryLeader(ministryIdParam)` - Factory function for scoped ministry leadership access

2. **Scoped Directory Endpoint** (server/routes.ts):
   - `GET /api/directory` - Returns users scoped by ministry membership
   - Members only see users who share at least one ministry with them
   - Leaders can see all users
   - Prevents global user enumeration for non-leaders

### Files Changed
- `server/replitAuth.ts` - Added permission middleware helpers
- `server/routes.ts` - Added scoped directory endpoint, imported new middleware

### Routes Added
- `GET /api/directory` - Scoped user directory for member messaging

### Permission Model
- **owner** (100): Full organization control
- **admin** (90): System control, no pastoral authority
- **pastor** (80): Spiritual oversight, care access
- **leader** (60): Ministry leadership, training oversight
- **member** (40): Dream Team member/volunteer
- **intern** (30): Limited authority, in training
- **attendee** (10): Regular church attendee

---

## Phase 3: Training Approval Workflow
**Status**: Complete  
**Date**: 2026-01-01

### Changes Made

1. **Updated Training Status Model** (shared/schema.ts):
   - Added 'submitted' status - awaiting leader approval after quiz completion
   - Added 'rejected' status - leader rejected, user can resubmit
   - Updated TRAINING_STATUS constant with all valid statuses

2. **Database Schema Updates** (shared/schema.ts):
   - Added `submittedAt` - timestamp when user submitted for approval
   - Added `rejectedBy` - reference to leader who rejected
   - Added `rejectedAt` - timestamp when rejected
   - Added `rejectionFeedback` - leader feedback explaining rejection

3. **New API Endpoints** (server/routes.ts):
   - `GET /api/training/submissions` - Leader-only endpoint to see pending submissions (scoped by ministry)
   - `POST /api/training/progress/:progressId/approve` - Approve a training submission
   - `POST /api/training/progress/:progressId/reject` - Reject a training submission with feedback

4. **Storage Methods** (server/storage.ts):
   - Added `getAllTrainingProgress()` - Get all training progress records
   - Added `updateTrainingProgress(id, data)` - Update progress by ID
   - Added `awardXp(userId, amount, sourceType, reason)` - Convenience method for XP awards

### Approval Workflow
1. User completes training quiz → status changes to 'submitted'
2. Leader sees pending submissions in `/api/training/submissions`
3. Leader approves → status changes to 'approved', XP awarded
4. Or leader rejects → status changes to 'rejected', feedback saved, user can resubmit

### Permission Scoping
- Leaders can only approve trainings for ministries they lead
- Admins and Pastors can approve any training
- XP is only awarded upon leader approval (not upon quiz completion)

---

## Phase 4: Unify Profile/Roles/Journey
**Status**: Complete  
**Date**: 2026-01-01

### Changes Made

1. **Unified User Progress Endpoint** (server/routes.ts):
   - `GET /api/user-progress` - Single endpoint returning all user journey data:
     - `user`: Basic profile info
     - `journey`: Class statuses (firstLook, nextNight, followingJesus, membership, baptism)
     - `onboarding`: Completion status and current step
     - `survey`: Completeness and section progress
     - `ministries`: Leading and serving ministries
     - `training`: Progress across all modules with status counts
     - `rewards`: XP, level, badges, progress to next level

### Response Structure
```json
{
  "user": { "id", "firstName", "lastName", "email", "profileImageUrl", "role" },
  "journey": {
    "firstLook": { "status", "completedAt" },
    "nextNight": { "status", "completedAt" },
    "followingJesus": { "status", "completedAt" },
    "membershipDate", "baptismDate"
  },
  "onboarding": { "isComplete", "currentStep", "profileComplete", "ministrySelectionComplete" },
  "survey": { "isComplete", "completedSections", "percentComplete" },
  "ministries": { "leading": [], "serving": [], "totalActive" },
  "training": { "totalModules", "completed", "inProgress", "submitted", "rejected", "progress": [] },
  "rewards": { "totalXp", "currentLevel", "nextLevel", "progressToNextLevel", "badges" }
}
```

### Benefits
- Single API call for Profile page instead of multiple calls
- Consistent data structure for frontend components
- Profile becomes the hub for user journey visualization

---

## Phase 5: Meetings & Messages → Team Center
**Status**: Complete  
**Date**: 2026-01-01

### Changes Made

1. **New Database Tables** (shared/schema.ts):
   - `meetingActionItems` - Action items with assignees, due dates, priorities, status
   - `meetingAttendance` - Attendance tracking with check-in/check-out

2. **Storage Methods** (server/storage.ts):
   - Action items: get, getByAssignee, create, update, delete
   - Attendance: get, upsert, update

3. **New API Endpoints** (server/routes.ts):
   - `GET /api/meetings/:id/action-items` - Get meeting action items
   - `POST /api/meetings/:id/action-items` - Create action item
   - `PATCH /api/meetings/action-items/:itemId` - Update action item
   - `DELETE /api/meetings/action-items/:itemId` - Delete action item
   - `GET /api/action-items/my` - Get current user's action items
   - `GET /api/meetings/:id/attendance` - Get meeting attendance
   - `POST /api/meetings/:id/attendance` - Record attendance
   - `POST /api/meetings/:id/check-in` - Self check-in
   - `POST /api/meetings/:id/check-out` - Self check-out

### Action Item Features
- Assignee tracking with user enrichment
- Priority levels: low, medium, high, urgent
- Status tracking: pending, in-progress, completed, cancelled
- Due date support
- Completion tracking with timestamp and who completed

### Attendance Features
- Status tracking: invited, confirmed, attended, absent, excused
- Self check-in/check-out with timestamps
- User enrichment for display

---

## Phase 6: Calendar + Room Reservations
**Status**: Complete  
**Date**: 2026-01-01

### Changes Made

1. **Unified Calendar Endpoint**:
   - `GET /api/calendar/unified` - Combines meetings, events, and room reservations
   - Supports date range filtering (start, end params)
   - Optional ministryId filter
   - Returns typed items (meeting/event/reservation) sorted by start time

2. **Room Approval Flow**:
   - `GET /api/room-reservations/pending` - Get pending reservations (leader only)
   - `POST /api/room-reservations/:id/approve` - Approve reservation (leader only)
   - `POST /api/room-reservations/:id/decline` - Decline with reason (leader only)
   - Status flow: pending → approved/declined/cancelled
   - Tracks approvedBy and approvedAt

3. **Outlook Integration Stubs**:
   - `GET /api/integrations/outlook/auth-url` - Returns config requirements
   - `POST /api/integrations/outlook/sync` - Stub for future integration
   - Indicates Azure AD configuration needed for full integration

### Room Approval Features
- Only leaders can approve/decline reservations
- Pending queue for easy review
- Decline reason tracked in notes
- Enriched with room info for display

---

## Phase 7: Admin Branding + Safe Settings
**Status**: Complete  
**Date**: 2026-01-01

### Changes Made

1. **New Database Table** (shared/schema.ts):
   - `orgSettings` - Organization configuration and branding
   - Basic info: name, tagline
   - Branding: primary/secondary/accent colors, logo/favicon URLs
   - Contact: email, phone, address, website
   - Social: Facebook, Instagram, YouTube, Twitter URLs
   - Feature flags: enable/disable major features
   - Integration flags: Outlook, email integrations

2. **Storage Methods** (server/storage.ts):
   - `getOrgSettings()` - Get current org settings (single row)
   - `upsertOrgSettings()` - Create or update settings

3. **New API Endpoints** (server/routes.ts):
   - `GET /api/org/settings` - Public endpoint for branding (no auth required)
   - `PUT /api/org/settings` - Admin-only settings update
   - `GET /api/org/features` - Public feature flags for frontend

### Feature Flags
- enableOnboarding: Toggle new member onboarding flow
- enableTraining: Toggle training modules
- enableRewards: Toggle XP/badge system
- enableTeamCenter: Toggle team collaboration features
- enableBackgroundChecks: Toggle background check workflow
- outlookIntegrationEnabled: Toggle Outlook calendar sync
- emailIntegrationEnabled: Toggle email notifications

### Security
- Settings read is public (for branding display)
- Settings update requires admin role
- Tracks updatedBy for audit trail

---

## Phase 8: File Cleanup / Clutter Removal
**Status**: Complete  
**Date**: 2026-01-01

### Files Removed
- `ministry-path.part-*` (12 archive split files)
- `ministry-path.zip` (full project archive)
- `FULL_SOURCE_CODE.txt` (code dump)
- `FULL_SOURCE_CODE_2.txt` (code dump copy)

### Files Retained
- `MinistryPath_Post_Launch_Improvement_Spec.md` - Valuable reference for overhaul
- `MinistryPath_Text_Audit.md` - Content audit reference
- `replit.md` - Project documentation
- `design_guidelines.md` - Frontend design reference

### Impact
- Reduced repository clutter
- Removed redundant archive files
- Kept reference documentation for future development

---

## Phase 9: Help Center - User Manual
**Status**: Complete  
**Date**: 2026-01-01

### Changes Made

1. **New Database Table** (shared/schema.ts):
   - `helpArticles` - Searchable help content
   - Fields: title, slug, summary, content, category, tags
   - Target roles for role-specific help
   - View count tracking
   - Publish/draft status

2. **Storage Methods** (server/storage.ts):
   - `getHelpArticles()` - Get all/category articles
   - `getHelpArticle()` - Get by ID
   - `getHelpArticleBySlug()` - Get by URL slug
   - `searchHelpArticles()` - Full-text search
   - `createHelpArticle()` - Admin create
   - `updateHelpArticle()` - Admin update
   - `incrementHelpArticleViews()` - Track views
   - `deleteHelpArticle()` - Admin delete

3. **New API Endpoints** (server/routes.ts):
   - `GET /api/help/articles` - List all (with category filter)
   - `GET /api/help/categories` - Categories with counts
   - `GET /api/help/search?q=query` - Full-text search
   - `GET /api/help/articles/:slug` - Single article (increments views)
   - `POST /api/help/articles` - Create (admin only)
   - `PUT /api/help/articles/:id` - Update (admin only)
   - `DELETE /api/help/articles/:id` - Delete (admin only)

### Categories
- getting-started, onboarding, training
- team-center, calendar, profile
- admin, troubleshooting, faq

### Features
- Full-text search across title, content, summary
- Role-based article visibility
- View count analytics
- Slug-based friendly URLs
- Admin-only content management

---

## Configuration Steps

### Required Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `ADMIN_USERNAME` - Admin bypass username
- `ADMIN_PASSWORD` - Admin bypass password
- `MAILGUN_API_KEY` - For email sending (optional)
- `MAILGUN_DOMAIN` - For email sending (optional)

### Outlook 365 Integration (Future)
- Not yet configured
- Will require: `OUTLOOK_CLIENT_ID`, `OUTLOOK_CLIENT_SECRET`, `OUTLOOK_TENANT_ID`

---

## Known Limitations
- None currently documented
