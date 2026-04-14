# Architecture Overview

**Project:** POS (Point of Sale) System  
**Version:** 2.2.0  
**Architecture:** Clean Architecture  
**Date:** 2026-04-14

---

## Overview

This project follows **Clean Architecture** principles with clear separation of concerns across 4 distinct layers. This structure improves maintainability, testability, and scalability.

---

## Folder Structure

```
src/
├── api/                    # Presentation Layer
│   ├── routes/            # HTTP endpoints
│   ├── middleware/        # Cross-cutting concerns
│   └── pages/             # Server-rendered views
├── domain/                 # Business Logic Layer
│   ├── entities/          # Business objects
│   ├── repositories/      # Data access
│   ├── services/          # Business logic
│   └── schemas/           # Validation schemas
├── infrastructure/         # External Concerns
│   ├── database/          # Drizzle ORM
│   ├── websocket/         # Real-time communication
│   └── email/             # Email service
├── shared/                 # Utilities
│   ├── templates/         # HTML templates
│   ├── utils/             # Helper functions
│   └── types/             # Shared types
└── config/                 # Configuration
```

---

## Layers

### 1. API Layer (Presentation)

**Purpose:** Handle HTTP requests and responses

**Components:**
- **Routes:** Define API endpoints (`/api/orders`, `/api/users`, etc.)
- **Middleware:** Authentication, rate limiting, request ID, CSRF protection
- **Pages:** Server-side rendered views (dashboard, login, POS interface)

**Dependencies:**
- Depends on: Domain Layer
- Imported by: Infrastructure (database)

**Example:**
```typescript
// src/api/routes/orders.ts
import { orderRepo } from '@/domain/repositories';
import { createOrderSchema } from '@/domain/schemas';

export const orderRoutes = new Elysia({ prefix: '/api/orders' })
  .get('/', async () => {
    return orderRepo.getAllOrders();
  });
```

---

### 2. Domain Layer (Business Logic)

**Purpose:** Core business logic, independent of frameworks

**Components:**
- **Entities:** Business objects (Order, User, Product)
- **Repositories:** Data access interfaces and implementations
- **Services:** Business operations and workflows
- **Schemas:** Zod validation schemas

**Dependencies:**
- Depends on: Nothing (inner layer)
- Imported by: API Layer, Infrastructure

**Example:**
```typescript
// src/domain/repositories/order.ts
import { db } from '@/infrastructure/database';
import { orders } from '@/infrastructure/database/schema';

export async function getAllOrders() {
  return db.select().from(orders);
}
```

---

### 3. Infrastructure Layer (External)

**Purpose:** External concerns and third-party integrations

**Components:**
- **Database:** Drizzle ORM configuration, schema definitions
- **WebSocket:** Socket.io for real-time features
- **Email:** Email service integration

**Dependencies:**
- Depends on: Nothing
- Imported by: Domain Layer, API Layer

**Example:**
```typescript
// src/infrastructure/database/index.ts
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

export const db = drizzle(pool);
```

---

### 4. Shared Layer (Utilities)

**Purpose:** Cross-cutting utilities used by all layers

**Components:**
- **Templates:** HTML template functions
- **Utils:** Helper functions (auth, pagination, logging)
- **Types:** Shared TypeScript types

**Dependencies:**
- Depends on: Nothing
- Imported by: All layers

**Example:**
```typescript
// src/shared/utils/auth.ts
export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}
```

---

## Import Patterns

### ✅ Recommended: Barrel Exports

```typescript
// Import everything from one place
import { 
  orderRepo, 
  userRepo, 
  inventoryRepo 
} from '@/domain/repositories';

import {
  createOrder,
  validateOrder
} from '@/domain/services';

import { db } from '@/infrastructure/database';
import { getHtmlTemplate } from '@/shared/templates';
```

### ❌ Avoid: Deep Imports

```typescript
// Don't do this - too verbose
import { orderRepo } from '../domain/repositories/order';
import { userRepo } from '../domain/repositories/user';
import { createOrder } from '../domain/services/order';
```

---

## Path Aliases

Configured in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/api/*": ["src/api/*"],
      "@/domain/*": ["src/domain/*"],
      "@/infrastructure/*": ["src/infrastructure/*"],
      "@/shared/*": ["src/shared/*"],
      "@/config/*": ["src/config/*"]
    }
  }
}
```

---

## Dependency Flow

```
┌─────────────────────────────────────────┐
│           API Layer                     │
│  (Routes, Middleware, Pages)            │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│          Domain Layer                   │
│  (Repositories, Services, Schemas)    │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│      Infrastructure Layer               │
│  (Database, WebSocket, Email)           │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│          Shared Layer                   │
│  (Utils, Templates, Types)              │
└─────────────────────────────────────────┘
```

**Rule:** Dependencies only flow inward (outer layers depend on inner layers)

---

## Testing

### Unit Tests
- Test domain logic without external dependencies
- Mock repositories and services

```typescript
// test/domain/order.test.ts
import { createOrder } from '@/domain/services/order';

test('should calculate order total', () => {
  const order = createOrder({ items: [...] });
  expect(order.total).toBe(expected);
});
```

### Integration Tests
- Test with real database
- Test API endpoints

```typescript
// test/integration/order.test.ts
test('should create order via API', async () => {
  const response = await request(app)
    .post('/api/orders')
    .send({ items: [...] });
  expect(response.status).toBe(201);
});
```

---

## Migration from Old Structure

See [MIGRATION-GUIDE.md](./MIGRATION-GUIDE.md) for detailed migration instructions.

---

## Architecture Decision Records

- [ADR-001: Clean Architecture](./ADR-001-clean-architecture.md)

---

## Best Practices

1. **Keep domain logic pure** - No external dependencies in domain layer
2. **Use barrel exports** - Import from module root, not individual files
3. **Follow naming conventions** - kebab-case for files, PascalCase for classes
4. **Write tests** - Unit tests for domain, integration for API
5. **Document changes** - Update this doc when adding new patterns

---

## Related Documentation

- [MIGRATION-GUIDE.md](./MIGRATION-GUIDE.md) - Migration from old structure
- [ADR-001-clean-architecture.md](./ADR-001-clean-architecture.md) - Why we chose Clean Architecture
- [README.md](../README.md) - Project overview
