# Phase 5 Implementation Plan - Performance Optimization

**Status:** Ready for Execution | **Phase:** 5 of 5 | **Duration:** 7 hours

---

## Goal

Implement performance optimizations for the POS application to eliminate N+1 query patterns, add pagination limits, and create database indexes for improved query performance.

---

## Prerequisites

- [x] Phase 1-4 completed and merged
- [x] All tests passing (78/78)
- [x] Database migrations can be applied
- [x] Local development database accessible

---

## Wave 1: N+1 Query Fixes (3 hours)

### Task 1.1: Optimize Order Retrieval in Routes
**What:** Replace Promise.all/map pattern with JOIN query
**File:** `src/routes/orders.ts:36-48`

**Current Code:**
```typescript
const todayOrders = await orderRepo.getTodayOrdersByTableId(Number(tableId));
const ordersWithItems = await Promise.all(
  todayOrders.map(async (order) => {
    const items = await orderItemRepo.getItemsWithMenuByOrderId(order.id);
    return { ...order, items };
  })
);
```

**Implementation:**
1. Create optimized method `getTodayOrdersWithItemsByTableId()` in order repository
2. Use Drizzle JOIN to fetch orders + items + menus in single query
3. Group results in code to reconstruct hierarchy
4. Update route to use new method

**Success Criteria:**
- Single query execution (verified with logging)
- Response time < 100ms for 10 orders
- All existing tests pass

---

### Task 1.2: Add Additional JOIN Queries
**What:** Identify and optimize other N+1 patterns
**Files:** 
- `src/routes/orders.ts:55-56` - Single order with items
- Other routes with similar patterns

**Implementation:**
1. Create `getOrderWithItemsById()` method
2. Use JOIN pattern: orders → orderItems → menus
3. Return order with nested items array

---

## Wave 2: Pagination Standardization (2 hours)

### Task 2.1: Create Pagination Utility
**What:** Reusable pagination helper
**File:** `src/utils/pagination.ts` (new)

**Implementation:**
```typescript
export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function validatePagination(params: PaginationParams): { page: number; limit: number } {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(Math.max(1, params.limit || 50), 500);
  return { page, limit };
}
```

---

### Task 2.2: Update Report Repositories
**What:** Add pagination to report queries
**Files:**
- `src/repositories/report.ts`
- `src/repositories/financial-report.ts`

**Implementation:**
1. Add pagination params to report methods
2. Use Drizzle `.limit()` and `.offset()`
3. Return total count alongside data

**Example:**
```typescript
export async function getReportData(page = 1, limit = 50) {
  const { page: p, limit: l } = validatePagination({ page, limit });
  const offset = (p - 1) * l;
  
  const [data, total] = await Promise.all([
    db.select().from(table).limit(l).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(table)
  ]);
  
  return {
    data,
    pagination: { page: p, limit: l, total: total[0].count }
  };
}
```

---

### Task 2.3: Update Report Routes
**What:** Return pagination metadata in responses
**Files:**
- `src/routes/reports.ts`

**Implementation:**
1. Extract pagination params from query string
2. Pass to repository methods
3. Return pagination in response body

---

## Wave 3: Database Indexes (2 hours)

### Task 3.1: Add Index Definitions to Schema
**What:** Create indexes for frequently queried columns
**File:** `src/db/schema.ts`

**Indexes to Add:**
```typescript
// orders table
export const orders = mysqlTable('orders', {
  // ... existing columns
}, (table) => ({
  createdAtIdx: index('orders_created_at_idx').on(table.createdAt),
  tableStatusIdx: index('orders_table_status_idx').on(table.tableId, table.status),
  customerIdx: index('orders_customer_idx').on(table.customerId),
}));

// orderItems table
export const orderItems = mysqlTable('order_items', {
  // ... existing columns
}, (table) => ({
  orderIdx: index('order_items_order_idx').on(table.orderId),
}));

// stockMovements table
export const stockMovements = mysqlTable('stock_movements', {
  // ... existing columns
}, (table) => ({
  ingredientDateIdx: index('stock_movements_ingredient_date_idx').on(table.ingredientId, table.createdAt),
}));

// customers table
export const customers = mysqlTable('customers', {
  // ... existing columns
}, (table) => ({
  emailIdx: index('customers_email_idx').on(table.email),
}));
```

---

### Task 3.2: Generate and Run Migrations
**What:** Create migration files with drizzle-kit

**Commands:**
```bash
# Generate migration
bunx drizzle-kit generate:mysql

# Review generated migration
# Apply migration (if drizzle-kit supports it)
# Or manually run the SQL in database
```

---

### Task 3.3: Verify Index Usage
**What:** Confirm indexes are being used by queries

**Verification:**
1. Run application
2. Execute queries
3. Check MySQL EXPLAIN output to verify index usage
4. Benchmark query performance before/after

---

## Testing Strategy

### Unit Tests
- [ ] Pagination utility validation
- [ ] New repository methods

### Integration Tests
- [ ] N+1 query fix performance
- [ ] Pagination response format
- [ ] Query performance benchmarks

### Performance Tests
- [ ] Benchmark order retrieval (before/after)
- [ ] Load test report endpoints
- [ ] Database query timing

---

## Exit Criteria

### Functional
- [ ] N+1 queries eliminated in order endpoints
- [ ] Pagination working on all report endpoints
- [ ] Database indexes created and verified
- [ ] All 78 existing tests passing

### Performance
- [ ] Order retrieval < 100ms for 10 orders
- [ ] Report queries with pagination
- [ ] EXPLAIN shows index usage

### Documentation
- [ ] New methods documented
- [ ] Migration notes recorded
- [ ] Performance benchmarks saved

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Migration fails | Test locally first; have rollback SQL ready |
| Indexes slow writes | Monitor write performance; remove if needed |
| Breaking API changes | Keep backward compatibility with defaults |
| Performance regression | Benchmark before deploying |

---

## Commits

1. `feat: optimize order retrieval with JOIN queries to fix N+1 pattern`
2. `feat: add pagination utility and apply to report endpoints`
3. `feat: add database indexes for query performance`
4. `test: add performance benchmarks for optimized queries`

---

## Dependencies

- Phase 1-4 completed
- Database access for migrations
- drizzle-kit installed

---

**Created:** 2026-04-12  
**Ready for Execution:** Yes
