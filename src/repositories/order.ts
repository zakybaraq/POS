import { eq, and, gte, desc } from 'drizzle-orm';
import { db } from '../db/index';
import { orders, orderItems, tables } from '../db/schema';
import type { Order, NewOrder } from '../db/schema';

function todayStart() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

export async function createOrder(tableId: number, userId: number) {
  const result = await db.insert(orders).values({
    tableId,
    userId,
    status: 'active',
    subtotal: 0,
    tax: 0,
    total: 0,
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

export async function getOrdersToday() {
  return db.select().from(orders)
    .where(gte(orders.createdAt, todayStart()))
    .orderBy(desc(orders.createdAt));
}

export async function getOrdersTodayWithTables() {
  return db.select().from(orders)
    .leftJoin(tables, eq(orders.tableId, tables.id))
    .where(gte(orders.createdAt, todayStart()))
    .orderBy(desc(orders.createdAt));
}

export async function updateOrderStatus(id: number, status: 'active' | 'completed' | 'cancelled') {
  const updateData: Partial<Order> = { status };
  if (status === 'completed' || status === 'cancelled') {
    updateData.completedAt = new Date();
  }
  await db.update(orders).set(updateData).where(eq(orders.id, id));
  return getOrderById(id);
}

export async function updateOrderTotals(id: number, subtotal: number, tax: number, total: number) {
  await db.update(orders).set({ subtotal, tax, total }).where(eq(orders.id, id));
  return getOrderById(id);
}

export async function completeOrder(id: number, amountPaid: number) {
  const order = await getOrderById(id);
  if (!order) return null;
  const changeDue = amountPaid - order.total;
  await db.update(orders).set({
    status: 'completed',
    amountPaid,
    changeDue,
    completedAt: new Date(),
  }).where(eq(orders.id, id));
  return getOrderById(id);
}

export async function calculateTotals(orderId: number) {
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  const subtotal = items.reduce((sum, item) => sum + (item.priceAtOrder * item.quantity), 0);
  const tax = Math.round(subtotal * 0.1);
  const total = subtotal + tax;
  await updateOrderTotals(orderId, subtotal, tax, total);
  return { subtotal, tax, total };
}