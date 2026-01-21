# MinistryPath Cleanup Report

Generated: January 21, 2026

This report identifies potentially unused components, pages, and code that may be candidates for cleanup.

---

## Potentially Unused Components

These components have zero or minimal imports and may be candidates for removal:

### Components with Zero Imports

| Component | Location | Notes |
|-----------|----------|-------|
| `ConfirmDialog` | `client/src/components/ConfirmDialog.tsx` | Confirm before deleting - may be planned for future use |
| `ObjectUploader` | `client/src/components/ObjectUploader.tsx` | May be replaced by other upload implementations |
| `RequiredClassesBanner` | `client/src/components/RequiredClassesBanner.tsx` | May be legacy or planned feature |
| `TrainingQuiz` | `client/src/components/TrainingQuiz.tsx` | Quiz functionality exists in TrainingViewer - may be duplicate |

### Pages with Zero/Low Imports

| Page | Location | Notes |
|------|----------|-------|
| `ComingSoon` | `client/src/pages/ComingSoon.tsx` | Feature flag disabled - `SHOW_COMING_SOON = false` |
| `Home` | `client/src/pages/Home.tsx` | May be legacy - check if still needed |

---

## Active Components (Confirmed In Use)

These components have verified imports and are actively used:

| Component | Import Count | Primary Usage |
|-----------|--------------|---------------|
| `ThemeToggle` | 6 | App header, settings |
| `HelpLink` | 5 | Contextual help across pages |
| `CoachBubble` | 4 | Onboarding tips |
| `ImageCropper` | 3 | Profile photo uploads |
| `AdminBypassBanner` | 2 | Admin impersonation mode |
| `NotificationBell` | 2 | Notification system |
| `ThemeProvider` | 2 | App root theme management |
| `InviteModal` | 1 | Invite system |
| `DatabaseUnavailable` | 1 | Error boundary |

---

## Code Quality Notes

### Good Patterns Observed
- Consistent use of TypeScript types from `@shared/schema`
- TanStack Query for data fetching with proper cache invalidation
- Shadcn/ui components for consistent UI
- Route protection with role-based middleware

### Areas for Improvement
1. **PDF Path Consistency**: Now resolved - both `/assets/` and `/attached_assets/` URLs are supported
2. **Training Content**: Empty state now shows when content isn't generated
3. **Questions Manager**: Now fully implemented with CRUD operations
4. **Room Reservations**: Member-facing request page now available at `/rooms/request`

---

## Recommendations

### Safe to Remove (Low Risk)
1. `ComingSoon.tsx` - Feature flag is permanently disabled
2. `Home.tsx` - If confirmed unused after route audit

### Investigate Before Removal
1. `ConfirmDialog.tsx` - Check if planned for admin tools
2. `ObjectUploader.tsx` - May be needed for future file uploads
3. `RequiredClassesBanner.tsx` - May be part of onboarding flow
4. `TrainingQuiz.tsx` - Confirm if duplicate of TrainingViewer quiz logic

### Keep
1. All components with 1+ active imports
2. Components that may be conditionally rendered
3. Components planned for upcoming features

---

## File Statistics

- **Total Components**: 14 (including ui/ directory)
- **Total Pages**: 40+ (member, leadership, public)
- **Total Routes**: 80+ API endpoints
- **Database Tables**: 30+ with proper foreign key relationships

---

## Next Steps

1. Review each "zero import" component to confirm if truly unused
2. Check git blame for recently added but not-yet-integrated components
3. Run test coverage to identify unused code paths
4. Consider adding JSDoc/comments for components that are conditionally rendered
5. Archive unused components to a `_deprecated` folder rather than deleting

---

*This report is a point-in-time analysis. Always verify component usage before removal.*
