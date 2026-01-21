# MinistryPath Forensic Audit Report

**Generated:** January 21, 2026  
**Prepared For:** Full codebase audit by ChatGPT

---

## 1. Project Stack Overview

### Framework & Build
- **Frontend:** React 18 with TypeScript, Vite bundler
- **Backend:** Express.js with TypeScript
- **Routing:** 
  - Frontend: Wouter (client-side routing)
  - Backend: Express Router
- **State Management:** TanStack Query (React Query v5)
- **UI Library:** Shadcn/ui (Radix primitives) + Tailwind CSS

### Authentication
- **Primary:** Replit Auth via OpenID Connect (passport.js, openid-client)
- **Sessions:** express-session with PostgreSQL session storage (connect-pg-simple)
- **Secure Admin Bootstrap:** POST /api/admin/bootstrap (requires STATUS_KEY env var)

### Database
- **Provider:** PostgreSQL via Neon serverless driver (@neondatabase/serverless)
- **ORM:** Drizzle ORM with drizzle-kit for migrations
- **Schema Location:** `shared/schema.ts`
- **Key Tables:** users, training_modules, user_training_progress, calendar_events, rooms, room_reservations, manuals, manual_analysis, quiz_questions, etc.

### Storage
- **File Storage:** Replit Object Storage for profile photos
- **PDF Manuals:** Local filesystem (`attached_assets/*.pdf` or `uploads/manuals/`)
- **Environment Variables:** STATUS_KEY, DATABASE_URL, MAILGUN_*, OUTLOOK_* (see .env.example)

---

## 2. Training Module System Map

### Data Storage
Training modules are stored in the PostgreSQL database in the `training_modules` table:

**Key Fields (from shared/schema.ts lines 1306-1346):**
```typescript
export const trainingModules = pgTable("training_modules", {
  id: varchar("id").primaryKey(),
  title: varchar("title").notNull(),
  slug: varchar("slug").notNull().unique(),
  description: text("description"),
  manualId: varchar("manual_id"),  // Links to source manual
  sourceCategory: varchar("source_category"),  // ministry_manual, leadership_training, resource
  lessonSummary: text("lesson_summary"),  // Plain text lesson summary
  lessons: jsonb("lessons").default([]),  // Array of lesson objects for deep training
  studyQuestions: jsonb("study_questions").default([]),
  knowledgeCheckQuestions: jsonb("knowledge_check_questions").default([]),
  estimatedMinutes: integer("estimated_minutes").default(30),
  ministryId: varchar("ministry_id"),
  audience: varchar("audience").default('all'),
  videoUrl: varchar("video_url"),  // Optional video URL
  isPublished: boolean("is_published").default(false),
  isRequired: boolean("is_required").default(false),
  isDeepTraining: boolean("is_deep_training").default(false),
});
```

### Where PDFs Are Stored
1. **Primary Location:** `attached_assets/*.pdf` (65 PDF files)
2. **Upload Location:** `uploads/manuals/` (runtime uploads)
3. **Database Linkage:** `manuals` table stores metadata, `manual_analysis` table stores AI-generated content extracted from PDFs

### How PDFs Link to Training Modules
1. PDF file → Registered in `manuals` table with file path
2. Manual → Analyzed by OpenAI via `manualAnalysisService.ts` → Results stored in `manual_analysis`
3. Analysis → `deepTrainingService.ts` generates training content (lessons, questions)
4. Training content → Stored in `training_modules.lessons`, `.studyQuestions`, `.knowledgeCheckQuestions`

### Presentation Display
**There is no separate "presentation" system.** Training content is rendered from:
- `lessonSummary` (text description)
- `lessons` (JSONB array of lesson objects with title, content, keyPoints)
- `videoUrl` (optional YouTube/Vimeo embeds)

### UI Components
- **Training Hub:** `client/src/pages/member/TrainingHub.tsx` - Lists available trainings
- **Training Viewer:** `client/src/pages/member/TrainingViewer.tsx` - Deep lesson display
- **Training Management:** `client/src/pages/leadership/TrainingManagement.tsx` - Admin CRUD
- **Training Quiz:** `client/src/components/TrainingQuiz.tsx` - Quiz component

### API Routes (server/routes.ts)
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/training/modules` | GET | List all training modules |
| `/api/training/modules/:id` | GET | Get single module with full content |
| `/api/training/modules` | POST | Create new module (leaders only) |
| `/api/training/modules/:id` | PATCH | Update module (leaders only) |
| `/api/training/modules/:id` | DELETE | Delete module (admin only) |
| `/api/training/assessments/:moduleId` | GET | Get quiz questions |
| `/api/training/assessments` | POST | Create assessment question |
| `/api/training/assessments/:id` | PATCH | Update assessment question |

---

## 3. Asset Integrity Scan

### PDF Files Present (65 total in attached_assets/)

| Filename | Status |
|----------|--------|
| SERVE_Booklet_*.pdf | ✅ Present |
| Holy_Spirit_Class_*.pdf | ✅ Present |
| About_Us_Manual_*.pdf | ✅ Present |
| Following_Jesus_*.pdf | ✅ Present |
| Baptism_Handout_*.pdf | ✅ Present |
| SOCIAL_MEDIA_MANUAL_*.pdf | ✅ Present |
| Youth_Worship_Manual_*.pdf | ✅ Present |
| Usher_Ministry_Manual_*.pdf | ✅ Present |
| Security_Ministry_Manual_*.pdf | ✅ Present |
| Recruitment_101_*.pdf | ✅ Present |
| Ministry_Development_Questionnaire_*.pdf | ✅ Present |
| Media_Ministry_Leader's_Job_Description_*.pdf | ✅ Present |
| Kingdom_Children_Manual_*.pdf | ✅ Present |
| Intercessory_Ministry_Manual_*.pdf | ✅ Present |
| Employee_Manual_*.pdf | ✅ Present |
| Facilities_Ministry_Manual_*.pdf | ✅ Present |
| Discipleship_Manual_*.pdf | ✅ Present |
| CREW_Manual_*.pdf | ✅ Present |
| Counting_Ministry_Manual_*.pdf | ✅ Present |
| Board_Member_Guide_*.pdf | ✅ Present |
| CORE_Minister_Manual_*.pdf | ✅ Present |
| Celebrate_Recovery_Manual_*.pdf | ✅ Present |
| Auxiliary_Ministry_Manual_*.pdf | ✅ Present |
| Language_of_a_Leader_*.pdf | ✅ Present |
| Ministry_Leaders_Manual_*.pdf | ✅ Present |
| Service_Coordinator_Job_Description_*.pdf | ✅ Present |
| Church-Incident-Report.pdf_*.pdf | ✅ Present |
| City_Youth_Worship_Manual_*.pdf | ✅ Present |
| Discipleship_Model_*.pdf | ✅ Present |

### Potential Missing Assets

**Issue: Training modules may reference manuals that aren't registered in DB**

To check:
1. Query `SELECT * FROM training_modules WHERE manual_id IS NOT NULL`
2. Cross-reference with `SELECT * FROM manuals`
3. For each manual, check if file exists at stored `file_path`

**Check storage.getManual()** in `server/storage.ts` for file resolution logic.

---

## 4. Feature Health Checks

### 4.1 Calendar Feature

**Status:** ⚠️ Partially Implemented

**Components:**
- `client/src/pages/member/MinistryCalendar.tsx` - Main calendar page
- `client/src/components/ui/calendar.tsx` - Calendar UI primitive

**API Endpoints (server/routes.ts):**
| Route | Line | Status |
|-------|------|--------|
| `GET /api/calendar/events` | ~3271 | ✅ Implemented |
| `POST /api/calendar/events` | ~3287 | ✅ Implemented |
| `PUT /api/calendar/events/:id` | ~3320 | ✅ Implemented |
| `DELETE /api/calendar/events/:id` | ~3349 | ✅ Implemented |
| `GET /api/calendar/unified` | ~5460 | ✅ Implemented (combines meetings, events, reservations) |
| `GET /api/calendar/categories` | Exists | ✅ Implemented |

**Database Tables:**
- `calendar_events` (schema.ts line 1032)
- `calendar_categories` (schema.ts line 956)

**Potential Issues:**
1. Outlook 365 integration may not be configured (requires OUTLOOK_* env vars)
2. Calendar category colors may not render correctly
3. Check if MinistryCalendar.tsx is properly importing from routes

**To Diagnose:**
```bash
# Check if calendar events exist
SELECT COUNT(*) FROM calendar_events;

# Check storage implementation
grep -n "getCalendarEvents\|createCalendarEvent" server/storage.ts
```

---

### 4.2 Room Request Module

**Status:** ⚠️ Potentially Broken

**Components:**
- `client/src/pages/leadership/RoomsManagement.tsx` - Admin room management

**API Endpoints (server/routes.ts):**
| Route | Line | Status |
|-------|------|--------|
| `GET /api/rooms` | ~5309 | ✅ Implemented |
| `POST /api/rooms` | ~5319 | ✅ Implemented |
| `GET /api/room-reservations` | ~5384 | ✅ Implemented |
| `POST /api/room-reservations` | ~5397 | ✅ Implemented |
| `POST /api/room-reservations/:id/approve` | ~5689 | ✅ Implemented |
| `POST /api/room-reservations/:id/decline` | ~5745 | ✅ Implemented |
| `GET /api/room-reservations/pending` | ~5774 | ✅ Implemented |

**Database Tables:**
- `rooms` (schema.ts line 1556)
- `room_reservations` (schema.ts line 1609)
- `room_layouts` (schema.ts line 2602)

**Potential Issues:**
1. **Conflict Detection:** Line 5417-5437 checks for conflicts but may have edge cases
2. **Missing UI:** No dedicated "Request a Room" page for regular members found
3. **Approval Workflow:** Requires leader role - check RBAC enforcement

**To Diagnose:**
```bash
# Check rooms exist
SELECT * FROM rooms;

# Check pending reservations
SELECT * FROM room_reservations WHERE status = 'pending';

# Check storage implementation
grep -n "createRoomReservation\|getRoomReservations" server/storage.ts
```

---

## 5. Edit Questions Capability

### Current State: ✅ Exists (Partial)

**UI Location:** TrainingManagement.tsx has "Manage Questions" button (line 93-94):
```tsx
<Button variant="ghost" size="icon" onClick={onManageQuestions} data-testid={`button-manage-questions-${training.id}`}>
  <FileQuestion className="w-4 h-4" />
</Button>
```

**API Endpoints for Quiz Questions:**
| Route | Purpose |
|-------|---------|
| `GET /api/training/assessments/:moduleId` | Get questions for module |
| `POST /api/training/assessments` | Create new question |
| `PATCH /api/training/assessments/:id` | Update existing question |
| `DELETE /api/training/assessments/:id` | Delete question |

**Database Tables:**
- `training_assessments` (schema.ts line 1391)
- `quiz_questions` (schema.ts line 2320)

### What Needs Verification:
1. Does `onManageQuestions` handler actually open a question editor dialog?
2. Does the UI allow editing individual questions, or just viewing?
3. Is there inline editing or only delete/recreate?

**To Find Implementation:**
```bash
grep -n "onManageQuestions\|ManageQuestions\|AssessmentEditor" client/src/pages/leadership/TrainingManagement.tsx
```

### What May Need Building:
1. **Inline question editing** - May currently require delete + create
2. **Drag-and-drop reordering** - `sortOrder` field exists but UI may not support
3. **Bulk question import** - No evidence of CSV/bulk upload

---

## 6. Known Runtime Errors / Code Markers

### Search Results

**No TODO/FIXME found in source code** (only in package-lock.json hashes and attached instruction files)

### LSP Diagnostics
Current LSP errors in `server/routes.ts` (12 diagnostics) - likely type mismatches or unused variables.

### Potential Error Patterns to Check:
```bash
# Find console.error statements
grep -n "console.error" server/routes.ts | head -50

# Find thrown errors
grep -n "throw new Error\|res.status(4\|res.status(5" server/routes.ts | head -50

# Find disabled routes (commented out)
grep -n "// app\.\|/\* app\." server/routes.ts
```

---

## 7. Bug Reproduction Steps

### BUG 1: Training Modules Missing PDFs
**Symptom:** Training module shows empty lesson content  
**Cause:** `manualId` links to non-existent manual or manual wasn't analyzed  
**Steps to Reproduce:**
1. Go to Training Hub as member
2. Click on any training module
3. Check if lesson content displays (lessonSummary, lessons array)
4. If empty, the manual→analysis→training pipeline is broken

**Fix Locations:**
- `server/deepTrainingService.ts` - Generates content
- `server/manualAnalysisService.ts` - Analyzes PDFs
- `server/routes.ts` line ~4115 - Returns module data

---

### BUG 2: Calendar Not Working
**Symptom:** Calendar page empty or errors  
**Steps to Reproduce:**
1. Login as any user
2. Navigate to Calendar page
3. Check browser console for errors
4. Check if events load via network tab

**Check Points:**
- Does `/api/calendar/events` return data?
- Is MinistryCalendar.tsx properly mounted in routing?
- Are calendar categories seeded in DB?

---

### BUG 3: Room Request Not Working
**Symptom:** Can't submit room reservation  
**Steps to Reproduce:**
1. Login as member or leader
2. Navigate to Room Reservations
3. Try to create a new reservation
4. Check for validation errors or API failures

**Check Points:**
- Are rooms seeded in `rooms` table?
- Does `/api/rooms` return rooms?
- Check conflict detection in POST /api/room-reservations

---

### BUG 4: Can't Edit Questions
**Symptom:** Question editing not available or doesn't save  
**Steps to Reproduce:**
1. Login as admin/leader
2. Go to Training Management
3. Click "Manage Questions" on a training
4. Try to edit a question
5. Check if changes persist

**Check Points:**
- Does PATCH /api/training/assessments/:id work?
- Is the UI bound to the correct update mutation?

---

## 8. File Structure Reference

```
MinistryPath/
├── client/
│   └── src/
│       ├── pages/
│       │   ├── member/
│       │   │   ├── TrainingHub.tsx
│       │   │   ├── TrainingViewer.tsx
│       │   │   └── MinistryCalendar.tsx
│       │   └── leadership/
│       │       ├── TrainingManagement.tsx
│       │       └── RoomsManagement.tsx
│       └── components/
│           └── TrainingQuiz.tsx
├── server/
│   ├── routes.ts (10,719 lines - main API)
│   ├── storage.ts (data access layer)
│   ├── deepTrainingService.ts (AI training generation)
│   ├── manualAnalysisService.ts (PDF analysis)
│   └── regenerateTrainings.ts (batch regeneration)
├── shared/
│   └── schema.ts (Drizzle schema - 3,000+ lines)
├── migrations/
│   └── (Drizzle migration files)
└── attached_assets/
    └── *.pdf (65 training manual PDFs)
```

---

## 9. Environment Variables Required

See `07_RUN_INSTRUCTIONS/.env.example` for full list.

**Critical Variables:**
- `DATABASE_URL` - PostgreSQL connection string
- `STATUS_KEY` - Admin bootstrap authorization
- `SESSION_SECRET` - Express session encryption
- `OPENAI_API_KEY` - For PDF analysis (optional but needed for training generation)
- `MAILGUN_*` - Email sending (optional)
- `OUTLOOK_*` - Calendar integration (optional)

---

## 10. Quick Diagnostic Commands

```bash
# Check DB health
curl http://localhost:5000/api/health

# List training modules
curl http://localhost:5000/api/training/modules

# Check calendar events
curl http://localhost:5000/api/calendar/events

# Check rooms
curl http://localhost:5000/api/rooms

# Check room reservations
curl http://localhost:5000/api/room-reservations
```

---

## End of Audit Report
