# Phase 2: Security Hardening - Context & Decisions

**Date:** 2026-04-12  
**Phase:** 2 (Security Hardening)  
**Status:** Context gathering complete; ready for research/planning

---

## Executive Summary

Phase 2 addresses 7 critical security gaps in the POS system:
1. Hardcoded JWT secret fallback
2. No password reset authentication requirement
3. Insecure cookie flags (no httpOnly, no secure flag)
4. Missing input validation on routes (Zod not used)
5. Arbitrary role assignment on registration
6. No rate limiting on auth endpoints
7. Sensitive data in error messages + missing RBAC on read operations

**Effort:** ~20 hours | **Risk:** Medium (changes middleware/auth) | **Business Impact:** High

---

## Current Security State (As-Is)

### Authentication & JWT
- **Location:** `src/utils/auth.ts:3`
- **Current:** Hardcoded fallback secret: `'pos-secret-key-change-in-production'`
- **Risk:** If `.env` missing, app uses hardcoded secret (high compromise risk)
- **Token structure:** JWT with userId, email, name, role
- **Token retrieval:** Reads from `pos_session` cookie header, no expiry validation

### Authorization (Role-Based Access Control)
- **Location:** `src/middleware/authorization.ts`
- **Current:** 
  - `requireRole(allowedRoles)` middleware checks user role against array
  - 5 role types: super_admin, admin_restoran, kasir, waitress, chef
  - Convenience helpers: `requireAdmin()`, `requirePosAccess()`, etc.
- **Issue:** Role-based GET filtering missing (cost data, stock movements still visible to kasir)

### Input Validation
- **Current:** Manual validation only (e.g., `if (!menuId)` checks)
- **Status:** Zod schemas NOT used anywhere
- **Risk:** 
  - Negative stock allowed
  - SQL injection not prevented
  - Type coercion attacks possible
  - No bounds checking on descriptions, prices

### Error Handling
- **Current:** Routes return error messages directly to client
- **Examples:**
  - `routes/orders.ts`: `return { error: 'Order not found' }`
  - `routes/auth.ts`: Likely exposes user existence
- **Risk:** Information leakage enables user enumeration, attack surface mapping

### Cookie Security
- **Location:** `src/services/session.ts` (assumed, not yet reviewed)
- **Current State:** Cookie flags likely missing
- **Risk:** 
  - No `secure` flag = susceptible to MITM on HTTP
  - No `httpOnly` = susceptible to XSS token theft
  - No `sameSite` = susceptible to CSRF attacks

### Password Reset
- **Current:** No reset endpoint implemented
- **Risk:** Users locked out if passwords forgotten; admins must manually reset

---

## Phase 2 Task Breakdown (ROADMAP-based)

### Task 2.1: JWT Secret Management ✓ (DECISION LOCKED)
**Effort:** 2 hours | **Risk:** Low

**Decision:** Centralized config with startup validation
- Create `src/config.ts` with required `JWT_SECRET` env var check
- Throw error at startup if missing (fail-fast principle)
- Remove hardcoded fallback from all files
- Update `.env.example` to require JWT_SECRET

**Files to create/modify:**
- `src/config.ts` (new)
- `src/utils/auth.ts:3` - Remove fallback
- `src/services/auth.ts` - Remove fallback  
- `src/services/session.ts` - Remove fallback
- `.env.example` - Document JWT_SECRET requirement

**Success:** App fails to start if JWT_SECRET not set

---

### Task 2.2: Password Reset Authentication ✓ (DECISION LOCKED)
**Effort:** 3 hours | **Risk:** Low

**Decision:** Require current password for reset (Option A - faster, sufficient)
- Do NOT implement email-based forgot-password flow yet (deferred to Phase 2.5)
- Endpoint: `PUT /api/auth/change-password` (renamed from reset-password)
- Required: userId from auth token, oldPassword, newPassword
- Verify oldPassword matches current hash
- Return 400 if oldPassword incorrect

**Files to modify:**
- `src/routes/auth.ts` - Update/add change-password endpoint
- `src/utils/auth.ts` - Add `comparePassword()` function
- Move password hashing to shared utils if not already there

**Success:** Password change requires correct current password

---

### Task 2.3: Cookie Security Flags ✓ (DECISION LOCKED)
**Effort:** 3 hours | **Risk:** Low

**Decision:** Always-secure cookies + CSRF middleware
- Set `secure: true` unconditionally in `src/services/session.ts`
- For local HTTP dev: Use env var `COOKIE_SECURE` to override (default true)
- Add `httpOnly: true` (prevents XSS token theft)
- Add `sameSite: 'strict'` (prevents CSRF)
- Implement CSRF token middleware:
  - Generate token on GET requests (cache in memory per session)
  - Validate on POST/PUT/DELETE via `X-CSRF-Token` header
  - Return 403 if token missing/invalid

**Files to create/modify:**
- `src/middleware/csrf.ts` (new) - CSRF token generation + validation
- `src/services/session.ts` - Update cookie options
- `src/index.ts` - Register CSRF middleware
- `.env.example` - Document COOKIE_SECURE (optional)

**Success:** Cookies sent only over HTTPS, CSRF tokens validated on state changes

---

### Task 2.4: Input Validation with Zod ✓ (DECISION LOCKED)
**Effort:** 4 hours | **Risk:** Medium (touches all routes)

**Decision:** Zod schemas for all POST/PUT endpoints
- Create `src/schemas/` directory
- Schemas needed:
  - `schemas/order.ts` - Order creation, item addition
  - `schemas/inventory.ts` - Stock adjustments (only positive integers)
  - `schemas/menu.ts` - Menu creation (price > 0, name length bounded)
  - `schemas/auth.ts` - Login/register (email format, password min length)
  - `schemas/user.ts` - User updates
- Apply validation in route handlers via `schema.safeParse(body)`
- Return 400 with parsed errors if validation fails
- Numeric bounds: `currentStock >= 0`, `price > 0`, `quantity > 0`, `email` valid format

**Files to create/modify:**
- `src/schemas/` (new directory, 5+ files)
- `src/routes/orders.ts` - Add schema validation to POST/PUT endpoints
- `src/routes/inventory.ts` - Add schema validation
- `src/routes/menus.ts` - Add schema validation
- `src/routes/auth.ts` - Add schema validation
- `src/routes/users.ts` - Add schema validation
- `src/routes/settings.ts` - Add schema validation

**Success:** All POST/PUT endpoints validate input with Zod; negative stock rejected

---

### Task 2.5: Auth Endpoint Role Assignment Bypass ✓ (DECISION LOCKED)
**Effort:** 2 hours | **Risk:** High if not done correctly

**Decision:** Remove role parameter from register; add admin-only role assignment endpoint
- Register endpoint (`POST /api/auth/register`):
  - Remove `role` from request body
  - Always set `role = 'kasir'` by default
- New endpoint (`PUT /api/users/:id/role`):
  - Require auth + `admin_restoran` or `super_admin` role
  - Accept `role` in body
  - Validate role against allowed values
  - Audit log all role changes
- Add to audit log: timestamp, who changed role, old role, new role

**Files to create/modify:**
- `src/routes/auth.ts:register` - Remove role parameter handling
- `src/routes/users.ts` - New `PUT /:id/role` endpoint
- `src/repositories/user.ts` - Add `updateUserRole()` function
- `src/repositories/audit-log.ts` - Add role change logging

**Success:** New users cannot register with admin roles; role changes audited

---

### Task 2.6: Rate Limiting on Auth Endpoints ✓ (DECISION LOCKED)
**Effort:** 3 hours | **Risk:** Medium (needs state management)

**Decision:** In-memory rate limiting with sliding window (no Redis needed yet)
- Create `src/middleware/rate-limit.ts`
- Implement sliding window counter:
  - Login: Max 5 failed attempts per email per 15 minutes
  - Register: Max 10 registrations per IP per hour
- Store in memory: `Map<key, Array<timestamp>>`
- On rate limit exceeded: Return 429 (Too Many Requests)
- Log all rate limit violations for security review

**Files to create/modify:**
- `src/middleware/rate-limit.ts` (new) - Rate limit implementation
- `src/routes/auth.ts` - Apply rate limiting to login + register
- `src/index.ts` - Register rate limit middleware globally or per-route

**Success:** Brute force blocked after 5 login failures; abuse logged

---

### Task 2.7: RBAC on Inventory GET Routes ✓ (DECISION LOCKED)
**Effort:** 2 hours | **Risk:** Low

**Decision:** Add role-based filtering to sensitive reads
- Protected reads (require `admin_restoran` or `super_admin`):
  - `GET /api/inventory/ingredients` - Cost data sensitive
  - `GET /api/inventory/stock-movements` - Audit trail sensitive
  - `GET /api/inventory/suppliers` - Supplier pricing sensitive
- Public reads (allow `kasir`):
  - `GET /api/recipes` - Menu recipes (no cost data)
  - `GET /api/menus` - Public menu list
- Implementation:
  - Apply `requireRole()` middleware to protected endpoints
  - Return filtered response (e.g., omit `costPerUnit` for non-admins)

**Files to modify:**
- `src/routes/inventory.ts` - Add auth middleware to GET endpoints
- `src/repositories/inventory.ts` - Add role-based filtering functions

**Success:** Cost data hidden from kasir; only admins see stock movements

---

## Key Decisions & Constraints

### JWT & Secrets
- ✅ **Constraint:** No hardcoded fallback (fail-fast on missing env var)
- ✅ **Pattern:** Single config file (`src/config.ts`) for all secrets
- ✅ **Scope:** Does NOT include token rotation or refresh tokens (deferred)

### Password Security
- ✅ **Constraint:** No email-based password reset yet (too complex, deferred to Phase 4)
- ✅ **Pattern:** Current password required for change (prevents account takeover)
- ✅ **Scope:** Does NOT include password expiration policies

### Cookie Security
- ✅ **Constraint:** Always secure=true in production
- ✅ **Pattern:** CSRF tokens in memory per session (stateless for now)
- ⚠️ **Caveat:** CSRF tokens lost on server restart (acceptable for MVP; use Redis later)

### Input Validation
- ✅ **Constraint:** Zod for all POST/PUT endpoints
- ✅ **Pattern:** `safeParse()` preferred (returns result object, not exceptions)
- ✅ **Scope:** Numeric bounds (price > 0, stock >= 0) included
- ⚠️ **Caveat:** Does NOT include SQL injection prevention (Drizzle handles this)

### Rate Limiting
- ✅ **Constraint:** In-memory only (no Redis required for Phase 2)
- ✅ **Pattern:** Sliding window with cleanup on memory spike
- ⚠️ **Caveat:** Not distributed (works for single-server MVP; upgrade to Redis later)

### Error Messages
- ✅ **Decision:** Return generic errors to client (e.g., "Invalid credentials" not "User not found")
- ✅ **Decision:** Log detailed errors server-side for debugging
- ✅ **Scope:** Does NOT include structured logging (deferred to Phase 4)

---

## Deferred to Later Phases

- **Password reset tokens (forgot-password flow)** → Phase 4 (requires email service)
- **Refresh token rotation** → Phase 4
- **Redis-based rate limiting** → Phase 4 (for distributed deployments)
- **Structured logging** → Phase 4
- **Metrics/monitoring** → Phase 4
- **IP-based access controls** → Phase 5
- **2FA/MFA** → Future enhancement

---

## Testing Strategy (Preview for Phase 3)

Each security fix should have corresponding tests:
- **2.1 JWT:** Test config fails if env var missing
- **2.2 Password:** Test change-password rejects wrong old password
- **2.3 Cookies:** Test CSRF middleware blocks state changes without token
- **2.4 Validation:** Test each Zod schema rejects invalid input
- **2.5 Roles:** Test register always defaults to kasir; role endpoint requires admin
- **2.6 Rate Limit:** Test login blocked after 5 failures
- **2.7 RBAC:** Test cost data hidden for non-admins

---

## Execution Order (Recommended)

1. **Task 2.1** (JWT) - Foundation for all other tasks
2. **Task 2.2** (Password reset) - Quick win, isolated
3. **Task 2.4** (Input validation) - Needed before 2.5
4. **Task 2.5** (Role bypass) - Depends on validation
5. **Task 2.3** (Cookies) - Can run in parallel
6. **Task 2.6** (Rate limiting) - Can run in parallel  
7. **Task 2.7** (RBAC reads) - Last (lowest risk, post-auth)

---

## Success Criteria (Phase 2 Complete)

- [ ] Application fails to start without JWT_SECRET
- [ ] Password changes require current password
- [ ] Cookies marked secure, httpOnly, sameSite
- [ ] All POST/PUT endpoints validate with Zod
- [ ] New users register as 'kasir'; role changes require admin
- [ ] Login/register blocked after rate limit threshold
- [ ] Cost data hidden from non-admin roles
- [ ] No hardcoded secrets in code
- [ ] Error messages generic (no user enumeration possible)
- [ ] All changes committed atomically with clear messages
