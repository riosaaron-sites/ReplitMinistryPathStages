# MinistryPath Security Fixes - Test Plan

## Overview
This document outlines verification steps for the security and code quality fixes implemented in the audit.

---

## 1. Training Module Data Integrity

### Test: Training modules return complete data

**Steps:**
1. Login as a member user
2. Navigate to Training section
3. Open any training module with deep lessons
4. Verify all fields are populated:
   - Title and description
   - Lesson content (lessonSummary or lessons array)
   - Study questions (if applicable)
   - Knowledge check questions (if applicable)
   - Assessments (if applicable)

**Expected Result:**
- Training viewer displays full content
- No console errors about missing data
- Progress tracking works correctly

---

## 2. Admin Bootstrap Endpoint

### Test: Bootstrap creates first admin with valid key

**Steps:**
1. Ensure no admin/owner users exist in database
2. Call `POST /api/admin/bootstrap` with:
   ```json
   {
     "email": "admin@example.com",
     "password": "SecurePass123!",
     "firstName": "Admin",
     "lastName": "User",
     "bootstrapKey": "<STATUS_KEY value>"
   }
   ```
3. Verify response indicates success
4. Verify user was created with `owner` role
5. Verify audit log entry was created

### Test: Bootstrap fails with invalid key

**Steps:**
1. Call `POST /api/admin/bootstrap` with wrong `bootstrapKey`
2. Verify 403 response

### Test: Bootstrap fails if admin exists

**Steps:**
1. After successful bootstrap, call endpoint again
2. Verify 409 response with message about existing admins

---

## 3. Impersonation System

### Test: Admin can start impersonation

**Steps:**
1. Login as admin/owner user
2. Call `POST /api/admin/impersonate/start` with:
   ```json
   {
     "targetUserId": "<valid-user-uuid>",
     "reason": "Testing user experience"
   }
   ```
3. Verify success response with target user info
4. Verify audit log entry created

### Test: Impersonation status check works

**Steps:**
1. While impersonating, call `GET /api/admin/impersonate/status`
2. Verify response shows `isImpersonating: true`
3. Verify target user information is returned

### Test: Admin can stop impersonation

**Steps:**
1. While impersonating, call `POST /api/admin/impersonate/stop`
2. Verify success response
3. Verify audit log entry created for stopping
4. Verify subsequent status check shows `isImpersonating: false`

### Test: Non-admins cannot impersonate

**Steps:**
1. Login as regular member
2. Attempt `POST /api/admin/impersonate/start`
3. Verify 403 response

### Test: Cannot impersonate owner (if not owner)

**Steps:**
1. Login as admin (not owner) user
2. Attempt to impersonate an owner user
3. Verify 403 response

---

## 4. Training Completion Enforcement

### Test: Deep training requires 100% progress

**Steps:**
1. Start a deep training module (one with lessons array)
2. Attempt to complete without finishing all lessons
3. Verify server rejects with appropriate error

### Test: Status transitions are validated

**Steps:**
1. Attempt to set training status to invalid value
2. Verify server rejects

### Test: Leader-only statuses blocked for members

**Steps:**
1. As member, attempt to set status to `approved` or `rejected`
2. Verify server rejects

---

## 5. Audit Logging

### Test: Admin actions create audit entries

**Verify audit_logs table contains entries for:**
- Admin bootstrap
- Impersonation start
- Impersonation stop
- User role changes (existing)
- Ministry assignment changes (existing)

---

## 6. Cleanup Verification

### Test: No diagnostic console output

**Steps:**
1. Open browser developer tools console
2. Navigate through training sections
3. Verify no `[TrainingViewer]` debug messages

### Test: seedAdminUser.ts is deleted

**Steps:**
1. Verify file `server/seedAdminUser.ts` does not exist
2. Verify no import errors on server startup

---

## Playwright Test Plan

```
1. [New Context] Create a new browser context
2. [Browser] Navigate to login page (path: /login)
3. [Browser] Login with test credentials
4. [Browser] Navigate to training page (path: /dashboard/training)
5. [Verify] Assert training modules are listed
6. [Browser] Click on first training module
7. [Verify] 
   - Assert training title is visible
   - Assert lesson content is displayed (not empty)
   - Assert progress indicator is visible
8. [Browser] Navigate through lesson steps (if deep training)
9. [Verify] Assert navigation between lessons works
```

---

## Manual Verification Checklist

- [ ] Server starts without errors
- [ ] No `seedAdminUser` console messages on startup
- [ ] Training modules load with full content
- [ ] Admin bootstrap works with correct STATUS_KEY
- [ ] Impersonation endpoints work correctly
- [ ] Audit log entries are created for admin actions
- [ ] No diagnostic console.log output in browser
