import { eq, and, desc, sql, gte } from 'drizzle-orm';
import { db } from '../db/index';
import { customers, loyaltyTransactions, orders } from '../db/schema';
import type { NewCustomer, NewLoyaltyTransaction } from '../db/schema';

export async function getAllCustomers() {
  return db.select().from(customers).orderBy(customers.name);
}

export async function getCustomerById(id: number) {
  const result = await db.select().from(customers).where(eq(customers.id, id));
  return result[0] || null;
}

export async function getCustomerByPhone(phone: string) {
  const result = await db.select().from(customers).where(eq(customers.phone, phone));
  return result[0] || null;
}

export async function createCustomer(data: NewCustomer) {
  const result = await db.insert(customers).values(data);
  const insertId = result[0]?.insertId;
  if (insertId) return getCustomerById(Number(insertId));
  return null;
}

export async function updateCustomer(id: number, data: Partial<NewCustomer>) {
  await db.update(customers).set(data).where(eq(customers.id, id));
  return getCustomerById(id);
}

export async function deleteCustomer(id: number) {
  return db.delete(customers).where(eq(customers.id, id));
}

export async function getCustomerStats() {
  const all = await db.select().from(customers);
  const total = all.length;
  const active = all.filter(c => c.isActive).length;
  const byTier: Record<string, number> = {};
  for (const c of all) {
    byTier[c.tier] = (byTier[c.tier] || 0) + 1;
  }
  const totalPoints = all.reduce((sum, c) => sum + (c.loyaltyPoints || 0), 0);
  return { total, active, byTier, totalPoints };
}

export async function addLoyaltyPoints(customerId: number, points: number, orderId?: number) {
  if (points <= 0) return;
  await db.insert(loyaltyTransactions).values({
    customerId,
    type: 'earn',
    points,
    referenceId: orderId || null,
    reason: orderId ? `Pesanan #${orderId}` : 'Manual',
  });
  await db.update(customers)
  .set({ loyaltyPoints: sql`${customers.loyaltyPoints} + ${points}` })
  .where(eq(customers.id, customerId));
  await updateCustomerTier(customerId);
}

export async function addLoyaltyPointsTx(tx: any, customerId: number, points: number, orderId?: number) {
  if (points <= 0) return;
  await tx.insert(loyaltyTransactions).values({
    customerId,
    type: 'earn',
    points,
    referenceId: orderId || null,
    reason: orderId ? `Pesanan #${orderId}` : 'Manual',
  });
  await tx.update(customers)
  .set({ loyaltyPoints: sql`${customers.loyaltyPoints} + ${points}` })
  .where(eq(customers.id, customerId));
  await updateCustomerTierTx(tx, customerId);
}

export async function redeemLoyaltyPoints(customerId: number, points: number, reason?: string) {
  const customer = await getCustomerById(customerId);
  if (!customer) return { error: 'Customer not found' };
  if (customer.loyaltyPoints < points) return { error: 'Poin tidak cukup' };
  if (points <= 0) return { error: 'Jumlah poin harus lebih dari 0' };

  await db.insert(loyaltyTransactions).values({
    customerId,
    type: 'redeem',
    points,
    reason: reason || 'Redeem poin',
  });
  await db.update(customers)
    .set({ loyaltyPoints: sql`${customers.loyaltyPoints} - ${points}` })
    .where(eq(customers.id, customerId));
}

export async function getLoyaltyTransactions(customerId: number, limit: number = 20) {
  return db.select().from(loyaltyTransactions)
    .where(eq(loyaltyTransactions.customerId, customerId))
    .orderBy(desc(loyaltyTransactions.createdAt))
    .limit(limit);
}

export async function updateCustomerTier(customerId: number) {
  const customer = await getCustomerById(customerId);
  if (!customer) return;
  const totalSpent = customer.totalSpent || 0;
  let newTier = 'regular';
  if (totalSpent >= 2000000) newTier = 'gold';
  else if (totalSpent >= 500000) newTier = 'silver';

  if (customer.tier !== newTier) {
    await db.update(customers).set({ tier: newTier as any }).where(eq(customers.id, customerId));
  }
}

export async function updateCustomerTierTx(tx: any, customerId: number) {
  const result = await tx.select().from(customers).where(eq(customers.id, customerId));
  const customer = result[0];
  if (!customer) return;
  const totalSpent = customer.totalSpent || 0;
  let newTier = 'regular';
  if (totalSpent >= 2000000) newTier = 'gold';
  else if (totalSpent >= 500000) newTier = 'silver';

  if (customer.tier !== newTier) {
    await tx.update(customers).set({ tier: newTier as any }).where(eq(customers.id, customerId));
  }
}

export async function updateCustomerVisit(customerId: number, amount: number) {
  await db.update(customers)
  .set({
    totalSpent: sql`${customers.totalSpent} + ${amount}`,
    totalVisits: sql`${customers.totalVisits} + 1`,
    updatedAt: new Date(),
  })
  .where(eq(customers.id, customerId));
  await updateCustomerTier(customerId);
}

export async function updateCustomerVisitTx(tx: any, customerId: number, amount: number) {
  await tx.update(customers)
  .set({
    totalSpent: sql`${customers.totalSpent} + ${amount}`,
    totalVisits: sql`${customers.totalVisits} + 1`,
    updatedAt: new Date(),
  })
  .where(eq(customers.id, customerId));
  await updateCustomerTierTx(tx, customerId);
}

export async function getCustomerOrderHistory(customerId: number, limit: number = 20) {
  return db.select({
    id: orders.id,
    tableId: orders.tableId,
    total: orders.total,
    status: orders.status,
    createdAt: orders.createdAt,
  })
  .from(orders)
  .where(eq(orders.customerId, customerId))
  .orderBy(desc(orders.createdAt))
  .limit(limit);
}
