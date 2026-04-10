# Architecture

**Analysis Date:** 2026-04-11

## Pattern Overview

**Overall:** Layered MVC-inspired architecture using Elysia.js (Bun web framework) with clear separation between presentation, business logic, and data layers.

**Key Characteristics:**
- Request flows through routes → pages (rendering) and API endpoints
- Service layer handles business logic (e.g., payment processing)
- Repository layer abstracts database operations with Drizzle ORM
- Middleware handles authentication and authorization
- Database: SQLite with schema-first approach (Drizzle)

## Layers

**Pages Layer (Presentation/Views):**
- Purpose: HTML rendering and server-side page generation
- Location: `src/pages/`
- Contains: Page components that render full HTML responses with embedded templates
- Depends on: Templates, Repositories, Utils (auth)
- Used by: Main app entry point (`src/index.ts`)
- Key files:
  - `src/pages/orders.ts` - Orders management page
  - `src/pages/inventory.ts` - Inventory/stock management page
  - `src/pages/menu.ts` - Menu item management
  - `src/pages/pos.ts` - Point of sale terminal UI
  - `src/pages/admin.ts` - Administrative dashboard
  - Auth pages: `src/pages/auth.ts`

**Routes/API Layer:**
- Purpose: HTTP endpoint definitions, request parsing, response formatting
- Location: `src/routes/`
- Contains: REST API handlers for all business domains
- Depends on: Services, Repositories, Middleware (authorization)
- Used by: Main app setup
- Pattern: Each domain has its own route file (e.g., `orders.ts`, `inventory.ts`, `menus.ts`)
- Key routes:
  - `/api/orders` - Order CRUD, payment processing
  - `/api/inventory` - Ingredient management, recipes, stock movements
  - `/api/menus` - Menu items and categories
  - `/api/tables` - Table management
  - `/api/auth` - Authentication endpoints

**Services Layer (Business Logic):**
- Purpose: Complex business logic and cross-cutting concerns
- Location: `src/services/`
- Contains: Payment processing, session management, auth logic
- Depends on: Repositories
- Used by: Routes
- Key services:
  - `src/services/payment.ts` - Payment calculation and order completion logic
  - `src/services/auth.ts` - JWT token generation and validation
  - `src/services/session.ts` - Session management

**Repository Layer (Data Access):**
- Purpose: Database abstraction - all database operations centralized here
- Location: `src/repositories/`
- Contains: CRUD operations and queries for each entity
- Depends on: Database (`src/db/`)
- Used by: Routes, Services, Pages
- Key repositories:
  - `src/repositories/order.ts` - Order queries, creation, status updates, completion
  - `src/repositories/inventory.ts` - Ingredient CRUD, recipe management, stock movements
  - `src/repositories/order-item.ts` - Order line items
  - `src/repositories/menu.ts` - Menu items
  - `src/repositories/table.ts` - Table management
  - `src/repositories/category.ts` - Menu categories
  - `src/repositories/user.ts` - User management
  - `src/repositories/supplier.ts` - Supplier management
  - `src/repositories/customer.ts` - Customer profiles

**Database Layer:**
- Purpose: Database connection, schema definition
- Location: `src/db/`
- Contains:
  - `src/db/index.ts` - Database connection setup with Drizzle
  - `src/db/schema.ts` - Complete schema definitions (429 lines)
- Provides: Drizzle ORM instance for queries

**Templates Layer (HTML/UI):**
- Purpose: Reusable HTML fragments for page composition
- Location: `src/templates/`
- Contains: Common UI components (navbar, sidebar, footer, etc.)
- Used by: Pages layer
- Key templates:
  - `src/templates/navbar.ts` - Navigation bar HTML
  - `src/templates/sidebar.ts` - Sidebar navigation
  - `src/templates/footer.ts` - Footer component
  - `src/templates/html.ts` - Main HTML wrapper
  - `src/templates/common-scripts.ts` - Shared JavaScript

**Middleware Layer (Cross-Cutting Concerns):**
- Purpose: Request authentication, authorization, role-based access control
- Location: `src/middleware/`
- Contains:
  - `src/middleware/authorization.ts` - Role checking, permission validation
- Used by: Routes (via `onBeforeHandle` or direct checks)

**Utilities Layer:**
- Purpose: Helper functions and shared utilities
- Location: `src/utils/`
- Contains:
  - `src/utils/auth.ts` - JWT token handling, cookie parsing
  - `src/utils/session.ts` - Session utilities


## Data Flow

**Order Creation & Payment Flow:**

1. User accesses POS terminal (`/pos`) → Page renders interactive UI
2. User adds menu items to order → Frontend calls `/api/orders/table/:id/items` (POST)
3. Route receives request → Calls `orderItemRepo.addItem()`
4. Repository inserts item, calls `orderRepo.calculateTotals()` → Database updated
5. User clicks "Pay" → Frontend calls `/api/orders/:id/complete` (POST)
6. Route → Calls `paymentService.processPayment()` → Route calls `orderRepo.completeOrder()`
7. `completeOrder()` sets order status='completed' and triggers stock decrement via `decrementStockForOrder()`
8. Stock decrement iterates recipe items → calls `inv.adjustStock()` for each ingredient
9. Response returns completed order with receipt data → Frontend generates receipt

**Stock Decrement Logic (Phase 3 Implementation):**

1. Order marked as "completed" (not during draft/active states)
2. `src/repositories/order.ts` → `completeOrder()` at line 91-112:
   - Sets `status = 'completed'` and `completedAt`
   - Conditionally calls `decrementStockForOrder(orderId)` if `markCompleted = true`
3. `src/repositories/inventory.ts` → `decrementStockForOrder()` at line 145-172:
   - Validates order is completed (line 151)
   - Fetches order items and their recipes
   - For each recipe ingredient: calls `adjustStock()` with negative quantity
   - Each adjustment creates a stock movement record
4. Atomicity: All stock operations occur within single database transaction context

**Inventory Lookup Flow:**

1. User views `/inventory` → Page fetches all ingredients via `inv.getAllIngredients()`
2. Page displays current stock, min stock, status indicators
3. User filters/sorts inventory via JavaScript on client → Filters applied to rendered table rows
4. User clicks "Stok" → Shows stock adjustment modal
5. User submits adjustment → Calls `/api/inventory/stock-movements` (POST)
6. Route receives request → Calls `inv.adjustStock()` with type ('in', 'out', 'adjustment', 'waste')
7. Repository updates `ingredients.currentStock` and creates `stockMovements` entry

**Menu Management Flow:**

1. Admin accesses `/menu` page
2. Page renders menu items with categories
3. CRUD operations through `/api/menus` routes
4. Menu items linked to recipes (many-to-many via `recipes` table)
5. Recipe defines ingredient quantities for each menu item

**State Management:**

- **Order Status Flow:** `draft` → `active` → `completed` OR `cancelled`
- **Kitchen Status:** `pending` → `cooking` → `ready` → `served` (parallel to order status)
- **Table Status:** `available` ↔ `occupied`
- **Item Status:** `pending` → `cooking` → `ready` → `served`
- **Stock Levels:** Dynamic based on purchases (decrements) and restocking (increments)

## Key Abstractions

**Order Entity:**
- Purpose: Represents a single customer transaction/table session
- Examples: `src/repositories/order.ts`, `src/pages/orders.ts`, `src/routes/orders.ts`
- Pattern: Order aggregates multiple order items; order controls table occupancy
- Key states: draft (being built), active (items added), completed (paid), cancelled

**OrderItem Entity:**
- Purpose: Individual line item in an order (a menu selection)
- Examples: `src/repositories/order-item.ts`
- Pattern: Links orders → menus; stores price snapshot at order time
- Tracks kitchen status independently (pending/cooking/ready/served)

**Recipe Entity:**
- Purpose: Defines ingredient composition for each menu item
- Examples: `src/repositories/inventory.ts`
- Pattern: Many-to-many relationship between menus and ingredients
- Enables automatic stock decrement calculations

**Ingredient Entity:**
- Purpose: Raw materials/stock items
- Examples: `src/repositories/inventory.ts`
- Pattern: Tracks current stock, min stock (reorder point), cost per unit
- Immutable once used in completed orders (via stock movements)

**StockMovement Entity:**
- Purpose: Audit trail for all inventory changes
- Pattern: Immutable log entries; reason and type track why stock changed
- Enables: Stock history, traceability, cost analysis

## Entry Points

**Web Server:**
- Location: `src/index.ts`
- Triggers: Application startup (Bun runtime)
- Responsibilities: Initialize Elysia app, register all routes and pages, seed default data, listen on PORT

**Browser Entry (Pages):**
- `/` → Redirects to `/pos` or `/login`
- `/login` → Authentication page
- `/dashboard` → Overview page
- `/pos` → Main POS terminal interface
- `/admin` → Admin panel
- `/orders` → Orders history/management
- `/inventory` → Stock/ingredient management
- `/menu` → Menu item management
- `/categories` → Menu categories
- `/tables` → Table management
- `/kitchen` → Kitchen display system
- `/reports` → Sales/analytics reports

**API Entry Points:**
- All prefixed with `/api/`
- Domains: `orders`, `inventory`, `menus`, `tables`, `auth`, `users`, `dashboard`, `reports`, `kitchen`, `suppliers`, `categories`

## Error Handling

**Strategy:** Validation at route level, exception propagation from repositories

**Patterns:**

1. **Route-level validation:**
   - Request body validation using Elysia's `t.Object()` schema
   - Example: `src/routes/inventory.ts` line 24-31 validates ingredient creation payload

2. **Repository error handling:**
   - Returns `null` on not-found conditions (e.g., `getOrderById()` returns `null`)
   - Throws errors for data integrity issues
   - Example: `src/repositories/order.ts` line 33-35

3. **Service-layer error handling:**
   - Throws descriptive errors for business rule violations
   - Example: `src/services/payment.ts` line 9-19 validates payment amount

4. **Page-level error handling:**
   - Redirects to login on auth failure: `redirectToLogin()`
   - Returns 403 Forbidden for permission denials
   - Example: `src/pages/inventory.ts` line 20-22

## Cross-Cutting Concerns

**Authentication:**
- Mechanism: JWT tokens stored in `pos_session` cookie
- Implementation: `src/utils/auth.ts` - JWT verification
- Token payload: `{ userId, email, name, role }`
- Token secret: `JWT_SECRET` environment variable (fallback: 'pos-secret-key-change-in-production')

**Authorization:**
- Roles: `super_admin`, `admin_restoran`, `kasir`, `waitress`, `chef`
- Role-based access control in middleware: `src/middleware/authorization.ts`
- Convenience middleware: `requireAdmin()`, `requirePosAccess()`, `requireOrderAccess()`, `requireSuperAdmin()`
- Per-endpoint role checks: e.g., `/api/orders/complete` requires `kasir` or `admin_restoran`

**Logging:**
- Audit logs via `src/repositories/audit-log.ts`
- Tracks: userId, action, details, timestamp
- Called manually where needed (not automatic)

**Validation:**
- Schema validation at route layer using Elysia's type system
- Business logic validation in services and repositories
- Example: Stock adjustment checks for sufficient inventory before allowing negative adjustments

**Transactions:**
- Handled by Drizzle ORM's `db.transaction()` in critical operations
- Stock decrement and order completion are atomic within `completeOrder()`

---

*Architecture analysis: 2026-04-11*
