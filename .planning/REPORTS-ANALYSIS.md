# Reports Page Analysis & Fix Plan

## Executive Summary

**User Request:** Fix reports page tabs that aren't displaying data correctly, and audit from business perspective what should stay/be removed.

**Status:** Analysis complete. Critical bug found + business requirements captured.

---

## Business Requirements (From User Input)

### Critical Tabs (Must Work)
1. **Penjualan (Sales)** - Daily revenue, order counts
2. **Performa Kasir (Cashier Performance)** - Cashier metrics & productivity  
3. **Laporan Keuangan (Financial)** - P&L statement

### Optional Tabs (Remove)
- ❌ **Menu Terlaris** - REMOVE (user doesn't need)
- ❌ **Okupansi Meja** - REMOVE (user doesn't need)

---

## Issues Identified

### 🔴 CRITICAL BUG: Financial Report Endpoint Crashes
**File:** `/src/repositories/financial-report.ts:77`
**Error:** `avg()` function used but NOT imported from drizzle-orm
**Impact:** Financial tab shows alert "Gagal memuat laporan keuangan" (Failed to load financial report)

```typescript
// Line 77 - BROKEN
avgSalary: avg(employeeProfiles.salary).mapWith(Number),
// ^^^ 'avg' is not defined

// Line 1 - Missing import
import { eq, and, gte, lte, desc, sql, sum, count } from 'drizzle-orm';
// Should be:
import { eq, and, gte, lte, desc, sql, sum, count, avg } from 'drizzle-orm';
```

### ✅ Other Tabs Status
- **Sales tab:** Full implementation ✓ (works if financial bug fixed)
- **Menu tab:** Full implementation ✓ (but user wants REMOVED)
- **Cashier tab:** Full implementation ✓
- **Occupancy tab:** Full implementation ✓ (but user wants REMOVED)

---

## Implementation Plan

### Phase 1: Fix Critical Bug (10 min)
1. Add `avg` to imports in financial-report.ts
2. Verify financial report API responds correctly
3. Test financial tab loads data

### Phase 2: Remove Unused Tabs (15 min)
1. Remove "Menu Terlaris" tab UI from reports.ts
2. Remove "Okupansi Meja" tab UI from reports.ts
3. Remove corresponding frontend JS functions (loadMenuReport, loadOccupancyReport, etc.)
4. Remove API endpoints (or keep for future use - non-critical)

### Phase 3: Verification (5 min)
1. All 3 remaining tabs display data correctly
2. Tab switching works smoothly
3. Date period filters work (today/week/month/custom)
4. Export CSV works for remaining tabs

---

## Code Changes Needed

### 1. Fix Import (financial-report.ts)
```typescript
- import { eq, and, gte, lte, desc, sql, sum, count } from 'drizzle-orm';
+ import { eq, and, gte, lte, desc, sql, sum, count, avg } from 'drizzle-orm';
```

### 2. Remove Tabs UI (reports.ts)
- Remove tab button for "Menu Terlaris" (lines ~55)
- Remove tab button for "Okupansi Meja" (lines ~57)
- Remove tab content div for menu (lines ~126-179)
- Remove tab content div for occupancy (lines ~220-276)
- Remove frontend JS functions:
  - loadMenuReport()
  - loadOccupancyReport()
  - exportMenuCSV()
  - exportOccupancyCSV()

### 3. Clean Up Sidebar/Navigation
- Verify sidebar still shows "Laporan" link properly

---

## Tab Configuration After Fix

**Remaining Tabs (3):**
```
[Penjualan] [Performa Kasir] [Laporan Keuangan]
```

**Default Tab:** Sales (Penjualan)

**Data Export:** All 3 tabs support CSV export

---

## Risk Assessment

- **Low Risk:** Bug fix is straightforward (missing import)
- **Low Risk:** Tab removal is UI-only (no data loss, endpoints remain callable if needed later)
- **No Breaking Changes:** Other app modules unaffected

---

## Next Steps

1. ✅ Business requirements captured
2. ⏳ Implement Phase 1 (bug fix)
3. ⏳ Implement Phase 2 (remove tabs)
4. ⏳ Verify all changes
5. ⏳ Test in browser

**Estimated Time:** 30-40 minutes total
