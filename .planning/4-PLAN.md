# Phase 4: Logging, Monitoring & Observability - Implementation Plan

**Date:** 2026-04-12  
**Total Effort:** 9 hours (4.1: 4h + 4.2: 3h + 4.3: 2h)  
**Dependencies:** Phase 3 complete (78/78 tests passing ✓)  
**Execution Strategy:** Sequential sub-phases (4.1 unblocks 4.2 & 4.3)

---

## Wave 1: Foundation & Infrastructure (Phase 4.1 - 4 hours)

### Task 4.1.1: Install Dependencies & Create Logger Module (1 hour)

**Objective:** Set up Pino, pino-pretty, prom-client; create base logger configuration.

**Subtasks:**
1. Install packages:
   ```bash
   bun add pino pino-pretty prom-client
   ```
2. Create `src/logger.ts`:
   - Export `logger` instance with Pino configuration
   - Config: `level: process.env.LOG_LEVEL || 'info'`
   - Dev transport: pino-pretty (colorized)
   - Production transport: standard JSON
   - Export helper: `createChildLogger(context)` for creating child loggers with bound context

3. Verify logger exports:
   - `logger.info()`, `logger.error()`, `logger.warn()`, `logger.debug()`
   - Default log level filtering works
   - JSON output is valid (test via `logger.info({ test: true })`)

**Success Criteria:**
- ✓ Package.json updated with pino, pino-pretty, prom-client
- ✓ `src/logger.ts` exists with exported logger instance
- ✓ `bun run src/logger.ts` produces JSON logs
- ✓ LOG_LEVEL env var controls filtering

**Files Modified:** 
- `src/logger.ts` (new)
- `package.json` (dependencies)

---

### Task 4.1.2: Create RequestId Middleware & AsyncLocalStorage (1 hour)

**Objective:** Implement request tracing via UUID generation + AsyncLocalStorage context propagation.

**Subtasks:**
1. Create `src/middleware/request-id.ts`:
   - Import AsyncLocalStorage from 'async_hooks'
   - Export `requestIdStore = new AsyncLocalStorage<string>()`
   - Middleware handler:
     - Generate unique requestId via `crypto.randomUUID()`
     - Store requestId in AsyncLocalStorage
     - Attach to `req` object as `req.id`
     - Set `X-Request-ID` response header
     - Call next middleware
   - Export helper: `getRequestId()` - retrieves requestId from store

2. Create `src/utils/logger-with-context.ts`:
   - Export `getLoggerWithRequestId()` function
   - Retrieves requestId from AsyncLocalStorage
   - Creates child logger with `{ requestId }` bound context
   - Returns logger that includes requestId in all logs automatically

3. Verify AsyncLocalStorage behavior:
   - Test that requestId persists through async calls
   - Verify multiple concurrent requests have isolated requestIds

**Success Criteria:**
- ✓ `src/middleware/request-id.ts` exports middleware + getRequestId() helper
- ✓ `src/utils/logger-with-context.ts` exports getLoggerWithRequestId()
- ✓ X-Request-ID header present in responses
- ✓ AsyncLocalStorage correctly isolates per-request context
- ✓ Manual test: Make request, verify requestId in logs

**Files Modified:**
- `src/middleware/request-id.ts` (new)
- `src/utils/logger-with-context.ts` (new)

---

### Task 4.1.3: Create PII Redaction Module (0.5 hour)

**Objective:** Implement whitelist-based redaction for sensitive fields.

**Subtasks:**
1. Create `src/utils/redact.ts`:
   - Define whitelist of safe fields (requestId, userId, orderId, status, method, path, timestamp, duration, count, etc.)
   - Export `redactObject(obj)` function
   - Recursively traverse object and replace non-whitelisted values with `[REDACTED]`
   - Preserve structure (null/undefined → null, arrays → arrays of redacted items)

2. Integrate with logger:
   - Create Pino serializer to apply redaction before JSON encoding
   - Configure in `src/logger.ts`: `serializers: { ...redactObject }`

3. Test redaction:
   - Log object with password, creditCard fields → verify redacted
   - Log with safe fields → verify preserved

**Success Criteria:**
- ✓ `src/utils/redact.ts` exports redactObject()
- ✓ Sensitive fields replaced with `[REDACTED]`
- ✓ Safe fields preserved in logs
- ✓ Nested objects handled correctly

**Files Modified:**
- `src/utils/redact.ts` (new)
- `src/logger.ts` (integrate serializers)

---

### Task 4.1.4: Register Middleware in Main App (0.5 hour)

**Objective:** Wire request ID middleware into Express app startup.

**Subtasks:**
1. Update `src/index.ts`:
   - Import request ID middleware from `src/middleware/request-id.ts`
   - Register middleware BEFORE all other middleware (first in chain)
   - Import logger for server startup logs
   - Replace `seedDefaultSettings().catch(console.error)` with `seedDefaultSettings().catch(err => logger.error({ err }, 'Failed to seed settings'))`
   - Replace `seedDefaultCategories().catch(console.error)` with `seedDefaultCategories().catch(err => logger.error({ err }, 'Failed to seed categories'))`
   - Replace server startup console.log with logger.info

2. Verify registration:
   - Start server: `bun run src/index.ts`
   - Check logs include startup messages with proper JSON format
   - Verify X-Request-ID header on test requests

**Success Criteria:**
- ✓ Middleware registered before other middleware
- ✓ Server startup logs use logger
- ✓ Seed errors logged via logger.error
- ✓ Test request shows X-Request-ID header

**Files Modified:**
- `src/index.ts` (register middleware, replace console.error/console.log)

---

### Task 4.1.5: Replace console.log/error in Backend Code (1 hour)

**Objective:** Systematically replace all console.* calls in src/ (excluding src/pages/*).

**Subtasks:**
1. **Priority 1 - Critical for stock audit:**
   - `src/repositories/inventory.ts`:
     - Line 2 consoles: Replace with `logger.info({ orderId }, 'Stock decrement decision')`
     - Use `getLoggerWithRequestId()` for full context
   
2. **Priority 2 - Order completion:**
   - `src/repositories/order.ts`:
     - Replace console.error in order completion → `logger.error({ err, orderId }, 'Failed to complete order')`

3. **Priority 3 - Config validation:**
   - `src/config.ts`:
     - Replace console.error → `logger.error({ err }, 'Configuration validation failed')`

4. **Priority 4 - All other backend files:**
   - `src/middleware/*.ts` - Replace with logger.debug or logger.info as appropriate
   - `src/routes/*.ts` - Add logger.info on route entry (optional, catch errors)
   - All other `src/**/*.ts` (except `src/pages/*` and logger files themselves)

**Search & Replace Strategy:**
- Use `grep -r "console\." src/ --include="*.ts" | grep -v "src/pages/"` to identify all calls
- Replace each console.log/error/warn/debug with appropriate logger method
- Ensure all logger calls use `getLoggerWithRequestId()` for context binding

**Success Criteria:**
- ✓ All console.* calls in src/ (excluding src/pages/*) replaced with logger.*
- ✓ Stock decrement logs include orderId, ingredients, before/after counts
- ✓ Error logs include error object + context
- ✓ `bun vitest run` still passes (78/78)
- ✓ Server startup produces JSON logs, no console output

**Files Modified:**
- `src/repositories/inventory.ts`
- `src/repositories/order.ts`
- `src/config.ts`
- `src/middleware/*.ts` (if console calls present)
- `src/routes/*.ts` (if console calls present)
- Any other `src/**/*.ts` with console.* calls (excluding src/pages/*)

---

## Wave 2: Financial Operations Observability (Phase 4.2 - 3 hours)

### Task 4.2.1: Stock Decrement Logging with Full Context (1 hour)

**Objective:** Add comprehensive logging to stock operations with audit trail.

**Subtasks:**
1. Review `src/repositories/inventory.ts`:
   - Locate `decrementStockForOrder()` and `decrementStockForOrderTx()` functions
   - Identify where stock adjustments happen (call to `adjustStock()`)

2. Enhance logging in `decrementStockForOrder()`:
   - Before decrement: `logger.info({ orderId, ingredients: [...], before: {...} }, 'Stock decrement starting')`
   - Per-ingredient: `logger.debug({ ingredientId, quantity, totalQuantity }, 'Ingredient stock adjustment')`
   - After decrement: `logger.info({ orderId, ingredients: [...], after: {...} }, 'Stock decrement completed')`
   - On skip: `logger.info({ orderId, reason: 'not completed' }, 'Stock decrement skipped')`

3. Enhance logging in `decrementStockForOrderTx()`:
   - Same structure but ensure requestId flows through (via AsyncLocalStorage)
   - Log transaction context: `{ orderId, txId, transactionStart: timestamp }`
   - Log idempotency check: `logger.debug({ orderId, existingMovements }, 'Checking for duplicate decrements')`

4. Test logging:
   - Create order → complete order → verify logs include stock before/after counts
   - Check that order not completed → logs show skip reason
   - Verify logs are JSON, not plain text

**Success Criteria:**
- ✓ Stock operations log before/after state
- ✓ Individual ingredient adjustments visible in logs
- ✓ Idempotency (duplicate decrements) logged with reason
- ✓ Logs include requestId from AsyncLocalStorage
- ✓ All logs are JSON format

**Files Modified:**
- `src/repositories/inventory.ts` (enhanced logging)

---

### Task 4.2.2: Payment Operations Logging (1 hour)

**Objective:** Add detailed logging to payment initiation, processing, and completion.

**Subtasks:**
1. Review `src/services/payment.ts` and payment routes:
   - Identify payment initiation flow
   - Locate payment processing/completion handlers
   - Find payment success/failure paths

2. Add logging to payment flow:
   - Payment initiation: `logger.info({ orderId, customerId, amount, paymentMethod }, 'Payment initiated')`
   - Payment processing: `logger.debug({ orderId, processor, processingTime }, 'Payment processing')`
   - Payment success: `logger.info({ orderId, customerId, amount, transactionId }, 'Payment completed successfully')`
   - Payment failure: `logger.error({ orderId, customerId, amount, reason, error }, 'Payment failed')`

3. Ensure full context in logs:
   - Include requestId (via AsyncLocalStorage)
   - Include userId of operator who processed payment
   - Include timestamp of each transition
   - Include payment method details (not sensitive data - method type only, not card numbers)

4. Test logging:
   - Process payment → verify logs show initiation → completion sequence
   - Failed payment → verify error logged with reason

**Success Criteria:**
- ✓ All payment transitions logged
- ✓ Logs include orderId, customerId, amount, requestId
- ✓ Error cases logged with failure reason
- ✓ No sensitive payment data in logs (method type only, no card numbers)
- ✓ Logs are JSON, time-sequenced

**Files Modified:**
- `src/services/payment.ts` (or payment route handler, depending on structure)

---

### Task 4.2.3: Loyalty Points & Order State Transition Logging (1 hour)

**Objective:** Add logging for customer loyalty changes and all order state transitions.

**Subtasks:**
1. Loyalty points logging in `src/repositories/customer.ts`:
   - Identify where loyalty points are updated
   - Add logging: `logger.info({ customerId, pointsBefore, pointsAfter, reason, transactionId }, 'Loyalty points updated')`
   - Include requestId, userId, timestamp

2. Order state transition logging:
   - Identify order status update points (likely in `src/repositories/order.ts`)
   - Log on EVERY transition: `logger.info({ orderId, previousState, newState, timestamp, userId }, 'Order state changed')`
   - Transitions to log: pending → confirmed, confirmed → completed, completed → cancelled, etc.

3. Ensure consistency with financial operations:
   - All logs include requestId, userId, timestamp
   - All logs are JSON format
   - Order ID always present for correlation

4. Test logging:
   - Create order → verify logs show pending state
   - Complete order → verify logs show pending → completed transition AND stock decrement
   - Cancel order → verify logs show completed → cancelled transition

**Success Criteria:**
- ✓ All loyalty operations logged
- ✓ All order state transitions logged
- ✓ Logs include customerId/orderId for audit trail
- ✓ Requestid flows through all transitions (AsyncLocalStorage)
- ✓ Logs are JSON, time-sequenced

**Files Modified:**
- `src/repositories/customer.ts` (loyalty logging)
- `src/repositories/order.ts` (state transition logging)

---

## Wave 3: Observability Endpoints (Phase 4.3 - 2 hours)

### Task 4.3.1: Health Check Endpoint (1 hour)

**Objective:** Implement GET /health endpoint for deployment monitoring.

**Subtasks:**
1. Create `src/routes/health.ts`:
   - Export health route handler
   - Route: GET `/health`
   - Response structure:
     ```json
     {
       "status": "healthy",
       "uptime": 12345,
       "database": "connected",
       "timestamp": "2026-04-12T10:00:00Z",
       "version": "1.0.0"
     }
     ```

2. Implement health checks:
   - **Uptime:** Calculate from process start time
   - **Database connectivity:** Run simple query (e.g., SELECT 1) to verify connection
   - **Status:** "healthy" if all checks pass, "degraded" if database slow, "unhealthy" if errors

3. Register in `src/index.ts`:
   - Import health route
   - Register handler for GET /health
   - No authentication required

4. Test health endpoint:
   - `curl http://localhost:3000/health`
   - Verify JSON response with all fields
   - Verify no auth required

**Success Criteria:**
- ✓ GET /health endpoint returns JSON status
- ✓ Database connectivity check works
- ✓ Uptime calculation accurate
- ✓ Response includes timestamp
- ✓ No authentication required
- ✓ Endpoint logs via logger

**Files Modified:**
- `src/routes/health.ts` (new)
- `src/index.ts` (register route)

---

### Task 4.3.2: Metrics Endpoint (Prometheus Format) (1 hour)

**Objective:** Implement GET /metrics endpoint for monitoring/Prometheus integration.

**Subtasks:**
1. Create `src/middleware/metrics.ts`:
   - Initialize `prom-client` counters and histograms
   - Counters:
     - `http_requests_total{method, status}` - Total requests by method and status
     - `orders_completed_total` - Total orders completed
     - `stock_decrements_total` - Total stock decrement operations
     - `payments_processed_total{status}` - Successful and failed payments
   - Histograms:
     - `http_request_duration_seconds{method, path}` - Request latency by endpoint

2. Create metrics middleware:
   - Hook into request/response to track HTTP metrics
   - Auto-increment counters on completion
   - Record latency histogram
   - Register in `src/index.ts` BEFORE other middleware

3. Export business metrics helpers:
   - `incrementOrdersCompleted(count=1)` - Call when order completes
   - `incrementStockDecrements(count=1)` - Call when stock decremented
   - `incrementPayments(status='success')` - Call on payment completion
   - Use these in repositories/services

4. Create `src/routes/metrics.ts`:
   - Route: GET `/metrics`
   - Response: Prometheus text format (via `prom-client.register.metrics()`)
   - No authentication required
   - Logs GET request via logger

5. Register in `src/index.ts`:
   - Import metrics middleware
   - Register middleware early (HTTP tracking)
   - Import metrics route
   - Register GET /metrics endpoint

6. Test metrics endpoint:
   - `curl http://localhost:3000/metrics`
   - Verify Prometheus text format (lines starting with #)
   - Verify counters and histograms present
   - Make requests, verify counters increment

**Success Criteria:**
- ✓ GET /metrics returns Prometheus text format
- ✓ HTTP metrics (requests, latency) tracked
- ✓ Business metrics (orders, stock, payments) accessible
- ✓ Metrics increment on operations
- ✓ No authentication required
- ✓ Metrics middleware registered early in chain
- ✓ Business metric helpers callable from repositories

**Files Modified:**
- `src/middleware/metrics.ts` (new)
- `src/routes/metrics.ts` (new)
- `src/index.ts` (register middleware + route, import helpers)

---

## Task 4.3.3: Wire Business Metrics into Repositories (0.5 hour)

**Objective:** Integrate business metric tracking into core operations.

**Subtasks:**
1. Update `src/repositories/order.ts`:
   - On order completion: Call `incrementOrdersCompleted()`
   - Verify metric increments with each completed order

2. Update `src/repositories/inventory.ts`:
   - On stock decrement: Call `incrementStockDecrements(count)`
   - Pass count of items decremented (or number of ingredient adjustments)

3. Update payment handling (payment service or route):
   - On successful payment: Call `incrementPayments('success')`
   - On failed payment: Call `incrementPayments('failed')`

4. Test metric tracking:
   - Create + complete order → verify orders_completed_total increments
   - Check metrics endpoint shows updated counts

**Success Criteria:**
- ✓ Business metrics called in right places
- ✓ Metrics endpoint shows accurate counts
- ✓ No errors from metrics calls
- ✓ Metrics increment on real operations (test via curl)

**Files Modified:**
- `src/repositories/order.ts` (call incrementOrdersCompleted)
- `src/repositories/inventory.ts` (call incrementStockDecrements)
- Payment service/route (call incrementPayments)

---

## Task 4.3.4: Verify All Tests Pass & Integration (0.5 hour)

**Objective:** Final verification that all changes work together.

**Subtasks:**
1. Run full test suite:
   ```bash
   bun vitest run
   ```
   - Verify 78/78 tests pass
   - No test output affected by logger changes

2. Start server and verify endpoints:
   - `bun run src/index.ts`
   - Verify server starts with logger info message
   - Test GET /health → JSON response ✓
   - Test GET /metrics → Prometheus format ✓
   - Make test request → Verify requestId in header + logs

3. Create test order workflow:
   - Create order
   - Add items
   - Process payment
   - Complete order
   - Verify all logs are JSON
   - Verify all logs include requestId
   - Verify requestId matches across logs (same request)
   - Check /metrics shows incremented counters

4. Verify no console output:
   - All logs go through logger (JSON)
   - No plain text console.log/error output
   - Only logger structured output

**Success Criteria:**
- ✓ All 78 tests pass
- ✓ Health endpoint responds with status
- ✓ Metrics endpoint responds with Prometheus format
- ✓ RequestId tracking works end-to-end
- ✓ No console.* calls in production code
- ✓ Stock decrement audit trail logged
- ✓ Payment audit trail logged
- ✓ Loyalty changes logged
- ✓ Order transitions logged

**Files Modified:**
- None (verification only)

---

## Execution Notes

### Wave 1 (4.1) - Foundation
- **Duration:** 4 hours
- **Critical path:** Must complete before 4.2 & 4.3
- **Verification:** `bun vitest run` passes + server starts with logger

### Wave 2 (4.2) - Financial Audit
- **Duration:** 3 hours
- **Depends on:** 4.1 complete
- **Verification:** Logs contain stock/payment/loyalty state changes

### Wave 3 (4.3) - Observability
- **Duration:** 2 hours
- **Depends on:** 4.1 complete (4.2 optional)
- **Verification:** /health and /metrics endpoints respond

### Parallel Opportunities
- Tasks within same wave can be parallelized where independent
- 4.1.1-4.1.2 can run in parallel after 4.1.4 (middleware registration)
- 4.2 tasks can be parallelized after 4.1 complete

### Rollback Strategy
- Keep all console.log calls until logger fully verified
- If logger breaks tests, revert logger.ts + middleware registration
- Individual file console replacements can be reverted separately

---

## Success Criteria (Phase 4 Exit)

✅ **Wave 1 Complete:**
- Logger configured (Pino + pino-pretty)
- Request ID middleware working
- PII redaction functional
- All console.log → logger.* in backend code
- Tests pass (78/78)

✅ **Wave 2 Complete:**
- Stock operations logged with before/after state
- Payment operations logged (initiation → completion)
- Loyalty changes logged
- Order state transitions logged
- Audit trail visible for compliance

✅ **Wave 3 Complete:**
- GET /health endpoint working
- GET /metrics endpoint working (Prometheus format)
- Business metrics tracked and incremented
- RequestId flows through all logs
- All logs are JSON

✅ **Overall:**
- No console.log in src/ (excluding src/pages/*)
- Log level configurable via LOG_LEVEL env var
- All existing tests pass (78/78)
- PII redacted from logs
- End-to-end request tracing works

---

**Ready for execution. Awaiting confirmation to begin Wave 1.**
