# Architecture

**Analysis Date:** 2026-04-10

## Pattern Overview

**Overall:** Server-Side Rendered (SSR) Multi-Layer Architecture with Elysia/Bun

**Key Characteristics:**
- JWT-based authentication with cookie sessions
- Role-based access control (RBAC)
- Drizzle ORM with MySQL database
- Server-rendered HTML pages (no separate frontend framework)
- Clean layer separation: Routes → Repositories → DB
- Business logic in services layer

## Layers

**Routes Layer:**
- Location: `src/routes/`
- Contains: API route definitions with embedded controller logic
- Depends on: Repositories, Services, Middleware
- Used by: Main server (`src/index.ts`)
- Contains: `orders.ts`, `menus.ts`, `tables.ts`, `auth.ts`, `users.ts`, `dashboard.ts`, `inventory.ts`, `customers.ts`, `reports.ts`, `settings.ts`, `suppliers.ts`, `purchase-orders.ts`, `employees.ts`, `shifts.ts`, `attendance.ts`, `kitchen.ts`, `categories.ts`, `audit-log.ts`

**Pages Layer:**
- Location: `src/pages/`
- Contains: Server-rendered HTML page handlers
- Depends on: Templates, Repositories, Utils
- Used by: Main server for serving UI pages
- Contains: `pos.ts`, `dashboard.ts`, `menu.ts`, `categories.ts`, `tables.ts`, `orders.ts`, `products.ts`, `customers.ts`, `inventory.ts`, `reports.ts`, `settings.ts`, `suppliers.ts`, `purchase-orders.ts`, `employees.ts`, `shifts.ts`, `attendance.ts`, `kitchen.ts`, `admin.ts`, `auth.ts`

**Repositories Layer:**
- Location: `src/repositories/`
- Contains: Data access functions - CRUD operations, queries
- Depends on: DB configuration (`src/db/`)
- Used by: Routes, Pages, Services
- Key files: `order.ts`, `menu.ts`, `table.ts`, `user.ts`, `customer.ts`, `inventory.ts`, `report.ts`, `employee.ts`, `category.ts`

**Services Layer:**
- Location: `src/services/`
- Contains: Business logic - authentication, payment processing, session management
- Depends on: Repositories
- Used by: Routes
- Key files: `auth.ts`, `payment.ts`, `session.ts`

**Database Layer:**
- Location: `src/db/`
- Contains: Database configuration and schema definitions
- Key files: `index.ts` (DB connection pool), `schema.ts` (Drizzle schema with all tables)

**Middleware Layer:**
- Location: `src/middleware/`
- Contains: Authorization and role-checking middleware
- Key files: `authorization.ts`

**Templates Layer:**
- Location: `src/templates/`
- Contains: HTML template helpers and components
- Key files: `html.ts`, `navbar.ts`, `sidebar.ts`, `footer.ts`, `common-scripts.ts`

**Utils Layer:**
- Location: `src/utils/`
- Contains: Utility functions
- Key files: `auth.ts` (JWT utilities, cookie parsing)

## Data Flow

**API Request Flow:**
1. Request hits route defined in `src/routes/*.ts`
2. Route handler extracts data, validates with Elysia type system
3. Authorization check via `getUserFromRequest()` or `requireRole()`
4. Repository function called (`src/repositories/*.ts`)
5. Repository executes DB query via Drizzle ORM (`src/db/index.ts`)
6. Response returned through route to client

**Authentication Flow:**
1. User submits login credentials to `/api/auth/login`
2. `src/routes/auth.ts` validates credentials
3. `src/services/auth.ts` verifies password, generates JWT
4. JWT stored in `pos_session` cookie
5. Subsequent requests use cookie for authentication
6. `src/utils/auth.ts` provides `getTokenFromCookies()` and `verifyToken()`

**Page Rendering Flow:**
1. Request hits page handler in `src/pages/*.ts`
2. Token extracted and verified via `src/utils/auth.ts`
3. Required data fetched from repositories
4. HTML template rendered using `src/templates/html.ts`
5. Full HTML response returned to browser

## Key Abstractions

**Role-Based Access Control:**
- Implementation: `src/middleware/authorization.ts`
- Roles: `super_admin`, `admin_restoran`, `kasir`, `waitress`, `chef`
- Pattern: `requireRole(allowedRoles)` middleware factory
- Usage in routes: `requireOrderCreate = () => requireRole(['super_admin', 'admin_restoran', 'kasir', 'waitress'])`

**JWT Authentication:**
- Implementation: `src/services/auth.ts` and `src/utils/auth.ts`
- Token stored in HTTP-only cookie (`pos_session`)
- Token payload includes: `userId`, `email`, `name`, `role`
- Expiration: 24 hours

**Payment Processing:**
- Implementation: `src/services/payment.ts`
- Pattern: Service function called from route handler
- Generates receipt text for printing

## Entry Points

**Main Server:**
- Location: `src/index.ts`
- Responsibilities: Initializes Elysia app, registers all routes and pages, serves static assets from `/styles` and `/pages`
- Port: `process.env.PORT || 3000`

**Route Aggregator:**
- Location: `src/routes/index.ts`
- Responsibilities: Combines all route modules with cookie plugin

## Error Handling

**Pattern:**
- Routes return error objects: `{ error: 'message' }`
- HTTP status codes used selectively (302 for redirect, 403 for unauthorized)
- Try/catch in async route handlers for DB errors

**Validation:**
- Elysia type system for request body validation
- Manual validation in route handlers for business logic

## Cross-Cutting Concerns

**Logging:** Console logging via `console.log` (no structured logging framework)

**Authentication:** JWT tokens with HTTP-only cookies

**Authorization:** Role-based middleware in `src/middleware/authorization.ts`

**Database Connection:** MySQL connection pool in `src/db/index.ts`

**Date Handling:** Uses Asia/Jakarta timezone for all date operations

---

*Architecture analysis: 2026-04-10*
