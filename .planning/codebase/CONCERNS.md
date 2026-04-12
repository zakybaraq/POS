# Codebase Concerns

**Analysis Date:** 2026-04-12

## Data Integrity & Transaction Issues

### Missing Transaction Boundaries for Order Item Operations

**Issue:** Stock decrement is protected by transaction in `completeOrder()`, but intermediate order operations (add/remove items, update quantities) occur outside transactions.

**Files:** `src/routes/orders.ts:114-122`, `src/routes/orders.ts:170-175`, `src/routes/orders.ts:188-201`

**Impact:** Race condition potential - multiple concurrent updates to the same order can result in inconsistent totals or duplicate/missing items. If `calculateTotals()` runs between item insertion and quantity update, the final total may be incorrect.

**Fix Approach:** Wrap item operations in transactions; consider implementing optimistic locking on order status or version field.

### Table Status Race Condition in Order Transfer

**Issue:** Table status updates for source and target tables are not atomic. Network failure between line 286-287 can leave both tables marked as occupied or both available.

**Files:** `src/routes/orders.ts:274-291`

**Symptoms:** User sees table unavailable but no order exists; multiple users claim same table simultaneously.

**Trigger:** Concurrent transfer requests or network latency during status update sequence.

**Fix Approach:** Use single DB transaction for both `updateTableStatus()` calls; validate target table status immediately before marking occupied.

### Order Cancellation with Partial Stock Refund Gap

**Issue:** When orders are cancelled (status='cancelled'), no stock is refunded even if partial payment was made. Stock decrement only occurs on 'completed' status, but there's no compensating logic for cancellations.

**Files:** `src/routes/orders.ts:231-253`, `src/repositories/order.ts:165-191`

**Impact:** Cancelled takeaway orders don't free up reserved stock; inventory becomes inconsistent if cancellations are frequent.

**Fix Approach:** Add stock refund logic in cancellation path; track "reserved" stock separately from "available" stock.

### Order Completion Payment Ambiguity

**Issue:** `completeOrder()` accepts `amountPaid` and `shouldComplete` flags, but `paymentService.processPayment()` always calls with `shouldComplete=true` (line 24, `src/services/payment.ts`). The `finish` endpoint also completes orders without payment (line 268, `src/routes/orders.ts`).

**Files:** `src/services/payment.ts:24`, `src/routes/orders.ts:268`

**Problem:** It's unclear whether stock decrements when an order is "finished" without payment. The transaction checks `order.status !== 'completed'` (inventory.ts:169) but `completeOrder()` marks status=completed regardless of payment.

**Impact:** Stock can be decremented for unpaid orders, or tables marked available while customer hasn't paid.

**Fix Approach:** Split logic into `markCompleted()` and `finishOrder(requirePayment)` or enforce payment before status change to 'completed'.

---

## Security Gaps

### JWT Secret Hardcoded as Fallback

**Issue:** Default JWT secret `'pos-secret-key-change-in-production'` used if `JWT_SECRET` env var missing. Same secret appears in 3 places with no consistency check.

**Files:** `src/utils/auth.ts:3`, `src/services/auth.ts:4`, `src/services/session.ts:5`

**Risk:** If env vars fail to load silently, all tokens become guessable; no warning to operator.

**Fix Approach:** Throw error at startup if `JWT_SECRET` not set; use single source of truth (config module).

### Password Reset Missing Authentication

**Issue:** `/api/auth/reset-password` accepts only `email` and `newPassword` — no verification that requester owns the email or has reset token.

**Files:** `src/routes/auth.ts:95-111`

**Risk:** Any user can reset any other user's password via email address.

**Recommendation:** Require previous password, reset token sent via email, or active session with matching email.

### Cookie Options Conditional on NODE_ENV Only

**Issue:** Cookie `secure` flag set to `true` only when `NODE_ENV === 'production'`, but `NODE_ENV` is easily spoofed in development. No CSRF token generation for state-changing operations.

**Files:** `src/routes/auth.ts:10-17`, `src/services/session.ts:11`

**Risk:** Session cookies sent over HTTP in non-production; susceptible to MITM attack; no CSRF protection on POST/PUT/DELETE.

**Recommendation:** Always use `secure: true` with explicit override for dev; implement CSRF token middleware for state changes.

### No Input Validation on Multiple Routes

**Issue:** Several routes only check for required fields but don't validate data types or ranges:
- Inventory routes (`src/routes/inventory.ts:13-31`) accept `currentStock` and `costPerUnit` with no numeric bounds check
- Settings routes (`src/routes/settings.ts`) have no body validation schemas
- Menu routes accept description up to 500 chars but don't trim/sanitize

**Files:** `src/routes/inventory.ts`, `src/routes/settings.ts`, `src/routes/menus.ts`

**Risk:** Negative stock values, SQL injection via unsanitized strings, NoSQL injection if logging query parameters.

**Recommendation:** Add Zod schema validation to all POST/PUT endpoints; sanitize user strings before logging.

### Auth Endpoint Role Assignment Bypass

**Issue:** `/api/auth/register` allows unauthenticated users to register with arbitrary roles if they pass the role parameter, falling back to 'kasir' only if no user is authenticated. No validation that requester has permission to assign role.

**Files:** `src/routes/auth.ts:32-41`

**Impact:** Any user can register as 'admin_restoran' or 'super_admin' if they craft the right request.

**Recommendation:** Reject role parameter unless requester is 'super_admin'; default to 'kasir' always.

### No Rate Limiting on Auth Endpoints

**Issue:** Login and register endpoints have no attempt limits. Brute force on email/password is trivial.

**Files:** `src/routes/auth.ts:58-88`, `src/routes/auth.ts:20-56`

**Risk:** Credential stuffing; enumeration of valid emails via timing attacks.

**Recommendation:** Add rate limiting via IP/email; implement exponential backoff after 5 failed attempts.

### Missing RBAC on Inventory GET Routes

**Issue:** GET endpoints for ingredients and stock movements have no auth requirement (`onBeforeHandle` applied only at end of chain, line 106).

**Files:** `src/routes/inventory.ts:6-7`, `src/routes/inventory.ts:97-99`

**Impact:** Anyone (including unauthenticated users) can list all ingredients and stock movements, potentially exposing cost data and supply chain info.

**Recommendation:** Apply `requireRole()` middleware to all GET endpoints; validate user.role before returning sensitive inventory data.

---

## Performance Concerns

### N+1 Query Pattern in Order List Endpoints

**Issue:** `/api/orders/table/:tableId/all` fetches list of orders, then loops calling `getItemsWithMenuByOrderId()` for each order.

**Files:** `src/routes/orders.ts:34-46`

**Problem:** For 10 orders = 1 query for orders list + 10 queries for items = 11 total. Scales linearly with order count.

**Cause:** No eager loading/join in `getTodayOrdersByTableId()`.

**Fix Approach:** Create single query with LEFT JOIN on orderItems and menus; batch fetch items.

### Report Queries Without Pagination Defaults

**Issue:** Financial reports and sales reports use `.limit(limit)` but default limit is 50 or 100 — no upper cap on client request.

**Files:** `src/repositories/report.ts:148`, `src/repositories/financial-report.ts:115`

**Risk:** Client can request limit=999999 to fetch entire dataset; memory spike on server.

**Recommendation:** Cap limit to 1000; validate query param type and range server-side.

### Missing Indexes on Foreign Keys

**Issue:** `orderItems.orderId`, `orderItems.menuId`, `orders.tableId` have indexes, but `recipes.menuId` and `stockMovements.referenceId` (used in `decrementStockForOrderTx()` line 206) lack indexes.

**Files:** `src/db/schema.ts:158-166`, `src/db/schema.ts:168-182`

**Impact:** Stock decrement query on busy days (thousands of orders) does full table scan of `stockMovements`.

**Fix Approach:** Add `index('idx_stock_movements_reference_id').on(stockMovements.referenceId)`.

### Large Page Files (Potential Load Time)

**Issue:** Single-page application bundles mixed with server logic in page files. `pos-client.ts` is 932 lines; `inventory.ts` is 548 lines.

**Files:** `src/pages/pos-client.ts`, `src/pages/inventory.ts`

**Risk:** Browser loads entire page HTML/CSS/JS even if only using one feature; no code splitting.

**Recommendation:** Consider moving business logic to separate modules; implement lazy loading for pages.

---

## Operational & Observability Gaps

### Limited Logging — No Structured Logging

**Issue:** Logging uses `console.log/error()` directly with inconsistent formats. No request IDs, no context propagation across async operations.

**Files:** `src/repositories/inventory.ts:170`, `src/repositories/order.ts:126`, `src/pages/pos-client.ts:498`

**Impact:** Hard to trace errors in production; log lines mixed with application output; no way to correlate related operations.

**Example:** When stock decrement fails silently (line 170, inventory.ts), message is lost in console noise.

**Recommendation:** Implement structured logging with JSON output; add request ID middleware; log all DB operations at debug level.

### No Error Boundary for Async Failures

**Issue:** `seedDefaultSettings()` and `seedDefaultCategories()` fail silently with `.catch(console.error)` at startup (line 31-32, `index.ts`). If seeding fails, app still starts but is in bad state.

**Files:** `src/index.ts:31-32`

**Impact:** Missing default categories breaks entire POS system silently; no startup health check.

**Recommendation:** Make seeding synchronous or wait for Promise.all(); throw if critical seeds fail.

### No Request Tracing or Correlation IDs

**Issue:** When customer payment fails (payment.ts line 18), error thrown but no context about which order, user, or time.

**Files:** `src/services/payment.ts:9-28`

**Impact:** Cannot trace transaction failure across logs; hard to debug "payment failed for 3 customers yesterday" without precise correlation.

**Recommendation:** Add correlation ID to request context; propagate through all service calls; log with context object.

### Missing Audit Trail for Financial Transactions

**Issue:** Only basic audit logs for login/register exist. No audit trail for:
- Payment amounts (only success/failure)
- Stock adjustments (recorded in stockMovements but not correlated to user action reason)
- Discount applications
- Refunds (not implemented)

**Files:** `src/repositories/audit-log.ts` (limited event types), `src/services/payment.ts` (no audit entry)

**Impact:** Cannot answer "who made this payment?" or "why was this stock adjusted?" — critical for fraud investigation.

**Recommendation:** Create comprehensive audit trail for all financial operations with user, amount, reason, timestamp.

### No Monitoring Alerts for Low Stock

**Issue:** Low stock detected via `getLowStockIngredients()` but no proactive alerts. Admin must remember to check dashboard.

**Files:** `src/repositories/inventory.ts:33-35`

**Impact:** Stockout happens without warning; kitchen forced to turn away customers.

**Recommendation:** Add webhook/email alert when ingredient drops below minStock; integrate with external monitoring system.

---

## Code Quality Debt

### Untested Critical Paths

**Issue:** No test files in repository. High-risk operations completely untested:

1. **Stock Decrement on Order Completion** (`src/repositories/inventory.ts:193-256`): Runs in transaction but no tests for:
   - Idempotency (decrement twice = same result)
   - Negative stock prevention (throws error correctly)
   - Concurrent decrements (race condition detection)
   - Partial recipe ingredients failure (rollback entire transaction)

2. **Payment Processing** (`src/services/payment.ts:9-28`): No tests for:
   - Overpayment handling
   - Exact change edge case
   - Multiple payment attempts (double-charge prevention)
   - Concurrent payment attempts on same order

3. **Order Cancellation** (`src/routes/orders.ts:231-253`): No tests for:
   - Cancelling completed orders (should fail)
   - Race with payment processing
   - Table status consistency after cancel

**Files:** No `*.test.ts` or `*.spec.ts` files found

**Risk:** Critical bugs in financial logic discovered in production only.

**Recommendation:** Add Jest/Vitest with minimum 80% coverage on services and repositories.

### Inconsistent Error Handling

**Issue:** Some routes catch errors (payment.ts:223-224), others let them bubble up or return generic `{ error: 'Failed to ...' }` without detail.

**Files:** 
- `src/routes/inventory.ts:45-49` — silently deletes without error handling
- `src/routes/orders.ts:244-250` — no try/catch on multiple awaits
- `src/services/payment.ts:9-28` — throws explicit errors (good)

**Impact:** Some failures logged, others disappear; inconsistent client experience.

**Recommendation:** Create error middleware with standardized response format; use try/catch in route handlers consistently.

### Missing Input Validation for Numeric IDs

**Issue:** `Number(params.id)` and `Number(tableId)` conversions without validation. If parsing fails, `NaN` passed to DB queries.

**Files:** `src/routes/orders.ts:19`, `src/routes/inventory.ts:8`

**Risk:** Silent failure or incorrect record fetched (NaN becomes 0 or NULL in SQL).

**Recommendation:** Use Zod to validate ID params; throw 400 if not parseable.

### Hardcoded Magic Strings

**Issue:** Role names, table statuses, order statuses scattered across code with no centralized enum/constants.

**Files:** `src/routes/orders.ts` uses `'super_admin'`, `'kasir'`, `'completed'` directly; definitions in schema.ts.

**Risk:** Typo in one place breaks functionality silently; refactoring role names breaks multiple files.

**Recommendation:** Export constants from schema or shared config module; use as single source of truth.

### Lack of Abstractions for Common Patterns

**Issue:** Multiple routes manually check `getUserFromRequest()` and return unauthorized. No middleware to enforce this globally.

**Files:** `src/routes/orders.ts:58`, `src/routes/inventory.ts:14`, `src/routes/menus.ts` — repeated 50+ times

**Impact:** Auth logic duplicated; easy to miss auth check on new endpoint; inconsistent error messages.

**Recommendation:** Create `@authorize()` decorator or middleware function to wrap handlers.

---

## Scalability Limitations

### JWT Secret Not Rotated

**Issue:** No mechanism for JWT key rotation. If key compromised, all tokens become insecure; no way to invalidate old tokens.

**Files:** `src/services/session.ts:35-36`

**Impact:** If secret leaked, attacker can forge tokens indefinitely until service restarted.

**Recommendation:** Implement key rotation strategy; use KID (key ID) in JWT header; maintain multiple valid keys during rotation window.

### Session Storage In-Memory Only

**Issue:** Sessions are JWTs only — no server-side session store. Cannot revoke token (logout doesn't invalidate token).

**Files:** `src/routes/auth.ts:90-93` — logout just clears cookie, token still valid

**Impact:** Even after logout, token can be reused; no way to force logout on all tabs; no concurrent session limit.

**Recommendation:** Add Redis session store to track active tokens; check store on each request.

### Single Database Connection

**Issue:** No connection pooling configuration visible; mysql2 default pool is 10 connections.

**Files:** `src/db/index.ts` (not shown but likely single connection)

**Risk:** High load (>10 concurrent queries) blocks additional requests; connection exhaustion on spike.

**Recommendation:** Configure connection pool size; implement queue/circuit breaker for DB access.

### No Query Result Caching

**Issue:** Menu list, categories, settings fetched from DB on every request with no caching.

**Files:** `src/routes/menus.ts:6`, `src/repositories/category.ts`

**Impact:** High-read, low-write data (menus, categories) hammers DB; CPU wasted on repeated queries.

**Recommendation:** Cache menus/categories in memory with TTL; invalidate on update.

### Cookie Injection Vulnerability in Role Assignment

**Issue:** While `getUserFromRequest()` validates token, role assignment in register endpoint checks `if (requestingUser)` without explicit role verification first.

**Files:** `src/routes/auth.ts:32-41`

**Impact:** If JWT parsing succeeds but token is from different app, role assignment logic unpredictable.

**Recommendation:** Validate payload shape explicitly; throw if role not in enum.

---

## Test Coverage Gaps

**Areas with No Test Coverage (High Risk):**

1. **Stock Decrement Idempotency** — `decrementStockForOrderTx()` checks for existing movements to prevent double-decrement, but this logic untested.
   - File: `src/repositories/inventory.ts:203-211`
   - Risk: If idempotency check fails, stock goes negative

2. **Concurrent Order Item Additions** — No locking on order.total calculation; could result in wrong totals under load.
   - File: `src/repositories/order.ts:132-139`
   - Risk: Customer charged wrong amount

3. **Table Status Race Condition** — Transfer endpoint updates source then target table status with no atomicity.
   - File: `src/routes/orders.ts:286-287`
   - Risk: Both tables marked occupied simultaneously

4. **Payment Validation Edge Cases** — No tests for:
   - Payment amount equals total exactly
   - Payment amount is 1 cent over
   - Negative payment amount (should fail)
   - File: `src/services/payment.ts:17-19`

5. **Auth Token Expiration** — No tests for expired token handling across routes.
   - File: `src/middleware/authorization.ts:12-16`
   - Risk: Expired tokens might bypass checks

---

## Fragile Areas

### Stock Decrement Failure Points

**Files:** `src/repositories/inventory.ts:193-256`

**Why Fragile:** Depends on:
1. Order status being exactly 'completed' (line 199)
2. All recipe ingredients existing in DB (line 220-227)
3. Sufficient stock available (line 233-237)
4. Transaction isolation level (could see dirty reads)

**Safe Modification:** 
- Never call outside transaction
- Always validate recipe existence before order completion
- Run pre-completion stock check in `completeOrder()` before marking completed
- Add retry logic for transient DB errors

### Permission Checks on Sensitive Endpoints

**Files:** `src/routes/auth.ts:95-111` (reset-password), `src/routes/orders.ts:207-225` (payment)

**Why Fragile:** Role checks use string literals (`['super_admin', 'admin_restoran', 'kasir']`) hardcoded in multiple places. If roles change, all hardcoded strings break.

**Safe Modification:**
- Extract role lists to shared constants
- Test all permission checks after role changes
- Add integration tests that verify each role can/cannot access endpoint

### Cookie Handling Across Platforms

**Files:** `src/middleware/authorization.ts:1`, `src/utils/auth.ts:19-44`

**Why Fragile:** Cookie parsing uses regex (`/pos_session=([^;]+)/`) and checks both `cookies.pos_session` and raw header. Inconsistency between Elysia cookie parsing and manual header parsing could bypass auth.

**Safe Modification:**
- Use single cookie parsing method (Elysia's cookie middleware)
- Add tests for cookie parsing with malformed input
- Document expected cookie format

---

## Missing Critical Features

### No Refund/Credit Note System

**Issue:** Orders can be cancelled but no way to issue refunds or credit notes. Payment flow assumes forward-only (order → payment → complete).

**Impact:** Customer disputes unhandled; no audit trail of who authorized refund; accounting can't reconcile.

**Priority:** High — affects business operations

### No Inventory Reorder Alerts

**Issue:** `getLowStockIngredients()` exists but not exposed as endpoint or integrated with alert system.

**Impact:** No proactive notification when stock below minimum; manual dashboard checks required.

**Priority:** Medium — quality of life for operators

### No Multi-Location Support

**Issue:** Schema has no location/branch field. POS assumes single restaurant.

**Impact:** Cannot scale to multi-location; all inventory aggregated; cannot isolate sales by location.

**Priority:** Low (feature gap, not bug) — architectural limitation

### No Customer Loyalty Points Redemption

**Issue:** Points are awarded (`src/repositories/customer.ts`) but no endpoint to redeem or apply as discount.

**Impact:** Loyalty feature incomplete; points meaningless to customers.

**Priority:** Medium — affects customer retention features

---

## Security Review Summary

**Critical (Fix Immediately):**
1. Password reset endpoint missing authentication
2. Role assignment bypass in register endpoint
3. Hardcoded JWT secret fallback

**High (Fix Before Production):**
1. No CSRF protection on state-changing operations
2. No rate limiting on auth endpoints
3. Unauthenticated GET access to inventory data
4. Unsafe Number() conversions on ID params

**Medium (Fix Before Scaling):**
1. No input validation on most POST/PUT endpoints
2. Cookie security only conditional on NODE_ENV
3. Missing comprehensive audit trail for payments
4. No error boundaries for startup failures

---

## Recommendations for Next Steps

1. **Add Type Safety:** Convert all `as any` casts to proper TypeScript types
2. **Implement Error Handling:** Standardize error responses across all routes
3. **Add Logging:** Implement structured logging with context propagation
4. **Create Tests:** Start with unit tests for payment, stock, and auth logic
5. **Secure Credentials:** Move hardcoded secrets to environment variables with validation
6. **Fix RBAC:** Apply consistent authorization to all endpoints
7. **Add Monitoring:** Set up alerts for stock, payment failures, and error spikes

---

*Concerns audit: 2026-04-12*
