import { eq, and, gte, lte, desc, sql, sum, count, avg, max } from 'drizzle-orm';
import { db } from '../db/index';
import { orders, orderItems, menus, users, tables } from '../db/schema';

function dateStart(dateStr: string) {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dateEnd(dateStr: string) {
  const d = new Date(dateStr);
  d.setHours(23, 59, 59, 999);
  return d;
}

function todayStart() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

function todayEnd() {
  const now = new Date();
  now.setHours(23, 59, 59, 999);
  return now;
}

function weekStart() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  now.setDate(diff);
  now.setHours(0, 0, 0, 0);
  return now;
}

function monthStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

// Sales Reports

export async function getDailySales(date?: string) {
  const start = date ? dateStart(date) : todayStart();
  const end = date ? dateEnd(date) : todayEnd();
  
  const result = await db.select({
    date: sql<string>`DATE(${orders.createdAt})`,
    totalOrders: count(orders.id).mapWith(Number),
    completedOrders: sql<number>`SUM(CASE WHEN ${orders.status} = 'completed' THEN 1 ELSE 0 END)`,
    cancelledOrders: sql<number>`SUM(CASE WHEN ${orders.status} = 'cancelled' THEN 1 ELSE 0 END)`,
    totalSales: sum(orders.total).mapWith(Number),
    totalTax: sum(orders.tax).mapWith(Number),
    avgOrderValue: avg(orders.total).mapWith(Number),
  })
  .from(orders)
  .where(and(gte(orders.createdAt, start), lte(orders.createdAt, end)))
  .groupBy(sql`DATE(${orders.createdAt})`);
  
  return result;
}

export async function getWeeklySales(startDate?: string, endDate?: string) {
  const start = startDate ? dateStart(startDate) : weekStart();
  const end = endDate ? dateEnd(endDate) : todayEnd();
  
  return db.select({
    date: sql<string>`DATE(${orders.createdAt})`,
    totalOrders: count(orders.id).mapWith(Number),
    completedOrders: sql<number>`SUM(CASE WHEN ${orders.status} = 'completed' THEN 1 ELSE 0 END)`,
    cancelledOrders: sql<number>`SUM(CASE WHEN ${orders.status} = 'cancelled' THEN 1 ELSE 0 END)`,
    totalSales: sum(orders.total).mapWith(Number),
    totalTax: sum(orders.tax).mapWith(Number),
    avgOrderValue: avg(orders.total).mapWith(Number),
  })
  .from(orders)
  .where(and(gte(orders.createdAt, start), lte(orders.createdAt, end)))
  .groupBy(sql`DATE(${orders.createdAt})`)
  .orderBy(sql`DATE(${orders.createdAt})`);
}

export async function getMonthlySales(year?: number, month?: number) {
  const now = new Date();
  const y = year || now.getFullYear();
  const m = month !== undefined ? month : now.getMonth();
  const start = new Date(y, m, 1);
  const end = new Date(y, m + 1, 0, 23, 59, 59, 999);
  
  return db.select({
    date: sql<string>`DATE(${orders.createdAt})`,
    totalOrders: count(orders.id).mapWith(Number),
    completedOrders: sql<number>`SUM(CASE WHEN ${orders.status} = 'completed' THEN 1 ELSE 0 END)`,
    cancelledOrders: sql<number>`SUM(CASE WHEN ${orders.status} = 'cancelled' THEN 1 ELSE 0 END)`,
    totalSales: sum(orders.total).mapWith(Number),
    totalTax: sum(orders.tax).mapWith(Number),
    avgOrderValue: avg(orders.total).mapWith(Number),
  })
  .from(orders)
  .where(and(gte(orders.createdAt, start), lte(orders.createdAt, end)))
  .groupBy(sql`DATE(${orders.createdAt})`)
  .orderBy(sql`DATE(${orders.createdAt})`);
}

export async function getSalesByDateRange(startDate: string, endDate: string) {
  const start = dateStart(startDate);
  const end = dateEnd(endDate);

  return db.select({
    date: sql<string>`DATE(${orders.createdAt})`,
    totalOrders: count(orders.id).mapWith(Number),
    completedOrders: sql<number>`SUM(CASE WHEN ${orders.status} = 'completed' THEN 1 ELSE 0 END)`,
    cancelledOrders: sql<number>`SUM(CASE WHEN ${orders.status} = 'cancelled' THEN 1 ELSE 0 END)`,
    totalSales: sum(orders.total).mapWith(Number),
    totalTax: sum(orders.tax).mapWith(Number),
    avgOrderValue: avg(orders.total).mapWith(Number),
  })
  .from(orders)
  .where(and(gte(orders.createdAt, start), lte(orders.createdAt, end)))
  .groupBy(sql`DATE(${orders.createdAt})`)
  .orderBy(sql`DATE(${orders.createdAt})`);
}

export async function getSalesByDateRangePaginated(startDate: string, endDate: string, page: number, limit: number) {
  const start = dateStart(startDate);
  const end = dateEnd(endDate);
  const offset = (page - 1) * limit;

  return db.select({
    date: sql<string>`DATE(${orders.createdAt})`,
    totalOrders: count(orders.id).mapWith(Number),
    completedOrders: sql<number>`SUM(CASE WHEN ${orders.status} = 'completed' THEN 1 ELSE 0 END)`,
    cancelledOrders: sql<number>`SUM(CASE WHEN ${orders.status} = 'cancelled' THEN 1 ELSE 0 END)`,
    totalSales: sum(orders.total).mapWith(Number),
    totalTax: sum(orders.tax).mapWith(Number),
    avgOrderValue: avg(orders.total).mapWith(Number),
  })
  .from(orders)
  .where(and(gte(orders.createdAt, start), lte(orders.createdAt, end)))
  .groupBy(sql`DATE(${orders.createdAt})`)
  .orderBy(sql`DATE(${orders.createdAt})`)
  .limit(limit)
  .offset(offset);
}

// Menu Reports

export async function getTopMenusByQuantity(startDate: string, endDate: string, limit: number = 10) {
  const start = dateStart(startDate);
  const end = dateEnd(endDate);
  
  return db.select({
    menuId: orderItems.menuId,
    menuName: menus.name,
    category: menus.category,
    totalQty: sum(orderItems.quantity).mapWith(Number),
    revenue: sum(sql`${orderItems.priceAtOrder} * ${orderItems.quantity}`).mapWith(Number),
  })
  .from(orderItems)
  .leftJoin(orders, eq(orderItems.orderId, orders.id))
  .leftJoin(menus, eq(orderItems.menuId, menus.id))
  .where(and(
    gte(orders.createdAt, start),
    lte(orders.createdAt, end),
    eq(orders.status, 'completed')
  ))
  .groupBy(orderItems.menuId, menus.name, menus.category)
  .orderBy(desc(sum(orderItems.quantity)))
  .limit(limit);
}

export async function getTopMenusByRevenue(startDate: string, endDate: string, limit: number = 10) {
  const start = dateStart(startDate);
  const end = dateEnd(endDate);
  
  return db.select({
    menuId: orderItems.menuId,
    menuName: menus.name,
    category: menus.category,
    totalQty: sum(orderItems.quantity).mapWith(Number),
    revenue: sum(sql`${orderItems.priceAtOrder} * ${orderItems.quantity}`).mapWith(Number),
  })
  .from(orderItems)
  .leftJoin(orders, eq(orderItems.orderId, orders.id))
  .leftJoin(menus, eq(orderItems.menuId, menus.id))
  .where(and(
    gte(orders.createdAt, start),
    lte(orders.createdAt, end),
    eq(orders.status, 'completed')
  ))
  .groupBy(orderItems.menuId, menus.name, menus.category)
  .orderBy(desc(sum(sql`${orderItems.priceAtOrder} * ${orderItems.quantity}`)))
  .limit(limit);
}

export async function getMenuCategoryBreakdown(startDate: string, endDate: string) {
  const start = dateStart(startDate);
  const end = dateEnd(endDate);
  
  return db.select({
    category: menus.category,
    totalQty: sum(orderItems.quantity).mapWith(Number),
    revenue: sum(sql`${orderItems.priceAtOrder} * ${orderItems.quantity}`).mapWith(Number),
  })
  .from(orderItems)
  .leftJoin(orders, eq(orderItems.orderId, orders.id))
  .leftJoin(menus, eq(orderItems.menuId, menus.id))
  .where(and(
    gte(orders.createdAt, start),
    lte(orders.createdAt, end),
    eq(orders.status, 'completed')
  ))
  .groupBy(menus.category);
}

// Cashier Reports

export async function getCashierPerformance(startDate: string, endDate: string) {
  const start = dateStart(startDate);
  const end = dateEnd(endDate);
  
  return db.select({
    userId: orders.userId,
    userName: users.name,
    userRole: users.role,
    totalTransactions: count(orders.id).mapWith(Number),
    completedOrders: sql<number>`SUM(CASE WHEN ${orders.status} = 'completed' THEN 1 ELSE 0 END)`,
    cancelledOrders: sql<number>`SUM(CASE WHEN ${orders.status} = 'cancelled' THEN 1 ELSE 0 END)`,
    totalSales: sum(orders.total).mapWith(Number),
    avgOrderValue: avg(orders.total).mapWith(Number),
  })
  .from(orders)
  .leftJoin(users, eq(orders.userId, users.id))
  .where(and(gte(orders.createdAt, start), lte(orders.createdAt, end)))
  .groupBy(orders.userId, users.name, users.role)
  .orderBy(desc(sum(orders.total)));
}

// Table Occupancy Reports

export async function getTableOccupancy(startDate: string, endDate: string) {
  const start = dateStart(startDate);
  const end = dateEnd(endDate);
  
  const totalTablesResult = await db.select({
    total: count(tables.id).mapWith(Number),
  }).from(tables);
  const totalTables = totalTablesResult[0]?.total || 0;
  
  const dailyOccupancy = await db.select({
    date: sql<string>`DATE(${orders.createdAt})`,
    uniqueTables: sql<number>`COUNT(DISTINCT ${orders.tableId})`,
    totalOrders: count(orders.id).mapWith(Number),
  })
  .from(orders)
  .where(and(
    gte(orders.createdAt, start),
    lte(orders.createdAt, end)
  ))
  .groupBy(sql`DATE(${orders.createdAt})`)
  .orderBy(sql`DATE(${orders.createdAt})`);
  
  return dailyOccupancy.map(d => ({
    ...d,
    totalTables,
    occupancyRate: totalTables > 0 ? Math.round((d.uniqueTables / totalTables) * 100) : 0,
  }));
}

// Summary

export async function getSalesSummary(startDate: string, endDate: string) {
  const start = dateStart(startDate);
  const end = dateEnd(endDate);
  
  const result = await db.select({
    totalSales: sum(orders.total).mapWith(Number),
    totalOrders: count(orders.id).mapWith(Number),
    avgOrderValue: avg(orders.total).mapWith(Number),
    totalTax: sum(orders.tax).mapWith(Number),
    completedOrders: sql<number>`SUM(CASE WHEN ${orders.status} = 'completed' THEN 1 ELSE 0 END)`,
    cancelledOrders: sql<number>`SUM(CASE WHEN ${orders.status} = 'cancelled' THEN 1 ELSE 0 END)`,
  })
  .from(orders)
  .where(and(gte(orders.createdAt, start), lte(orders.createdAt, end)));
  
  return result[0] || {
    totalSales: 0,
    totalOrders: 0,
    avgOrderValue: 0,
    totalTax: 0,
    completedOrders: 0,
    cancelledOrders: 0,
  };
}
