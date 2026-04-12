# Coding Conventions

**Analysis Date:** 2026-04-12

## Naming Patterns

**Files:**
- Repositories use kebab-case with entity name: `user.ts`, `order.ts`, `order-item.ts`, `customer.ts`
- Route files use kebab-case: `auth.ts`, `orders.ts`, `menus.ts`, `purchase-orders.ts`
- Page files use kebab-case: `pos.ts`, `pos-client.ts`, `purchase-orders.ts`, `kitchen.ts`
- Middleware/utils use kebab-case: `authorization.ts`, `common-scripts.ts`
- No prefix/suffix conventions (unlike `OrderService` or `userUtil`)

**Functions:**
- Repository functions use camelCase: `createOrder`, `getOrderById`, `updateOrderStatus`, `getAllCustomers`, `getCustomerByPhone`
- Exported functions are public without underscore prefix
- Internal helper functions are not distinguished; see "Module Design" for pattern
- Async functions do not have `Async` suffix
- Query functions use `get` prefix: `getOrderById`, `getOrdersToday`, `getStockMovements`
- Mutation functions use `create`, `update`, `delete` prefixes: `createOrder`, `updateOrderStatus`, `deleteRecipe`
- Transaction functions use `Tx` suffix to indicate they accept transaction context: `decrementStockForOrderTx`, `addLoyaltyPointsTx`, `updateCustomerVisitTx`
- Role-checking middleware functions use `require` prefix: `requireRole`, `requireAdmin`, `requirePosAccess`

**Variables:**
- camelCase for all local variables and parameters: `orderId`, `tableId`, `userId`, `amountPaid`, `currentStock`, `newStock`
- SQL result variables: `result`, `order`, `items`, `table`, `orders` (singular/plural based on quantity)
- Computed values use descriptive names: `totalCost`, `changeDue`, `subtotal`, `todayStart`, `weekStart`
- Loop variables often abbreviated: `o` (order), `i` (item), `c` (customer), `r` (result), `m` (menu)

**Types:**
- Database types use `New` prefix for insert types: `NewOrder`, `NewIngredient`, `NewCustomer`, `NewRecipe` (from Drizzle schema)
- TypeScript interfaces use PascalCase: `TokenPayload`, `Order`, `Order`, `Menu`, `Customer`, `Ingredient`
- Type imports explicitly use `type` keyword: `import type { Order, NewOrder } from '../db/schema'`
- Object type properties use camelCase

**Constants:**
- Uppercase with underscores: `JWT_SECRET` (auth.ts)
- Export at module level without encapsulation

## Code Style

**Formatting:**
- No explicit formatter configured (no .prettierrc, no ESLint config found)
- Observed patterns: 2-space indentation (implicit, not enforced)
- Semicolons are always used
- Single quotes for strings, except template literals with backticks
- Object destructuring common in parameters: `{ params, body, headers, cookie }`
- Chained method calls broken across lines in query builders (Drizzle ORM style)

**Linting:**
- TypeScript strict mode enabled in `tsconfig.json`
- `noFallthroughCasesInSwitch: true` - switch statements must be exhaustive
- `noUncheckedIndexedAccess: true` - array/object access must check for undefined
- `noImplicitOverride: true` - subclass method overrides must use explicit `override` keyword
- No ESLint or Prettier config found - formatting is ad-hoc, inconsistent indentation observed in some files (spaces vs alignment)

## Import Organization

**Order:**
1. Framework/runtime imports (Elysia, Node.js modules): `import { Elysia, t } from 'elysia'`, `import { readFileSync } from 'fs'`
2. External packages: `import jwt from 'jsonwebtoken'`, `import mysql from 'mysql2/promise'`
3. Database imports: `import { db } from '../db/index'`, `import { eq, and, desc } from 'drizzle-orm'`
4. Drizzle schema imports: `import { orders, customers } from '../db/schema'`, `import type { Order, NewOrder } from '../db/schema'`
5. Type-only imports marked with `type`: `import type { TokenPayload } from '../utils/auth'`
6. Relative imports from project: `import * as orderRepo from '../repositories/order'`, `import { requireRole } from '../middleware/authorization'`
7. Type imports from other modules: `import type { Order } from '../db/schema'`, `import type { MySql2Database } from 'drizzle-orm/mysql2'`

**Path Aliases:**
- Relative paths only (`../`), no path aliases configured
- Deep nesting common but accepted (e.g., `../../../repositories/order`)

**Destructuring imports:**
- Namespace imports common: `import * as orderRepo from '../repositories/order'` 
- Selective imports used: `import { Elysia, t } from 'elysia'`, `import { eq, and, desc } from 'drizzle-orm'`
- Default exports not used; only named exports

## Error Handling

**Patterns:**
- `try/catch` blocks used for validation and authentication failures: `try { user = verifyToken(token); } catch { return redirectToLogin(); }`
- Empty catch blocks are common: `catch {}` - error is silently ignored
- Direct `throw new Error(message)` with descriptive message: `throw new Error('Order not found')`, `throw new Error('Order is not active')`
- Error responses as object returns: `return { error: 'Table not found' }` instead of throwing
- Transaction error handling re-throws for rollback: `catch (error) { console.error(...); throw error; }`
- No custom error types or error classes defined
- No error codes or error maps

**Error Messages:**
- Informal, user-facing style: `'Meja wajib untuk order dine-in'`, `'Poin tidak cukup'`
- Mix of English and Indonesian error messages across codebase
- No consistent error message structure

**Gaps:**
- Empty catch blocks hide real errors, making debugging hard
- No error context (stack traces, request IDs, user ID for logging)
- No HTTP status code mapping (400, 404, 500, etc.) - responses return bare `{ error: 'message' }`
- No retry logic or circuit breakers for database operations
- Transaction rollbacks happen automatically but errors aren't captured for audit
- No validation errors distinguish between validation failure vs system error

## Logging

**Framework:** `console.log` and `console.error` - no structured logger

**Patterns:**
- `console.log` for informational flow: `console.log(\`Stock decrement skipped for order #${orderId} - order not completed\`)`
- `console.error` for errors: `console.error(\`Failed to complete order #${id}:\`, error)`
- `console.error` for seed operations: `seedDefaultSettings().catch(console.error)`
- Server startup logged: `console.log(\`Server running at http://localhost:${process.env.PORT || 3000}\`)`
- Kitchen page uses verbose logging: `console.error('Failed to load orders, status:', res.status, 'text:', text)`
- Menu loading errors logged: `console.error('Failed to load categories:', e)`

**Gaps:**
- No log levels (debug, info, warn, error, fatal) - only console.log and console.error
- No timestamps in logs (console adds them, but inconsistently)
- No structured JSON logging - string interpolation only
- No request/context correlation (no request ID, user ID, order ID prefix in all logs)
- No request logging at entry/exit
- No performance metrics (query time, execution time)
- Page-level JavaScript errors not logged: `catch (e) { document.getElementById('emp-tbody').innerHTML = '...Error: ' + e.message; }`

## Comments

**When to Comment:**
- Minimal comments observed - code is mostly self-documenting
- Business logic decisions explained: see `// Always mark the order as complete when payment is processed successfully...` in payment.ts
- TODO/FIXME rarely used; not found in codebase scan
- Section headers used in files with many functions (e.g., `// === CRUD Ingredients ===`, `// === Stock Movements ===` in inventory.ts)

**JSDoc/TSDoc:**
- Not used in codebase
- No function documentation blocks
- No parameter type documentation
- Type hints sufficient; documentation not expected

## Function Design

**Size:**
- Repository functions average 5-15 lines
- Query builders chain across 3-8 lines (Drizzle ORM style)
- Page rendering functions can exceed 200 lines (HTML generation)
- Route handlers average 20-40 lines with nested logic

**Parameters:**
- Positional parameters for IDs: `getOrderById(id: number)`
- Object destructuring for multiple related parameters in routes: `{ params, body, headers, cookie }`
- Optional parameters for optional filtering: `getStockMovements(ingredientId?: number, limit: number = 50)`
- Transaction context parameter as `tx: any` - no proper typing (see gaps below)
- No parameter validation at function entry (validation in routes, not repositories)

**Return Values:**
- Database queries return `T[]` (array) or single record `T | null`
- Boolean for success/failure: `hasRole(user, roles): boolean`
- Objects for complex results: `{ table, order, items }`, `{ total, active, byTier, totalPoints }`
- Response objects: `{ error: 'message' }` (inconsistent with throwing)
- Async functions always return Promise even if used synchronously

## Module Design

**Exports:**
- All functions exported as named exports: `export async function createOrder(...)`, `export function verifyToken(...)`
- No default exports
- All repository functions exported; internal helpers rare
- Type exports marked with `export type`: `export type { TokenPayload }`

**Barrel Files:**
- Not used; direct imports required: `import * as orderRepo from '../repositories/order'`
- Would improve import clarity but not implemented

**Organization Pattern:**
- Repositories contain all DB queries for one entity (Customer, Order, Menu, etc.)
- Namespace imports used to keep repo functions organized: `const { getOrderById } = await import('./order')`
- Dynamic imports used for circular dependency avoidance (e.g., payment → order → inventory)
- Routes import repositories and services; no business logic in routes beyond request validation

## Code Organization Patterns

**Single Responsibility:**
- Repositories handle all data access for one entity
- Routes handle HTTP request/response transformation and basic validation
- Services handle cross-entity business logic (payment, auth, session)
- Pages handle HTML rendering
- Middleware handles authentication/authorization

**DRY Principle:**
- Repository CRUD patterns duplicated: `getById`, `create`, `update`, `delete` repeated in every repo
- No base class or mixin to eliminate duplication (would need refactoring)
- Query builder patterns repeated across files
- HTML rendering duplicated in page files instead of using template functions

**Module Exports:**
- Namespace imports preferred: `import * as orderRepo from '../repositories/order'`
- Allows organized grouping: `orderRepo.getOrderById()`, `orderRepo.createOrder()`
- All functions public; no encapsulation strategy

## Inconsistencies & Gaps

**Critical Gaps:**
1. **Error handling inconsistent** - some endpoints throw, others return `{ error: '...' }`; no standardization
2. **No input validation in repositories** - parameters assumed valid; validation happens in routes using Elysia `t.*` types
3. **Transaction typing weak** - `tx: any` parameter should be `MySql2Database<typeof schema>`
4. **No error codes or types** - error messages are strings; no structured error catalog
5. **Circular imports resolved with dynamic imports** - risky, makes dependency graph unclear
6. **Missing null/undefined checks** - despite TypeScript strict mode, many `?.` chaining suggests runtime nulls
7. **No consistent response format** - some endpoints return entity, others return `{ order, items }` object
8. **Empty catch blocks** - `catch {}` prevents error investigation; should at least log
9. **Console.error/log mixed with user-facing code** - frontend pages using `console.error` for UI updates

---

*Convention analysis: 2026-04-12*
