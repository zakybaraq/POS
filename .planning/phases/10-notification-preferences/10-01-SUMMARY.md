---
phase: 10-notification-preferences
plan: 01
tags: [notifications, preferences, user-settings]
dependency_graph:
  requires: []
  provides:
    - notification-preferences-api
    - notification-preferences-ui
  affects:
    - src/services/notifications.ts
tech_stack:
  added:
    - User notification preferences storage in users table
    - API endpoints for preferences CRUD
    - Navbar UI for toggling preferences
  patterns:
    - Preference-based notification filtering
    - Fail-open for missing preferences
key_files:
  created: []
  modified:
    - src/db/schema.ts
    - src/repositories/user.ts
    - src/routes/users.ts
    - src/services/notifications.ts
    - src/templates/navbar.ts
    - src/templates/common-scripts.ts
    - src/public/styles/global.css
decisions:
  - Preference keys: 'order:created', 'order:status-changed', 'order:completed', 'payment:received'
  - Default: all enabled (true)
  - Storage: JSON string in VARCHAR(1000)
  - Filter behavior: fail-open (send if cannot check)
metrics:
  tasks: 5
  files_modified: 7
  test_count: 78
  duration_minutes: <5
---

## Phase 10 Plan 1: Notification Preferences Summary

**One-liner:** Add user notification preferences allowing dashboard users to control which real-time notification types they receive.

### Completed Tasks

| # | Task | Status | Files Modified |
|---|------|--------|----------------|
| 1 | notificationPreferences column to users | ✅ | src/db/schema.ts |
| 2 | Repository methods for preferences | ✅ | src/repositories/user.ts |
| 3 | API endpoints GET/PUT | ✅ | src/routes/users.ts |
| 4 | Notification service filtering | ✅ | src/services/notifications.ts |
| 5 | Navbar UI toggle panel | ✅ | src/templates/navbar.ts, common-scripts.ts, global.css |

### Implementation Details

**1. Database Schema (src/db/schema.ts)**
- Added `notificationPreferences` VARCHAR(1000) column with JSON default `'{"order:created":true,"order:status-changed":true,"order:completed":true,"payment:received":true}'`
- Exported `NotificationPreferences` type

**2. Repository Methods (src/repositories/user.ts)**
- `getNotificationPreferences(userId)` - Fetch and parse preferences
- `updateNotificationPreferences(userId, preferences)` - Merge and save preferences
- `getDefaultPreferences()` - Return all-true defaults
- `getUsersByRoles(roles)` - Filter users by role for notification targeting

**3. API Endpoints (src/routes/users.ts)**
- `GET /api/users/:id/notifications` - Get preferences
- `PUT /api/users/:id/notifications` - Update preferences

**4. Notification Service (src/services/notifications.ts)**
- Added `shouldSendNotification(userId, eventType)` helper
- Updated all notify* functions to filter by user preference
- Broadcasts via both user-specific rooms and role rooms
- Fail-open behavior if preferences unavailable

**5. Navbar UI (src/templates/navbar.ts, common-scripts.ts, global.css)**
- Gear icon in notification dropdown header
- Preferences panel with 4 toggle checkboxes
- `loadPreferences()` loads on dropdown open
- `savePreference()` saves on checkbox change
- CSS styling for preferences panel

### Verification Results

- [x] All tasks completed as specified
- [x] 78 existing tests pass
- [x] No breaking changes to existing functionality
- [x] Preference filtering respects user settings

### Deviation from Plan

None - all requirements implemented as specified.

### Threat Flags

None identified - preference changes are user-specific with no security impact.