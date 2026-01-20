# MinistryPath Security and Code Audit Report

## Executive Summary

This audit identifies security issues, inconsistent code paths, and implementation gaps in the MinistryPath application. The findings are organized by severity and category.

---

## 1. CRITICAL: Hardcoded Admin Credentials

### Location
- `server/seedAdminUser.ts` (lines 6-8)

### Issue
Hardcoded admin account with predictable credentials:
```typescript
const ADMIN_USERNAME = "ADMIN";
const ADMIN_EMAIL = "ADMIN@local.dev";
const ADMIN_PASSWORD = "ADMIN";
```

This account is automatically seeded on every server startup (`server/routes.ts` line 9751).

### Risk
- Anyone who reads the source code knows the admin password
- The account has full admin bypass mode enabled by default
- No rate limiting on login attempts

### Required Fix
- Remove `seedAdminUser.ts` entirely
- Implement secure admin bootstrap via environment variables
- Require one-time bootstrap with token verification

---

## 2. HIGH: Admin Bypass Mode Implementation

### Locations
- `server/adminBypass.ts`
- `server/routes.ts` (lines 366-425)
- `client/src/components/AdminBypassBanner.tsx`
- `client/src/layouts/MemberLayout.tsx` (line 263)
- `client/src/layouts/LeadershipLayout.tsx` (line 178)

### Issues
1. **Session-based bypass** (`req.session.adminBypass`) can be set via simple username/password POST
2. **No audit logging** when bypass mode is toggled
3. **Toggleable by any admin** without oversight or logging
4. **Persists to user record** (`adminBypassMode` field in users table)

### Current Flow
1. User POSTs to `/api/admin/login-bypass` with ADMIN/ADMIN credentials
2. Session flag `adminBypass` is set to true
3. OR user toggles `adminBypassMode` on their user record
4. Various endpoints check `hasAdminBypass()` helper

### Required Fix
- Remove the bypass toggle system entirely
- Implement proper impersonation with audit logging
- Add admin panel with explicit admin-only actions

---

## 3. MEDIUM: Training Completion Logic

### Status: MOSTLY CORRECT

### Server-Side Enforcement (GOOD)
Location: `server/routes.ts` lines 4164-4400

The server properly:
- Validates status against canonical `TRAINING_STATUS` enum
- Blocks leader-only statuses (`approved`, `rejected`) from regular users
- Enforces deep training prerequisites (100% progress, knowledge check completion)
- Converts `completed` to `submitted` when `requiresApproval=true`

### Potential Issues Found
1. **No explicit `/api/training/modules/:id/complete` endpoint** - completion is handled via the general `/api/training/progress` POST
2. **Client can set `progressPercent: 100`** without server verification of actual lesson completion (trusts client)

### Client-Side (TrainingViewer.tsx)
- Lines 583-598: `handleComplete()` sends `status: 'completed'` directly
- Server converts this to `submitted` if approval is required (good)
- No auto-complete on missing questions found (good)

### Recommendation
- Add explicit server-side tracking of lesson completion per user
- Consider adding `/api/training/modules/:id/complete` with strict verification

---

## 4. TEMPORARY/DIAGNOSTIC Code Found

### Locations

| File | Line | Pattern | Description |
|------|------|---------|-------------|
| `server/routes.ts` | 669 | "Temporary admin endpoint" | Add password to OAuth account |
| `server/routes.ts` | 3920-3931 | "DIAGNOSTIC LOGGING" | Temporary logging block |
| `server/routes.ts` | 3933 | "TEMPORARY" | Simplified response for diagnosis |
| `client/src/pages/member/TrainingViewer.tsx` | 218-244 | "DIAGNOSTIC" | Console logging for lessons |

### Required Action
- Review and remove diagnostic code if no longer needed
- Keep legitimate debugging behind environment flag

---

## 5. Schema/API Payload Alignment

### Status: ALIGNED

The `shared/schema.ts` defines `TRAINING_STATUS` as:
```typescript
export const TRAINING_STATUS = [
  'not-started',
  'in-progress', 
  'submitted',
  'approved',
  'rejected',
  'completed',
] as const;
```

Server enforces this enum in training progress endpoint (line 4188-4193).

---

## 6. Dead Links / Missing Routes

### Verification Needed
- All navigation links appear to have corresponding routes
- No obvious 404-producing links found in codebase
- Full navigation testing recommended

---

## 7. Admin Functionality Gaps

### Missing Features for Safe Admin Access
1. No admin audit log table
2. No impersonation system
3. No "skip onboarding" admin action
4. No "view all trainings" admin override

### Current Admin Endpoints
- `/api/admin/login-bypass` - INSECURE, remove
- `/api/admin/check-bypass` - Remove after migration
- `/api/admin/toggle-bypass` - Remove after migration
- `/api/admin/force-complete-onboarding` - Dev-only, needs proper implementation

---

## Action Plan

### Phase 1: Training Pipeline + Completion Enforcement
- Remove diagnostic logging
- Verify server-side enforcement is solid
- Test training completion flow

### Phase 2: RBAC/Admin Overhaul
- Remove hardcoded ADMIN account and seedAdminUser
- Implement POST /api/admin/bootstrap with token verification
- Create admin_audit_log table
- Implement safe impersonation with audit trail
- Add skip-onboarding admin action

### Phase 3: Cleanup
- Remove bypass mode system
- Replace with proper admin panel
- Remove dead code and temporary endpoints
- Full navigation testing

---

## Files Changed Summary

This document will be updated after each phase with:
- List of files changed
- Description of changes per file
- Test checklist for verification
