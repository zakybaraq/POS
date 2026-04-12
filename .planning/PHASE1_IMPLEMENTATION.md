# Phase 1: Data Integrity Fixes - Implementation Plan

**Status:** Ready to execute
**Date:** 2026-04-12
**Effort:** 15 hours | **Risk:** Medium | **Business Impact:** CRITICAL

---

## Overview

Phase 1 addresses 4 critical race conditions that can cause order data corruption, stock inconsistency, and financial inaccuracies. All fixes use database transactions to ensure atomicity.

### Execution Sequence (Recommended)
1. **1.1 Item Operations TX** (4 hrs) - Foundation; most frequently used
2. **1.2 Table Transfer TX** (3 hrs) - Quick win; simple scenario
3. **1.4 Payment Ambiguity** (3 hrs) - Clarify logic; prepares for 1.3
4. **1.3 Cancellation Refunds** (5 hrs) - Complex; depends on 1.1 & 1.4

---

## Task 1.1: Fix Order Item Operation Race Conditions

**Current Problem:**
```
POST /api/orders/:id/items (add item)
    ↓ Insert orderItem
    ↓ [NO TRANSACTION]
    ✗ If calculateTotals() runs here, it sees incomplete state
    ✓ Finish operation
```

Multiple concurrent add/remove operations can result in:
- Lost items (second insert overwrites first)
- Incorrect totals (calculated mid-operation)
- Orphaned items (not counted in final total)

**Desired Behavior:**
```
POST /api/orders/:id/items (add item)
    ↓ Start Transaction
    ├─ Insert/Update orderItem
    ├─ Calculate totals
    ├─ Update order totals
    ↓ Commit Transaction (all-or-nothing)
```

### Implementation Details

#### Step 1.1.1: Create Transactional Add Item Function

**File:** `src/repositories/order-item.ts`

**New Function:**
```typescript
export async function addItemTx(
  tx: any,
  orderId: number,
  menuId: number,
  quantity: number = 1,
  notes: string = ''
) {
  // Check menu exists and get price
  const menu = await tx.select().from(menus)
    .where(eq(menus.id, menuId))
    .then(r => r[0]);
  
  if (!menu) {
    throw new Error(`Menu item #${menuId} not found`);
  }

  // Check if item already in order
  const existingItem = await tx.select().from(orderItems)
    .where(and(eq(orderItems.orderId, orderId), eq(orderItems.menuId, menuId)))
    .then(items => items[0] || null);

  if (existingItem) {
    // Update quantity
    await tx.update(orderItems)
      .set({ quantity: existingItem.quantity + quantity })
      .where(eq(orderItems.id, existingItem.id));
    return { ...existingItem, quantity: existingItem.quantity + quantity };
  }

  // Insert new item
  await tx.insert(orderItems).values({
    orderId,
    menuId,
    quantity,
    priceAtOrder: menu.price,
    notes,
    status: 'pending',
  });

  return { orderId, menuId, quantity, priceAtOrder: menu.price, notes, status: 'pending' };
}

// Keep non-TX version for backwards compatibility (optional)
export async function addItem(orderId: number, menuId: number, quantity: number = 1, notes: string = '') {
  return db.transaction(tx => addItemTx(tx, orderId, menuId, quantity, notes));
}
```

**Impact:** Lines 6-29 in current `addItem()` now become transactional variant

---

#### Step 1.1.2: Create Transactional Update Quantity Function

**File:** `src/repositories/order-item.ts`

**New Function:**
```typescript
export async function updateQuantityTx(tx: any, itemId: number, quantity: number) {
  if (quantity <= 0) {
    // Delete instead of update
    return tx.delete(orderItems).where(eq(orderItems.id, itemId));
  }
  
  await tx.update(orderItems)
    .set({ quantity, updatedAt: new Date() })
    .where(eq(orderItems.id, itemId));
  
  return { id: itemId, quantity, updatedAt: new Date() };
}

export async function updateQuantity(itemId: number, quantity: number) {
  return db.transaction(tx => updateQuantityTx(tx, itemId, quantity));
}
```

**Impact:** Lines 37-43 refactored

---

#### Step 1.1.3: Create Transactional Remove Item Function

**File:** `src/repositories/order-item.ts`

**New Function:**
```typescript
export async function removeItemTx(tx: any, itemId: number) {
  const result = await tx.delete(orderItems).where(eq(orderItems.id, itemId));
  return result;
}

export async function removeItem(itemId: number) {
  return db.transaction(tx => removeItemTx(tx, itemId));
}
```

**Impact:** Lines 45-47 refactored

---

#### Step 1.1.4: Update Order Routes to Use Transactional Add Item

**File:** `src/routes/orders.ts`

**Current (Broken):**
```typescript
// Line ~114-122
.post('/:id/items', async ({ params: { id }, body, cookie, headers }) => {
  const user = getUserFromRequest(cookie, headers);
  if (!user) return { error: 'Unauthorized' };
  
  const { menuId, quantity } = body as any;
  await orderItemRepo.addItem(Number(id), menuId, quantity); // ← NOT transactional
  await orderRepo.calculateTotals(Number(id)); // ← Separate operation
  const order = await orderRepo.getOrderById(Number(id));
  return { order, success: true };
})
```

**Fixed:**
```typescript
.post('/:id/items', async ({ params: { id }, body, cookie, headers }) => {
  const user = getUserFromRequest(cookie, headers);
  if (!user) return { error: 'Unauthorized' };
  
  const { menuId, quantity, notes } = body as any;
  
  // Validate input
  if (!menuId || !quantity || quantity <= 0) {
    return { error: 'menuId and quantity > 0 are required', status: 400 };
  }
  
  // Single transaction for add item + calculate totals
  const order = await db.transaction(async (tx) => {
    // Add/update item
    await orderItemRepo.addItemTx(tx, Number(id), menuId, quantity || 1, notes || '');
    
    // Recalculate totals within same transaction
    const items = await tx.select().from(orderItems)
      .where(eq(orderItems.orderId, Number(id)));
    
    let subtotal = 0;
    for (const item of items) {
      subtotal += Number(item.priceAtOrder) * item.quantity;
    }
    const tax = subtotal * 0.1; // Assume 10% tax
    const total = subtotal + tax;
    
    await tx.update(orders)
      .set({ subtotal, tax, total, updatedAt: new Date() })
      .where(eq(orders.id, Number(id)));
    
    return tx.select().from(orders).where(eq(orders.id, Number(id))).then(r => r[0]);
  });
  
  return { order, success: true };
})
```

**Changes:**
- Wrap add item + calculate totals in single transaction
- Add input validation
- Return updated order to verify success

---

#### Step 1.1.5: Update Remove Item Endpoint

**File:** `src/routes/orders.ts`

**Current (Broken):**
```typescript
// Line ~170-175
.delete('/:id/items/:itemId', async ({ params: { id, itemId }, cookie, headers }) => {
  const user = getUserFromRequest(cookie, headers);
  if (!user) return { error: 'Unauthorized' };
  
  await orderItemRepo.removeItem(Number(itemId)); // ← NOT transactional
  const order = await orderRepo.getOrderById(Number(id));
  return { order, success: true };
})
```

**Fixed:**
```typescript
.delete('/:id/items/:itemId', async ({ params: { id, itemId }, cookie, headers }) => {
  const user = getUserFromRequest(cookie, headers);
  if (!user) return { error: 'Unauthorized' };
  
  const order = await db.transaction(async (tx) => {
    // Remove item
    await orderItemRepo.removeItemTx(tx, Number(itemId));
    
    // Recalculate totals
    const items = await tx.select().from(orderItems)
      .where(eq(orderItems.orderId, Number(id)));
    
    let subtotal = 0;
    for (const item of items) {
      subtotal += Number(item.priceAtOrder) * item.quantity;
    }
    const tax = subtotal * 0.1;
    const total = subtotal + tax;
    
    await tx.update(orders)
      .set({ subtotal, tax, total, updatedAt: new Date() })
      .where(eq(orders.id, Number(id)));
    
    return tx.select().from(orders).where(eq(orders.id, Number(id))).then(r => r[0]);
  });
  
  return { order, success: true };
})
```

---

#### Step 1.1.6: Update Update Quantity Endpoint

**File:** `src/routes/orders.ts`

**Current (Broken):**
```typescript
// Line ~188-201
.put('/:id/items/:itemId', async ({ params: { id, itemId }, body, cookie, headers }) => {
  const user = getUserFromRequest(cookie, headers);
  if (!user) return { error: 'Unauthorized' };
  
  const { quantity } = body as any;
  await orderItemRepo.updateQuantity(Number(itemId), quantity); // ← NOT transactional
  const order = await orderRepo.getOrderById(Number(id));
  return { order, success: true };
})
```

**Fixed:**
```typescript
.put('/:id/items/:itemId', async ({ params: { id, itemId }, body, cookie, headers }) => {
  const user = getUserFromRequest(cookie, headers);
  if (!user) return { error: 'Unauthorized' };
  
  const { quantity } = body as any;
  
  if (!quantity || quantity < 0) {
    return { error: 'quantity >= 0 required', status: 400 };
  }
  
  const order = await db.transaction(async (tx) => {
    // Update quantity (or remove if 0)
    await orderItemRepo.updateQuantityTx(tx, Number(itemId), quantity);
    
    // Recalculate totals
    const items = await tx.select().from(orderItems)
      .where(eq(orderItems.orderId, Number(id)));
    
    let subtotal = 0;
    for (const item of items) {
      subtotal += Number(item.priceAtOrder) * item.quantity;
    }
    const tax = subtotal * 0.1;
    const total = subtotal + tax;
    
    await tx.update(orders)
      .set({ subtotal, tax, total, updatedAt: new Date() })
      .where(eq(orders.id, Number(id)));
    
    return tx.select().from(orders).where(eq(orders.id, Number(id))).then(r => r[0]);
  });
  
  return { order, success: true };
})
```

---

### Test Cases for 1.1

**File:** `test/integration/order-items.test.ts` (new)

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as orderRepo from '../../src/repositories/order';
import * as orderItemRepo from '../../src/repositories/order-item';
import { db } from '../../src/db/index';

describe('Order Item Operations (Transactional)', () => {
  let orderId: number;
  
  beforeEach(async () => {
    // Create test order
    const order = await orderRepo.createOrder(1, 1);
    orderId = order.id;
  });
  
  it('should add item to order and calculate totals atomically', async () => {
    const result = await db.transaction(async (tx) => {
      await orderItemRepo.addItemTx(tx, orderId, 1, 2); // Menu 1, qty 2
      // Verify item added in transaction
      const items = await tx.select().from(orderItems)
        .where(eq(orderItems.orderId, orderId));
      expect(items).toHaveLength(1);
      return items[0];
    });
    
    expect(result.quantity).toBe(2);
  });
  
  it('should prevent duplicate items and increase quantity instead', async () => {
    await orderItemRepo.addItem(orderId, 1, 2);
    await orderItemRepo.addItem(orderId, 1, 3); // Add same menu again
    
    const items = await orderItemRepo.getItemsByOrderId(orderId);
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(5); // 2 + 3
  });
  
  it('should roll back item and total update if one fails', async () => {
    try {
      await db.transaction(async (tx) => {
        await orderItemRepo.addItemTx(tx, orderId, 1, 1);
        throw new Error('Simulated failure');
      });
    } catch (e) {
      // Expected
    }
    
    const items = await orderItemRepo.getItemsByOrderId(orderId);
    expect(items).toHaveLength(0); // Rollback should remove item
  });
  
  it('should update quantity atomically', async () => {
    await orderItemRepo.addItem(orderId, 1, 2);
    const items = await orderItemRepo.getItemsByOrderId(orderId);
    const itemId = items[0].id;
    
    await orderItemRepo.updateQuantity(itemId, 5);
    const updated = await orderItemRepo.getItemsByOrderId(orderId);
    expect(updated[0].quantity).toBe(5);
  });
  
  it('should remove item when quantity set to 0', async () => {
    await orderItemRepo.addItem(orderId, 1, 2);
    const items = await orderItemRepo.getItemsByOrderId(orderId);
    const itemId = items[0].id;
    
    await orderItemRepo.updateQuantity(itemId, 0);
    const remaining = await orderItemRepo.getItemsByOrderId(orderId);
    expect(remaining).toHaveLength(0);
  });
  
  afterEach(async () => {
    // Cleanup
    await orderRepo.deleteOrder(orderId);
  });
});
```

---

### Rollback Plan for 1.1

If issues occur after deployment:
1. Revert commits for order-item.ts and routes/orders.ts
2. Re-run old non-transactional code
3. Manually verify order totals for orders created during buggy period
4. If totals incorrect, recalculate and update via admin endpoint

---

## Task 1.2: Fix Table Status Race Condition in Order Transfer

**Current Problem:**
```
POST /api/orders/:id/transfer (transfer to another table)
    ├─ Update source table status to 'available'
    ├─ [Network failure / timeout]
    ├─ Update target table status to 'occupied'
    ├─ Update order.tableId
    ✗ If timeout between steps: both tables could be available or occupied
```

**Scenario:**
- Table A: order active (occupied)
- Transfer order to Table B
- Network failure after Table A marked available but before Table B marked occupied
- Result: Table B shows available but has order!

**Desired Behavior:**
```
POST /api/orders/:id/transfer
    ↓ Start Transaction
    ├─ Verify target table is available
    ├─ Update source table to 'available'
    ├─ Update target table to 'occupied'
    ├─ Update order.tableId
    ↓ Commit (all-or-nothing)
```

### Implementation Details

#### Step 1.2.1: Create Transactional Table Transfer Function

**File:** `src/repositories/order.ts`

**New Function:**
```typescript
export async function transferOrderToTableTx(
  tx: any,
  orderId: number,
  sourceTableId: number,
  targetTableId: number
) {
  // Verify order exists
  const order = await tx.select().from(orders)
    .where(eq(orders.id, orderId))
    .then(r => r[0]);
  
  if (!order) {
    throw new Error(`Order #${orderId} not found`);
  }
  
  if (order.tableId !== sourceTableId) {
    throw new Error(`Order #${orderId} not on table #${sourceTableId}`);
  }
  
  // Verify source table exists
  const sourceTable = await tx.select().from(tables)
    .where(eq(tables.id, sourceTableId))
    .then(r => r[0]);
  
  if (!sourceTable) {
    throw new Error(`Source table #${sourceTableId} not found`);
  }
  
  // Verify target table exists AND is available
  const targetTable = await tx.select().from(tables)
    .where(eq(tables.id, targetTableId))
    .then(r => r[0]);
  
  if (!targetTable) {
    throw new Error(`Target table #${targetTableId} not found`);
  }
  
  if (targetTable.status === 'occupied') {
    throw new Error(`Target table #${targetTableId} is occupied`);
  }
  
  // Atomic updates:
  // 1. Mark source table available
  await tx.update(tables)
    .set({ status: 'available', updatedAt: new Date() })
    .where(eq(tables.id, sourceTableId));
  
  // 2. Mark target table occupied
  await tx.update(tables)
    .set({ status: 'occupied', updatedAt: new Date() })
    .where(eq(tables.id, targetTableId));
  
  // 3. Update order with new tableId
  await tx.update(orders)
    .set({ tableId: targetTableId, updatedAt: new Date() })
    .where(eq(orders.id, orderId));
  
  return {
    orderId,
    sourceTableId,
    targetTableId,
    status: 'transferred',
  };
}

export async function transferOrderToTable(
  orderId: number,
  sourceTableId: number,
  targetTableId: number
) {
  return db.transaction(tx => 
    transferOrderToTableTx(tx, orderId, sourceTableId, targetTableId)
  );
}
```

---

#### Step 1.2.2: Update Order Transfer Route

**File:** `src/routes/orders.ts`

**Current (Broken):**
```typescript
// Approximate line ~274-291
.post('/:id/transfer', async ({ params: { id }, body, cookie, headers }) => {
  const user = getUserFromRequest(cookie, headers);
  if (!user) return { error: 'Unauthorized' };
  
  const { sourceTableId, targetTableId } = body as any;
  const order = await orderRepo.getOrderById(Number(id));
  
  if (!order) return { error: 'Order not found' };
  if (order.tableId !== sourceTableId) {
    return { error: 'Order not on source table' };
  }
  
  // ✗ Multiple separate calls - race condition!
  await tableRepo.updateTableStatus(sourceTableId, 'available');
  await tableRepo.updateTableStatus(targetTableId, 'occupied');
  await orderRepo.updateOrder(Number(id), { tableId: targetTableId });
  
  const updated = await orderRepo.getOrderById(Number(id));
  return { order: updated, success: true };
})
```

**Fixed:**
```typescript
.post('/:id/transfer', async ({ params: { id }, body, cookie, headers }) => {
  const user = getUserFromRequest(cookie, headers);
  if (!user) return { error: 'Unauthorized' };
  
  const { sourceTableId, targetTableId } = body as any;
  
  // Validate input
  if (!sourceTableId || !targetTableId) {
    return { error: 'sourceTableId and targetTableId required', status: 400 };
  }
  
  if (sourceTableId === targetTableId) {
    return { error: 'Source and target must be different', status: 400 };
  }
  
  try {
    // Atomic transaction
    await orderRepo.transferOrderToTable(
      Number(id),
      sourceTableId,
      targetTableId
    );
    
    const updated = await orderRepo.getOrderById(Number(id));
    return { order: updated, success: true };
  } catch (error: any) {
    return { error: error.message, status: 400 };
  }
})
```

---

### Test Cases for 1.2

**File:** `test/integration/order-transfer.test.ts` (new)

```typescript
describe('Order Transfer (Transactional)', () => {
  let orderId: number;
  let sourceTableId = 1;
  let targetTableId = 2;
  
  beforeEach(async () => {
    const order = await orderRepo.createOrder(sourceTableId, 1);
    orderId = order.id;
    // Table 1 is now occupied, Table 2 is available
  });
  
  it('should transfer order to new table atomically', async () => {
    await orderRepo.transferOrderToTable(orderId, sourceTableId, targetTableId);
    
    const order = await orderRepo.getOrderById(orderId);
    expect(order.tableId).toBe(targetTableId);
    
    const sourceTable = await tableRepo.getTableById(sourceTableId);
    expect(sourceTable.status).toBe('available');
    
    const targetTable = await tableRepo.getTableById(targetTableId);
    expect(targetTable.status).toBe('occupied');
  });
  
  it('should rollback if target table occupied', async () => {
    // Mark target as occupied
    await tableRepo.updateTableStatus(targetTableId, 'occupied');
    
    try {
      await orderRepo.transferOrderToTable(orderId, sourceTableId, targetTableId);
      expect.fail('Should have thrown');
    } catch (e: any) {
      expect(e.message).toContain('occupied');
    }
    
    // Verify original state unchanged
    const order = await orderRepo.getOrderById(orderId);
    expect(order.tableId).toBe(sourceTableId);
  });
  
  it('should prevent transfer if order not on source table', async () => {
    try {
      await orderRepo.transferOrderToTable(orderId, 999, targetTableId);
      expect.fail('Should have thrown');
    } catch (e: any) {
      expect(e.message).toContain('not on table');
    }
  });
});
```

---

## Task 1.3: Fix Order Cancellation Stock Refund Gap

**Current Problem:**
```
Order lifecycle:
1. Create order (stock not decremented yet)
2. Add items
3. Process payment → status='completed' → stock DECREMENTS
4. User cancels → status='cancelled' → stock NOT REFUNDED
✗ Result: Inventory inconsistent; stock never returned to available
```

**Scenario:**
- Pizza order completed, stock: Flour went from 100 → 80
- Customer cancels (refund issued)
- Stock still shows: Flour 80 (should be 100 again)
- Next pizza order fails: "Insufficient flour"

**Desired Behavior:**
```
Order cancelled after completion:
1. Check if order was completed (stock was decremented)
2. If yes: Create "refund" entries in stockMovements
3. Increment ingredient.currentStock for each item
4. Mark order as 'cancelled'
5. Mark table as 'available'
```

### Implementation Details

#### Step 1.3.1: Create Stock Refund Function

**File:** `src/repositories/inventory.ts`

**New Function:**
```typescript
export async function refundStockForOrderTx(tx: any, orderId: number) {
  // Verify order exists and is completed
  const order = await tx.select().from(orders)
    .where(eq(orders.id, orderId))
    .then(r => r[0]);
  
  if (!order) {
    throw new Error(`Order #${orderId} not found`);
  }
  
  if (order.status !== 'completed') {
    // Order was never completed, so stock was never decremented
    return { orderId, refunded: false, reason: 'Order was not completed' };
  }
  
  // Check if already refunded (to prevent double-refund)
  const existingRefunds = await tx.select().from(stockMovements)
    .where(
      and(
        eq(stockMovements.referenceId, orderId),
        eq(stockMovements.type, 'in'), // Refunds are 'in' type
        sql`reason LIKE '%Refund%'`
      )
    )
    .then(r => r.length > 0);
  
  if (existingRefunds) {
    return { orderId, refunded: false, reason: 'Already refunded' };
  }
  
  // Get order items
  const items = await tx.select().from(orderItems)
    .where(eq(orderItems.orderId, orderId));
  
  if (!items || items.length === 0) {
    return { orderId, refunded: false, reason: 'No items in order' };
  }
  
  // For each item, restore stock
  for (const item of items) {
    const recipes = await tx.select().from(recipes)
      .where(eq(recipes.menuId, item.menuId));
    
    for (const recipe of recipes) {
      const ingredient = await tx.select().from(ingredients)
        .where(eq(ingredients.id, recipe.ingredientId))
        .then(r => r[0]);
      
      if (!ingredient) continue;
      
      const refundQuantity = Number(recipe.quantity) * item.quantity;
      const currentStock = Number(ingredient.currentStock);
      const newStock = currentStock + refundQuantity;
      
      // Update ingredient stock
      await tx.update(ingredients)
        .set({ currentStock: String(newStock), updatedAt: new Date() })
        .where(eq(ingredients.id, recipe.ingredientId));
      
      // Record refund in stockMovements
      await tx.insert(stockMovements).values({
        ingredientId: recipe.ingredientId,
        type: 'in', // Refund is an inbound movement
        quantity: String(refundQuantity),
        stockBefore: String(currentStock),
        stockAfter: String(newStock),
        reason: `Refund for cancelled order #${orderId}`,
        referenceId: orderId,
        createdAt: new Date(),
      });
    }
  }
  
  return { orderId, refunded: true, itemsRefunded: items.length };
}
```

**Imports to add:**
```typescript
import { recipes, ingredients, stockMovements, orders, orderItems } from '../db/schema';
```

---

#### Step 1.3.2: Update Order Cancellation Route

**File:** `src/routes/orders.ts`

**Current (Broken):**
```typescript
// Line ~231-253
.post('/:id/cancel', async ({ params: { id }, body, cookie, headers }) => {
  const user = getUserFromRequest(cookie, headers);
  if (!user) return { error: 'Unauthorized' };
  
  const order = await orderRepo.getOrderById(Number(id));
  if (!order) return { error: 'Order not found' };
  
  await orderRepo.updateOrderStatus(Number(id), 'cancelled');
  
  // ✗ NO STOCK REFUND LOGIC!
  
  return { order, success: true };
})
```

**Fixed:**
```typescript
.post('/:id/cancel', async ({ params: { id }, body, cookie, headers }) => {
  const user = getUserFromRequest(cookie, headers);
  if (!user) return { error: 'Unauthorized' };
  
  const { reason } = body as any;
  
  const order = await db.transaction(async (tx) => {
    const existing = await tx.select().from(orders)
      .where(eq(orders.id, Number(id)))
      .then(r => r[0]);
    
    if (!existing) {
      throw new Error('Order not found');
    }
    
    if (existing.status === 'cancelled') {
      throw new Error('Order already cancelled');
    }
    
    // If order was completed, refund stock
    if (existing.status === 'completed') {
      const { inventoryService } = await import('../repositories/inventory');
      await inventoryService.refundStockForOrderTx(tx, Number(id));
    }
    
    // Mark order cancelled
    await tx.update(orders)
      .set({ 
        status: 'cancelled', 
        completedAt: new Date(),
        notes: reason || '',
        updatedAt: new Date()
      })
      .where(eq(orders.id, Number(id)));
    
    // Mark table as available (if dine-in order)
    if (existing.tableId && existing.tableId > 0) {
      await tx.update(tables)
        .set({ status: 'available', updatedAt: new Date() })
        .where(eq(tables.id, existing.tableId));
    }
    
    return tx.select().from(orders)
      .where(eq(orders.id, Number(id)))
      .then(r => r[0]);
  });
  
  return { order, success: true };
})
```

---

### Test Cases for 1.3

**File:** `test/integration/order-cancellation.test.ts` (new)

```typescript
describe('Order Cancellation with Stock Refund', () => {
  let orderId: number;
  
  beforeEach(async () => {
    const order = await orderRepo.createOrder(1, 1);
    orderId = order.id;
  });
  
  it('should not refund stock if order not completed', async () => {
    const result = await inventoryRepo.refundStockForOrderTx(
      db.transaction,
      orderId
    );
    expect(result.refunded).toBe(false);
    expect(result.reason).toContain('not completed');
  });
  
  it('should refund stock when completed order is cancelled', async () => {
    // Add item and complete order
    const menu = await menuRepo.getMenuById(1);
    await orderItemRepo.addItem(orderId, menu.id, 2);
    
    // Mock completing order (which decrements stock)
    const stockBefore = 100;
    await inventoryRepo.adjustStock(1, 'out', 4, 'Order'); // Simulate decrement
    
    // Now cancel and verify refund
    const result = await inventoryRepo.refundStockForOrderTx(
      db.transaction,
      orderId
    );
    
    expect(result.refunded).toBe(true);
    
    // Verify stock was restored
    const ingredient = await inventoryRepo.getIngredientById(1);
    expect(ingredient.currentStock).toBe(stockBefore);
  });
  
  it('should prevent double-refund', async () => {
    // First refund
    await inventoryRepo.refundStockForOrderTx(db.transaction, orderId);
    
    // Second attempt should fail
    const result = await inventoryRepo.refundStockForOrderTx(
      db.transaction,
      orderId
    );
    
    expect(result.refunded).toBe(false);
    expect(result.reason).toContain('Already refunded');
  });
});
```

---

## Task 1.4: Clarify Order Completion Payment Logic

**Current Problem:**
```
completeOrder() signature unclear:
  completeOrder(id, amountPaid, markCompleted)
  
Routes call it differently:
  1. paymentService.processPayment() → completeOrder(id, amountPaid, true)
  2. POST /api/orders/:id/finish → completeOrder(id, 0, true)
  
Result: Unclear if stock decrements on unpaid finish
```

**Ambiguity:**
- Is "finish" = "complete"? (current code says yes)
- Should unpaid orders trigger stock decrement? (current code says yes)
- What's the difference between payment-based completion and manual finish?

**Desired Behavior:**
```
Two distinct operations:

1. completeOrder(orderId, amountPaid)
   - Called by payment service (payment verified)
   - Updates status = 'completed'
   - Decrements stock (payment received, goods will be delivered)
   - Records payment info
   
2. finishOrderWithoutPayment(orderId)
   - Called by manual finish endpoint (for future credits, split payments, etc.)
   - Updates status = 'completed'
   - Does NOT decrement stock (payment pending)
   - Marks order for manual review
```

### Implementation Details

#### Step 1.4.1: Refactor completeOrder Function

**File:** `src/repositories/order.ts`

**Current (Ambiguous):**
```typescript
// Lines 92-114
export async function completeOrder(id: number, amountPaid: number, markCompleted: boolean = true) {
  const order = await getOrderById(id);
  if (!order) return null;

  const changeDue = amountPaid - order.total;

  return await db.transaction(async (tx) => {
    try {
      const updateData: Record<string, unknown> = {
        amountPaid,
        changeDue,
      };
      if (markCompleted) {
        updateData.status = 'completed';
        updateData.completedAt = new Date();
      }
      // ... rest of code ...
    } catch (e) {
      throw e;
    }
  });
}
```

**Fixed (Clear, separated logic):**
```typescript
/**
 * Complete order with payment (stock will be decremented)
 * Called when payment is processed and verified
 */
export async function completeOrderWithPayment(
  id: number,
  amountPaid: number
) {
  const order = await getOrderById(id);
  if (!order) {
    throw new Error(`Order #${id} not found`);
  }
  
  if (amountPaid < order.total) {
    throw new Error(`Payment insufficient: ${amountPaid} < ${order.total}`);
  }
  
  const changeDue = amountPaid - order.total;
  
  return await db.transaction(async (tx) => {
    // 1. Update order status and payment
    await tx.update(orders)
      .set({
        status: 'completed',
        amountPaid,
        changeDue,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, id));
    
    // 2. Decrement stock (payment received, order can be fulfilled)
    const { decrementStockForOrderTx } = await import('./inventory');
    await decrementStockForOrderTx(tx, id);
    
    // 3. Update customer loyalty (if applicable)
    if (order.customerId) {
      const { addLoyaltyPointsTx, updateCustomerVisitTx } = await import('./customer');
      await addLoyaltyPointsTx(tx, order.customerId, Math.floor(order.total / 100));
      await updateCustomerVisitTx(tx, order.customerId);
    }
    
    return tx.select().from(orders)
      .where(eq(orders.id, id))
      .then(r => r[0]);
  });
}

/**
 * Finish order without payment (stock will NOT be decremented)
 * Used for future payment, split payments, or manual review scenarios
 */
export async function finishOrderWithoutPayment(id: number) {
  const order = await getOrderById(id);
  if (!order) {
    throw new Error(`Order #${id} not found`);
  }
  
  return await db.transaction(async (tx) => {
    await tx.update(orders)
      .set({
        status: 'completed',
        completedAt: new Date(),
        notes: 'Marked complete without payment - manual review required',
        updatedAt: new Date(),
      })
      .where(eq(orders.id, id));
    
    return tx.select().from(orders)
      .where(eq(orders.id, id))
      .then(r => r[0]);
  });
}

// Keep old function for backwards compatibility (logs deprecation warning)
export async function completeOrder(
  id: number,
  amountPaid: number,
  markCompleted: boolean = true
) {
  console.warn(
    'completeOrder() is deprecated. Use completeOrderWithPayment() or finishOrderWithoutPayment() instead'
  );
  if (markCompleted && amountPaid > 0) {
    return completeOrderWithPayment(id, amountPaid);
  }
  return finishOrderWithoutPayment(id);
}
```

---

#### Step 1.4.2: Update Payment Service

**File:** `src/services/payment.ts`

**Current:**
```typescript
// Line ~24
export async function processPayment(orderId: number, amountPaid: number) {
  const order = orderRepo.getOrderById(orderId);
  // ... validation ...
  return orderRepo.completeOrder(orderId, amountPaid, true);
}
```

**Fixed:**
```typescript
export async function processPayment(orderId: number, amountPaid: number) {
  const order = await orderRepo.getOrderById(orderId);
  
  if (!order) {
    throw new Error(`Order #${orderId} not found`);
  }
  
  if (amountPaid <= 0) {
    throw new Error('Amount must be positive');
  }
  
  // Use explicit function name (payment-based completion)
  return orderRepo.completeOrderWithPayment(orderId, amountPaid);
}
```

---

#### Step 1.4.3: Update Order Finish Endpoint

**File:** `src/routes/orders.ts`

**Current (Ambiguous):**
```typescript
// Line ~268
.post('/:id/finish', async ({ params: { id }, cookie, headers }) => {
  const user = getUserFromRequest(cookie, headers);
  if (!user) return { error: 'Unauthorized' };
  
  const order = await orderRepo.completeOrder(Number(id), 0, true); // ← What does this do?
  return { order, success: true };
})
```

**Fixed (Clear intent):**
```typescript
.post('/:id/finish', async ({ params: { id }, body, cookie, headers }) => {
  const user = getUserFromRequest(cookie, headers);
  if (!user) return { error: 'Unauthorized' };
  
  const { requirePayment } = body as any; // Allow flexibility
  
  const order = await (requirePayment === true
    ? orderRepo.completeOrderWithPayment(Number(id), 0) // Will throw if amount insufficient
    : orderRepo.finishOrderWithoutPayment(Number(id)) // Finish without payment check
  );
  
  return { order, success: true };
})
```

---

### Test Cases for 1.4

**File:** `test/integration/order-completion.test.ts` (new)

```typescript
describe('Order Completion - Clear Payment Logic', () => {
  let orderId: number;
  let orderTotal = 100000; // 100k IDR
  
  beforeEach(async () => {
    const order = await orderRepo.createOrder(1, 1);
    orderId = order.id;
    // Set order total
    await orderRepo.updateOrderTotals(orderId, 100000, 10000, 110000);
  });
  
  it('should complete with payment and decrement stock', async () => {
    const result = await orderRepo.completeOrderWithPayment(orderId, 110000);
    
    expect(result.status).toBe('completed');
    expect(result.amountPaid).toBe(110000);
    expect(result.changeDue).toBe(0);
    
    // Verify stock was decremented (check stockMovements)
    const movements = await stockMovementRepo.getMovementsByOrderId(orderId);
    expect(movements.length).toBeGreaterThan(0);
  });
  
  it('should reject insufficient payment', async () => {
    try {
      await orderRepo.completeOrderWithPayment(orderId, 50000); // Less than total
      expect.fail('Should have thrown');
    } catch (e: any) {
      expect(e.message).toContain('insufficient');
    }
  });
  
  it('should finish without payment and NOT decrement stock', async () => {
    const result = await orderRepo.finishOrderWithoutPayment(orderId);
    
    expect(result.status).toBe('completed');
    expect(result.amountPaid).toBeUndefined(); // No payment recorded
    
    // Verify stock was NOT decremented
    const movements = await stockMovementRepo.getMovementsByOrderId(orderId);
    expect(movements.length).toBe(0);
  });
  
  it('should calculate change correctly', async () => {
    const result = await orderRepo.completeOrderWithPayment(orderId, 150000);
    
    expect(result.changeDue).toBe(40000); // 150000 - 110000
  });
});
```

---

## Execution Checklist

### Pre-Execution
- [ ] Backup production database
- [ ] Create feature branch: `git checkout -b fix/data-integrity-phase1`
- [ ] Ensure all new test files exist in `test/` directory
- [ ] Review all code changes with team

### 1.1: Item Operations TX (4 hrs)
- [ ] Add `addItemTx()`, `updateQuantityTx()`, `removeItemTx()` to order-item.ts
- [ ] Update 3 order routes (add/update/remove items)
- [ ] Write and run unit tests
- [ ] Deploy to staging
- [ ] Manual test: Add/remove items concurrently

### 1.2: Table Transfer TX (3 hrs)
- [ ] Add `transferOrderToTable()` to order.ts
- [ ] Update transfer route to use new function
- [ ] Write and run integration tests
- [ ] Manual test: Transfer order between tables
- [ ] Verify table statuses update atomically

### 1.4: Payment Ambiguity (3 hrs)
- [ ] Add `completeOrderWithPayment()` and `finishOrderWithoutPayment()`
- [ ] Update payment service
- [ ] Update finish endpoint
- [ ] Write tests
- [ ] Deploy and test payment flow

### 1.3: Cancellation Refunds (5 hrs)
- [ ] Add `refundStockForOrderTx()` to inventory.ts
- [ ] Update cancellation route
- [ ] Write tests
- [ ] Deploy and test cancellation with stock refund
- [ ] Verify stockMovements recorded correctly

### Post-Execution
- [ ] Run full integration test suite
- [ ] Create PR with all changes
- [ ] Code review and team approval
- [ ] Deploy to production
- [ ] Monitor for errors (48 hours)
- [ ] If errors, execute rollback plan
- [ ] Document lessons learned

---

## Risk Mitigation

**High Risk Items:**
1. **Transaction Timeout** - Set timeout to 30s (query should finish in <5s)
   - Mitigation: Add logging to catch timeouts
2. **Concurrent Requests** - Multiple users performing same operation
   - Mitigation: Test under concurrent load in staging
3. **Partial Stock Refund** - Missing ingredients in refund
   - Mitigation: Verify all recipe items are refunded in tests

**Rollback Plan:**
1. If deployment causes errors, run:
   ```bash
   git revert <commit-hash>
   git push
   ```
2. Revert order table to pre-transaction state (manual SQL if needed)
3. Monitor error logs for any missed transactions
4. Re-deploy after fixes

---

## Success Metrics

After Phase 1 completion:
- ✓ Zero race condition bugs reported
- ✓ All integration tests passing
- ✓ Concurrent order operations tested and verified
- ✓ Stock refunds working correctly
- ✓ Payment flow unambiguous and tested
- ✓ Order totals always correct (never mid-calculation state visible)

---

**Next Steps:**
1. Review this plan with team
2. Schedule 5-day sprint for Phase 1 execution
3. Begin with 1.1 (highest frequency, lowest risk)
4. Move to 1.2, then 1.4, then 1.3
5. After Phase 1 complete, start Phase 2 (Security)
