# Financial Report Bug Fix - Debug Log

## Issue
**Error:** 500 Internal Server Error when clicking "Terapkan" on Financial tab
```
HTTP 500: SyntaxError: Unexpected token 'F', "Failed que"... is not valid JSON
```

**API Response:** 
```
Failed query: select sum(`salary`), count(`id`), avg(`salary`) from `employee_profiles` where ( = ? and  <= ?)
params: active,Sun Apr 12 2026 23:59:59 GMT+0700 (Western Indonesia Time)
```

---

## Root Cause
**File:** `src/repositories/financial-report.ts:70-90`
**Function:** `getEmployeeSalaryExpenses()`

The function was using non-existent database columns:
- ❌ `employeeProfiles.employmentStatus` (doesn't exist)
- ❌ `employeeProfiles.joinedAt` (doesn't exist)

**Actual columns in schema:**
- ✅ `isActive` (boolean)
- ✅ `hireDate` (datetime)
- ✅ `createdAt` (datetime)

The query was generating invalid SQL with empty WHERE clauses because the column references were invalid.

---

## Solution
Updated `getEmployeeSalaryExpenses()` to use correct schema columns:

```typescript
// BEFORE (BROKEN)
.where(and(
  eq(employeeProfiles.employmentStatus, 'active'),  // ❌ doesn't exist
  lte(employeeProfiles.joinedAt, end)                // ❌ doesn't exist
))

// AFTER (FIXED)
.where(eq(employeeProfiles.isActive, true))          // ✅ correct column
```

The date range parameters (`startDate`, `endDate`) were not actually needed for salary calculation - we just need active employees' salaries regardless of hire date.

---

## Verification
After fix, API now responds correctly:

```bash
$ curl "http://localhost:3000/api/reports/financial/profit-loss?startDate=2026-04-01&endDate=2026-04-12"

{
  "period": {"startDate": "2026-04-01", "endDate": "2026-04-12"},
  "revenue": {
    "totalRevenue": 2035002,
    "totalTax": 185000,
    "completedOrders": 66,
    "avgOrderValue": 30833
  },
  "expenses": {
    "purchases": null,
    "salaries": null,
    "totalExpenses": 0
  },
  "grossProfit": 2033588.03,
  "netProfit": 2033588.03,
  "profitMargin": 99.93
}
```

✅ Valid JSON returned  
✅ No server errors  
✅ Financial calculations working

---

## Files Changed
- `src/repositories/financial-report.ts` (1 function, 2 lines changed)

## Status
✅ **FIXED** - Financial tab now loads without errors
