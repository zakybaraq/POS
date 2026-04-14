# Migration Guide

**Version:** 2.2.0  
**Date:** 2026-04-14

This guide helps you migrate from the old project structure to the new Clean Architecture structure.

---

## Quick Reference

| Old Import | New Import |
|------------|------------|
| `../db/` | `../infrastructure/database/` |
| `../repositories/` | `../domain/repositories/` |
| `../services/` | `../domain/services/` |
| `../schemas/` | `../domain/schemas/` |
| `../routes/` | `../api/routes/` |
| `../middleware/` | `../api/middleware/` |
| `../pages/` | `../api/pages/` |
| `../utils/` | `../shared/utils/` |
| `../templates/` | `../shared/templates/` |
| `../websocket/` | `../infrastructure/websocket/` |

---

## Import Examples

### Before and After

#### Database Imports

**Before:**
```typescript
import { db } from '../db';
import { orders, orderItems } from '../db/schema';
```

**After:**
```typescript
import { db } from '../infrastructure/database';
import { orders, orderItems } from '../infrastructure/database/schema';
```

**With Barrel Exports:**
```typescript
import { db } from '@/infrastructure/database';
import { orders, orderItems } from '@/infrastructure/database';
```

---

#### Repository Imports

**Before:**
```typescript
import { getOrderById } from '../repositories/order';
import { getUserById } from '../repositories/user';
import { getInventoryById } from '../repositories/inventory';
```

**After:**
```typescript
import { getOrderById, getUserById, getInventoryById } from '../domain/repositories';
```

**With Path Aliases:**
```typescript
import { getOrderById, getUserById, getInventoryById } from '@/domain/repositories';
```

---

#### Service Imports

**Before:**
```typescript
import { createOrder } from '../services/order';
import { sendNotification } from '../services/notifications';
```

**After:**
```typescript
import { createOrder, sendNotification } from '../domain/services';
```

**With Path Aliases:**
```typescript
import { createOrder, sendNotification } from '@/domain/services';
```

---

#### Route Imports

**Before:**
```typescript
import { orderRoutes } from '../routes/orders';
import { userRoutes } from '../routes/users';
```

**After:**
```typescript
import { orderRoutes, userRoutes } from '../api/routes';
```

**With Path Aliases:**
```typescript
import { orderRoutes, userRoutes } from '@/api/routes';
```

---

#### Utility Imports

**Before:**
```typescript
import { hashPassword } from '../utils/auth';
import { getLoggerWithRequestId } from '../utils/logger-with-context';
```

**After:**
```typescript
import { hashPassword, getLoggerWithRequestId } from '../shared/utils';
```

**With Path Aliases:**
```typescript
import { hashPassword, getLoggerWithRequestId } from '@/shared/utils';
```

---

## Barrel Exports

### What Are They?

Barrel exports (index.ts files) allow you to import multiple items from one location:

```typescript
// Instead of this (multiple imports)
import { getOrderById } from '../domain/repositories/order';
import { getUserById } from '../domain/repositories/user';
import { getInventoryById } from '../domain/repositories/inventory';

// Do this (single import)
import { getOrderById, getUserById, getInventoryById } from '../domain/repositories';
```

### Available Barrel Exports

- `src/domain/repositories/index.ts` - All repositories
- `src/domain/services/index.ts` - All services
- `src/domain/schemas/index.ts` - All schemas
- `src/infrastructure/database/index.ts` - Database exports
- `src/shared/utils/index.ts` - Utility functions

---

## Path Aliases

### Configuration

Path aliases are configured in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@/api/*": ["src/api/*"],
      "@/domain/*": ["src/domain/*"],
      "@/infrastructure/*": ["src/infrastructure/*"],
      "@/shared/*": ["src/shared/*"]
    }
  }
}
```

### Usage

Use path aliases for cleaner imports:

```typescript
// ❌ Avoid: Deep relative imports
import { orderRepo } from '../../../domain/repositories/order';

// ✅ Prefer: Path aliases
import { orderRepo } from '@/domain/repositories';
```

---

## Common Patterns

### Repository Pattern

**Old:**
```typescript
// src/repositories/order.ts
import { db } from '../db';

export async function getOrderById(id: number) {
  return db.select().from(orders).where(eq(orders.id, id));
}
```

**New:**
```typescript
// src/domain/repositories/order.ts
import { db } from '@/infrastructure/database';

export async function getOrderById(id: number) {
  return db.select().from(orders).where(eq(orders.id, id));
}
```

---

### Service Pattern

**Old:**
```typescript
// src/services/order.ts
import { getOrderById } from '../repositories/order';
import { getUserById } from '../repositories/user';
```

**New:**
```typescript
// src/domain/services/order.ts
import { getOrderById, getUserById } from '@/domain/repositories';
```

---

### Route Pattern

**Old:**
```typescript
// src/routes/orders.ts
import { createOrder } from '../services/order';
import { validateOrder } from '../schemas/order';
```

**New:**
```typescript
// src/api/routes/orders.ts
import { createOrder } from '@/domain/services';
import { validateOrder } from '@/domain/schemas';
```

---

## Testing

### Unit Tests

Update test imports:

**Before:**
```typescript
// test/repositories/order.test.ts
import { getOrderById } from '../../src/repositories/order';
```

**After:**
```typescript
// test/domain/repositories/order.test.ts
import { getOrderById } from '../../src/domain/repositories';
```

---

## IDE Setup

### VS Code

Add to `.vscode/settings.json`:

```json
{
  "typescript.preferences.importModuleSpecifier": "non-relative"
}
```

This helps VS Code suggest path aliases instead of relative imports.

---

## Migration Checklist

- [ ] Update database imports (`../db/` → `../infrastructure/database/`)
- [ ] Update repository imports (`../repositories/` → `../domain/repositories/`)
- [ ] Update service imports (`../services/` → `../domain/services/`)
- [ ] Update schema imports (`../schemas/` → `../domain/schemas/`)
- [ ] Update route imports (`../routes/` → `../api/routes/`)
- [ ] Update middleware imports (`../middleware/` → `../api/middleware/`)
- [ ] Update page imports (`../pages/` → `../api/pages/`)
- [ ] Update utility imports (`../utils/` → `../shared/utils/`)
- [ ] Update template imports (`../templates/` → `../shared/templates/`)
- [ ] Update websocket imports (`../websocket/` → `../infrastructure/websocket/`)
- [ ] Consider using barrel exports
- [ ] Consider using path aliases (`@/domain/repositories`)
- [ ] Run tests to verify
- [ ] Commit changes

---

## Troubleshooting

### Import Not Found

**Problem:** `Cannot find module '@/domain/repositories'`

**Solution:**
1. Check barrel export exists: `src/domain/repositories/index.ts`
2. Verify path alias in tsconfig.json
3. Restart TypeScript server in IDE

### Barrel Export Missing

**Problem:** Function not exported from barrel

**Solution:**
1. Check `src/domain/repositories/index.ts`
2. Add export if missing:
   ```typescript
   export * from './order';
   ```

### Relative Import Too Deep

**Problem:** `import { x } from '../../../../../domain/repositories'`

**Solution:**
Use path alias instead:
```typescript
import { x } from '@/domain/repositories';
```

---

## Examples

See the [Architecture documentation](./ARCHITECTURE.md) for more examples.

---

## Getting Help

- Check [ARCHITECTURE.md](./ARCHITECTURE.md) for architecture overview
- Review [ADR-001](./ADR-001-clean-architecture.md) for rationale
- Look at existing files in new structure for patterns

---

## Summary

**Key Changes:**
1. **Structure** - 4 layers: api, domain, infrastructure, shared
2. **Imports** - Update paths to new locations
3. **Barrel Exports** - Import from module root
4. **Path Aliases** - Use `@/domain/*` instead of relative paths

**Benefits:**
- Clear separation of concerns
- Easier testing
- Better maintainability
- Scalable structure
