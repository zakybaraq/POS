# External Integrations

**Analysis Date:** 2026-04-12

## APIs & External Services

**No third-party APIs currently integrated** - The POS system operates as a self-contained application with no external service dependencies for core functionality.

**Future integration points identified:**
- Payment processors (Stripe, Square, local payment gateways)
- SMS/Email services (customer notifications)
- Cloud backup services
- Analytics platforms

## Data Storage

**Primary Database:**
- MySQL 5.7+ (self-hosted or cloud-managed)
  - Connection: `src/db/index.ts` uses mysql2/promise pool
  - ORM: Drizzle ORM for type-safe queries
  - Client: mysql2 with promise wrapper
  - Configuration: `drizzle.config.ts`
  - Schema: `src/db/schema.ts` (23 tables)

**File Storage:**
- Local filesystem only
  - Static assets: `src/public/` (CSS, JavaScript)
  - HTML templates: `src/templates/`
  - Logo/images: Stored as strings in `businessSettings` table
  - No cloud storage integration

**Caching:**
- None - All queries hit MySQL directly
- Session management handled via JWT tokens (stateless)
- No Redis or in-memory cache layer

## Authentication & Identity

**Auth Provider:**
- Custom JWT-based implementation
  - Token generation: `src/services/auth.ts` (login flow)
  - Token verification: `src/utils/auth.ts` (middleware)
  - Token storage: HTTP-only cookies via @elysiajs/cookie

**Authentication Flow:**
1. User login at `/login` (`src/pages/auth.ts`)
2. Credentials validated in `src/services/auth.ts`
3. Password verified via bcryptjs comparison
4. JWT token generated with payload: `{ userId, email, name, role }`
5. Token stored in `pos_session` cookie
6. Subsequent requests extract token from cookie and verify signature

**Password Hashing:**
- bcryptjs 3.0.3 - Bcrypt algorithm for password storage
  - Used in: `src/repositories/user.ts`
  - Hash rounds: Default (10)
  - Never stored in plain text

**JWT Configuration:**
- Secret key: `process.env.JWT_SECRET || 'pos-secret-key-change-in-production'`
  - ⚠️ Default unsafe - must be set in production
- Algorithm: HS256 (default for jsonwebtoken)
- Expiration: 24 hours (configured in `src/services/auth.ts`)

**Role-Based Access Control:**
- 5 roles defined in schema: `super_admin`, `admin_restoran`, `kasir`, `waitress`, `chef`
- Middleware: `src/middleware/authorization.ts`
- Convenience middleware functions:
  - `requireAdmin()` - super_admin, admin_restoran
  - `requirePosAccess()` - super_admin, admin_restoran, kasir
  - `requireOrderAccess()` - super_admin, admin_restoran, kasir, waitress, chef
  - `requireSuperAdmin()` - super_admin only

## Monitoring & Observability

**Error Tracking:**
- None - No external error tracking service (Sentry, Rollbar, etc.)
- Errors logged to console/stdout via JavaScript `console.error()`

**Logs:**
- Server startup log: `server.log` file
- Activity logging: Audit trails stored in `auditLogs` table
  - Records: userId, userName, action, details, createdAt
  - Used for: User action history and accountability
  - Location: `src/repositories/audit-log.ts`

**Structured Logging:**
- Not implemented - Ad-hoc console logging only
- No correlation IDs or request tracking

## CI/CD & Deployment

**Hosting:**
- Self-hosted or VPS-based (no platform-specific integration)
- Runs on any system with Bun + MySQL
- Typical deployment: Standalone Bun process listening on port 3000

**CI Pipeline:**
- None - No automated CI/CD pipeline configured
- Manual deployment required

**Process Management:**
- Dev: `bun run dev` (watch mode)
- Production: `bun run start` (single instance)
- Recommended: Use process manager (PM2, systemd, Docker) for production

**Database Migrations:**
- Drizzle Kit CLI: `bunx drizzle-kit generate:mysql` (create migrations)
- Apply: `bunx drizzle-kit push:mysql` (apply to database)
- Migrations stored in: `drizzle/` directory

## Environment Configuration

**Required Environment Variables:**
```
# Database
DB_HOST=localhost              # MySQL server hostname
DB_USER=root                   # MySQL username
DB_PASSWORD=                   # MySQL password
DB_NAME=pos_db                 # Database name

# Server
PORT=3000                      # HTTP server port
NODE_ENV=development           # Environment (development/production)

# Authentication
JWT_SECRET=change-me-in-prod   # CRITICAL: JWT signing key
```

**Secrets Location:**
- `.env` file (local development only)
- Note: `.env` is in `.gitignore` - not committed to repository
- Production: Set via environment variables or secret management system

**Configuration Defaults:**
- All database variables have fallback values for localhost development
- JWT_SECRET has insecure default - MUST be overridden in production
- PORT defaults to 3000

## Data Format Integration

**Request/Response Validation:**
- Elysia type validators (`t.Object`, `t.String`, `t.Number`, etc.)
- Located in route handlers: `src/routes/*.ts`
- Not using Zod (installed but unused)
- Example pattern:
  ```typescript
  body: t.Object({
    tableId: t.Number(),
    userId: t.Number(),
  })
  ```

**JSON API:**
- All responses returned as JSON
- Consistent response format from repositories and services
- Example order response:
  ```json
  {
    "id": 1,
    "tableId": 5,
    "status": "completed",
    "total": 500000,
    "items": [...]
  }
  ```

**Database Type Safety:**
- Drizzle generates TypeScript types automatically from schema
- All queries type-checked at build time
- Type exports: `User`, `Order`, `Menu`, etc. (38 types defined)
- Insert types: `NewUser`, `NewOrder`, `NewMenu`, etc.

## Cookie Management

**Session Cookies:**
- Package: @elysiajs/cookie 0.8.0
- Cookie name: `pos_session`
- Content: JWT token
- Scope: Used by `src/utils/auth.ts` for session verification
- Features: Automatic parsing by Elysia

**Cookie Options:**
- Set via: `src/routes/auth.ts` (login endpoint)
- Path: Root (`/`) - accessible to all routes
- Secure flag: Not currently set (HTTP only in development)
  - ⚠️ Should enable in production for HTTPS

## Third-Party Integrations

**Currently Unused Dependencies:**
- `zod 4.3.6` - Installed but NOT used for validation
  - Validation instead uses Elysia's built-in `t.*` validators
  - No schema definitions found in codebase

**No External APIs:**
- No Stripe, PayPal, Square integration
- No email service (no nodemailer, SendGrid, etc.)
- No SMS service (no Twilio, etc.)
- No cloud storage (no AWS S3, Azure Blob, etc.)
- No analytics (no Google Analytics, Mixpanel, etc.)

## Data Flow: Order to Payment to Stock

**Complete integration chain:**

1. **Order Creation** (Routes: `src/routes/orders.ts`)
   - POST /api/orders/with-items
   - Input validation via Elysia type validators
   - Creates order in MySQL via `src/repositories/order.ts`

2. **Order Service Layer** (`src/repositories/order.ts`)
   - Uses Drizzle queries to insert/update orders
   - Manages status transitions: draft → active → completed
   - Triggers stock decrement on completion

3. **Payment Processing** (`src/services/payment.ts`)
   - Validates order status and payment amount
   - Calls `src/repositories/order.ts` → `completeOrder()`
   - Stock decrement executed atomically with order completion

4. **Inventory Management** (`src/repositories/inventory.ts`)
   - `decrementStockForOrderTx()` - Transaction-based stock reduction
   - Creates `stockMovements` record for audit trail
   - Updates `ingredients` current stock
   - Only executes when order reaches "completed" status

5. **Stock Tracking** (Database tables)
   - `ingredients` - Current stock levels
   - `recipes` - Menu-to-ingredient mappings
   - `stockMovements` - Transaction log with before/after values
   - `orders` - Order status (triggers decrement on "completed")

**Key Integration Point:**
- Stock is decremented ONLY when `orders.status` = "completed"
- Ensures inventory accuracy throughout order lifecycle
- Transaction isolation prevents race conditions
- Audit trail maintained in `stockMovements` table

## Communication Patterns

**HTTP/REST API:**
- Routes: `src/routes/` (18 route modules)
- All routes use Elysia HTTP server
- Request types: GET, POST (PUT/DELETE not used in current routes)
- Response format: JSON

**Database Communication:**
- Query builder: Drizzle ORM
- Connection pooling: mysql2 promise pool (5 connections)
- Transaction support: Available via Drizzle transactions
- Type safety: Full TypeScript compilation-time checking

**Authentication Token Exchange:**
- Login: POST with email/password → JWT token returned in Set-Cookie
- Subsequent requests: JWT extracted from pos_session cookie
- Token verified server-side on every protected route

## Webhook & Callback Handling

**Incoming Webhooks:**
- None - No external webhooks received

**Outgoing Webhooks:**
- None - No outbound webhook calls made

**Local Event Handling:**
- Audit logging: `src/repositories/audit-log.ts` creates logs on user actions
- Status callbacks: Order status changes trigger stock movements automatically

---

*Integration audit: 2026-04-12*
