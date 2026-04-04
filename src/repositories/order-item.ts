import { eq } from 'drizzle-orm';
import { db } from '../db/index';
import { orderItems, menus } from '../db/schema';
import type { OrderItem, NewOrderItem } from '../db/schema';

export async function addItem(orderId: number, menuId: number, quantity: number = 1) {
  const menu = await db.select().from(menus).where(eq(menus.id, menuId)).then(r => r[0]);
  if (!menu) return null;
  
  const existingItem = await db.select().from(orderItems)
    .where(eq(orderItems.orderId, orderId))
    .then(items => items.find(item => item.menuId === menuId));
  
  if (existingItem) {
    await db.update(orderItems)
      .set({ quantity: existingItem.quantity + quantity })
      .where(eq(orderItems.id, existingItem.id));
    return existingItem;
  }
  
  await db.insert(orderItems).values({
    orderId,
    menuId,
    quantity,
    priceAtOrder: menu.price,
  });
  return { orderId, menuId, quantity, priceAtOrder: menu.price };
}

export async function updateQuantity(itemId: number, quantity: number) {
  if (quantity <= 0) {
    return removeItem(itemId);
  }
  await db.update(orderItems).set({ quantity }).where(eq(orderItems.id, itemId));
  return { id: itemId, quantity };
}

export async function removeItem(itemId: number) {
  return db.delete(orderItems).where(eq(orderItems.id, itemId));
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