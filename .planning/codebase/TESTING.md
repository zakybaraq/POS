# Testing Patterns

**Analysis Date:** 2026-04-11

## Test Framework Status

**Current State: NO TESTING FRAMEWORK CONFIGURED**

No testing infrastructure found in this codebase:
- No test files (`*.test.ts`, `*.spec.ts`)
- No test configuration files (`jest.config.*`, `vitest.config.*`, `playwright.config.*`, `cypress.config.*`)
- No testing dependencies in `package.json`

## Recommended Testing Setup

Given the technology stack (Bun + Elysia + Drizzle), the recommended approach:

### Option 1: Bun Built-in Test Runner (Recommended)
```bash
# Bun has a built-in test runner - add to package.json scripts
"test": "bun test",
"test:watch": "bun test --watch"
```

Install assertion library if needed:
```bash
bun add -d @types/bun
```

### Option 2: Vitest (Fast, Vite-native)
```bash
bun add -d vitest @vitest/coverage-v8
```

Create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,js}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/templates/', // HTML templates
        'src/pages/',     // Page handlers (test via integration)
      ]
    }
  }
});
```

## Test File Organization

### Recommended Structure
```
src/
├── repositories/
│   ├── order.ts
│   └── order.test.ts          # Co-located tests
├── services/
│   ├── payment.ts
│   └── payment.test.ts        # Co-located tests
├── routes/
│   ├── orders.ts
│   └── orders.test.ts         # Co-located tests
├── utils/
│   ├── auth.ts
│   └── auth.test.ts           # Co-located tests
└── db/
    └── schema.test.ts         # Schema validation tests
```

### Naming Convention
- Unit tests: `[filename].test.ts`
- Integration tests: `[feature].integration.test.ts`
- E2E tests: `[flow].e2e.test.ts`

## Test Patterns for This Codebase

### Repository Tests (Drizzle ORM)

Pattern for testing repositories with test database:

```typescript
// src/repositories/order.test.ts
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { db } from '../db/index';
import * as orderRepo from './order';
import * as tableRepo from './table';

describe('Order Repository', () => {
  let testTableId: number;
  
  beforeEach(async () => {
    // Clean state before each test
    await db.delete(orderItems);
    await db.delete(orders);
    
    // Create test table
    const table = await tableRepo.createTable({ tableNumber: 999, capacity: 4 });
    testTableId = table.id;
  });
  
  describe('createOrder', () => {
    it('should create an order with valid data', async () => {
      const order = await orderRepo.createOrder(testTableId, 1);
      
      expect(order).toBeDefined();
      expect(order?.status).toBe('active');
      expect(order?.tableId).toBe(testTableId);
    });
    
    it('should set initial totals to 0', async () => {
      const order = await orderRepo.createOrder(testTableId, 1);
      
      expect(order?.subtotal).toBe(0);
      expect(order?.tax).toBe(0);
      expect(order?.total).toBe(0);
    });
  });
  
  describe('completeOrder', () => {
    it('should mark order as completed and decrement stock', async () => {
      const order = await orderRepo.createOrder(testTableId, 1);
      // Add items, etc.
      
      const completed = await orderRepo.completeOrder(order.id, 100000, true);
      
      expect(completed?.status).toBe('completed');
      expect(completed?.amountPaid).toBe(100000);
    });
    
    it('should not decrement stock when markCompleted is false', async () => {
      // Test stock synchronization logic
    });
  });
});
```

### Service Tests

```typescript
// src/services/payment.test.ts
import { describe, it, expect } from 'vitest';
import { calculateChange, processPayment } from './payment';

describe('Payment Service', () => {
  describe('calculateChange', () => {
    it('should calculate correct change', () => {
      expect(calculateChange(50000, 100000)).toBe(50000);
      expect(calculateChange(50000, 50000)).toBe(0);
    });
    
    it('should handle insufficient payment', () => {
      expect(calculateChange(100000, 50000)).toBe(-50000);
    });
  });
  
  describe('processPayment', () => {
    it('should throw for non-existent order', async () => {
      await expect(processPayment(99999, 50000))
        .rejects.toThrow('Order not found');
    });
    
    it('should throw for inactive order', async () => {
      // Setup completed order
      await expect(processPayment(completedOrderId, 50000))
        .rejects.toThrow('Order is not active');
    });
    
    it('should throw for insufficient payment', async () => {
      // Setup active order with total 100000
      await expect(processPayment(orderId, 50000))
        .rejects.toThrow('Insufficient payment');
    });
  });
});
```

### Route/Integration Tests

```typescript
// src/routes/orders.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { Elysia } from 'elysia';
import { orderRoutes } from './orders';
import { getTestToken } from '../utils/test-helpers';

describe('Order Routes', () => {
  let app: Elysia;
  let authToken: string;
  
  beforeAll(async () => {
    app = new Elysia().use(orderRoutes);
    authToken = await getTestToken({ role: 'kasir' });
  });
  
  describe('POST /api/orders', () => {
    it('should create order with valid data', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': `pos_session=${authToken}`
          },
          body: JSON.stringify({ tableId: 1, userId: 1 })
        })
      );
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.tableId).toBe(1);
    });
    
    it('should reject unauthorized requests', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/orders', {
          method: 'POST',
          body: JSON.stringify({ tableId: 1, userId: 1 })
        })
      );
      
      expect(response.status).toBe(401);
    });
  });
});
```

### Database Testing Utilities

```typescript
// src/utils/test-helpers.ts
import { db } from '../db/index';
import jwt from 'jsonwebtoken';

export async function setupTestDb() {
  // Run migrations or use test database
  // Reset sequences
}

export async function cleanupTestDb() {
  // Delete all test data
  await db.delete(orderItems);
  await db.delete(orders);
  await db.delete(tables);
}

export function getTestToken(userData: Partial<TokenPayload> = {}) {
  const defaultPayload = {
    userId: 1,
    email: 'test@example.com',
    name: 'Test User',
    role: 'kasir'
  };
  
  return jwt.sign(
    { ...defaultPayload, ...userData },
    process.env.JWT_SECRET || 'test-secret'
  );
}

export async function createTestOrder(data: Partial<NewOrder> = {}) {
  // Helper to create orders in tests
}
```

## Critical Test Areas

Based on codebase analysis, these areas need priority testing:

### 1. Stock Synchronization (`src/repositories/order.ts`, `src/repositories/inventory.ts`)
- Stock decrement only on order completion
- Rollback scenarios
- Concurrent order handling

### 2. Payment Processing (`src/services/payment.ts`)
- Change calculation accuracy
- Edge cases (exact payment, overpayment)
- Receipt generation

### 3. Authorization (`src/middleware/authorization.ts`, `src/utils/auth.ts`)
- Role-based access control
- Token validation
- Cookie handling

### 4. Order Lifecycle (`src/repositories/order.ts`)
- Status transitions (draft → active → completed/cancelled)
- Table availability updates
- Order transfer functionality

### 5. Database Operations
- Transaction integrity
- Foreign key constraints
- Index usage for queries

## Test Database Setup

### Option A: Test Database (Recommended)
```typescript
// .env.test
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=pos_db_test
JWT_SECRET=test-secret-key
```

### Option B: In-Memory with Better SQLite
Not applicable (MySQL-specific features used)

## CI/CD Integration

Add to GitHub Actions workflow:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      mysql:
        image: mysql:8
        env:
          MYSQL_ROOT_PASSWORD: root
          MYSQL_DATABASE: pos_db_test
        ports:
          - 3306:3306
    
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      
      - name: Install dependencies
        run: bun install
      
      - name: Run tests
        run: bun test
        env:
          DB_HOST: localhost
          DB_USER: root
          DB_PASSWORD: root
          DB_NAME: pos_db_test
```

## Coverage Requirements

**Recommended minimums:**
- Services: 90% (critical business logic)
- Repositories: 80% (database operations)
- Routes: 70% (happy path + error cases)
- Utils: 80% (pure functions)

**Exclusions:**
- `src/templates/` (HTML generation)
- `src/pages/` (page handlers - test via integration)

## Testing Commands

```bash
# Run all tests
bun test

# Run with coverage
bun test --coverage

# Run specific file
bun test src/services/payment.test.ts

# Watch mode
bun test --watch

# Run tests matching pattern
bun test --grep "stock"
```

---

*Testing analysis: 2026-04-11*
*Action Required: Implement testing framework and initial test suite*

