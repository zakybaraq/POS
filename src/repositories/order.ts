import { eq, and, gte, gt, desc, sql, sum } from 'drizzle-orm';
import { db } from '../db/index';
import { orders, orderItems, tables, menus } from '../db/schema';
import type { Order, NewOrder } from '../db/schema';

function todayStart(): Date {
  const now = new Date();
  const wibDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
  wibDate.setHours(0, 0, 0, 0);
  return wibDate;
}

export async function createOrder(tableId: number | null, userId: number, customerId?: number | null) {
  const wibTime = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
  const now = new Date(wibTime);
  const result = await db.insert(orders).values({
    tableId: tableId ?? 0,
    userId,
    customerId: customerId || null,
    servedBy: '',
    status: 'active',
    subtotal: 0,
    tax: 0,
    total: 0,
    createdAt: now,
  });
  const insertId = result[0]?.insertId;
  if (insertId) {
    return getOrderById(Number(insertId));
  }
  return null;
}

export async function getOrderById(id: number) {
  const result = await db.select().from(orders).where(eq(orders.id, id));
  return result[0] || null;
}

export async function getActiveOrderByTableId(tableId: number) {
  const result = await db.select().from(orders)
    .where(and(eq(orders.tableId, tableId), eq(orders.status, 'active')));
  return result[0] || null;
}

export async function getOrdersByTableId(tableId: number) {
  return db.select().from(orders)
    .where(eq(orders.tableId, tableId))
    .orderBy(desc(orders.createdAt));
}

export async function getTodayOrdersByTableId(tableId: number) {
  return db.select().from(orders)
    .where(and(eq(orders.tableId, tableId), eq(orders.status, 'active'), gt(orders.subtotal, 0)))
    .orderBy(desc(orders.createdAt));
}

export async function getOrdersToday() {
  return db.select().from(orders)
    .where(gte(orders.createdAt, todayStart()))
    .orderBy(desc(orders.createdAt));
}

export async function getOrdersTodayWithTables() {
  return db.select().from(orders)
    .leftJoin(tables, eq(orders.tableId, tables.id))
    .orderBy(desc(orders.createdAt));
}

export async function updateOrderStatus(id: number, status: 'draft' | 'active' | 'completed' | 'cancelled') {
  const updateData: Partial<Order> = { status };
  if (status === 'completed' || status === 'cancelled') {
    updateData.completedAt = new Date();
  }
  await db.update(orders).set(updateData).where(eq(orders.id, id));
  return getOrderById(id);
}

export async function updateOrder(id: number, data: Partial<{ tableId: number }>) {
  await db.update(orders).set(data).where(eq(orders.id, id));
  return getOrderById(id);
}

export async function deleteOrder(id: number) {
  await db.delete(orders).where(eq(orders.id, id));
}

export async function updateOrderTotals(id: number, subtotal: number, tax: number, total: number) {
  await db.update(orders).set({ subtotal, tax, total }).where(eq(orders.id, id));
  return getOrderById(id);
}

export async function completeOrder(id: number, amountPaid: number, markCompleted: boolean = true) {
  const order = await getOrderById(id);
  if (!order) return null;

  const changeDue = amountPaid - order.total;

  return await db.transaction(async (tx) => {
    try {
      const updateData: Record<string, unknown> = {
        amountPaid,
        changeDue,
        completedAt: new Date(),
      };
      if (markCompleted) {
        updateData.status = 'completed';
      }

      await tx.update(orders).set(updateData).where(eq(orders.id, id));

      if (markCompleted) {
        const { decrementStockForOrderTx } = await import('./inventory');
        await decrementStockForOrderTx(tx, id);
      }

      if (order.customerId) {
        const { updateCustomerVisitTx, addLoyaltyPointsTx } = await import('./customer');
        const points = Math.floor(order.total * 0.01);
        await updateCustomerVisitTx(tx, order.customerId, order.total);
        await addLoyaltyPointsTx(tx, order.customerId, points, id);
      }

      const [completedOrder] = await tx.select().from(orders).where(eq(orders.id, id));
      return completedOrder || null;
    } catch (error) {
      console.error(`Failed to complete order #${id}:`, error);
      throw error;
    }
  });
}

export async function calculateTotals(orderId: number) {
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  const subtotal = items.reduce((sum, item) => sum + (item.priceAtOrder * item.quantity), 0);
  const tax = Math.round(subtotal * 0.1);
  const total = subtotal + tax;
  await updateOrderTotals(orderId, subtotal, tax, total);
  return { subtotal, tax, total };
}

export async function getTodaySales() {
  const result = await db.select({ total: sum(orders.total) })
    .from(orders)
    .where(and(gte(orders.completedAt, todayStart()), eq(orders.status, 'completed')));
  return Number(result[0]?.total || 0);
}

export async function getTodayOrders() {
  const result = await db.select({ count: sql<number>`count(*)` })
    .from(orders)
    .where(and(gte(orders.completedAt, todayStart()), eq(orders.status, 'completed')));
  return Number(result[0]?.count || 0);
}

export async function getRecentOrders(limit: number = 5) {
  return db.select({
    id: orders.id,
    tableId: orders.tableId,
    total: orders.total,
    status: orders.status,
    createdAt: orders.createdAt,
    tableNumber: tables.tableNumber,
  })
  .from(orders)
  .leftJoin(tables, eq(orders.tableId, tables.id))
  .where(and(gte(orders.completedAt, todayStart()), eq(orders.status, 'completed')))
  .orderBy(desc(orders.completedAt))
  .limit(limit);
}

export async function getTopMenus(limit: number = 5) {
  return db.select({
    name: menus.name,
    totalSold: sum(orderItems.quantity).mapWith(Number),
    revenue: sum(sql`${orderItems.priceAtOrder} * ${orderItems.quantity}`).mapWith(Number),
  })
  .from(orderItems)
  .leftJoin(menus, eq(orderItems.menuId, menus.id))
  .leftJoin(orders, eq(orderItems.orderId, orders.id))
  .where(and(gte(orders.completedAt, todayStart()), eq(orders.status, 'completed')))
  .groupBy(menus.name)
  .orderBy(desc(sum(orderItems.quantity)))
  .limit(limit);
}