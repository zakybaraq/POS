import { eq, and } from 'drizzle-orm';
import { db } from '../db/index';
import { orderItems, menus } from '../db/schema';
import type { OrderItem, NewOrderItem } from '../db/schema';

/**
 * Add or update an item in an order within a transaction
 * @param tx - Database transaction object
 * @param orderId - Order ID
 * @param menuId - Menu item ID
 * @param quantity - Quantity to add (1 by default)
 * @param notes - Optional notes for the item
 */
export async function addItemTx(
  tx: any,
  orderId: number,
  menuId: number,
  quantity: number = 1,
  notes: string = ''
) {
  const menu = await tx.select().from(menus)
    .where(eq(menus.id, menuId))
    .then((r: any) => r[0]);

  if (!menu) {
    throw new Error(`Menu item #${menuId} not found`);
  }

  const existingItem = await tx.select().from(orderItems)
    .where(and(eq(orderItems.orderId, orderId), eq(orderItems.menuId, menuId)))
    .then((items: any) => items[0] || null);

  if (existingItem) {
    await tx.update(orderItems)
      .set({ quantity: existingItem.quantity + quantity })
      .where(eq(orderItems.id, existingItem.id));
    return { ...existingItem, quantity: existingItem.quantity + quantity };
  }

  await tx.insert(orderItems).values({
    orderId,
    menuId,
    quantity,
    priceAtOrder: menu.price,
    notes,
  });

  return { orderId, menuId, quantity, priceAtOrder: menu.price, notes };
}

/**
 * Add or update an item in an order (non-transactional wrapper)
 */
export async function addItem(orderId: number, menuId: number, quantity: number = 1, notes: string = '') {
  return db.transaction(tx => addItemTx(tx, orderId, menuId, quantity, notes));
}

/**
 * Update item quantity within a transaction
 * @param tx - Database transaction object
 * @param itemId - Order item ID
 * @param quantity - New quantity (if <= 0, item is deleted)
 */
export async function updateQuantityTx(tx: any, itemId: number, quantity: number) {
  if (quantity <= 0) {
    return tx.delete(orderItems).where(eq(orderItems.id, itemId));
  }

  await tx.update(orderItems)
    .set({ quantity })
    .where(eq(orderItems.id, itemId));

  return { id: itemId, quantity };
}

/**
 * Update item quantity (non-transactional wrapper)
 */
export async function updateQuantity(itemId: number, quantity: number) {
  return db.transaction(tx => updateQuantityTx(tx, itemId, quantity));
}

/**
 * Remove an item from order within a transaction
 * @param tx - Database transaction object
 * @param itemId - Order item ID to remove
 */
export async function removeItemTx(tx: any, itemId: number) {
  return tx.delete(orderItems).where(eq(orderItems.id, itemId));
}

/**
 * Remove an item from order (non-transactional wrapper)
 */
export async function removeItem(itemId: number) {
  return db.transaction(tx => removeItemTx(tx, itemId));
}

export async function updateItemNotes(orderId: number, menuId: number, notes: string) {
  await db.update(orderItems)
    .set({ notes })
    .where(and(eq(orderItems.orderId, orderId), eq(orderItems.menuId, menuId)));
}

export async function getItemsByOrderId(orderId: number) {
  return db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
}

export async function getItemsWithMenuByOrderId(orderId: number) {
  return db.select({
    id: orderItems.id,
    orderId: orderItems.orderId,
    menuId: orderItems.menuId,
    quantity: orderItems.quantity,
    priceAtOrder: orderItems.priceAtOrder,
    notes: orderItems.notes,
    status: orderItems.status,
    menuName: menus.name,
    menuPrice: menus.price,
  })
  .from(orderItems)
  .leftJoin(menus, eq(orderItems.menuId, menus.id))
  .where(eq(orderItems.orderId, orderId));
}

export async function deleteItemsByOrderId(orderId: number) {
  return db.delete(orderItems).where(eq(orderItems.orderId, orderId));
}