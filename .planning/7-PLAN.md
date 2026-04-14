# Phase 7 Plan - Inventory Alert System

**Status:** Ready for Execution | **Phase:** 7 of 10 | **Duration:** 10 hours  
**Context:** [7-CONTEXT.md](./7-CONTEXT.md) | **Requirements:** REQ-003

---

## Goal

Implement real-time inventory monitoring and alerting system to prevent stockouts. Monitor stock levels against configurable thresholds and emit WebSocket alerts when inventory falls below safe levels.

---

## Prerequisites

- [x] Phase 6 (WebSocket) complete
- [x] 7-CONTEXT.md created with decisions
- [x] WebSocket infrastructure ready
- [x] Field `minStock` already exists in ingredients table
- [x] Default threshold: 0 (use existing minStock values)

---

## Wave 1: Low Stock Threshold Configuration (4 hours)

### Task 1.1: Verify Existing minStock Field
**What:** Confirm minStock field exists and is suitable for threshold
**File:** `src/db/schema.ts`

**Discovery:** Field `minStock` already exists on line 150:
```typescript
minStock: decimal('min_stock', { precision: 10, scale: 2 }).notNull().default('0'),
```

**Action Required:**
- ✅ Field already exists - NO schema changes needed
- [ ] Add optional index on minStock for performance (if not exists)

**Success Criteria:**
- [x] Confirmed: minStock field exists
- [ ] Optional: Add index on minStock column for faster low-stock queries

---

### Task 1.2: Add Database Index (Optional)
**What:** Add index on minStock for faster low-stock queries
**File:** `src/db/schema.ts`

**Implementation:**
```typescript
export const ingredients = mysqlTable('ingredients', {
  // ... existing fields
}, (table) => ({
  nameIdx: index('idx_ingredients_name').on(table.name),
  minStockIdx: index('idx_ingredients_min_stock').on(table.minStock), // Add this
}));
```

**Migration Command:**
```bash
bunx drizzle-kit generate:mysql
bunx drizzle-kit push:mysql
```

**Success Criteria:**
- [ ] Index added (optional optimization)
- [ ] Migration generated and applied

---

### Task 1.3: Add Threshold Repository Methods
**What:** Repository methods for threshold CRUD
**File:** `src/repositories/inventory.ts`

**Implementation:**
```typescript
// Update minStock threshold for an ingredient
export async function updateIngredientThreshold(id: number, threshold: number) {
  await db.update(ingredients)
    .set({ minStock: String(threshold) })
    .where(eq(ingredients.id, id));
  return getIngredientById(id);
}

// Get ingredients with stock below their minStock threshold
export async function getIngredientsBelowThreshold() {
  return db.select()
    .from(ingredients)
    .where(sql`${ingredients.currentStock} <= ${ingredients.minStock}`);
}

// Check if a specific ingredient is below threshold
export async function isIngredientBelowThreshold(ingredientId: number): Promise<boolean> {
  const [result] = await db.select({
    belowThreshold: sql<boolean>`${ingredients.currentStock} <= ${ingredients.minStock}`
  })
  .from(ingredients)
  .where(eq(ingredients.id, ingredientId));
  
  return result?.belowThreshold ?? false;
}
```

**Success Criteria:**
- [ ] Update method works
- [ ] Query method returns low stock items
- [ ] Single ingredient check method works

---

### Task 1.4: Add Threshold API Endpoint
**What:** REST endpoint for updating thresholds
**File:** `src/routes/inventory.ts`

**Implementation:**
```typescript
.put('/ingredients/:id/threshold', async ({ params, body }) => {
  const { threshold } = body as any;
  
  if (!threshold || threshold < 1 || threshold > 1000) {
    return { error: 'Invalid threshold (must be 1-1000)' };
  }
  
  return inventoryRepo.updateIngredientThreshold(Number(params.id), threshold);
})
```

**Success Criteria:**
- [ ] Endpoint accepts threshold updates
- [ ] Validation works (1-1000 range)
- [ ] Returns updated ingredient

---

### Task 1.5: Add Threshold UI
**What:** Frontend UI for configuring thresholds
**File:** `src/pages/inventory.ts`

**Implementation:**
- Add threshold input field in ingredient edit form
- Display current threshold in ingredient list
- Show warning icon for ingredients with low threshold vs stock

**Success Criteria:**
- [ ] UI shows current threshold
- [ ] Can edit threshold
- [ ] Changes persist

---

## Wave 2: Real-time Stock Monitoring (6 hours)

### Task 2.1: Create Inventory Monitor Service
**What:** Service to check thresholds and emit alerts
**File:** `src/services/inventory-monitor.ts` (new)

**Implementation:**
```typescript
import { getIO } from '../websocket';
import { getLoggerWithRequestId } from '../utils/logger-with-context';

const alertedIngredients = new Set<number>();
const logger = getLoggerWithRequestId();

export async function checkStockThreshold(ingredient: any) {
  const threshold = parseFloat(ingredient.minStock || '0');
  const currentStock = parseFloat(ingredient.currentStock || '0');
  
  // Skip check if threshold is 0 (no alert configured)
  if (threshold <= 0) return;
  
  if (currentStock <= threshold) {
    // Check if already alerted
    if (alertedIngredients.has(ingredient.id)) {
      return; // Already alerted
    }
    
    // Emit alert
    const io = getIO();
    io.to('admin').to('kitchen').emit('inventory:low-stock', {
      namespace: 'inventory',
      event: 'low-stock',
      payload: {
        ingredientId: ingredient.id,
        name: ingredient.name,
        currentStock,
        threshold,
        shortfall: threshold - currentStock,
        unit: ingredient.unit,
      },
      timestamp: new Date().toISOString(),
    });
    
    alertedIngredients.add(ingredient.id);
    logger.info({ ingredientId: ingredient.id, currentStock, threshold }, 'Low stock alert');
  } else {
    // Stock recovered, clear alert
    alertedIngredients.delete(ingredient.id);
  }
}

export function acknowledgeAlert(ingredientId: number) {
  alertedIngredients.delete(ingredientId);
}

export function getAlertedIngredients(): number[] {
  return Array.from(alertedIngredients);
}
```

**Success Criteria:**
- [ ] Service checks thresholds
- [ ] Emits WebSocket events
- [ ] Tracks alerted ingredients
- [ ] Acknowledgment works

---

### Task 2.2: Integrate with Stock Operations
**What:** Check threshold after stock decrements
**File:** `src/repositories/inventory.ts`

**Implementation:**
```typescript
export async function decrementStockForOrder(orderId: number) {
  // ... existing logic ...
  
  // After decrement, check thresholds
  const orderItems = await getOrderItems(orderId);
  for (const item of orderItems) {
    const ingredient = await getIngredientById(item.ingredientId);
    if (ingredient) {
      await checkStockThreshold(ingredient);
    }
  }
}
```

**Success Criteria:**
- [ ] Threshold checked after stock decrement
- [ ] Alerts emit automatically
- [ ] No duplicate alerts

---

### Task 2.3: Create Acknowledgment Endpoint
**What:** REST endpoint to acknowledge alerts
**File:** `src/routes/inventory.ts`

**Implementation:**
```typescript
.post('/alerts/:ingredientId/acknowledge', async ({ params }) => {
  acknowledgeAlert(Number(params.ingredientId));
  return { success: true };
})
```

**Success Criteria:**
- [ ] Endpoint acknowledges alerts
- [ ] Alert no longer shown

---

### Task 2.4: Add Dashboard Widget
**What:** Widget showing low stock items
**File:** `src/pages/dashboard.ts`

**Implementation:**
- Create low stock list component
- Subscribe to `inventory:low-stock` events
- Show ingredient name, current stock, threshold
- Add acknowledge button
- Auto-update on events

**Success Criteria:**
- [ ] Widget displays low stock items
- [ ] Real-time updates via WebSocket
- [ ] Acknowledge button works

---

### Task 2.5: Add Alert History (Optional)
**What:** Track alert history in database
**File:** New table + queries

**Implementation (if time permits):**
- Create `alerts` table
- Log all alerts with timestamp
- Query for alert history

**Success Criteria:**
- [ ] Alert history tracked (optional for MVP)

---

## Testing Strategy

### Unit Tests
- [ ] Threshold validation tests
- [ ] Stock monitoring logic tests
- [ ] Alert acknowledgment tests

### Integration Tests
- [ ] End-to-end alert flow
- [ ] WebSocket event emission
- [ ] Dashboard widget updates

### Manual Tests
- [ ] Create order, complete, verify alert
- [ ] Acknowledge alert
- [ ] Restock ingredient, verify alert clears
- [ ] Multiple low stock items

---

## Exit Criteria

### Functional
- [ ] Thresholds configurable per ingredient
- [ ] Alerts trigger when stock below threshold
- [ ] No duplicate alerts within window
- [ ] Acknowledgment clears alert
- [ ] Dashboard shows low stock
- [ ] All 78 existing tests passing

### Performance
- [ ] Threshold check < 100ms
- [ ] Alert emission < 500ms

---

## Commits

1. `feat: add minStockThreshold field to ingredients`
2. `feat: create inventory monitor service with alerting`
3. `feat: integrate threshold checks with stock operations`
4. `feat: add dashboard low stock widget`
5. `feat: add threshold configuration UI`

---

## Dependencies

- Phase 6 (WebSocket) complete
- Database migration tool

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Too many alerts | Implement cooldown/acknowledgment |
| Migration issues | Test on dev first |
| Performance on large inventory | Add caching if needed |

---

## Next Phase

**Phase 8:** Real-time Dashboard Backend
**Blocking:** None

---

**Created:** 2026-04-13  
**Ready for Execution:** Yes
