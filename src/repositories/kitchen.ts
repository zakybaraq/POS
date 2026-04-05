import { eq, and, sql, sum, count, avg, desc, gte, lte } from 'drizzle-orm';
import { db } from '../db/index';
import { orders, orderItems, menus, tables } from '../db/schema';

export async function getActiveKitchenOrders() {
  return db.select({
    id: orders.id,
    tableNumber: tables.tableNumber,
    userId: orders.userId,
    servedBy: orders.servedBy,
    kitchenStatus: orders.kitchenStatus,
    cookingStartedAt: orders.cookingStartedAt,
    readyAt: orders.readyAt,
    total: orders.total,
    notes: orders.notes,
    createdAt: orders.createdAt,
  })
  .from(orders)
  .leftJoin(tables, eq(orders.tableId, tables.id))
  .where(and(
    sql`${orders.kitchenStatus} != 'served'`,
    sql`${orders.status} != 'cancelled'`
  ))
  .orderBy(desc(orders.createdAt));
}

export async function getKitchenOrdersByCategory(category: 'makanan' | 'minuman') {
  return db.select({
    id: orders.id,
    tableNumber: tables.tableNumber,
    userId: orders.userId,
    servedBy: orders.servedBy,
    kitchenStatus: orders.kitchenStatus,
    cookingStartedAt: orders.cookingStartedAt,
    readyAt: orders.readyAt,
    total: orders.total,
    notes: orders.notes,
    createdAt: orders.createdAt,
  })
  .from(orders)
  .leftJoin(tables, eq(orders.tableId, tables.id))
  .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
  .innerJoin(menus, eq(orderItems.menuId, menus.id))
  .where(and(
    eq(menus.category, category),
    sql`${orders.kitchenStatus} != 'served'`,
    sql`${orders.status} != 'cancelled'`
  ))
  .orderBy(desc(orders.createdAt));
}

export async function updateKitchenStatus(orderId: number, status: 'cooking' | 'ready' | 'served') {
  const updateData: Record<string, any> = { kitchenStatus: status };
  if (status === 'cooking') updateData.cookingStartedAt = new Date();
  if (status === 'ready') updateData.readyAt = new Date();

  await db.update(orders).set(updateData).where(eq(orders.id, orderId));
  return db.select().from(orders).where(eq(orders.id, orderId));
}

export async function getKitchenOrderItems(orderId: number) {
  return db.select({
    id: orderItems.id,
    menuName: menus.name,
    category: menus.category,
    quantity: orderItems.quantity,
    priceAtOrder: orderItems.priceAtOrder,
    notes: orderItems.notes,
    status: orderItems.status,
  })
  .from(orderItems)
  .innerJoin(menus, eq(orderItems.menuId, menus.id))
  .where(eq(orderItems.orderId, orderId));
}

export async function getKitchenStats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [result] = await db.select({
    totalOrders: count(orders.id).mapWith(Number),
    completedOrders: sql<number>`SUM(CASE WHEN ${orders.kitchenStatus} = 'served' THEN 1 ELSE 0 END)`,
    pendingOrders: sql<number>`SUM(CASE WHEN ${orders.kitchenStatus} = 'pending' THEN 1 ELSE 0 END)`,
    cookingOrders: sql<number>`SUM(CASE WHEN ${orders.kitchenStatus} = 'cooking' THEN 1 ELSE 0 END)`,
    readyOrders: sql<number>`SUM(CASE WHEN ${orders.kitchenStatus} = 'ready' THEN 1 ELSE 0 END)`,
  })
  .from(orders)
  .where(and(gte(orders.createdAt, today), lte(orders.createdAt, tomorrow)));

  return result || {
    totalOrders: 0,
    completedOrders: 0,
    pendingOrders: 0,
    cookingOrders: 0,
    readyOrders: 0,
  };
}
