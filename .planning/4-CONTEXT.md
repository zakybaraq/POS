# Phase 4: Logging, Monitoring & Observability - Context & Decisions

**Date:** 2026-04-12  
**Phase:** 4 (Logging, Monitoring & Observability)  
**Status:** Context locked; ready for planning/execution  
**Unblocking:** Phase 3 tests now 78/78 passing ✓

---

## Executive Summary

Phase 4 implements structured logging, request tracing, and observability to enable production debugging and monitoring. Currently, all logging uses `console.log/error`, making it impossible to trace requests, correlate errors, or extract business metrics from logs.

**Effort:** ~9 hours (4h logging + 3h financial ops + 2h health/metrics)  
**Risk:** Low (non-breaking, backward compatible)  
**Business Impact:** High (production debugging, compliance audit trails)

---

## Decisions Made

### 1. Logging Library: Pino
- **Selected:** Pino v8+ (via `bun add pino`)
- **Why Pino over Winston:**
  - JSON-first logging (structured by default, no custom formatters needed)
  - Significantly faster (~3x faster than Winston on high-volume logging)
  - Built-in request ID support
  - Smaller bundle footprint (~280KB vs ~500KB)
  - Native support for child loggers with context binding
- **Configuration:**
  ```typescript
  level: process.env.LOG_LEVEL || 'info' (default: 'info', 'debug' for dev)
  transport: pino-pretty for development (colorized JSON)
  transport: standard JSON for production
  ```

### 2. Request Tracing Strategy
- **Implementation:** UUID-based requestId middleware
- **Generation:** Unique requestId per HTTP request (via `crypto.randomUUID()`)
- **Scope:** RequestId included in ALL logs (HTTP, service calls, database operations, financial transactions) - enables full end-to-end tracing through entire request lifecycle
- **Propagation:** 
  - Set in middleware as `req.id`
  - Passed through AsyncLocalStorage to maintain context across async boundaries
  - Included in all logs via logger child context binding
  - Returned in HTTP responses (`X-Request-ID` header)
  - Enables end-to-end request tracing even through internal service calls
- **Child Logger Pattern:** Each route handler + service layer gets logger with `{ requestId }` bound (no manual field addition)
- **Storage Mechanism:** Use AsyncLocalStorage to preserve requestId across async function boundaries (no manual parameter passing)

### 3. Logging Scope (Phase 4.1 & 4.2)
- **Replace in:** Backend code only (`src/` excluding `src/pages/*`)
- **Keep as-is:** Frontend client logging in `src/pages/*` (browser-side, separate concern)
- **Target files for 4.1:** 
  - `src/routes/*.ts` - Request entry points
  - `src/repositories/*.ts` - Database operations
  - `src/services/*.ts` - Business logic
  - `src/middleware/*.ts` - Middleware handlers
  - `src/config.ts` - Startup validation
- **Priority for 4.2 (Financial):**
  - `src/repositories/inventory.ts` - Stock decrement operations (HIGH PRIORITY - Phase 3 decision)
  - `src/services/payment.ts` - Payment initiation/completion
  - `src/repositories/customer.ts` - Loyalty points changes
  - Order completion flow - All state transitions

### 4. Log Levels & Frequency
- **error:** Only actual errors (exceptions, failed DB ops, auth failures)
- **warn:** Operational warnings (stock low, unusual patterns, retries)
- **info:** Business events (order created, payment processed, stock decremented, state transitions)
- **debug:** Detailed operation tracking (query execution, middleware flow, data transformations)
- **Default:** `info` level in production (reduces noise, captures business events)

### 4a. Sensitive Data Redaction
- **Strategy:** Whitelist approach (safe by default)
- **Implementation:** Create `src/utils/redact.ts` with whitelist of safe fields
- **Redaction scope:** Any log object passed through logger
- **Safe fields (whitelist):** requestId, userId, orderId, status, method, path, timestamp, duration, count
- **Dangerous fields (redacted):** password, secret, token, apiKey, creditCard, ssn, pin, email (partial), phone (partial)
- **Mechanism:** Pino's built-in `serializers` to intercept objects before JSON encoding
- **Logging PII safely:** Log only aggregated metrics (e.g., "5 orders from customers") not individual PII

### 5. Financial Operations Audit Trail
- **Scope:** Stock decrements, payments, loyalty changes (compliance-sensitive)
- **Storage:** Logs go to stdout (JSON format) + stockMovements table for stock-specific audit
- **Payment audit:** Logs only (no dedicated DB table) - sufficient for compliance tracing
- **Loyalty audit:** Logs only (no dedicated DB table) - sufficient for compliance tracing
- **Order state transitions:** Log ALL transitions (pending → confirmed → completed → cancelled/refunded) - full traceability
- **What to log:**
  - Stock decrement: `{ orderId, ingredients: [...], stockBefore, stockAfter, timestamp, userId, requestId }`
  - Payment: `{ orderId, customerId, amount, paymentMethod, timestamp, success, requestId }`
  - Loyalty: `{ customerId, pointsBefore, pointsAfter, reason, transactionId, timestamp, requestId }`
  - Order state transition: `{ orderId, previousState, newState, timestamp, userId, requestId }`
- **Immutability:** Logs are append-only via stdout; no modification possible (compliance requirement)
- **Audit trail access:** Review logs via log aggregation tool; stockMovements table for stock-specific queries

### 6. Log Output & Rotation
- **Output destination:** Stdout only (no rotating file logs)
- **Rationale:** Containerized environments (Docker/K8s) handle log collection via stdout capture; external log aggregation handled operationally
- **Format in dev:** JSON + pino-pretty (colorized for readability)
- **Format in production:** Raw JSON (optimized for log aggregation tools like ELK, Datadog, CloudWatch)
- **Rotation:** Handled by external infrastructure (Docker volume drivers, K8s log rotation, log aggregation tools)

### 7. Health Check Endpoint
- **Route:** GET `/health`
- **Response:** JSON with status, uptime, database connectivity, timestamp
- **Purpose:** Kubernetes/monitoring probes, deployment health verification
- **Implementation:** New file `src/routes/health.ts`, register in `src/index.ts`

### 8. Metrics Endpoint (Phase 4.3 - Full Implementation)
- **Route:** GET `/metrics` (Prometheus text-based format)
- **Library:** `prom-client` v15+
- **Metrics to expose:**
  - `http_requests_total{method,status}` - Total request count
  - `http_request_duration_seconds{method,path}` - Request latency histogram
  - `database_pool_size{status}` - Active/available DB connections
  - `orders_completed_total` - Business metric
  - `stock_decrements_total` - Business metric
  - `payments_processed_total{status}` - Successful/failed payments
- **Integration:** Auto-register middleware to collect HTTP metrics; manual registration for business metrics
- **Scraping:** Returns Prometheus-compatible text format for scraper intervals

---

## Current State Analysis

### Logging Usage (Before Phase 4)
- **Total console calls:** ~22 across backend + frontend
- **Distribution:**
  - `src/repositories/inventory.ts` - 2 (stock decrement decisions)
  - `src/repositories/order.ts` - 1 (order completion error)
  - `src/index.ts` - 3 (server startup, seed errors)
  - `src/config.ts` - 1 (config validation error)
  - `src/pages/*.ts` - 15 (frontend, client-side, leave unchanged)
- **Problem:** No correlation between logs (multiple req handlers can't be traced); errors lack context

### File Structure (Phase 4 targets)
- **Routes:** `src/routes/` (7 files - orders, items, analytics, categories, customers, payments, menu)
- **Repositories:** `src/repositories/` (5 files - order, inventory, analytics, customer, payment)
- **Services:** `src/services/` (2 files - payment, stock - may not exist yet, check during execution)
- **Middleware:** `src/middleware/` (5 files - auth, authorization, rate-limit, error, cors)

### Database Audit Infrastructure (Already In Place)
- **Table:** `stockMovements` exists (Phase 1 artifact)
- **Schema:** Already captures stockId, orderId, type, quantity, before, after, createdAt
- **Usage:** `src/repositories/inventory.ts` already logs to this table on stock changes
- **Leverage:** Log stock decrement operation BEFORE writing to stockMovements table (atomic)

---

## Phase 4 Breakdown

### 4.1 Structured Logging (4 hours)
1. **Install & Setup (30 min)**
   - `bun add pino pino-pretty`
   - Create `src/logger.ts` with Pino configuration
   - Create `src/middleware/request-id.ts` (UUID generation + context binding)

2. **Middleware Integration (1 hour)**
   - Register requestId middleware in `src/index.ts` (BEFORE other middleware)
   - Wire logger into Express req object
   - Verify request ID flows through to responses

3. **Replace console.log Calls (2.5 hours)**
   - `src/config.ts` - Config validation errors → logger.error
   - `src/repositories/inventory.ts` - Stock decisions → logger.info
   - `src/repositories/order.ts` - Order completion errors → logger.error
   - `src/routes/*.ts` - All route handlers → logger.info on success
   - `src/middleware/*.ts` - Middleware events → logger.debug
   - `src/index.ts` - Server startup → logger.info

4. **Testing & Validation (1 hour)**
   - Verify all logs are JSON (not plain text)
   - Check requestId propagates through requests
   - Verify log levels filter correctly
   - Update any tests that capture console output

### 4.2 Financial Operations Observability (3 hours)
1. **Stock Decrement Logging (1 hour)**
   - Location: `src/repositories/inventory.ts` (already using console.log)
   - Add structured logging with full context: orderId, ingredients array, before/after counts, timestamp
   - Log BEFORE writing to `stockMovements` table (atomic pair)

2. **Payment Logging (1 hour)**
   - Location: `src/services/payment.ts` or payment route handler
   - Log payment initiation: orderId, customerId, amount, paymentMethod
   - Log payment completion: success/failure, timestamp, transactionId

3. **Loyalty Points Logging (1 hour)**
   - Location: `src/repositories/customer.ts`
   - Log loyalty changes: customerId, pointsBefore, pointsAfter, reason, transactionId

### 4.3 Health Check & Metrics (2 hours)
1. **Health Check Endpoint (1 hour)**
   - New file: `src/routes/health.ts`
   - Route: GET `/health`
   - Response includes: status, uptime, database connectivity check, timestamp
   - Register in `src/index.ts` (no auth required)

2. **Metrics Endpoint (1 hour)**
   - New file: `src/routes/metrics.ts`
   - Route: GET `/metrics` (Prometheus text format)
   - Install `prom-client` library
   - Expose: HTTP metrics (requests, latency), DB pool size, business metrics (orders, stock, payments)
   - Auto-register HTTP middleware for request counting/latency
   - Register in `src/index.ts` (no auth required)

---

## Success Criteria (Phase 4 Exit)

✓ All logs are structured JSON (verifiable via log output inspection)  
✓ No `console.log`, `console.error`, etc. in production backend code (`src/` excluding `src/pages/*`)  
✓ Request tracing works: same requestId appears across all logs for single request (including async operations)  
✓ Financial operations (stock, payment, loyalty, order state transitions) produce detailed audit-trail logs  
✓ Health endpoint responds with system status and database connectivity  
✓ Metrics endpoint (/metrics) exposes Prometheus-format metrics (HTTP + business)  
✓ Sensitive data is redacted from logs (whitelist approach verified)  
✓ Log level is configurable via `LOG_LEVEL` environment variable  
✓ All existing tests still pass (78/78)  
✓ New tests added for logger + request ID middleware + metrics (optional but recommended)

---

## Constraints & Assumptions

### Constraints
- **No breaking changes:** Backward compatibility with existing routes/responses
- **Data consistency:** Stock decrement logging must be atomic with DB write (Phase 3 requirement maintained)
- **No hardcoded secrets:** Logger config must use environment variables only
- **Test isolation:** Tests must not be affected by logger output (capture via test setup if needed)

### Assumptions
- **Pino-pretty dependency:** `pino-pretty` is available in npm registry (standard)
- **Database uptime:** Health check assumes database is reachable; no retries implemented
- **Request ID uniqueness:** `crypto.randomUUID()` provides sufficient uniqueness (safe assumption for this scale)
- **Log volume:** ~100-500 requests/day in production; Pino performance is suitable

### Known Limitations
- **Distributed tracing:** RequestId is in-process only; no cross-service correlation (out of scope for Phase 4)
- **Log storage:** Logs go to stdout; log aggregation (ELK, Splunk) is operational concern, not development
- **Metrics export:** Phase 4.3 metrics are optional; full Prometheus integration deferred to future phase

---

## Related Artifacts

### Phase 3 (Completed)
- Test infrastructure: 78/78 tests passing ✓
- Stock decrement on order completion: Implemented ✓
- Database transactions: In place ✓

### Phase 2 (Completed)
- JWT authentication: In place
- Input validation (Zod): Implemented
- Rate limiting: Implemented
- Error handling middleware: In place

### Phase 1 (Completed)
- Stock movements audit table: `stockMovements` table exists
- Order → Item → Payment → Completion flow: Implemented
- Financial operations: Core logic in place

---

## Next Steps for Planning/Execution

1. **Review this context:** Confirm all decisions align with project goals
2. **Create PLAN.md:** Break down 4.1, 4.2, 4.3 into atomic implementation tasks
3. **Execute 4.1 first:** Pino setup + request ID middleware + console replacement (unblocks 4.2 & 4.3)
4. **Execute 4.2:** Financial operations logging (highest business value)
5. **Execute 4.3:** Health & metrics endpoints (nice-to-have, can be deferred if time tight)
6. **Verify:** All tests pass, health endpoint responds, logs are JSON
7. **Exit criteria:** All 3 sub-phases complete OR 4.1 + 4.2 complete with 4.3 deferred to Phase 5

---

## Rollback Plan (If Needed)

- **Revert to console.log:** Undo all logger.* calls, restore console.* calls (low risk)
- **Remove Pino dependency:** `bun remove pino pino-pretty prom-client` (high risk if already in use elsewhere)
- **Disable request ID middleware:** Remove registration from `src/index.ts` (medium risk, affects header only)

## Implementation Notes from User Clarifications

**User-confirmed decisions (locked):**
1. ✓ RequestId in ALL logs (including async service calls via AsyncLocalStorage)
2. ✓ Stdout-only logging (no rotating file logs)
3. ✓ Full metrics endpoint (Prometheus format, prom-client library)
4. ✓ Whitelist-based PII redaction (safe-by-default approach)
5. ✓ Frontend logging unchanged (console.log in browser context is appropriate)
6. ✓ Log all order state transitions (pending → confirmed → completed/cancelled)
7. ✓ Payment/loyalty audit in logs + stockMovements for stock (no new DB tables)

**AsyncLocalStorage implementation detail:**
- RequestId must be preserved across async boundaries (database calls, service layer, middleware chains)
- Use Node.js built-in `AsyncLocalStorage` to store requestId per request context
- All loggers created within same request context inherit requestId automatically

---

**Phase 4 context locked. Ready for planning phase.**
