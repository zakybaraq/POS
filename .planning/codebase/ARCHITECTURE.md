# POS System Architecture

**Analysis Date:** 2026-04-12

## Pattern Overview

**Overall:** Layered N-tier REST architecture with domain-driven design

**Key Characteristics:**
- Clean separation between HTTP routes, business logic (services), and data access (repositories)
- Domain-focused repositories organized by functional area (orders, inventory, customers, employees)
- Transaction-aware operations for critical workflows (order completion with stock decrement, loyalty tracking)
- Role-based access control (RBAC) enforced at middleware layer
- Request-response cycle driven by Elysia web framework
- Database-first with Drizzle ORM providing type-safe queries and migrations

## Layers

**HTTP Routes Layer:**
- Purpose: Handle incoming requests, parse parameters, delegate to services, return responses
- Location: `src/routes/`
- Contains: Endpoint definitions for each business domain (orders, menus, tables, customers, inventory, kitchen, employees, etc.)
- Depends on: Services, repositories, authorization middleware, Zod validation
- Used by: Client applications (UI, POS terminals)
- Pattern: Elysia plugin pattern with prefix-based namespacing (e.g., `/api/orders`, `/api/inventory`)

**Services Layer:**
- Purpose: Business logic orchestration, cross-cutting concerns, complex calculations
- Location: `src/services/`
- Contains: `payment.ts` (payment processing, change calculation, receipt generation), `auth.ts` (JWT token management), `session.ts` (session handling)
- Depends on: Repositories, domain models
- Used by: Routes layer
- Pattern: Stateless service functions, pure functions for calculations

**Repositories Layer:**
- Purpose: Data access abstraction, database operations, domain-specific queries
- Location: `src/repositories/`
- Contains: One repository file per major domain entity
  - `order.ts` (order CRUD, status transitions, financial calculations)
  - `order-item.ts` (line items for orders)
  - `inventory.ts` (ingredients, recipes, stock movements, cost calculations)
  - `customer.ts` (customer profiles, loyalty points, tier management)
  - `employee.ts` (employee profiles, shifts, attendance)
  - `kitchen.ts` (kitchen order workflows, item status tracking)
  - `menu.ts` (menu items, availability)
  - `table.ts` (dining table management)
  - `supplier.ts` (supplier master data)
  - `purchase-orders.ts` (supplier purchase orders)
  - `user.ts` (system users, authentication)
  - `settings.ts` (business configuration)
  - `report.ts`, `financial-report.ts` (reporting queries)
  - `audit-log.ts` (audit trail)
  - `category.ts` (menu categories)
- Depends on: Drizzle ORM, database connection
- Used by: Services, routes
- Pattern: CRUD operations with specialized query methods, transaction-aware variants (e.g., `*Tx` functions)

**Middleware Layer:**
- Purpose: Cross-cutting request/response concerns, authentication, authorization
- Location: `src/middleware/`
- Contains: `authorization.ts` (JWT verification, role-based access control)
- Depends on: Utils/auth
- Used by: Routes
- Pattern: Middleware functions return early with redirects/errors if conditions not met

**Database Layer:**
- Purpose: Database connection pooling, ORM initialization, schema definition
- Location: `src/db/`
- Contains:
  - `index.ts` - Drizzle ORM instance with MySQL2 connection pool (5 connections)
  - `schema.ts` - All table definitions with relations, indexes, enums, and type exports
- Depends on: MySQL2, Drizzle ORM, environment configuration
- Used by: Repositories
- Pattern: Single exported `db` instance, relations defined with Drizzle `relations()`

**Template Layer (Server-Side Rendering):**
- Purpose: HTML page rendering, UI template generation
- Location: `src/templates/`, `src/pages/`
- Contains: HTML builders for common UI elements (navbar, sidebar, footer, scripts), page-specific templates
- Depends on: Elysia
- Used by: Routes (returns HTML responses)
- Pattern: String concatenation-based HTML generation

**Utils Layer:**
- Purpose: Helper functions, cross-cutting utilities
- Location: `src/utils/`
- Contains: `auth.ts` (JWT creation/verification, cookie parsing, token extraction)
- Depends on: jsonwebtoken, external libraries
- Used by: Services, middleware

## Data Flow

### Primary Order Management Flow

**Order Creation:**
1. Client → `POST /api/orders/with-items` (routes/orders.ts)
2. Route validates request, checks authorization
3. Route calls `orderRepo.createOrder()` (repositories/order.ts)
4. Order created with status='active', subtotal=0, tax=0
5. Returns new order with assigned ID

**Item Addition to Order:**
1. Client → `POST /api/order-items` (routes/orders.ts)
2. Route validates item and menu existence
3. Route calls `orderItemRepo.addItemToOrder()` (repositories/order-item.ts)
4. OrderItem created with priceAtOrder captured at time of addition
5. Route calls `orderRepo.calculateTotals()` (repositories/order.ts)
6. Totals recalculated: subtotal (sum of qty × priceAtOrder), tax (subtotal × 0.1), total = subtotal + tax

**Stock-Critical Order Completion Flow (TRANSACTIONAL):**
1. Client → `POST /api/orders/:id/payment` with amountPaid
2. Route calls `paymentService.processPayment(orderId, amountPaid)` (services/payment.ts)
3. Service validates: order status='active', amountPaid >= order.total
4. Service calls `orderRepo.completeOrder(orderId, amountPaid, markCompleted=true)` (repositories/order.ts)
5. **TRANSACTION BEGINS:**
   - Update order: status='completed', amountPaid, changeDue, completedAt=now
   - Call `inventoryRepo.decrementStockForOrderTx(tx, orderId)` **WITHIN SAME TRANSACTION**
     - Fetch all orderItems for the order
     - For each item: find recipes (ingredient requirements)
     - For each ingredient: validate sufficient stock, decrement, create stockMovement record
     - If insufficient stock → throw error → **ENTIRE TRANSACTION ROLLS BACK**
   - If customer attached to order: call `customerRepo.updateCustomerVisitTx(tx, customerId, total)` and `customerRepo.addLoyaltyPointsTx(tx, customerId, points, orderId)`
   - **TRANSACTION COMMITS** - all operations atomic
6. Return completed order to client

**Key Transaction Properties:**
- **Atomicity:** Stock, order status, customer loyalty all succeed or all fail together
- **Consistency:** Stock never decremented if order completion fails; inventory counts always accurate
- **Isolation:** Multiple payment requests for same order won't cause race conditions (order status check prevents)
- **Durability:** MySQL persists after transaction commit

### Kitchen Workflow Flow

1. Order created with status='active', kitchenStatus='pending'
2. Kitchen staff views active orders → `GET /api/kitchen/orders`
3. Staff marks order as cooking → `PATCH /api/kitchen/orders/:id` with kitchenStatus='cooking', cookingStartedAt=now
4. Items prepared, staff marks ready → `PATCH /api/kitchen/orders/:id` with kitchenStatus='ready', readyAt=now
5. Waitress serves to customer → `PATCH /api/kitchen/orders/:id` with kitchenStatus='served'
6. Payment processed → order transitions to status='completed'

### Inventory Management Flow

1. Admin views ingredients → `GET /api/inventory/ingredients`
2. Ingredients show currentStock vs minStock
3. If currentStock < minStock, flagged in UI for reordering
4. Admin creates purchase order with supplier → `POST /api/purchase-orders`
5. Items received → update stockMovement type='in', increment currentStock
6. When order completed (payment processed) → stock automatically decremented via decrementStockForOrderTx

### Customer Loyalty Flow

1. During order completion (in transaction), if customerId attached:
   - Calculate loyalty points earned: floor(order.total × 0.01)
   - Insert loyaltyTransaction record with type='earn', points, referenceId=orderId
   - Increment customer.loyaltyPoints by points
   - Update customer tier based on totalSpent:
     - regular: any
     - silver: totalSpent >= 1,000,000
     - gold: totalSpent >= 5,000,000
2. Customer can redeem points → decrements loyaltyPoints, logs redemption transaction

### Employee Shift & Attendance Flow

1. Employee clocks in → `POST /api/shifts/clock-in` creates attendance record
2. Shift opened → `POST /api/shifts/open` with startingCash (opening balance)
3. Orders processed by this employee throughout shift → orders.userId links to employee
4. Shift closed → `POST /api/shifts/:id/close` with actualCash
5. System calculates: expectedCash = startingCash + totalSalesInShift
6. Compares actualCash vs expectedCash, logs difference

## State Management

**Order Lifecycle States:**
- `draft` (initial, not used actively)
- `active` (items being added)
- `completed` (payment processed, stock decremented)
- `cancelled` (order voided)

**Kitchen Item States:**
- `pending` (awaiting cooking)
- `cooking` (on stove)
- `ready` (complete, waiting service)
- `served` (delivered to customer)

**Kitchen Order States:**
- `pending` (not started)
- `cooking` (preparation in progress)
- `ready` (food ready for service)
- `served` (delivered to customer)

**Table Status:**
- `available` (no active order)
- `occupied` (has active order)

**Shift Status:**
- `open` (cashier on duty)
- `closed` (shift ended, reconciled)

## Key Abstractions

**Order Entity:**
- Purpose: Central revenue document, tracks transaction lifecycle
- Examples: `src/repositories/order.ts`, `src/routes/orders.ts`
- Pattern: Status-driven state machine, contains computed totals (subtotal, tax, total)
- Relations: 1:N orderItems, M:1 table, M:1 user, 1:N stockMovements (via reference)

**OrderItem Entity:**
- Purpose: Line item for orders, captures menu prices at order time
- Examples: `src/repositories/order-item.ts`
- Pattern: Immutable price capture (priceAtOrder), quantity variable
- Relations: M:1 order, M:1 menu

**Recipe Entity:**
- Purpose: Maps menu items to ingredient requirements
- Examples: `src/repositories/inventory.ts`
- Pattern: Specifies quantity needed per menu item for production
- Relations: M:1 menu, M:1 ingredient
- Cardinality: Single menu can have multiple ingredients (M:N via recipes)

**StockMovement Entity:**
- Purpose: Audit trail for all inventory changes
- Examples: `src/repositories/inventory.ts`
- Pattern: Immutable log of every stock change with before/after values
- Types: 'in' (purchase received), 'out' (used in order), 'adjustment' (manual correction), 'waste' (spoilage)
- Reference tracking: referenceId links to originating order/PO for traceability

**Customer Entity:**
- Purpose: Loyalty tracking, repeat customer identification
- Examples: `src/repositories/customer.ts`
- Pattern: Tracks lifetime value (totalSpent, totalVisits), loyalty tier
- Relations: 1:N loyaltyTransactions, 1:N orders

**Employee Entity:**
- Purpose: Staff management, shift tracking, attendance
- Examples: `src/repositories/employee.ts`
- Pattern: 1:1 relationship with user (employment details separate from login account)
- Relations: 1:N shifts, 1:N attendance, M:1 user

## Entry Points

**Server Start:**
- Location: `src/index.ts`
- Triggers: `npm run dev` or `bun run src/index.ts`
- Responsibilities:
  - Initialize Elysia app
  - Mount cookie middleware
  - Register all route plugins (routes/*)
  - Register all page plugins (pages/*)
  - Seed default settings and categories on startup
  - Listen on PORT (default 3000)
  - Serve static CSS files from `/styles/:path`
  - Serve page scripts from `/pages/:path`

**HTTP Route Examples:**
- `GET /health` - Liveness probe
- `GET /api/orders/today` - List today's orders
- `POST /api/orders/with-items` - Create order with initial items
- `POST /api/orders/:id/payment` - Process payment, trigger stock decrement
- `GET /api/kitchen/orders` - List active kitchen orders
- `PATCH /api/kitchen/orders/:id` - Update kitchen status
- `GET /api/inventory/ingredients` - List ingredients with stock levels
- `POST /api/inventory/stock-movement` - Manual stock adjustment
- `GET /api/customers/:id` - Fetch customer with loyalty history
- `POST /api/employees/shifts/open` - Open new shift
- `GET /pages/:path` - Fetch page-specific JavaScript

## Error Handling

**Strategy:** Synchronous error handling with transaction rollback

**Patterns:**
- Route layer: Return `{ error: 'message' }` JSON for validation failures
- Service layer: Throw Error objects with descriptive messages; caller catches and returns to client
- Repository layer (transactional): Throw Error objects; Drizzle transaction context automatically rolls back
- Database errors: MySQL errors bubble up as exceptions, caught at service layer

**Examples:**
- Insufficient stock → `decrementStockForOrderTx` throws → transaction rolls back → order remains active, payment returns error
- Invalid role → `requireRole()` middleware returns 403 Forbidden
- Unauthorized request → `getUserFromRequest()` returns null → route returns `{ error: 'Unauthorized' }`
- Validation failure → Zod schema validation fails → route returns error

## Cross-Cutting Concerns

**Logging:** 
- Approach: `console.error()` and `console.log()` for critical events
- Patterns: Error on failed stock decrement, log on skipped operations (idempotent checks)
- Location: Throughout repositories and services

**Validation:**
- Approach: Zod schemas at route layer for request body/parameters
- Patterns: `body: t.Object({ ... })` in Elysia route definitions
- Example: `orderRoutes.post('/', ..., { body: t.Object({ tableId: t.Number(), userId: t.Number() }) })`

**Authentication:**
- Approach: JWT tokens stored in cookies, verified per request
- Patterns: `getTokenFromCookies()` extracts from request, `verifyToken()` validates signature
- Flow: Login creates token → stored in httpOnly cookie → included in subsequent requests
- Location: `src/utils/auth.ts`, `src/middleware/authorization.ts`

**Authorization:**
- Approach: Role-based access control (RBAC)
- Roles: super_admin, admin_restoran, kasir, waitress, chef
- Patterns: `requireRole(['kasir', 'admin_restoran'])` middleware, `getUserFromRequest()` gets current user
- Example: Order payment restricted to kasir/admin roles

**Multi-Tenancy (Business Settings):**
- Approach: Single-instance (per restaurant deployment)
- Customization: `businessSettings`, `taxSettings`, `receiptSettings`, `operatingHours` tables
- Pattern: Settings loaded per request, not cached

---

*Architecture analysis: 2026-04-12*
