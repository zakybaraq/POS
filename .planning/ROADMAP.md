# POS Application Hardening Roadmap

**Status:** Comprehensive codebase analysis complete
**Date:** 2026-04-12
**Scope:** Full POS system (not just stock sync)
**Current State:** Functional but high-risk for production (0% test coverage, multiple race conditions, security gaps)

---

## Executive Summary

The POS application has a solid 3-layer architecture (Routes → Services → Repositories → Drizzle ORM → MySQL) with **correct atomic stock decrement on order completion**. However, it lacks:

- **Testing:** 0% coverage; critical financial paths (payment, stock, loyalty) untested
- **Data Integrity:** Race conditions in order item operations, table transfers, order cancellations
- **Security:** Hardcoded JWT secrets (fallback), unauthenticated password reset, no rate limiting, role assignment bypass
- **Observability:** Ad-hoc console logging, no structured logging or request tracing
- **Validation:** Zod imported but unused; ad-hoc checks throughout

**Risk Level:** HIGH for production (financial + inventory data at risk)

---

## Phased Implementation Plan

### Phase 1: Critical Data Integrity Fixes (Week 1)
**Priority:** CRITICAL | Effort: 3-4 days | Risk: Medium

**Why:** Race conditions in production can cause:
- Order totals to be incorrect (if item ops race with calculateTotals)
- Tables to be both occupied and available simultaneously (transfer ops)
- Stock to not be refunded on order cancellation (inconsistent inventory)

#### 1.1 Fix Order Item Operation Race Conditions
**What:** Wrap order item add/remove/update operations in database transactions

**How:**
1. Create transactional variants of `addOrderItem()`, `updateOrderItemQuantity()`, `removeOrderItem()`
2. In routes/orders.ts, use transactional wrappers for endpoints:
   - POST /api/orders/:id/items (add item)
   - PUT /api/orders/:id/items/:itemId (update quantity/notes)
   - DELETE /api/orders/:id/items/:itemId (remove item)
3. Ensure `calculateTotals()` is called inside the same transaction to prevent intermediate state

**Files to modify:**
- `src/repositories/order-item.ts` - Add TX versions of CRUD methods
- `src/routes/orders.ts:114-122, 170-175, 188-201` - Use TX variants

**Success Criteria:**
- Concurrent add/remove operations on same order result in consistent state
- Total is calculated after all item operations commit atomically
- No orphaned or missing items

**Estimate:** 4 hours

---

#### 1.2 Fix Table Status Race Condition in Order Transfer
**What:** Make table status updates atomic during order transfer

**How:**
1. Create `transferOrderToTable(orderId, sourceTableId, targetTableId)` with single transaction
2. Inside transaction:
   - Validate target table is available (status='available')
   - Update source table status to 'available'
   - Update target table status to 'occupied'
   - Update order.tableId
3. Roll back entire operation if any step fails

**Files to modify:**
- `src/repositories/table.ts` - Add transactional transfer method
- `src/routes/orders.ts:274-291` - Use atomic transfer instead of sequential updates

**Success Criteria:**
- No scenario where both tables are marked occupied
- No race condition between availability check and status update
- Both tables remain consistent even on network failure during transfer

**Estimate:** 3 hours

---

#### 1.3 Fix Order Cancellation Stock Refund Gap
**What:** Add stock refund logic when orders are cancelled; prevent double-decrement

**How:**
1. Determine cancellation rules: Are only unpaid orders refundable? Partially paid?
2. Create `refundStockForOrderTx(tx, orderId)` as inverse of `decrementStockForOrderTx()`
3. Update cancellation endpoint to:
   - Check if stock was already decremented (order completed before cancellation)
   - If yes, call refund logic within same transaction
   - Update order.status to 'cancelled'
   - Update table.status back to 'available'
4. Use stockMovements.reason field to track refunds (reason: "Refund for order #X")

**Files to modify:**
- `src/repositories/inventory.ts` - Add `refundStockForOrderTx()`
- `src/routes/orders.ts:231-253` - Integrate refund logic
- `src/db/schema.ts` - Consider adding order.completedStock boolean flag to track if stock was already decremented

**Success Criteria:**
- Cancelled orders have stock refunded if applicable
- stockMovements table shows clear in/out pairs for refunds
- No double-decrement scenarios

**Estimate:** 5 hours

---

#### 1.4 Clarify Order Completion Payment Logic
**What:** Separate "mark complete" from "finalize payment" to remove ambiguity

**How:**
1. Create two distinct operations:
   - `completeOrder(orderId, amountPaid)` - Called by payment service; marks status='completed' and decrements stock
   - `finishOrder(orderId)` - Called by manual finish endpoint; only marks status='completed' without payment; **does NOT decrement stock**
2. Update routes to call appropriate method:
   - POST /api/orders/:id/pay → paymentService.processPayment() → completeOrder() [stock decrements]
   - POST /api/orders/:id/finish → finishOrder() [no stock decrement, table stays occupied]
3. Document business rule: Stock only decrements when payment is made or finalize endpoint is called with explicit flag

**Files to modify:**
- `src/repositories/order.ts` - Add `finishOrder()` separate from `completeOrder()`
- `src/routes/orders.ts:268` - Use new `finishOrder()` method
- `src/services/payment.ts` - Ensure calls `completeOrder()` with amountPaid

**Success Criteria:**
- Clear distinction between paid (stock decremented) and unpaid (stock not decremented) order completion
- All code paths explicit about whether stock decrements
- Documentation updated with business rule

**Estimate:** 3 hours

**Total Phase 1:** ~15 hours | Risk reduction: High | Business impact: Critical

---

### Phase 2: Security Hardening (Week 1-2)
**Priority:** HIGH | Effort: 2-3 days | Risk: Medium

**Why:** Security gaps allow unauthorized access and data breaches (password reset bypass, role assignment bypass, brute force)

#### 2.1 Fix JWT Secret Management
**What:** Eliminate hardcoded fallback JWT secret; enforce environment variable requirement

**How:**
1. Create `src/config.ts` with centralized config loading
2. At startup, throw error if `JWT_SECRET` not set:
   ```typescript
   const JWT_SECRET = process.env.JWT_SECRET;
   if (!JWT_SECRET) throw new Error('JWT_SECRET env var required');
   ```
3. Remove hardcoded fallback from all files: `src/utils/auth.ts`, `src/services/auth.ts`, `src/services/session.ts`
4. Update `.env.example` to require JWT_SECRET

**Files to modify:**
- `src/config.ts` (new) - Centralized config with validation
- `src/utils/auth.ts:3` - Remove hardcoded secret, import from config
- `src/services/auth.ts:4` - Remove hardcoded secret, import from config
- `src/services/session.ts:5` - Remove hardcoded secret, import from config
- `.env.example` - Add JWT_SECRET requirement

**Success Criteria:**
- Application fails to start if JWT_SECRET not set
- Single source of truth for all secrets
- No hardcoded secrets in code

**Estimate:** 2 hours

---

#### 2.2 Fix Password Reset Authentication
**What:** Require authentication for password reset; add reset token flow

**How:**
1. Option A (Recommended): Require active session
   - Endpoint: PUT /api/auth/reset-password
   - Required: `oldPassword` (current password) + `newPassword`
   - Verify requester is authenticated
   - Verify `oldPassword` matches current hash
   - Hash new password and update

2. Option B: Email-based reset token (if "forgot password" needed)
   - Endpoint for request: POST /api/auth/forgot-password (email only)
   - Generate short-lived token (15 min), store in DB
   - Send token to email (requires email service integration)
   - Endpoint for reset: POST /api/auth/reset-password-token (token, newPassword)
   - Verify token exists, not expired, matches email

**Files to modify:**
- `src/routes/auth.ts:95-111` - Update reset-password endpoint
- `src/repositories/user.ts` - Add token table if doing Option B
- `src/utils/auth.ts` - Add password verification function

**Success Criteria:**
- Password reset requires prior authentication (active session or correct old password)
- No email enumeration possible
- Reset tokens are short-lived and invalidated after use

**Estimate:** 3 hours

---

#### 2.3 Fix Cookie Security Flags
**What:** Always use secure cookies; implement CSRF protection

**How:**
1. In `src/services/session.ts`, set `secure: true` unconditionally:
   ```typescript
   const cookieOptions = {
     secure: true,  // Always secure; use localhost:80 for local dev if needed
     httpOnly: true,
     sameSite: 'strict', // Add CSRF protection
     maxAge: 86400 * 7, // 7 days
   };
   ```
2. For local development, add `.env` var `COOKIE_SECURE=false` if testing requires HTTP
3. Add CSRF token middleware for state-changing operations (POST/PUT/DELETE):
   - Generate token on GET requests (form pages)
   - Validate token on state-change requests
   - Use `src/middleware/csrf.ts` (new)

**Files to modify:**
- `src/services/session.ts:11` - Set secure: true always
- `src/middleware/csrf.ts` (new) - Add CSRF token validation
- `src/index.ts` - Register CSRF middleware

**Success Criteria:**
- Cookies always sent over secure transport
- CSRF tokens validated on state-changing endpoints
- No MITM cookie theft possible

**Estimate:** 3 hours

---

#### 2.4 Add Input Validation on All Routes
**What:** Implement Zod schemas for all POST/PUT endpoints; validate types and ranges

**How:**
1. Create `src/schemas/` with Zod schemas for each resource:
   - `schemas/order.ts` - Order creation, item addition
   - `schemas/inventory.ts` - Stock adjustments (positive integers only)
   - `schemas/settings.ts` - Business settings validation
   - `schemas/menu.ts` - Menu creation (bounds on description length, category)
2. In each route handler, validate request body with `schema.parse(body)` or `schema.safeParse(body)`
3. Return 400 with validation errors if parsing fails
4. Add numeric bounds: `currentStock >= 0`, `price > 0`, `quantity > 0`

**Files to modify:**
- `src/schemas/` (new directory) - All validation schemas
- `src/routes/inventory.ts:13-31` - Add schema validation
- `src/routes/settings.ts` - Add schema validation
- `src/routes/menus.ts` - Add schema validation
- `src/routes/orders.ts` - Add schema validation

**Success Criteria:**
- All POST/PUT endpoints validate input with Zod
- Negative stock, invalid prices rejected at route entry
- No unvalidated data reaches database layer

**Estimate:** 4 hours

---

#### 2.5 Fix Auth Endpoint Role Assignment Bypass
**What:** Reject arbitrary role assignments; default to 'kasir' for new users

**How:**
1. In `/api/auth/register` endpoint:
   - Remove role parameter from request
   - Always default to role='kasir'
   - Only admins can assign roles post-registration via `/api/users/:id/role` (new endpoint)
2. Add permission check: Only users with role='admin_restoran' or 'super_admin' can assign roles
3. Add audit logging: Log all role assignment attempts

**Files to modify:**
- `src/routes/auth.ts:32-41` - Remove role parameter handling
- `src/routes/users.ts` (new endpoint) - PUT /api/users/:id/role with admin check
- `src/repositories/user.ts` - Add role update function

**Success Criteria:**
- New users cannot register with admin roles
- Role assignment requires authentication + admin role
- All role changes are audited

**Estimate:** 2 hours

---

#### 2.6 Add Rate Limiting on Auth Endpoints
**What:** Prevent brute force attacks on login/register

**How:**
1. Create `src/middleware/rate-limit.ts` using simple in-memory store or Redis
2. Implement sliding window: Max 5 failed login attempts per email per 15 minutes
3. Apply to endpoints:
   - POST /api/auth/login (check failed attempts)
   - POST /api/auth/register (check per-IP limit, e.g., 10 registrations per hour)
4. Return 429 (Too Many Requests) when limit exceeded
5. Log rate limit violations for security monitoring

**Files to modify:**
- `src/middleware/rate-limit.ts` (new) - Rate limit middleware
- `src/routes/auth.ts` - Apply rate limiting to login/register endpoints
- `src/index.ts` - Register rate limit middleware

**Success Criteria:**
- Brute force attempts blocked after 5 failures
- Rate limit info visible in response headers
- Abuse logged for review

**Estimate:** 3 hours

---

#### 2.7 Add RBAC to Inventory GET Routes
**What:** Require authentication for sensitive read operations (cost data, supplier info)

**How:**
1. Apply `requireRole()` middleware to GET endpoints:
   - GET /api/inventory/ingredients - Require 'admin_restoran' or 'super_admin' (cost data)
   - GET /api/inventory/stock-movements - Require admin (audit trail)
   - GET /api/recipes - Allow 'kasir' and 'chef' (public menu info)
2. Filter returned data by role (e.g., don't return costPerUnit for 'kasir')

**Files to modify:**
- `src/routes/inventory.ts:6-7, 97-99` - Add auth middleware
- `src/repositories/inventory.ts` - Add role-based filters

**Success Criteria:**
- Unauthenticated users cannot access inventory
- Cost data hidden from non-admin roles
- Stock movements only visible to admins

**Estimate:** 2 hours

**Total Phase 2:** ~20 hours | Risk reduction: High | Business impact: High

---

### Phase 3: Testing Infrastructure & Critical Path Coverage (Week 2-3)
**Priority:** HIGH | Effort: 4-5 days | Risk: Low (only adds code, no breaking changes)

**Why:** 0% coverage means all fixes above are untested; financial operations must have tests

#### 3.1 Set Up Vitest Testing Framework
**What:** Install Vitest, configure for integration tests, set up test database

**How:**
1. Install Vitest and dependencies:
   ```bash
   bun add -D vitest @vitest/ui @testing-library/node
   ```
2. Create `vitest.config.ts`:
   ```typescript
   import { defineConfig } from 'vitest/config';
   export default defineConfig({
     test: {
       globals: true,
       environment: 'node',
       setupFiles: ['./test/setup.ts'],
     },
   });
   ```
3. Create `test/setup.ts` to initialize test database (isolated MySQL instance or in-memory mock)
4. Add test script to `package.json`: `"test": "vitest"`

**Files to create:**
- `vitest.config.ts`
- `test/setup.ts`
- `test/fixtures/` - Test data fixtures
- `.env.test` - Test environment variables

**Success Criteria:**
- `bun test` runs Vitest
- Tests can connect to isolated test database
- Test environment isolated from production

**Estimate:** 2 hours

---

#### 3.2 Write Unit Tests for Auth & Validation
**What:** Unit tests for JWT, password hashing, role checks

**How:**
1. Create test files:
   - `test/utils/auth.test.ts` - verifyToken, createToken, hash/verify password
   - `test/middleware/authorization.test.ts` - requireRole, hasRole, requirePosAccess
   - `test/schemas/*.test.ts` - Zod schema validation
2. Test cases:
   - Valid JWT parsing
   - Invalid/expired tokens throw
   - Correct role checks
   - Schema validation passes/fails appropriately
   - Boundary conditions (empty strings, negative numbers)

**Files to create:**
- `test/utils/auth.test.ts`
- `test/middleware/authorization.test.ts`
- `test/schemas/*.test.ts`

**Success Criteria:**
- 50+ unit tests written
- Auth utilities 100% covered
- Schema validation 100% covered

**Estimate:** 4 hours

---

#### 3.3 Write Integration Tests for Order Lifecycle
**What:** Integration tests covering order creation → item add → payment → completion → stock decrement

**How:**
1. Create `test/integration/order.test.ts`
2. Test scenarios:
   - Create order
   - Add item to order
   - Verify total calculates correctly
   - Add another item concurrently; verify no race condition
   - Process payment
   - Verify stock is decremented
   - Verify stock movement recorded
   - Verify order marked completed
3. Test error cases:
   - Add item to non-existent order (fails)
   - Process payment on already-paid order (idempotent)
   - Concurrent payments (only one succeeds)

**Files to create:**
- `test/integration/order.test.ts`

**Test coverage:**
- Happy path: order → items → payment → completion → stock
- Error cases: invalid operations, race conditions, idempotency
- All file changes from Phase 1 should be covered here

**Success Criteria:**
- 20+ integration tests for order lifecycle
- All race condition fixes verified by tests
- All payment logic verified

**Estimate:** 6 hours

---

#### 3.4 Write Integration Tests for Stock & Inventory
**What:** Tests for stock decrement, refund, transaction atomicity

**How:**
1. Create `test/integration/inventory.test.ts`
2. Test scenarios:
   - Stock decrements on order completion
   - Stock NOT decremented until order completed
   - Stock refund on order cancellation
   - No double-decrement on retry
   - Insufficient stock prevents completion
   - Stock movements table tracks all changes with order reference
3. Edge cases:
   - Multiple items in single order affect multiple ingredients
   - Recipe ingredients consumed correctly (e.g., 2 pizzas = 4 units flour)
   - Rollback on failed completion leaves stock untouched

**Files to create:**
- `test/integration/inventory.test.ts`

**Success Criteria:**
- 15+ integration tests for stock operations
- All Phase 1 fixes verified (transaction atomicity, refund logic)
- Idempotency tested (retries don't double-decrement)

**Estimate:** 5 hours

---

#### 3.5 Write Integration Tests for Payment Processing
**What:** Tests for payment flows, change calculation, multiple payment methods

**How:**
1. Create `test/integration/payment.test.ts`
2. Test scenarios:
   - Single payment completes order
   - Partial payment (first installment)
   - Second payment (remaining balance)
   - Overpayment with change calculation
   - Payment reversal/refund
   - Concurrent payments on same order (one succeeds, other fails)

**Files to create:**
- `test/integration/payment.test.ts`

**Success Criteria:**
- 10+ integration tests for payment flows
- All financial calculations verified
- Race conditions tested

**Estimate:** 4 hours

---

#### 3.6 Write Integration Tests for RBAC & Security
**What:** Tests for authentication, role-based access, input validation

**How:**
1. Create `test/integration/auth-rbac.test.ts`
2. Test scenarios:
   - Unauthenticated requests rejected
   - Role-based access works (admin can, kasir cannot)
   - Password reset requires old password
   - Role assignment requires admin
   - Rate limiting blocks brute force
   - Input validation rejects invalid data

**Files to create:**
- `test/integration/auth-rbac.test.ts`

**Success Criteria:**
- 20+ security tests
- All Phase 2 security fixes verified
- Permission checks comprehensive

**Estimate:** 5 hours

**Total Phase 3:** ~26 hours | Risk reduction: Medium | Coverage gain: 30-40%

---

### Phase 4: Logging, Monitoring & Observability (Week 3)
**Priority:** MEDIUM | Effort: 2-3 days | Risk: Low

**Why:** No structured logging makes debugging production issues impossible; no request tracing

#### 4.1 Implement Structured Logging
**What:** Replace console.log with structured logger; add request tracing

**How:**
1. Install logger library (e.g., `pino` or `winston`):
   ```bash
   bun add pino
   ```
2. Create `src/logger.ts`:
   ```typescript
   import pino from 'pino';
   export const logger = pino({
     level: process.env.LOG_LEVEL || 'info',
     transport: {
       target: 'pino-pretty',
     },
   });
   ```
3. Replace all console.log/console.error:
   - In routes: `logger.info({ path, method, user })` for requests
   - In repositories: `logger.debug({ query, duration })` for DB ops
   - In error handlers: `logger.error({ error, context })`
4. Add request ID middleware for tracing:
   - Generate unique requestId per request
   - Include in all log messages
   - Include in error responses

**Files to modify:**
- `src/logger.ts` (new)
- `src/index.ts` - Register logger middleware
- `src/routes/*.ts` - Replace console.log with logger
- `src/repositories/*.ts` - Replace console.log with logger

**Success Criteria:**
- All logs are structured JSON (not plain text)
- Request tracing via requestId possible
- Log level configurable
- No console.log in production code

**Estimate:** 4 hours

---

#### 4.2 Add Observability to Financial Operations
**What:** Log all payment, stock, loyalty operations with full context

**How:**
1. Add detailed logging to:
   - Payment initiation: `logger.info({ orderId, customerId, amount, timestamp })`
   - Stock decrement: `logger.info({ orderId, ingredients: [...], before, after })`
   - Loyalty points: `logger.info({ customerId, pointsBefore, pointsAfter, reason })`
2. Include business context in all logs (customer name, order details)
3. Log both success and failure paths
4. Consider audit trail in DB for compliance (already exists in stockMovements; extend to payments, loyalty)

**Files to modify:**
- `src/services/payment.ts` - Add comprehensive logging
- `src/repositories/inventory.ts` - Log all stock changes
- `src/repositories/customer.ts` - Log loyalty changes

**Success Criteria:**
- All financial operations produce detailed logs
- Logs include timestamps, users, amounts, results
- Audit trail visible for compliance review

**Estimate:** 3 hours

---

#### 4.3 Add Health Check & Metrics Endpoints
**What:** Expose system health and basic metrics for monitoring

**How:**
1. Create health check endpoint: GET /health
   ```typescript
   {
     status: 'healthy',
     uptime: 12345,
     database: 'connected',
     timestamp: '2026-04-12T10:00:00Z'
   }
   ```
2. Create metrics endpoint: GET /metrics (optional, for Prometheus integration)
   ```typescript
   # requests_total{method="GET",status="200"} 1234
   # request_duration_seconds{method="GET",path="/orders"} 0.123
   # database_pool_size{current=5,max=5} 5
   ```
3. Register health checks for: database connectivity, JWT secret loaded, required services available

**Files to create:**
- `src/routes/health.ts`
- `src/metrics.ts` (optional)

**Success Criteria:**
- Health endpoint responds with system status
- Metrics available for monitoring
- Can detect if database connection lost

**Estimate:** 2 hours

**Total Phase 4:** ~9 hours | Risk reduction: Low | Operational gain: High

---

### Phase 5: Performance Optimization (Week 4)
**Priority:** MEDIUM-LOW | Effort: 2-3 days | Risk: Low

**Why:** N+1 queries, missing pagination, no caching cause performance issues under load

#### 5.1 Fix N+1 Query Patterns
**What:** Optimize order queries to use joins instead of loops

**How:**
1. In `src/repositories/order.ts`, update `getTodayOrdersByTableId()`:
   - Use LEFT JOIN on orderItems and menus
   - Fetch all data in single query
   - Group results in code if needed
2. Benchmark before/after (10 orders: 1 query vs 11 queries)
3. Apply same pattern to other list endpoints

**Files to modify:**
- `src/repositories/order.ts` - Optimize order+items queries
- `src/routes/orders.ts:34-46` - Use optimized query

**Success Criteria:**
- Single query for orders + items instead of 1+N
- Performance improvement measurable (benchmark)
- No duplicate data returned

**Estimate:** 3 hours

---

#### 5.2 Add Pagination Limits
**What:** Cap query results; enforce max limits on client requests

**How:**
1. Add validation to report endpoints:
   - Default limit: 50
   - Max limit: 500 (prevent 999999 attacks)
   - Min limit: 1
2. Return pagination metadata:
   ```typescript
   {
     data: [...],
     pagination: {
       limit: 50,
       offset: 0,
       total: 1234,
     }
   }
   ```

**Files to modify:**
- `src/repositories/report.ts:148` - Add limit validation
- `src/repositories/financial-report.ts:115` - Add limit validation
- `src/routes/reports.ts` - Return pagination metadata

**Success Criteria:**
- Max limit enforced (no 999999 requests)
- Pagination metadata in responses
- Memory usage capped

**Estimate:** 2 hours

---

#### 5.3 Add Database Indexes
**What:** Add indexes for common queries (orders by date, items by order, etc.)

**How:**
1. Analyze query patterns in code
2. Add indexes in schema:
   - orders(createdAt) - For date range queries
   - orderItems(orderId) - For order detail queries
   - stockMovements(ingredientId, createdAt) - For stock audit reports
   - customers(email) - For customer lookup
3. Use `drizzle-kit generate:mysql` to create migration

**Files to modify:**
- `src/db/schema.ts` - Add index definitions
- Create migration via drizzle-kit

**Success Criteria:**
- Queries use indexes (EXPLAIN shows index usage)
- Query performance improved
- No full table scans for common operations

**Estimate:** 2 hours

**Total Phase 5:** ~7 hours | Risk reduction: Low | Performance gain: 50-80%

---

## Quick Wins (0.5-1 hour each)

These can be tackled first to build momentum:

1. **Create src/config.ts** - Centralize environment variable loading
   - Files: src/config.ts (new), update auth files to use it
   - Impact: Improves code maintainability
   - Time: 30 min

2. **Add .env validation script** - Ensure required vars are set at startup
   - Files: src/index.ts (add validation at top)
   - Impact: Prevent silent failures
   - Time: 30 min

3. **Fix kitchen.ts route guard** - Add missing auth middleware
   - Files: src/routes/kitchen.ts
   - Impact: Improves security
   - Time: 15 min

4. **Document stock sync flow** - Add comments to order.ts + inventory.ts explaining atomic operation
   - Files: src/repositories/order.ts, src/repositories/inventory.ts
   - Impact: Improves maintainability
   - Time: 45 min

5. **Implement .env.example** - Add all required environment variables with descriptions
   - Files: .env.example
   - Impact: Improves onboarding
   - Time: 30 min

---

## Implementation Strategy

### Recommended Execution Order:
1. **Quick Wins (Day 1)** - 2-3 hours
   - Config.ts, env validation, docs
   - Boosts confidence and momentum

2. **Phase 1: Data Integrity (Days 2-4)** - 15 hours
   - Critical for production stability
   - Most business-impactful
   - Should be done before any major release

3. **Phase 2: Security (Days 5-7)** - 20 hours
   - Must be done before public/multi-user access
   - Parallel with Phase 1 testing

4. **Phase 3: Testing (Days 8-12)** - 26 hours
   - Validates all fixes work
   - Prevents regressions

5. **Phase 4: Observability (Days 13-15)** - 9 hours
   - Enables production debugging
   - Lower priority but important

6. **Phase 5: Performance (Days 16-18)** - 7 hours
   - For scale readiness
   - Can be deferred if not under load

### Parallel Tracks:
- Phases 1 & 2 can run in parallel if team has 2+ people
- Phase 3 can run alongside Phase 2 (write tests as features are built)
- Phase 4 & 5 are independent and can be done anytime

### Estimated Total Effort:
- **Baseline:** ~77 hours development
- **With testing & review:** ~100-120 hours (including PR reviews, debugging)
- **Team of 1:** 3-4 weeks (part-time)
- **Team of 2:** 2-3 weeks (parallel)

---

## Success Criteria (Final)

✓ All Phase 1 fixes implemented and tested (data integrity)
✓ All Phase 2 security gaps closed (security)
✓ 30-40% test coverage with critical paths covered (testing)
✓ Structured logging in place (observability)
✓ N+1 queries fixed, pagination limits enforced (performance)
✓ Zero known race conditions in order lifecycle
✓ Zero security vulnerabilities (JWT, auth, validation)
✓ Production-ready confidence

---

## Related Documents

- `.planning/codebase/ARCHITECTURE.md` - System design
- `.planning/codebase/CONCERNS.md` - Detailed issue list
- `.planning/codebase/TESTING.md` - Test strategy
- `.planning/codebase/CONVENTIONS.md` - Code standards
- `CONTEXT.md` - Stock sync requirements

---

**Next Steps:**
1. Review this roadmap with team
2. Pick Phase 1 tasks to start immediately
3. Create issues/PRs for each task
4. Execute in phases with weekly check-ins
5. Update roadmap as priorities change
