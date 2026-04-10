# Coding Conventions

**Analysis Date:** 2026-04-11

## Language & Runtime

**Primary:** TypeScript (ESNext)
- **Runtime:** Bun (not Node.js)
- **Module System:** ES Modules (`"type": "module"`)
- **Target:** ESNext
- **Strict Mode:** Enabled with comprehensive strict flags

## Naming Patterns

### Files
- **CamelCase** for all TypeScript files
  - Examples: `order.ts`, `inventory.ts`, `menu.ts`, `auth.ts`
  - No dashes or underscores in filenames
  - Repository files: `[entity].ts` in `src/repositories/`
  - Route files: `[entity].ts` in `src/routes/`

### Functions
- **camelCase** for all function names
  - Async functions: `getOrderById`, `createOrder`, `calculateTotals`
  - Utility functions: `redirectToLogin`, `getTokenFromCookies`
  - Service functions: `processPayment`, `calculateChange`
  - Pattern: `verbNoun` or `actionEntity`

### Variables
- **camelCase** for all variables
  - Examples: `tableId`, `userId`, `orderId`, `amountPaid`
  - Boolean flags: `isAvailable`, `isActive`, `markCompleted`
  - Constants: Standard camelCase (not UPPER_SNAKE_CASE)

### Types & Interfaces
- **PascalCase** for type definitions
  - Entity types: `Order`, `Menu`, `Table`, `User`
  - New entity types: `NewOrder`, `NewMenu`, `NewUser`
  - Payload types: `TokenPayload`
  - Enum types derived from tables: `Order`, `NewOrder`

### Database Columns
- **snake_case** in database schema
  - Examples: `table_number`, `user_id`, `created_at`, `price_at_order`
  - TypeScript mapping: camelCase in code (`tableNumber`, `userId`)

## Code Style

### Formatting
- **Indentation:** 2 spaces
- **Quotes:** Single quotes preferred
- **Semicolons:** Required
- **Line endings:** Unix style

### TypeScript Strictness
From `tsconfig.json`:
```json
{
  "strict": true,
  "noFallthroughCasesInSwitch": true,
  "noUncheckedIndexedAccess": true,
  "noImplicitOverride": true
}
```

### Import Organization
Order observed in codebase:
1. Third-party packages (Elysia, Drizzle, JWT)
2. Local absolute imports (`../db/schema`)
3. Type imports (`import type { Order }`)
4. Dynamic imports (for circular dependencies)

Example from `src/repositories/order.ts`:
```typescript
import { eq, and, gte, desc, sql, sum } from 'drizzle-orm';
import { db } from '../db/index';
import { orders, orderItems, tables, menus } from '../db/schema';
import type { Order, NewOrder } from '../db/schema';
```

## Error Handling

### Pattern
- Throw `Error` with descriptive messages in services
- Return error objects in routes: `{ error: 'message' }`
- Use try-catch for async operations

Example:
```typescript
// Service layer
export async function processPayment(orderId: number, amountPaid: number) {
  const order = await orderRepo.getOrderById(orderId);
  if (!order) {
    throw new Error('Order not found');
  }
  if (order.status !== 'active') {
    throw new Error('Order is not active');
  }
}

// Route layer
.post('/:id/pay', async ({ params: { id }, body }) => {
  try {
    const completedOrder = await paymentService.processPayment(Number(id), amountPaid);
    return { order: completedOrder };
  } catch (e: any) {
    return { error: e.message };
  }
})
```

## Function Design

### Async Functions
- All database operations are async
- Return `Promise<T>` or `Promise<T | null>`
- Handle null cases explicitly

Example:
```typescript
export async function getOrderById(id: number): Promise<Order | null> {
  const result = await db.select().from(orders).where(eq(orders.id, id));
  return result[0] || null;
}
```

### Parameters
- Use object destructuring in route handlers
- Type validation via Elysia's `t.Object()` schema
- Optional parameters use `t.Optional()`

## Module Exports

### Named Exports
- Always use named exports, never default exports
- Group related functions in a single file
- Export types when used externally

Example:
```typescript
// Export functions
export async function getOrderById(id: number) { /* ... */ }
export async function createOrder(tableId: number, userId: number) { /* ... */ }

// Export types for external use
export type { TokenPayload };
```

### Repository Pattern
Files in `src/repositories/` follow CRUD pattern:
- `getAll[Entity]s()` - List all
- `get[Entity]ById(id)` - Get single by ID
- `create[Entity](data)` - Create new
- `update[Entity](id, data)` - Update existing
- `delete[Entity](id)` - Delete
- `get[Entity]By[Field](value)` - Query by specific field

## Database Patterns

### Drizzle ORM Usage
```typescript
// Selecting with conditions
const result = await db.select().from(orders).where(eq(orders.id, id));

// Joins
return db.select().from(orders)
  .leftJoin(tables, eq(orders.tableId, tables.id))
  .orderBy(desc(orders.createdAt));

// Aggregations
const result = await db.select({ total: sum(orders.total) })
  .from(orders)
  .where(and(gte(orders.completedAt, todayStart()), eq(orders.status, 'completed')));
```

### Type Inference
- Use `typeof table.$inferSelect` for entity types
- Use `typeof table.$inferInsert` for new entity types

## Authentication Pattern

### JWT Handling
- Token stored in cookie named `pos_session`
- Verify token on protected routes
- Role-based access control via middleware

Example:
```typescript
const requirePayment = () => requireRole(['super_admin', 'admin_restoran', 'kasir']);

.post('/:id/pay', async ({ cookie, headers, params: { id }, body }) => {
  const user = getUserFromRequest(cookie, headers);
  if (!user) return { error: 'Unauthorized' };
  if (!['super_admin', 'admin_restoran', 'kasir'].includes(user.role)) {
    return { error: 'Akses ditolak' };
  }
  // ... handler logic
})
```

## Comments & Documentation

### When to Comment
- Complex business logic (e.g., stock decrement timing)
- Workarounds or temporary fixes
- API endpoint purposes

Example:
```typescript
// After order is completed, decrement stock
if (markCompleted) {
  const { decrementStockForOrder } = await import('./inventory');
  await decrementStockForOrder(id);
}
```

### Inline Comments
- Use for explaining WHY, not WHAT
- Keep comments updated when code changes

## Architecture Patterns

### Elysia Routes
```typescript
export const orderRoutes = new Elysia({ prefix: '/api/orders' })
  .get('/', async () => { /* ... */ })
  .post('/', async ({ body }) => { /* ... */ }, {
    body: t.Object({ /* validation schema */ })
  });
```

### Service Layer
- Business logic extracted to `src/services/`
- Pure functions for calculations
- Async functions for data operations

### Repository Layer
- All database access in `src/repositories/`
- No direct DB calls in routes or pages
- Re-export from barrel files if needed

---

*Convention analysis: 2026-04-11*

