# Codebase Structure

**Analysis Date:** 2026-04-12

## Directory Layout

```
/Users/zakybaraq/Desktop/pos/
├── src/                              # Source code root
│   ├── index.ts                       # Elysia app bootstrap, route/page plugin registration
│   ├── db/                            # Database layer
│   │   ├── index.ts                   # Drizzle ORM instance, MySQL connection pool
│   │   └── schema.ts                  # All table definitions, enums, relations, types
│   ├── middleware/                    # Request/response middleware
│   │   └── authorization.ts           # JWT verification, role-based access control
│   ├── routes/                        # HTTP API endpoints (REST)
│   │   ├── index.ts                   # Route aggregator, mounts all domain routes
│   │   ├── orders.ts                  # Order lifecycle (create, add items, payment, status)
│   │   ├── order-items.ts             # Line item management
│   │   ├── menus.ts                   # Menu item CRUD
│   │   ├── tables.ts                  # Table management
│   │   ├── kitchen.ts                 # Kitchen workflow (order status, item status)
│   │   ├── customers.ts               # Customer CRUD, loyalty points
│   │   ├── inventory.ts               # Ingredients, recipes, stock movements
│   │   ├── suppliers.ts               # Supplier master data
│   │   ├── purchase-orders.ts         # Supplier purchase order management
│   │   ├── employees.ts               # Employee profiles
│   │   ├── shifts.ts                  # Shift open/close, cash reconciliation
│   │   ├── attendance.ts              # Employee check-in/check-out
│   │   ├── users.ts                   # User account management
│   │   ├── auth.ts                    # Login, logout, token management
│   │   ├── dashboard.ts               # Dashboard metrics endpoint
│   │   ├── reports.ts                 # Sales/financial reporting
│   │   ├── settings.ts                # Business settings, tax, payment methods
│   │   ├── categories.ts              # Menu categories
│   │   ├── audit-log.ts               # Audit trail queries
│   └── repositories/                  # Data access layer (domain repositories)
│   │   ├── order.ts                   # Order CRUD, status transitions, totals, completion with transaction
│   │   ├── order-item.ts              # OrderItem CRUD
│   │   ├── menu.ts                    # Menu CRUD
│   │   ├── table.ts                   # Table CRUD, status management
│   │   ├── kitchen.ts                 # Kitchen-specific queries (active orders, items, stats)
│   │   ├── customer.ts                # Customer CRUD, loyalty (earn/redeem points, tier updates)
│   │   ├── inventory.ts               # Ingredients, recipes, stock movements, cost calculations
│   │   │                               # CRITICAL: decrementStockForOrderTx() for transactional stock decrement
│   │   ├── supplier.ts                # Supplier CRUD
│   │   ├── user.ts                    # User CRUD, password hashing
│   │   ├── employee.ts                # Employee profiles, shifts, attendance, payroll
│   │   ├── settings.ts                # Business settings, tax, payment methods, receipts
│   │   ├── category.ts                # Menu categories, seed defaults
│   │   ├── audit-log.ts               # Audit log queries
│   │   ├── report.ts                  # Sales reports (by category, time range, etc.)
│   │   └── financial-report.ts        # Financial summaries (daily, monthly)
│   ├── services/                      # Business logic orchestration
│   │   ├── auth.ts                    # JWT token creation/verification, login logic
│   │   ├── payment.ts                 # Payment processing, change calculation, receipt generation
│   │   └── session.ts                 # Session management
│   ├── pages/                         # Server-side rendered pages (HTML templates)
│   │   ├── auth.ts                    # Login/register page HTML
│   │   ├── dashboard.ts               # Dashboard page HTML
│   │   ├── pos.ts                     # POS (Point of Sale) page HTML
│   │   ├── admin.ts                   # Admin settings page HTML
│   │   ├── menu.ts                    # Menu management page HTML
│   │   ├── categories.ts              # Category management page HTML
│   │   ├── tables.ts                  # Table management page HTML
│   │   ├── orders.ts                  # Orders list page HTML
│   │   ├── products.ts                # Products/menu items page HTML
│   │   ├── inventory.ts               # Inventory page HTML
│   │   ├── customers.ts               # Customers page HTML
│   │   ├── reports.ts                 # Reports page HTML
│   │   ├── settings.ts                # Settings page HTML
│   │   ├── suppliers.ts               # Suppliers page HTML
│   │   ├── purchase-orders.ts         # Purchase orders page HTML
│   │   ├── employees.ts               # Employees page HTML
│   │   ├── shifts.ts                  # Shifts page HTML
│   │   ├── attendance.ts              # Attendance page HTML
│   │   └── kitchen.ts                 # Kitchen display system (KDS) page HTML
│   ├── templates/                     # Reusable HTML components
│   │   ├── html.ts                    # HTML document wrapper
│   │   ├── navbar.ts                  # Top navigation bar
│   │   ├── sidebar.ts                 # Left sidebar navigation
│   │   ├── footer.ts                  # Footer component
│   │   └── common-scripts.ts          # Shared JavaScript includes
│   ├── utils/                         # Utility functions
│   │   └── auth.ts                    # JWT creation/verification, cookie parsing, token extraction
│   ├── public/                        # Static assets
│   │   └── styles/                    # CSS stylesheets
│   └── index.ts                       # Entry point (see above)
├── drizzle/                           # Database migrations generated by Drizzle
│   └── (migration files)
├── .planning/                         # Project planning directory
│   ├── codebase/                      # Codebase analysis documents
│   │   ├── ARCHITECTURE.md            # This file (system design, layers, data flow)
│   │   └── STRUCTURE.md               # Directory organization, module responsibilities
│   └── (other planning files)
├── package.json                       # NPM dependencies, scripts
├── tsconfig.json                      # TypeScript configuration
├── drizzle.config.ts                  # Drizzle migration configuration
├── .env                               # Environment variables (secrets, DB connection)
└── .env.example                       # Environment template (no secrets)
```

## Directory Purposes

**src/db/**
- Purpose: Database initialization and schema definition
- Contains: Drizzle ORM instance, MySQL connection pool, all table schemas with relationships
- Key files: `index.ts` (db export), `schema.ts` (entities)
- Generated: No
- Committed: Yes

**src/middleware/**
- Purpose: Cross-cutting request/response concerns
- Contains: Authorization middleware (JWT verification, role checking)
- Key files: `authorization.ts` (RBAC enforcement)
- Generated: No
- Committed: Yes

**src/routes/**
- Purpose: HTTP endpoint definitions for all business domains
- Contains: 15+ route handlers, one per domain area
- Key files: `index.ts` (route aggregator), `orders.ts` (core order API)
- Generated: No
- Committed: Yes
- Pattern: Each route file exports a named Elysia instance (e.g., `orderRoutes`), aggregated in `index.ts`

**src/repositories/**
- Purpose: Data access abstraction and domain-specific queries
- Contains: 15+ repository files, one per major entity
- Key files: `order.ts` (order lifecycle, critical transaction), `inventory.ts` (stock management)
- Generated: No
- Committed: Yes
- Pattern: CRUD operations + specialized queries, repository functions are async, transaction-aware variants suffixed with `Tx`

**src/services/**
- Purpose: Business logic, orchestration, cross-cutting calculations
- Contains: Payment processing, authentication, session management
- Key files: `payment.ts` (charge calculation, receipt), `auth.ts` (JWT token management)
- Generated: No
- Committed: Yes
- Pattern: Stateless functions, delegating to repositories, throwing errors for exceptional cases

**src/pages/**
- Purpose: Server-side HTML page rendering
- Contains: 15+ page templates for all management interfaces
- Key files: `auth.ts` (login page), `pos.ts` (main POS interface), `kitchen.ts` (kitchen display)
- Generated: No
- Committed: Yes
- Pattern: Export named page functions, called by corresponding route in index.ts

**src/templates/**
- Purpose: Reusable HTML components and layout scaffolding
- Contains: Common page elements (navbar, sidebar, footer, script tags)
- Key files: `html.ts` (document wrapper), `sidebar.ts` (navigation)
- Generated: No
- Committed: Yes
- Pattern: String concatenation HTML builders, composed into pages

**src/utils/**
- Purpose: Helper functions, utility logic
- Contains: Authentication utilities (JWT, cookie parsing)
- Key files: `auth.ts` (token lifecycle)
- Generated: No
- Committed: Yes

**src/public/**
- Purpose: Static assets served by web server
- Contains: CSS stylesheets
- Generated: Possibly (if build step)
- Committed: Yes

**drizzle/**
- Purpose: Database migration history
- Contains: Generated migration files from Drizzle Kit
- Generated: Yes (by `bun db:generate`)
- Committed: Yes (migrations are committed, not output artifacts)

## Key File Locations

**Entry Points:**
- `src/index.ts` - Server startup, Elysia app initialization, plugin registration, listens on PORT

**Configuration:**
- `src/db/index.ts` - Database connection (MySQL2 pool, 5 connections)
- `src/db/schema.ts` - Complete data model (all tables, relationships, enums)
- `package.json` - Dependencies (Elysia, Drizzle, JWT, bcryptjs)

**Core Logic - Order Management:**
- `src/repositories/order.ts` - Order CRUD, critical `completeOrder()` with transactional stock decrement
- `src/routes/orders.ts` - Order endpoints (create, fetch, add items, payment)
- `src/services/payment.ts` - Payment processing orchestration

**Core Logic - Inventory:**
- `src/repositories/inventory.ts` - Ingredients, recipes, stock movements; `decrementStockForOrderTx()` for transaction
- `src/routes/inventory.ts` - Inventory endpoints
- Database schema: `src/db/schema.ts` tables: `ingredients`, `recipes`, `stockMovements`

**Core Logic - Kitchen:**
- `src/repositories/kitchen.ts` - Active orders, order items by category, kitchen stats
- `src/routes/kitchen.ts` - Kitchen workflow endpoints
- Database schema: `src/db/schema.ts` table: `orders` (kitchenStatus field)

**Core Logic - Customers & Loyalty:**
- `src/repositories/customer.ts` - Customer CRUD, loyalty earn/redeem, tier updates
- `src/routes/customers.ts` - Customer endpoints
- Database schema: `src/db/schema.ts` tables: `customers`, `loyaltyTransactions`

**Core Logic - Employees & Shifts:**
- `src/repositories/employee.ts` - Employee profiles, shifts, attendance, payroll
- `src/routes/employees.ts`, `src/routes/shifts.ts`, `src/routes/attendance.ts` - Employee management endpoints
- Database schema: `src/db/schema.ts` tables: `employeeProfiles`, `shifts`, `attendance`

**Authentication & Authorization:**
- `src/utils/auth.ts` - JWT creation, verification, token extraction from cookies
- `src/services/auth.ts` - Login logic, session handling
- `src/middleware/authorization.ts` - Role-based access control, requireRole middleware
- Routes use: `requireRole(['role1', 'role2'])` middleware

## Naming Conventions

**Files:**
- Repository files: `{entity}.ts` (e.g., `order.ts`, `customer.ts`)
- Route files: `{entity}.ts` or `{feature}.ts` (e.g., `orders.ts`, `auth.ts`)
- Page files: `{feature}.ts` or `{page-name}.ts` (e.g., `pos.ts`, `dashboard.ts`)
- Service files: `{service-name}.ts` (e.g., `payment.ts`, `auth.ts`)

**Directories:**
- All lowercase: `routes/`, `repositories/`, `services/`, `middleware/`, `utils/`, `pages/`, `templates/`, `db/`

**Functions:**
- Repository CRUD: `get{Entity}()`, `get{Entity}ById()`, `create{Entity}()`, `update{Entity}()`, `delete{Entity}()`
- Repository specialized: `getActive{Entity}()`, `get{Entity}sByCondition()`, `{verb}{Entity}()` (e.g., `incrementStock()`)
- Transaction variants: Suffixed with `Tx` (e.g., `decrementStockForOrderTx()`, `addLoyaltyPointsTx()`)
- Routes: HTTP verb lowercase (e.g., `.post()`, `.get()`, `.patch()`)

**Types:**
- Inferred from Drizzle: `User`, `Order`, `Customer` (from schema)
- Drizzle insert types: `NewUser`, `NewOrder`, `NewCustomer` (prefixed with `New`)
- All exported from `src/db/schema.ts`

**Path Aliases:**
- None configured; full relative paths used (e.g., `'../db/index'`, `'../repositories/order'`)

## Where to Add New Code

**New Feature (e.g., Discount Management):**
- Primary code: 
  - Table & types: `src/db/schema.ts` (add discount table, relations)
  - Repository: `src/repositories/discount.ts` (CRUD + domain logic)
  - Routes: `src/routes/discounts.ts` (endpoints)
  - Page: `src/pages/discounts.ts` (UI template)
  - Template: Shared elements in `src/templates/` if reusable
- Tests: None (no test framework configured)

**New Component/Module (e.g., Receipt Printer Integration):**
- Implementation: `src/services/receipt-printer.ts` (new service)
- Integration: Called from existing services/routes
- Routes: May add endpoint to trigger printing
- Example: Called from `paymentService.processPayment()`

**Utilities/Helpers (e.g., DateFormatter):**
- Shared helpers: `src/utils/dates.ts` (new file)
- Domain-specific: Keep in domain repository if closely coupled

**New Middleware (e.g., Rate Limiting):**
- Implementation: `src/middleware/rate-limiting.ts`
- Registration: Added in `src/routes/index.ts` at top level
- Example: `.use(rateLimiting())`

## Special Directories

**`drizzle/`:**
- Purpose: Database migration history
- Generated: Yes (by `bun db:generate`)
- Committed: Yes
- Usage: Never manually edit; Drizzle Kit generates based on schema changes
- Run after schema changes: `bun db:generate` (creates migration), `bun db:push` (applies to DB)

**`src/public/`:**
- Purpose: Static assets served directly
- Generated: No (but could contain build output)
- Committed: Yes
- Usage: CSS in `styles/` subdirectory, served via `GET /styles/:path` route

**`.planning/`:**
- Purpose: Project planning and codebase analysis documents
- Generated: Yes (by GSD commands)
- Committed: Yes (as project reference)
- Contains: ROADMAP.md, phase plans, codebase analysis (ARCHITECTURE.md, STRUCTURE.md, etc.)

## Module Responsibilities & Public APIs

### Repository Modules (`src/repositories/`)

**`order.ts` Public API:**
```typescript
export async function createOrder(tableId: number | null, userId: number, customerId?: number)
export async function getOrderById(id: number)
export async function getActiveOrderByTableId(tableId: number)
export async function updateOrderStatus(id: number, status: 'draft' | 'active' | 'completed' | 'cancelled')
export async function updateOrderTotals(id: number, subtotal: number, tax: number, total: number)
export async function completeOrder(id: number, amountPaid: number, markCompleted: boolean = true)
  // CRITICAL: Transactional, includes decrementStockForOrderTx() call
export async function calculateTotals(orderId: number)
```

**`inventory.ts` Public API:**
```typescript
export async function getAllIngredients()
export async function getRecipesByMenuId(menuId: number)
export async function createRecipe(data: NewRecipe)
export async function adjustStock(ingredientId: number, quantity: number, type: 'in'|'out'|'adjustment'|'waste', reason: string, userId?: number, referenceId?: number)
export async function decrementStockForOrderTx(tx: any, orderId: number)
  // CRITICAL: Only called within transaction from order.completeOrder()
export async function getStockMovements(ingredientId?: number, limit: number = 50)
```

**`customer.ts` Public API:**
```typescript
export async function getAllCustomers()
export async function getCustomerById(id: number)
export async function createCustomer(data: NewCustomer)
export async function updateCustomer(id: number, data: Partial<NewCustomer>)
export async function addLoyaltyPoints(customerId: number, points: number, orderId?: number)
export async function addLoyaltyPointsTx(tx: any, customerId: number, points: number, orderId?: number)
export async function redeemLoyaltyPoints(customerId: number, points: number, reason?: string)
export async function getLoyaltyTransactions(customerId: number, limit: number = 20)
```

**`kitchen.ts` Public API:**
```typescript
export async function getActiveKitchenOrders()
export async function getKitchenOrderItems(orderId: number)
export async function updateKitchenStatus(orderId: number, status: 'cooking'|'ready'|'served')
export async function getKitchenStats()
```

**`employee.ts` Public API:**
```typescript
export async function getAllEmployees()
export async function getOpenShift(userId: number)
export async function openShift(userId: number, startingCash: number, notes?: string)
export async function closeShift(shiftId: number, actualCash: number, closedBy: number, notes?: string)
export async function clockIn(userId: number, status: 'present'|'late'|'absent'|'leave'|'sick')
export async function clockOut(attendanceId: number, totalHours: number)
```

### Service Modules (`src/services/`)

**`payment.ts` Public API:**
```typescript
export function calculateChange(total: number, amountPaid: number): number
export async function processPayment(orderId: number, amountPaid: number)
  // CRITICAL: Calls orderRepo.completeOrder() which triggers stock decrement
export function generateReceipt(order: Order, items: any[], tableNumber: number): string
```

**`auth.ts` Public API:**
```typescript
export async function authenticateUser(email: string, password: string)
export function generateToken(userId: number, email: string, role: string): string
```

### Middleware Modules (`src/middleware/`)

**`authorization.ts` Public API:**
```typescript
export function requireRole(allowedRoles: string[])
  // Returns middleware that validates JWT and checks role
export function getUserFromRequest(cookie: any, headers: any): TokenPayload | null
export const requireAdmin = () => requireRole(['super_admin', 'admin_restoran'])
export const requirePosAccess = () => requireRole(['super_admin', 'admin_restoran', 'kasir'])
```

### Utils Modules (`src/utils/`)

**`auth.ts` Public API:**
```typescript
export function getTokenFromCookies(cookie: any, headers: any): string | null
export function verifyToken(token: string): TokenPayload
export function createToken(payload: TokenPayload): string
export interface TokenPayload { userId: number; email: string; role: string }
```

---

*Structure analysis: 2026-04-12*
