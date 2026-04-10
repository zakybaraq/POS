# Phase 2 Context - Orders Page Empty Data

**Generated:** 2026-04-10
**Phase:** 2 - Fix Orders Page

## Prior Context

From PROJECT.md, STATE.md:
- Full-stack POS application
- Phase 1: UI Halaman Kategori - Complete
- PR #82 merged

## User's Issue

**Problem:** Halaman `/orders` tidak menampilkan data dengan benar - kosong/tidak ada data meskipun seharusnya ada pesanan.

## Investigation

### Current Query Analysis

**File:** `src/repositories/order.ts` (lines 64-68)

```typescript
export async function getOrdersTodayWithTables() {
  return db.select().from(orders)
    .leftJoin(tables, eq(orders.tableId, tables.id))
    .where(gte(orders.createdAt, todayStart()))
    .orderBy(desc(orders.createdAt));
}
```

**Function:** `todayStart()` (lines 6-15)
```typescript
function todayStart(): Date {
  const now = new Date();
  const wibString = now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
  const wibDate = new Date(wibString);
  return new Date(Date.UTC(
    wibDate.getUTCFullYear(),
    wibDate.getUTCMonth(),
    wibDate.getUTCDate(),
    0, 0, 0, 0
  ));
}
```

### Potential Issues

1. **Timezone bug** - `todayStart()` calculates start of today in UTC based on current local time, but orders may be stored with different timezone
2. **No orders for today** - Actual date mismatch
3. **Query returns null/empty** - Frontend rendering issue

## Gray Areas for Discussion

1. **Debug approach** - Should we add debug logging or test directly?
2. **Fix scope** - Is this just a query fix or broader issue?

## Decisions (To Be Confirmed)

- File to investigate: `src/repositories/order.ts`, `src/pages/orders.ts`
- Priority: High - broken feature
- Next: Plan fix → Execute

## Next

After discuss-phase, run `/gsd-plan-phase 2` to create implementation plan