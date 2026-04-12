# Phase 5 Context - Performance Optimization

**Status:** Discussion Complete | **Phase:** 5 of 5 | **Effort:** 7 hours

---

## Executive Summary

Phase 5 focuses on performance optimization to address N+1 query patterns, add pagination limits, and create database indexes. This is the final phase of the POS hardening roadmap.

**Current Issues Found:**
- N+1 query pattern in order retrieval (routes/orders.ts:42-47)
- Inconsistent pagination across report endpoints
- Missing database indexes for frequently queried columns

**Expected Performance Gain:** 50-80% improvement in query response times

---

## Decisions Made

### 5.1 N+1 Query Fix Approach
**Decision:** Use Drizzle ORM relations/joins to fetch orders with items in single query

**Implementation Strategy:**
1. Replace `Promise.all(map)` pattern with LEFT JOIN query
2. Use Drizzle's relation queries or manual joins
3. Group results in code to reconstruct order-item hierarchy
4. Benchmark before/after performance

**Files to Modify:**
- `src/routes/orders.ts:42-47` - N+1 pattern location
- `src/repositories/order.ts` - Add new method with join query

**Success Criteria:**
- Single query for orders + items instead of 1+N
- Measurable performance improvement
- No duplicate data returned

---

### 5.2 Pagination Implementation
**Decision:** Standardize pagination across all list endpoints with consistent pattern

**Implementation Strategy:**
1. Create reusable pagination helper/middleware
2. Default limit: 50, Max limit: 500, Min limit: 1
3. Return pagination metadata in responses
4. Apply to all report and list endpoints

**Files to Modify:**
- `src/repositories/report.ts` - Add pagination
- `src/repositories/financial-report.ts` - Add pagination
- `src/routes/reports.ts` - Return pagination metadata
- Create pagination utility

**Success Criteria:**
- Max limit enforced (no 999999 requests)
- Pagination metadata in all list responses
- Memory usage capped

---

### 5.3 Database Indexes
**Decision:** Add indexes based on query patterns identified in codebase analysis

**Recommended Indexes:**
1. `orders(createdAt)` - For date range queries (getOrdersToday)
2. `orderItems(orderId)` - For order detail queries
3. `stockMovements(ingredientId, createdAt)` - For stock audit reports
4. `customers(email)` - For customer lookup
5. `orders(tableId, status)` - For active order lookups
6. `orders(customerId)` - For customer order history

**Implementation Strategy:**
1. Update `src/db/schema.ts` with index definitions
2. Use `drizzle-kit generate:mysql` to create migrations
3. Run migrations in development and production
4. Verify with EXPLAIN queries

**Success Criteria:**
- Indexes created and visible in schema
- EXPLAIN shows index usage for common queries
- Query performance improved
- No full table scans for indexed operations

---

## Key Findings from Codebase Analysis

### N+1 Query Location
```typescript
// src/routes/orders.ts:42-47 - PROBLEMATIC CODE
const ordersWithItems = await Promise.all(
  todayOrders.map(async (order) => {
    const items = await orderItemRepo.getItemsWithMenuByOrderId(order.id);
    return { ...order, items };
  })
);
```
**Problem:** For N orders, this makes N+1 queries (1 for orders, N for items)

### Existing Pagination
Some endpoints already use `.limit()`:
- `src/repositories/customer.ts` - getLoyaltyTransactions (limit: 20)
- `src/repositories/customer.ts` - getCustomerOrderHistory (limit: 20)
- Need to standardize and enforce max limits

### Query Patterns Requiring Indexes
1. `gte(orders.createdAt, todayStart())` - orders by date
2. `eq(orders.tableId, tableId)` + `eq(orders.status, 'active')` - active orders by table
3. `eq(orderItems.orderId, orderId)` - items by order
4. `eq(stockMovements.ingredientId, ingredientId)` - stock by ingredient

---

## Implementation Plan

### Wave 1: N+1 Query Fix (3 hours)
1. Create optimized query method in order repository
2. Update routes to use new method
3. Benchmark performance
4. Apply pattern to other endpoints if needed

### Wave 2: Pagination (2 hours)
1. Create pagination utility/helper
2. Update report repositories with pagination
3. Add pagination to route responses
4. Add validation for limit parameters

### Wave 3: Database Indexes (2 hours)
1. Add index definitions to schema
2. Generate migrations with drizzle-kit
3. Run migrations
4. Verify with EXPLAIN

---

## Technical Notes

### Drizzle Join Pattern
```typescript
// Optimized query with join
const results = await db
  .select({
    order: orders,
    item: orderItems,
    menu: menus,
  })
  .from(orders)
  .leftJoin(orderItems, eq(orders.id, orderItems.orderId))
  .leftJoin(menus, eq(orderItems.menuId, menus.id))
  .where(and(
    eq(orders.tableId, tableId),
    eq(orders.status, 'active')
  ));

// Group results in code
const ordersMap = new Map();
results.forEach(({ order, item, menu }) => {
  if (!ordersMap.has(order.id)) {
    ordersMap.set(order.id, { ...order, items: [] });
  }
  if (item) {
    ordersMap.get(order.id).items.push({ ...item, menu });
  }
});
```

### Pagination Pattern
```typescript
// Repository
export async function getOrdersPaginated(page = 1, limit = 50) {
  const maxLimit = Math.min(limit, 500);
  const offset = (page - 1) * maxLimit;
  
  const [data, total] = await Promise.all([
    db.select().from(orders).limit(maxLimit).offset(offset),
    db.select({ count: count() }).from(orders)
  ]);
  
  return {
    data,
    pagination: {
      page,
      limit: maxLimit,
      total: total[0].count,
      totalPages: Math.ceil(total[0].count / maxLimit),
    }
  };
}
```

### Index Definition
```typescript
// In schema.ts
export const orders = mysqlTable('orders', {
  // ... columns
}, (table) => ({
  createdAtIdx: index('orders_created_at_idx').on(table.createdAt),
  tableStatusIdx: index('orders_table_status_idx').on(table.tableId, table.status),
}));
```

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Indexes slow down writes | Only add indexes on read-heavy tables; monitor write performance |
| Breaking changes to API | Add pagination as optional params with defaults |
| Join queries return too much data | Use selective column selection; add LIMIT |
| Migration failures | Test migrations locally first; have rollback plan |

---

## Next Steps

1. **Create Phase 5 Plan** (PLAN.md) - detailed task breakdown
2. **Implement Wave 1** - N+1 query fixes
3. **Implement Wave 2** - Pagination standardization
4. **Implement Wave 3** - Database indexes
5. **Performance Testing** - Benchmark improvements

---

**Context Locked:** 2026-04-12
**Ready for Planning:** Yes
