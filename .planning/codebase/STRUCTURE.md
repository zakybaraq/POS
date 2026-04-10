# Codebase Structure

**Analysis Date:** 2026-04-10

## Directory Layout

```
/Users/zakybaraq/Desktop/pos/
├── src/
│   ├── index.ts              # Main server entry point
│   ├── routes/                # API routes (controllers)
│   ├── pages/                 # Server-rendered page handlers
│   ├── repositories/          # Data access layer
│   ├── services/              # Business logic
│   ├── db/                    # Database configuration and schema
│   ├── templates/              # HTML templates and components
│   ├── middleware/            # Middleware functions
│   ├── utils/                 # Utility functions
│   └── public/                # Static assets
├── drizzle/                   # Database migrations
├── package.json               # Dependencies
└── tsconfig.json              # TypeScript config
```

## Directory Purposes

**src/routes/:**
- Purpose: API route handlers (controller logic)
- Contains: Route definitions with embedded business logic
- Key files: `orders.ts`, `menus.ts`, `tables.ts`, `auth.ts`, `users.ts`, `dashboard.ts`, `inventory.ts`, `customers.ts`, `reports.ts`, `settings.ts`, `suppliers.ts`, `purchase-orders.ts`, `employees.ts`, `shifts.ts`, `attendance.ts`, `kitchen.ts`, `categories.ts`, `audit-log.ts`

**src/pages/:**
- Purpose: Server-side rendered page handlers
- Contains: HTML page generation with embedded data fetching
- Key files: `pos.ts`, `dashboard.ts`, `menu.ts`, `categories.ts`, `tables.ts`, `orders.ts`, `products.ts`, `customers.ts`, `inventory.ts`, `reports.ts`, `settings.ts`, `suppliers.ts`, `purchase-orders.ts`, `employees.ts`, `shifts.ts`, `attendance.ts`, `kitchen.ts`, `admin.ts`, `auth.ts`

**src/repositories/:**
- Purpose: Data access layer - all database queries and CRUD operations
- Contains: Database access functions using Drizzle ORM
- Key files: `order.ts`, `menu.ts`, `table.ts`, `user.ts`, `customer.ts`, `inventory.ts`, `report.ts`, `employee.ts`, `category.ts`, `supplier.ts`, `settings.ts`, `kitchen.ts`, `audit-log.ts`, `order-item.ts`

**src/services/:**
- Purpose: Business logic - authentication, payment processing
- Contains: Core business operations
- Key files: `auth.ts` (JWT token management, login/register), `payment.ts` (payment processing, receipt generation), `session.ts` (session cookie management)

**src/db/:**
- Purpose: Database configuration and schema
- Contains: Connection pool, Drizzle ORM schema definitions
- Key files: `index.ts` (MySQL connection pool using mysql2), `schema.ts` (all table definitions)

**src/templates/:**
- Purpose: HTML template utilities
- Contains: HTML response helpers, reusable UI components
- Key files: `html.ts` (main HTML response wrapper), `navbar.ts`, `sidebar.ts`, `footer.ts`, `common-scripts.ts`

**src/middleware/:**
- Purpose: Request middleware functions
- Contains: Authorization and role-based access control
- Key files: `authorization.ts` (role checking middleware)

**src/utils/:**
- Purpose: Utility functions
- Contains: JWT utilities, cookie parsing
- Key files: `auth.ts` (JWT verify, token extraction)

**src/public/:**
- Purpose: Static assets served to browser
- Contains: CSS stylesheets
- Structure: `src/public/styles/` - CSS files (`global.css`, `pos.css`, `variables.css`)

## Key File Locations

**Entry Points:**
- `src/index.ts`: Main server - initializes Elysia, registers all routes and pages

**API Routes:**
- `src/routes/index.ts`: Aggregator that combines all route modules
- Individual route files in `src/routes/` directory

**Page Handlers:**
- Individual page files in `src/pages/` directory
- Each file exports an Elysia plugin with GET handlers

**Configuration:**
- `src/db/index.ts`: Database connection configuration
- `src/db/schema.ts`: Database schema (Drizzle ORM)
- `package.json`: Dependencies and scripts
- `tsconfig.json`: TypeScript configuration
- `drizzle.config.ts`: Drizzle migration configuration

**Core Logic:**
- Repositories in `src/repositories/` - data access
- Services in `src/services/` - business logic layer
- Routes in `src/routes/` - API handlers that orchestrate repositories

## Naming Conventions

**Files:**
- Route files: `{entity}.ts` (e.g., `orders.ts`, `menus.ts`)
- Repository files: `{entity}.ts` (same as routes)
- Page files: `{page}.ts` (e.g., `pos.ts`, `dashboard.ts`)
- Service files: `{service}.ts` (e.g., `auth.ts`, `payment.ts`)

**Directories:**
- Lowercase plural: `routes`, `pages`, `repositories`, `services`, `utils`

**Functions:**
- Repository functions: `camelCase`, action-oriented (e.g., `getOrdersToday()`, `createOrder()`)
- Service functions: `camelCase` (e.g., `login()`, `processPayment()`)

## Where to Add New Code

**New API Endpoint:**
- Create new file in `src/routes/` (e.g., `src/routes/reservations.ts`)
- Import and register in `src/routes/index.ts`
- Use repository functions for data access

**New Page:**
- Create new file in `src/pages/` (e.g., `src/pages/reports.ts`)
- Import and register in `src/index.ts`
- Use HTML template from `src/templates/html.ts`

**New Data Access:**
- Create new file in `src/repositories/` (e.g., `src/repositories/reservation.ts`)
- Use Drizzle ORM with schema from `src/db/schema.ts`

**New Business Logic:**
- Create new file in `src/services/` (e.g., `src/services/notification.ts`)
- Call from route handlers, use repository functions

**New Utility:**
- Add to appropriate file in `src/utils/` or create new file

**New Database Table:**
- Add schema to `src/db/schema.ts`
- Create migration in `drizzle/` directory
- Create repository in `src/repositories/`

## Special Directories

**drizzle/:**
- Purpose: Database migrations
- Contains: SQL migration files, schema snapshots
- Generated: Yes (via drizzle-kit CLI)

**src/public/styles/:**
- Purpose: Static CSS files served to browser
- Key files: `global.css`, `pos.css`, `variables.css`
- Served via `/styles/:path` route in `src/index.ts`

---

*Structure analysis: 2026-04-10*
