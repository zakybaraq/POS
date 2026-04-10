# Coding Conventions

**Analysis Date:** 2026-04-10

## Naming Patterns

### Files
- **Routes:** kebab-case with `.ts` extension
  - Example: `src/routes/orders.ts`, `src/routes/menus.ts`
- **Repositories:** kebab-case matching route names
  - Example: `src/repositories/order.ts`, `src/repositories/order-item.ts`
- **Pages:** kebab-case with `.ts` extension
  - Example: `src/pages/pos.ts`, `src/pages/dashboard.ts`
- **Services:** kebab-case with `.ts` extension
  - Example: `src/services/auth.ts`, `src/services/payment.ts`

### Functions
- **All functions:** camelCase
  - Example: `createOrder`, `getOrderById`, `getUserFromRequest`, `processPayment`
- **Async repository functions:** Start with action verb
  - Example: `getOrderById`, `createOrder`, `updateOrderStatus`, `calculateTotals`

### Variables
- **All variables:** camelCase
  - Example: `tableId`, `userId`, `orderType`, `amountPaid`, `currentTotal`
- **Database columns in code:** Map to camelCase
  - Example: `tableNumber`, `isAvailable`, `createdAt`, `updatedAt`

### Types
- **TypeScript types:** PascalCase
  - Example: `Menu`, `Order`, `OrderItem`, `TokenPayload`, `User`
- **Database types from Drizzle:** Use `$inferSelect` and `$inferInsert`
  - Example: `type Menu = typeof menus.$inferSelect`
  - Example: `type NewMenu = typeof menus.$inferInsert`

## Code Style

### Formatting
- No explicit formatter configured
- Standard TypeScript formatting (2-space indent)

### Linting
- No explicit linter configured
- TypeScript strict mode via `tsconfig.json`

## Import Organization

### Order
1. External packages
   ```typescript
   import { Elysia, t } from 'elysia';
   import jwt from 'jsonwebtoken';
   ```
2. Internal modules (relative paths)
   ```typescript
   import * as orderRepo from '../repositories/order';
   import * as orderItemRepo from '../repositories/order-item';
   ```
3. Local utilities
   ```typescript
   import { requireRole, getUserFromRequest } from '../middleware/authorization';
   import { getTokenFromCookies, verifyToken } from '../utils/auth';
   ```

### Path Aliases
- No path aliases configured
- Use relative paths: `../repositories/`, `../services/`, `../middleware/`

## Error Handling

### API Routes
- Return error object format:
  ```typescript
  return { error: 'Table not found' };
  return { error: 'Invalid amount paid' };
  return { error: 'Unauthorized' };
  ```
- HTTP status codes only used for redirects (e.g., login redirect)

### Services/Repositories
- Throw exceptions with messages:
  ```typescript
  throw new Error('Email already registered');
  throw new Error('Invalid email or password');
  ```
- Use try/catch in route handlers:
  ```typescript
  try {
    const completedOrder = await paymentService.processPayment(Number(id), amountPaid);
  } catch (e: any) {
    return { error: e.message };
  }
  ```

### Authentication Errors
- Redirect to login:
  ```typescript
  return redirectToLogin();
  ```
- Return 403 for role violations:
  ```typescript
  return new Response('Akses ditolak', { status: 403 });
  ```

## Response Format Conventions

### Successful Responses
- Return data directly (no wrapper):
  ```typescript
  return orderRepo.getOrdersToday();
  return orderRepo.getOrderById(id);
  ```
- Return object with nested data:
  ```typescript
  return { order, items, table };
  return { table, order, items };
  ```

### Error Responses
- Always use `error` key:
  ```typescript
  return { error: 'message' };
  ```
- Success confirmation (rare):
  ```typescript
  return { success: true };
  ```

### Mixed Responses
- Combine data and error in one response:
  ```typescript
  return { table, order: null };
  return { order: completedOrder, items, receipt };
  ```

## Database Schema Patterns (Drizzle)

### Table Definition
```typescript
export const orders = mysqlTable('orders', {
  id: serial('id').primaryKey(),
  tableId: int('table_id').notNull(),
  userId: int('user_id').notNull(),
  status: orderStatusEnum.notNull().default('draft'),
  createdAt: datetime('created_at').notNull().default(new Date()),
}, (table) => ({
  tableIdIdx: index('idx_orders_table_id').on(table.tableId),
}));
```

### Column Types
- Primary key: `serial('column_name')`
- String: `varchar('column_name', { length: 100 })`
- Integer: `int('column_name')`
- Boolean: `boolean('column_name')`
- DateTime: `datetime('column_name')`
- Enum: `mysqlEnum('column_name', ['value1', 'value2'])`
- Decimal: `decimal('column_name', { precision: 10, scale: 2 })`

### Indexes
- Defined in third parameter to `mysqlTable`
- Example: `(table) => ({ emailIdx: index('idx_users_email').on(table.email) })`

### Relations
```typescript
export const ordersRelations = relations(orders, ({ one, many }) => ({
  table: one(tables, {
    fields: [orders.tableId],
    references: [tables.id],
  }),
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  orderItems: many(orderItems),
}));
```

### Enum Definitions
- Defined before tables using `mysqlEnum`:
  ```typescript
  export const orderStatusEnum = mysqlEnum('order_status', ['draft', 'active', 'completed', 'cancelled']);
  export const roleEnum = mysqlEnum('role', ['super_admin', 'admin_restoran', 'kasir', 'waitress', 'chef']);
  ```

## Middleware & Authorization

### Role-Based Access
- Define role requirements as factory functions:
  ```typescript
  const requireOrderCreate = () => requireRole(['super_admin', 'admin_restoran', 'kasir', 'waitress']);
  const requirePayment = () => requireRole(['super_admin', 'admin_restoran', 'kasir']);
  ```
- Convenience exports:
  ```typescript
  export const requireAdmin = () => requireRole(['super_admin', 'admin_restoran']);
  export const requirePosAccess = () => requireRole(['super_admin', 'admin_restoran', 'kasir']);
  ```

## Module Design

### Exports
- Named exports only
  ```typescript
  export const orderRoutes = new Elysia({ prefix: '/api/orders' });
  export async function createOrder(tableId: number | null, userId: number) { ... }
  ```

### Barrel Files
- Use `index.ts` files for re-exports
  - Example: `src/routes/index.ts` aggregates all route modules

### Dynamic Imports
- Used for conditional/lazy loading:
  ```typescript
  const { getAvailableMenus } = await import('../repositories/menu');
  ```

## Function Design

### Repository Functions
- **Size:** Typically single-purpose, focused queries
- **Parameters:** Simple types (id, data objects)
- **Return:** Single record, array, or null

### Route Handlers
- **Size:** Medium - contain validation and orchestration
- **Parameters:** Extract from `body`, `params`, `cookie`, `headers`
- **Return:** Direct data or error object

---

*Convention analysis: 2026-04-10*
