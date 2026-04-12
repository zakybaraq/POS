# Testing Patterns

**Analysis Date:** 2026-04-12

## Test Framework

**Runner:**
- **No test framework configured** - Jest, Vitest, or any test runner not installed
- `package.json` has no dev dependencies for testing: `@types/bun`, `drizzle-kit`, TypeScript only
- No test script in `package.json` (`npm test`, `bun test` not defined)

**Assertion Library:**
- Not applicable - no testing infrastructure

**Run Commands:**
```bash
# No test commands available
# (Would need: npm install -D vitest or jest)
```

**Status:** ⚠️ **No tests found in codebase**

## Test File Organization

**Location:**
- Scanned entire `src/` directory for test files: No `*.test.ts`, `*.spec.ts`, or `__tests__/` directories found
- Search results confirmed: 0 test files

**File Search Results:**
```bash
find /Users/zakybaraq/Desktop/pos -type f \( -name "*.test.ts" -o -name "*.spec.ts" -o -name "*\.test\.js" \) \
  ! -path "*/node_modules/*" 
# Result: No test files found
```

**Naming Convention:**
- Not applicable (no tests exist)
- Industry standard would be: `order.test.ts` or `order.spec.ts` co-located with `src/repositories/order.ts`

**Structure:**
- Not applicable

## Test Coverage

**Requirements:** None enforced (no coverage tooling installed)

**Current Status:**
- **0% coverage** - No tests means no coverage
- Critical paths untested: order creation, stock decrement, payment processing, stock transaction atomicity
- User authentication partially testable (verifyToken function exists but never tested)

## Test Types

### Unit Tests
**Scope:** Not covered
**What should be tested:**
- `verifyToken()` in `src/utils/auth.ts` - JWT parsing, error handling
- `calculateChange()` in `src/services/payment.ts` - math correctness
- `adjustStock()` in `src/repositories/inventory.ts` - stock calculation logic
- Role-based access functions: `hasRole()`, `requireRole()` in `src/middleware/authorization.ts`
- Customer tier calculations in `src/repositories/customer.ts`

**Example Unit Test (missing):**
```typescript
// Would look like:
describe('verifyToken', () => {
  it('should decode valid JWT', () => {
    const token = jwt.sign({ userId: 1, email: 'test@test.com', ... }, JWT_SECRET);
    const payload = verifyToken(token);
    expect(payload.userId).toBe(1);
  });

  it('should throw on invalid token', () => {
    expect(() => verifyToken('invalid')).toThrow();
  });
});
```

### Integration Tests
**Scope:** Not covered
**Critical paths that need integration tests:**
1. **Order Completion Flow** (HIGH PRIORITY - relates to stock sync issue):
   - Create order → add items → calculate totals → complete order → verify stock decremented
   - Database transaction rollback on stock insufficient error
   - Loyalty points added on completion
   - Table status updated to 'available'

2. **Stock Decrement Transaction** (HIGH PRIORITY):
   - `decrementStockForOrderTx()` called within `completeOrder()` transaction
   - Verify atomic: order status and stock update together or neither
   - Verify idempotency: calling twice should not double-decrement
   - Verify rollback: if stock insufficient, order stays 'active'

3. **Payment Processing**:
   - `processPayment()` → `completeOrder()` → stock decrement
   - Verify order transitions 'active' → 'completed'
   - Verify amountPaid validation (>= total)
   - Verify changeDue calculated correctly

4. **Stock Movement Tracking**:
   - Adjust stock → creates stock movement record
   - Stock movement has correct `stockBefore`, `stockAfter`, `reason`
   - Can replay stock movements to audit history

5. **Customer Loyalty**:
   - Complete order for registered customer
   - Loyalty points awarded
   - Customer tier updated based on points
   - Redemption deducts points

**Example Integration Test (missing):**
```typescript
describe('Order Completion', () => {
  it('should decrement stock and complete order atomically', async () => {
    // Setup
    const menu = await createTestMenu();
    const recipe = await createRecipe(menu.id, ingredient.id, 5);
    const ingredient = await createIngredient({ currentStock: '10' });
    const order = await createOrder(tableId, userId);
    await addItem(order.id, menu.id, 1); // needs 5 units
    
    // Execute
    const completed = await completeOrder(order.id, 100);
    
    // Verify
    expect(completed.status).toBe('completed');
    const updatedIngredient = await getIngredient(ingredient.id);
    expect(updatedIngredient.currentStock).toBe('5'); // 10 - 5
    expect(await getStockMovements(ingredient.id)).toHaveLength(1);
  });

  it('should rollback if stock insufficient', async () => {
    const menu = await createTestMenu();
    const recipe = await createRecipe(menu.id, ingredient.id, 100);
    const ingredient = await createIngredient({ currentStock: '10' });
    const order = await createOrder(tableId, userId);
    await addItem(order.id, menu.id, 1); // needs 100 units, only 10 available
    
    // Execute & Verify
    await expect(completeOrder(order.id, 100)).rejects.toThrow('Insufficient stock');
    const orderAfter = await getOrder(order.id);
    expect(orderAfter.status).toBe('active'); // unchanged
  });
});
```

### E2E Tests
**Framework:** Not used
**What could be tested:**
- Full user flow: login → create table → add order → complete payment → verify receipt
- Kitchen display updates when order created, items ready
- Staff pages load correctly with authentication
- Order history and reports generate correctly

## Test Gaps

**Critical Gaps (By Priority):**

### 1. Stock Synchronization (HIGHEST PRIORITY)
**Why tested:** Context requires atomic stock decrement on order completion
- **Untested:** `decrementStockForOrderTx()` in `src/repositories/inventory.ts` lines 193-256
- **Untested:** Transaction atomicity in `completeOrder()` lines 98-129 in `src/repositories/order.ts`
- **Risk:** Double-decrement if called twice, or no decrement if transaction fails silently
- **Scenario:** Order completes, stock decrements, then system crashes → on restart, stock should not be re-decremented
- **Test needed:**
  ```typescript
  // Verify idempotency of stock decrement
  // Verify transaction rollback on insufficient stock
  // Verify order status and stock move together or not at all
  ```

### 2. Payment Processing (HIGH PRIORITY)
**Why tested:** Handles money; must be correct
- **Untested:** `processPayment()` in `src/services/payment.ts` lines 9-28
- **Untested:** Receipt generation `generateReceipt()` lines 30-62
- **Untested:** Amount validation (sufficient funds, correct change)
- **Test needed:** Calculate change correctly, handle edge cases (exact payment, overpayment)

### 3. Order Completion (HIGH PRIORITY)
**Why tested:** Core business process affected by stock sync fix
- **Untested:** Full order lifecycle: create → add items → complete
- **Untested:** Order status transitions (draft → active → completed)
- **Untested:** Table status updates when order completes
- **Untested:** Totals calculation on completion
- **Test needed:** End-to-end order completion with multiple items

### 4. Authentication & Authorization (MEDIUM PRIORITY)
**Why tested:** Access control critical
- **Untested:** `verifyToken()` in `src/utils/auth.ts` lines 46-48
- **Untested:** `requireRole()` middleware lines 6-22 in `src/middleware/authorization.ts`
- **Untested:** Token extraction from cookies lines 19-44
- **Untested:** Expired token handling
- **Test needed:** Valid token, expired token, invalid signature, missing token

### 5. Inventory Management (MEDIUM PRIORITY)
**Why tested:** Stock accuracy depends on correct calculations
- **Untested:** `adjustStock()` in `src/repositories/inventory.ts` lines 117-163
- **Untested:** Low stock detection `getLowStockIngredients()` lines 33-35
- **Untested:** Waste/adjustment vs. out vs. in calculations
- **Untested:** Stock movement audit trail
- **Test needed:** Verify each stock type (in/out/waste/adjustment) behaves correctly

### 6. Customer & Loyalty (LOW PRIORITY - Feature)
**Untested:** `addLoyaltyPoints()` calculation
- **Untested:** Tier promotion logic
- **Untested:** Points redemption validation

### 7. Kitchen Display (LOW PRIORITY - UI)
**Untested:** Kitchen page order fetching and filtering
**Untested:** Real-time order status updates

## Mocking Strategy (Recommended)

**When to Mock:**
- Database: Use in-memory SQLite or test database container
- External APIs: Mock payment processors (if added later), SMS, email
- Clock: Mock current time for date-based tests

**When NOT to Mock:**
- Database for integration tests - use real DB schema to catch migration issues
- Order repository functions - test actual behavior
- Stock calculations - must be real to catch rounding errors

**Example Test Database Setup (missing):**
```typescript
// tests/setup.ts - NOT CURRENTLY IMPLEMENTED
import { drizzle } from 'drizzle-orm/sqlite';
import Database from 'better-sqlite3';
import { schema } from '../src/db/schema';

export function createTestDb() {
  const db = new Database(':memory:');
  const drizzleDb = drizzle(db, { schema });
  // Run migrations
  return drizzleDb;
}
```

## Recommended Test Implementation Plan

### Phase 1: Critical Path (Stock Sync Fix)
**Implement first:**
1. Set up test runner (Vitest recommended for Bun compatibility)
2. Create test database utilities
3. Write order completion integration tests
4. Write stock decrement transaction tests
5. Test idempotency of stock decrement

**Files affected:**
- `src/repositories/inventory.ts` - `decrementStockForOrderTx()`
- `src/repositories/order.ts` - `completeOrder()`
- `src/services/payment.ts` - `processPayment()`

### Phase 2: Core Business Logic
**Implement after Phase 1:**
1. Authentication tests (requireRole, verifyToken)
2. Payment processing tests
3. Inventory adjustment tests
4. Customer creation and updates

### Phase 3: API Routes
**Implement after Phase 2:**
1. Order API endpoints (GET, POST, PUT)
2. Inventory API endpoints
3. Payment endpoints
4. Customer endpoints

### Phase 4: Page Tests
**Implement after Phase 3:**
1. Kitchen display order loading
2. Orders page filtering/sorting
3. Dashboard data aggregation

## Coverage Targets

**Recommended Coverage Goals:**
- `src/repositories/` - 85%+ (data access must be correct)
- `src/services/` - 90%+ (business logic critical)
- `src/middleware/` - 90%+ (security-critical)
- `src/utils/auth.ts` - 95%+ (auth no room for bugs)
- `src/pages/` - 40%+ (HTML rendering less critical, harder to test)

**Current Status:** 0% (baseline)

## CI/CD Integration

**Not Yet Configured:**
- No test script in package.json
- No GitHub Actions or CI pipeline
- No pre-commit hooks

**Recommended Setup:**
```bash
# Install Vitest
bun add -d vitest @vitest/ui

# Add test script to package.json
"test": "vitest",
"test:ui": "vitest --ui",
"test:coverage": "vitest --coverage"

# Run before commit
pre-commit: npm test
```

## Test File Locations (Recommended)

**Structure:**
```
src/
├── repositories/
│   ├── order.ts
│   ├── order.test.ts          ← co-located test
│   ├── inventory.ts
│   ├── inventory.test.ts      ← co-located test
│   └── ...
├── services/
│   ├── payment.ts
│   └── payment.test.ts        ← co-located test
├── middleware/
│   ├── authorization.ts
│   └── authorization.test.ts  ← co-located test
├── utils/
│   ├── auth.ts
│   └── auth.test.ts           ← co-located test
└── ...
tests/
├── setup.ts                   ← test database utilities
├── fixtures.ts                ← test data factories
└── e2e/
    ├── order-flow.test.ts     ← end-to-end tests
    └── kitchen.test.ts
```

---

*Testing analysis: 2026-04-12*
*Status: NO TESTS FOUND - Complete coverage gap. Recommend Phase 1 implementation for stock sync testing.*
