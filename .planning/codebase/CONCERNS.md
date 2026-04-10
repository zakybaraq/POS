# Codebase Concerns

**Analysis Date:** 2026-04-11

## Critical Issues

### Stock Synchronization Bug - FIXED BUT HISTORICAL DATA IMPACT
- **Issue:** Stock was decremented in wrong order during payment flow, causing stock movements to never be created
- **Files:** `src/services/payment.ts` (line 28-29 - duplicate call), `src/repositories/order.ts` (line 106-108), `src/repositories/inventory.ts` (line 145-173)
- **Root Cause:** 
  - `payment.ts` called `decrementStockForOrder()` BEFORE order status was set to 'completed'
  - `decrementStockForOrder()` has early return check: `if (!order || order.status !== 'completed') return`
  - Order status was still 'active' when first called from payment.ts, causing silent skip
  - Stock decrement was duplicated - called from both `payment.ts` AND `order.ts completeOrder()`
- **Impact:** 15 completed orders in database have NO stock movement records. Inventory levels are incorrect.
- **Fix Status:** Code fix applied:
  - Removed duplicate `decrementStockForOrder()` call from `payment.ts`
  - Stock now decremented ONLY in `order.ts completeOrder()` AFTER status set to 'completed'
- **Historical Data Risk:** PAST orders #1, #3, #9, #10, #11, and others missing stock movements need manual review. Inventory counts may be inaccurate.

### Timezone Inconsistency - FIXED
- **Issue:** Stock movement dates in inventory page displayed in browser's local timezone instead of Asia/Jakarta
- **Files:** `src/pages/inventory.ts` (line 152), `src/repositories/inventory.ts` (line 132 - dead code)
- **Root Cause:** 
  - `wibTime` variable created but never used in `adjustStock()`
  - `toLocaleString('id-ID')` without `timeZone: 'Asia/Jakarta'` option
  - UTC timestamps stored in DB, displayed without timezone conversion
- **Fix Status:** Fixed - added `timeZone: 'Asia/Jakarta'` to date formatting and removed unused `wibTime` variable

## Tech Debt

### 1. Type Coercion and String Storage of Numeric Values
- **Issue:** Numeric values stored as VARCHAR strings in database causing unnecessary type conversion throughout codebase
- **Files:** 
  - `src/db/schema.ts` (ingredients.currentStock, recipes.quantity, stockMovements.quantity)
  - `src/repositories/inventory.ts` (lines 125-135, 162)
  - `src/repositories/supplier.ts` (multiple numeric conversions)
- **Impact:** 
  - Performance overhead from constant Number() conversions
  - Type safety vulnerabilities
  - Potential NaN errors if conversion fails
  - Confusing code readability
- **Fix approach:** 
  - Migrate numeric columns from VARCHAR to proper MySQL numeric types (INT, DECIMAL)
  - Remove unnecessary String() and Number() conversions
  - Add database migration script
  - Update repository layer to remove type coercion
- **Priority:** HIGH

### 2. Timezone Handling Inconsistency
- **Issue:** Multiple timezone approaches used across codebase; inconsistent between UTC storage and local display
- **Files:**
  - `src/repositories/order.ts` (lines 6-14, 24) - toLocaleString() conversion
  - `src/repositories/inventory.ts` - Uses UTC from new Date()
  - `src/pages/inventory.ts` - Manual toLocaleString() in template
  - Schema defines timezone in settings but not consistently used
- **Current approach:** 
  - Database stores UTC times
  - Client-side conversion with toLocaleString('en-US', { timeZone: 'Asia/Jakarta' })
- **Impact:** 
  - Brittle timezone handling prone to DST bugs
  - Different time handling strategies in different modules
- **Fix approach:**
  - Implement centralized timezone utility function
  - Standardize all date handling through single utility
  - Consider using date library (date-fns, dayjs) for robust handling
  - Store timezone setting in database and use server-side
  - Add tests for timezone edge cases (DST transitions)
- **Priority:** HIGH

### 3. Pagination Implementation Only in UI
- **Issue:** Pagination added only to frontend HTML generation, not enforced at API/database level
- **Files:** `src/pages/inventory.ts` (stock movements pagination)
- **Risk:** 
  - Query returns all records, then paginates in JavaScript
  - Memory inefficient for large datasets
  - No query optimization at database level
- **Fix approach:**
  - Implement offset/limit in repository functions
  - Add pagination parameters to API routes
  - Return page metadata (total, pageCount) from API
  - Add database query pagination in `getStockMovements()` and similar functions
- **Priority:** MEDIUM

### 4. Error Handling Gaps
- **Issue:** Minimal error handling in repository layer; most functions lack try-catch blocks
- **Files:** 
  - `src/repositories/inventory.ts` - No error handling in adjustStock() or decrementStockForOrder()
  - `src/repositories/order.ts` - No error handling in completeOrder() or calculateTotals()
  - `src/routes/orders.ts` - Basic validation but no error details
- **Impact:** 
  - Silent failures possible
  - Difficult to debug production issues
  - No rollback on partial failures
- **Fix approach:**
  - Add try-catch blocks around all DB operations
  - Implement error logging strategy
  - Add specific error types for different failure modes
  - Return detailed error responses from API routes
- **Priority:** HIGH

### 5. Transaction Management Missing
- **Issue:** Multi-step operations (stock decrement + order completion) lack database transactions
- **Files:** `src/repositories/order.ts` (lines 91-112) - stock decrement happens after order update with no atomicity
- **Risk:** 
  - Order completion succeeds but stock decrement fails → data inconsistency
  - No rollback mechanism if operation partially fails
  - Violates ACID principles
- **Fix approach:**
  - Use Drizzle transaction API for atomic operations
  - Move stock decrement inside same transaction as order completion
  - Add idempotent operation handling for retries
  - Test rollback scenarios
- **Priority:** CRITICAL

### 6. Circular Dependency Risk
- **Issue:** Dynamic imports used to break circular dependencies (inventory.ts imports from order.ts and vice versa)
- **Files:**
  - `src/repositories/order.ts` (lines 107, 147)
  - `src/repositories/inventory.ts` (lines 147, 156)
- **Impact:** 
  - Makes dependency graph harder to trace
  - Performance cost from dynamic imports at runtime
  - Potential for bugs if import order changes
- **Fix approach:**
  - Refactor into shared service layer to break circular dependencies
  - Create `src/services/order-stock.ts` for atomic operations
  - Use dependency injection pattern
  - Add static dependency analysis to CI
- **Priority:** MEDIUM

### 7. Hardcoded JWT Secret
- **Files:** `src/utils/auth.ts`
- **Issue:** Default JWT secret may fall back to hardcoded value
- **Impact:** Security vulnerability if environment variable not set
- **Fix approach:** Ensure JWT_SECRET environment variable always set; fail startup if not
- **Priority:** HIGH

### 8. Console Logging for Debugging
- **Issue:** 15+ console.log/error calls left in code, likely from development
- **Files:** Scattered across `src/pages/`, `src/repositories/`
- **Example:** `src/repositories/inventory.ts` line 152
- **Impact:** Debug noise in production logs; security risk
- **Fix:** Remove or replace with proper logging framework
- **Priority:** MEDIUM

---

## Known Bugs

### 1. Stock Decrement Verification Missing
- **Symptoms:** No confirmation that stock was actually decremented after order completion
- **Files:** `src/repositories/order.ts` (lines 91-112), `src/repositories/inventory.ts` (lines 145-172)
- **Trigger:** Complete any order with menu items that have recipes
- **Current mitigation:** 
  - Log message on line 152 of inventory.ts checks if order completed
  - Manual database inspection required to verify stock movements
- **Workaround:** Check stock_movements table for order reference
- **Priority:** HIGH

### 2. Negative Stock Possible but Display Inconsistent
- **Symptoms:** Stock can go negative; display status switches between Stok Rendah and Stok Habis inconsistently
- **Files:** 
  - `src/pages/inventory.ts` - Negative stock detection for display
  - Recent fixes (commits 93fd748, 83d4e23) addressed this partially
- **Status:** 
  - Fixed visually but no prevention at DB level
  - Negative stock values allowed, could cause business logic issues
- **Priority:** MEDIUM

### 3. Recipe Quantity Type Inconsistency
- **Symptoms:** Recipe.quantity stored as VARCHAR "1" instead of numeric 1
- **Files:** `src/db/schema.ts` (line 38), calculations throughout inventory.ts
- **Impact:** Silent type coercion; possible precision loss with decimals
- **Priority:** MEDIUM
- **Current mitigation:** Cookie-based session dengan httpOnly

### Missing Rate Limiting
- **Issue:** Tidak ada rate limiting untuk login endpoint
- **Impact:** Brute force attack memungkinkan
- **Recommendations:** Implement rate limiting untuk `/auth/login` endpoint

### No CSRF Protection
- **Issue:** Tidak ada CSRF token implementation
- **Impact:** CSRF attacks mungkin bisa dilakukan
- **Recommendations:** Implement CSRF tokens untuk state-changing operations

---

## Code Quality Issues

### No Test Coverage
- **Issue:** Tidak ada test files di codebase
- **Impact:** Perubahan bisa break functionality tanpa deteksi
- **Fix approach:** Tambah unit tests untuk repositories dan services, integration tests untuk routes

### Large File Sizes
- **Files:**
  - `src/pages/pos-client.ts` (900 lines)
  - `src/pages/admin.ts` (538 lines)
  - `src/pages/reports.ts` (481 lines)
  - `src/pages/menu.ts` (466 lines)
- **Issue:** Beberapa page files terlalu besar (>400 lines)
- **Impact:** Harder to maintain, test, and understand
- **Fix approach:** Extract components, separate concerns (data fetching, rendering, logic)

### Inconsistent Error Handling
- **Issue:** Tidak ada pola error handling yang konsisten
- **Impact:** User experience tidak predictable saat errors
- **Fix approach:** Implement global error handler, consistent error responses

### Missing Error Boundaries in Frontend
- **Issue:** Frontend pages tidak memiliki error boundaries
- **Impact:** JS errors bisa crash entire page tanpa recovery
- **Fix approach:** Tambah try-catch di async operations, user-friendly error messages

---

## Performance Considerations

### No Query Optimization
- **Issue:** Database queries tidak dioptimize (tidak ada pagination, lazy loading)
- **Impact:** Performance degrades dengan data growth
- **Fix approach:** Implement pagination untuk list endpoints, limit results

### Large Inline CSS/JS in Pages
- **Issue:** Setiap page memiliki inline styles dan scripts
- **Impact:** Duplicated code, larger bundle size
- **Fix approach:** Extract ke shared CSS/JS files atau use component library

---

## Missing Critical Features

### No Data Backup/Export
- **Issue:** Tidak ada fitur export/backup data
- **Impact:** Data loss risk, manual migration sulit
- **Fix approach:** Tambah export endpoints (CSV/JSON) untuk orders, inventory, dll.

### No Audit Trail for Sensitive Operations
- **Issue:** Tidak ada logging untuk sensitive operations (password changes, role changes)
- **Impact:** Sulit track who did what
- **Fix approach:** Gunakan existing `audit-log` repository yang sudah ada

### No Offline Capability
- **Issue:** POS client tidak bisa beroperasi offline
- **Impact:** Jika network issue, transactions berhenti
- **Fix approach:** Implement local-first dengan sync when online

---

## Documentation Gaps

### No API Documentation
- **Issue:** Tidak ada API docs (Swagger/OpenAPI)
- **Impact:** Sulit untuk integrasi external
- **Fix approach:** Generate OpenAPI spec dari routes

### No Deployment/DevOps Docs
- **Issue:** Tidak ada setup/production deployment guides
- **Impact:** Onboarding sulit, deployment risky
- **Fix approach:** Tambah README dengan setup instructions

---

## Dependencies at Risk

### Old Dependencies
- **Issue:** Beberapa packages tidak diupdate (drizzle-orm: 0.45.2, elysia: 1.4.28)
- **Impact:** Security vulnerabilities, compatibility issues
- **Migration plan:** Regular updates, check for breaking changes

---

*Concerns audit: 2026-04-11*