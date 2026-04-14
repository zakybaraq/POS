# Phase 15 Context - File Cleanup

**Status:** New Implementation
**Date:** 2026-04-14
**Milestone:** v2.2 Codebase Refactoring

---

## Prior Context

Phase 15 is the first phase of Milestone v2.2 (Codebase Refactoring). Previous milestones completed:
- v1.0: Core system with data integrity, security, testing, observability, performance
- v2.1: Advanced inventory with suppliers, purchase orders, cost analytics, auto-reorder

Current state has accumulated temporary files and clutter that need cleanup before restructuring.

---

## What's Already Built

### Temporary Files (To Delete)
- `login-page-snapshot.md` - Temporary test snapshot
- `login-snapshot.md` - Temporary test snapshot  
- `login-after-submit.md` - Temporary test snapshot
- `PR_BODY.md` - Pull request template used once
- `issue.md` - Issue template used once
- `LOYALTY_IMPLEMENTATION.md` - Unused implementation doc

### Auto-Generated Directories (To .gitignore)
- `test-results/` - Playwright test results (332KB)
- `playwright-report/` - Playwright reports (848KB)

### Files to Archive
- `CONTEXT.md` - Old project status document, should be in `.planning/`

### Log Files (To .gitignore)
- `server.log` - Application logs
- Any `*.log` files

---

## What's NOT Yet Implemented (New for Phase 15)

### Gap 1: File Deletion
- [NEW] Delete 6 temporary .md files from root
- [NEW] Verify deletions don't break anything

### Gap 2: .gitignore Updates
- [NEW] Add `test-results/` to .gitignore
- [NEW] Add `playwright-report/` to .gitignore
- [NEW] Add `*.log` to .gitignore
- [NEW] Add `*.log.*` for rotated logs

### Gap 3: File Archiving
- [NEW] Create `.planning/archive/` directory
- [NEW] Move `CONTEXT.md` to `.planning/archive/CONTEXT-v1.0.md`

---

## Implementation Decisions (DECIDED)

### 1. Temporary File Deletion Strategy
- **Decision:** Delete all identified temporary files
- **Safety:** All files are temporary/single-use documents
- **Backup:** Git history preserves if needed

### 2. .gitignore Pattern
- **Decision:** Use standard patterns for common directories
- **Pattern:**
  ```
  # Test results
  test-results/
  playwright-report/
  
  # Logs
  *.log
  *.log.*
  
  # OS files
  .DS_Store
  Thumbs.db
  ```

### 3. Archive Location
- **Decision:** Archive to `.planning/archive/`
- **Naming:** Add version/date suffix to archived files
- **Rationale:** Keep planning docs organized

---

## Gray Areas (To Discuss)

None - all decisions are straightforward deletions and moves.

---

## Next Steps

1. Delete identified temporary files
2. Create `.planning/archive/` directory
3. Move CONTEXT.md to archive
4. Update .gitignore with new patterns
5. Verify git status is clean
6. Commit changes

---

## Files Inventory

### To Delete (6 files)
```
├── login-page-snapshot.md
├── login-snapshot.md
├── login-after-submit.md
├── PR_BODY.md
├── issue.md
└── LOYALTY_IMPLEMENTATION.md
```

### To Archive (1 file)
```
├── CONTEXT.md → .planning/archive/CONTEXT-v1.0.md
```

### To Ignore (directories)
```
test-results/
playwright-report/
*.log
```

## Requirements Reference

From REQUIREMENTS-v2.2.md (REQ-001):
- Delete temporary files
- Add test directories to .gitignore
- Archive old documentation
- Verify no auto-generated files in git

---

## Success Criteria

- [ ] All 6 temporary files deleted
- [ ] CONTEXT.md archived
- [ ] .gitignore updated
- [ ] Git status shows only expected changes
- [ ] No functional impact
- [ ] All 125+ tests still passing
