import { db } from '../infrastructure/database/index';
import { orders, orderItems, menus, ingredients } from '../infrastructure/database/schema';
import { eq, gte, sql, desc, and } from 'drizzle-orm';
import { getLowStockIngredients } from '../repositories/inventory';
import * as tableRepo from '../repositories/table';
import * as menuRepo from '../repositories/menu';

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60000;

async function getCachedOrFetch(key: string, fetchFn: () => Promise<any>) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  const data = await fetchFn();
  cache.set(key, { data, timestamp: Date.now() });
  return data;
}

export async function getTodaySalesOptimized() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const result = await db.select({
    total: sql<number>`COALESCE(SUM(${orders.total}), 0)`,
  })
  .from(orders)
  .where(
    and(
      gte(orders.createdAt, today),
      eq(orders.status, 'completed')
    )
  );

  return Number(result[0]?.total || 0);
}

export async function getTodayOrdersOptimized() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const result = await db.select({
    count: sql<number>`count(*)`,
  })
  .from(orders)
  .where(gte(orders.createdAt, today));

  return Number(result[0]?.count || 0);
}

export async function getActiveOrdersCount() {
  const result = await db.select({
    count: sql<number>`count(*)`,
  })
  .from(orders)
  .where(eq(orders.status, 'active'));

  return Number(result[0]?.count || 0);
}

export async function getKitchenQueueStatus() {
  const [pending, cooking, ready] = await Promise.all([
    db.select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(eq(orders.status, 'active')),
    db.select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(eq(orders.status, 'cooking')),
    db.select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(eq(orders.status, 'ready')),
  ]);

  return {
    pending: pending[0]?.count || 0,
    cooking: cooking[0]?.count || 0,
    ready: ready[0]?.count || 0,
  };
}

export async function getLowStockCount() {
  const result = await db.select({
    count: sql<number>`count(*)`,
  })
  .from(ingredients)
  .where(sql`${ingredients.currentStock} <= ${ingredients.minStock} AND ${ingredients.minStock} > 0`);

  return Number(result[0]?.count || 0);
}

export async function getTopMenusToday(limit: number = 5) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const result = await db.select({
    menuId: orderItems.menuId,
    name: menus.name,
    totalSold: sql<number>`SUM(${orderItems.quantity})`,
    revenue: sql<number>`SUM(${orderItems.quantity} * ${orderItems.priceAtOrder})`,
  })
  .from(orderItems)
  .leftJoin(menus, eq(orderItems.menuId, menus.id))
  .leftJoin(orders, eq(orderItems.orderId, orders.id))
  .where(gte(orders.createdAt, today))
  .groupBy(orderItems.menuId, menus.name)
  .orderBy(desc(sql<number>`SUM(${orderItems.quantity})`))
  .limit(limit);

  return result.map(r => ({
    menuId: r.menuId,
    name: r.name || 'Unknown',
    totalSold: Number(r.totalSold) || 0,
    revenue: Number(r.revenue) || 0,
  }));
}

async function getSalesByDate(dateLabel: string) {
  let targetDate = new Date();
  if (dateLabel === 'yesterday') {
    targetDate.setDate(targetDate.getDate() - 1);
  }
  targetDate.setHours(0, 0, 0, 0);
  const nextDate = new Date(targetDate);
  nextDate.setDate(nextDate.getDate() + 1);

  const result = await db.select({
    total: sql<number>`COALESCE(SUM(${orders.total}), 0)`,
  })
  .from(orders)
  .where(and(gte(orders.createdAt, targetDate), sql`${orders.createdAt} < ${nextDate}`));

  return Number(result[0]?.total || 0);
}

async function getOrdersByDate(dateLabel: string) {
  let targetDate = new Date();
  if (dateLabel === 'yesterday') {
    targetDate.setDate(targetDate.getDate() - 1);
  }
  targetDate.setHours(0, 0, 0, 0);
  const nextDate = new Date(targetDate);
  nextDate.setDate(nextDate.getDate() + 1);

  const result = await db.select({
    count: sql<number>`count(*)`,
  })
  .from(orders)
  .where(and(gte(orders.createdAt, targetDate), sql`${orders.createdAt} < ${nextDate}`));

  return Number(result[0]?.count || 0);
}

async function getSalesLast7Days() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const result = await db.select({
    total: sql<number>`COALESCE(SUM(${orders.total}), 0)`,
  })
  .from(orders)
  .where(gte(orders.createdAt, sevenDaysAgo));

  return Number(result[0]?.total || 0);
}

async function getOrdersLast7Days() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const result = await db.select({
    count: sql<number>`count(*)`,
  })
  .from(orders)
  .where(gte(orders.createdAt, sevenDaysAgo));

  return Number(result[0]?.count || 0);
}

async function getTopMenusLast7Days(limit: number) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const result = await db.select({
    menuId: orderItems.menuId,
    name: menus.name,
    totalSold: sql<number>`SUM(${orderItems.quantity})`,
    revenue: sql<number>`SUM(${orderItems.quantity} * ${orderItems.priceAtOrder})`,
  })
  .from(orderItems)
  .leftJoin(menus, eq(orderItems.menuId, menus.id))
  .leftJoin(orders, eq(orderItems.orderId, orders.id))
  .where(gte(orders.createdAt, sevenDaysAgo))
  .groupBy(orderItems.menuId, menus.name)
  .orderBy(desc(sql<number>`SUM(${orderItems.quantity})`))
  .limit(limit);

  return result.map(r => ({
    name: r.name || 'Unknown',
    totalSold: Number(r.totalSold) || 0,
  }));
}

async function getSalesByDateRange(startDate: string, endDate: string) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59);

  const result = await db.select({
    total: sql<number>`COALESCE(SUM(${orders.total}), 0)`,
  })
  .from(orders)
  .where(and(gte(orders.createdAt, start), sql`${orders.createdAt} <= ${end}`));

  return Number(result[0]?.total || 0);
}

async function getOrdersByDateRange(startDate: string, endDate: string) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59);

  const result = await db.select({
    count: sql<number>`count(*)`,
  })
  .from(orders)
  .where(and(gte(orders.createdAt, start), sql`${orders.createdAt} <= ${end}`));

  return Number(result[0]?.count || 0);
}

async function getTopMenusByDateRange(startDate: string, endDate: string, limit: number) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59);

  const result = await db.select({
    menuId: orderItems.menuId,
    name: menus.name,
    totalSold: sql<number>`SUM(${orderItems.quantity})`,
  })
  .from(orderItems)
  .leftJoin(menus, eq(orderItems.menuId, menus.id))
  .leftJoin(orders, eq(orderItems.orderId, orders.id))
  .where(and(gte(orders.createdAt, start), sql`${orders.createdAt} <= ${end}`))
  .groupBy(orderItems.menuId, menus.name)
  .orderBy(desc(sql<number>`SUM(${orderItems.quantity})`))
  .limit(limit);

  return result.map(r => ({
    name: r.name || 'Unknown',
    totalSold: Number(r.totalSold) || 0,
  }));
}

async function getTopMenusByDate(dateLabel: string) {
  return getTopMenusToday(5);
}

export async function getDashboardMetrics(range: string = 'today', startDate?: string, endDate?: string) {
  const cacheKey = `metrics-${range}-${startDate}-${endDate}`;
  
  let getSalesFn, getOrdersFn, getTopMenusFn;
  
  switch (range) {
    case 'today':
      getSalesFn = getTodaySalesOptimized;
      getOrdersFn = getTodayOrdersOptimized;
      getTopMenusFn = () => getTopMenusToday(5);
      break;
    case 'yesterday':
      getSalesFn = () => getSalesByDate(range);
      getOrdersFn = () => getOrdersByDate(range);
      getTopMenusFn = () => getTopMenusByDate(range);
      break;
    case '7days':
      getSalesFn = () => getSalesLast7Days();
      getOrdersFn = () => getOrdersLast7Days();
      getTopMenusFn = () => getTopMenusLast7Days(5);
      break;
    case 'custom':
      getSalesFn = () => getSalesByDateRange(startDate!, endDate!);
      getOrdersFn = () => getOrdersByDateRange(startDate!, endDate!);
      getTopMenusFn = () => getTopMenusByDateRange(startDate!, endDate!, 5);
      break;
    default:
      getSalesFn = getTodaySalesOptimized;
      getOrdersFn = getTodayOrdersOptimized;
      getTopMenusFn = () => getTopMenusToday(5);
  }

  const [
    todaySales,
    todayOrders,
    activeOrders,
    kitchenQueue,
    lowStockCount,
    topMenus,
    hourlyTrend,
    tableStats,
    menuStats,
  ] = await Promise.all([
    getCachedOrFetch(`${cacheKey}-sales`, getSalesFn),
    getCachedOrFetch(`${cacheKey}-orders`, getOrdersFn),
    getCachedOrFetch('active-orders', getActiveOrdersCount),
    getCachedOrFetch('kitchen-queue', getKitchenQueueStatus),
    getCachedOrFetch('low-stock-count', getLowStockCount),
    getCachedOrFetch(`${cacheKey}-topmenus`, getTopMenusFn),
    getCachedOrFetch(`${cacheKey}-hourly`, () => getHourlySalesTrend(range, startDate, endDate)),
    getCachedOrFetch('table-stats', () => tableRepo.getTableStats()),
    getCachedOrFetch('menu-stats', () => menuRepo.getMenuStats()),
  ]);

  return {
    todaySales,
    todayOrders,
    activeOrders,
    kitchenQueue,
    lowStockCount,
    topMenus,
    hourlyTrend,
    tableStats: { occupied: tableStats.occupied, available: tableStats.available, total: tableStats.total },
    menuStats: { available: menuStats.available, total: menuStats.total },
    timestamp: new Date().toISOString(),
  };
}

export async function getHourlySalesTrend(range: string = 'today', startDate?: string, endDate?: string) {
  let startTime = new Date();
  
  if (range === 'today') {
    startTime.setHours(0, 0, 0, 0);
  } else if (range === 'yesterday') {
    startTime.setDate(startTime.getDate() - 1);
    startTime.setHours(0, 0, 0, 0);
  } else if (range === '7days') {
    startTime.setDate(startTime.getDate() - 7);
  } else if (range === 'custom' && startDate) {
    startTime = new Date(startDate);
  }

  const whereCondition = range === '7days' || range === 'custom'
    ? gte(orders.createdAt, startTime)
    : and(gte(orders.createdAt, startTime), eq(orders.status, 'completed'));

  const hourlyOrders = await db.select({
    id: orders.id,
    createdAt: orders.createdAt,
    total: orders.total,
    status: orders.status,
  })
  .from(orders)
  .where(whereCondition);

  const hourlyMap = new Map<number, { orders: number; sales: number }>();
  
  for (let i = 0; i < 24; i++) {
    hourlyMap.set(i, { orders: 0, sales: 0 });
  }

  for (const order of hourlyOrders) {
    const hour = new Date(order.createdAt).getHours();
    const current = hourlyMap.get(hour) || { orders: 0, sales: 0 };
    hourlyMap.set(hour, {
      orders: current.orders + 1,
      sales: current.sales + Number(order.total),
    });
  }

  const result = [];
  for (let i = 0; i < 24; i++) {
    const data = hourlyMap.get(i)!;
    result.push({ hour: i, orders: data.orders, sales: data.sales });
  }

  return result;
}

export function invalidateCache(key: string) {
  cache.delete(key);
}

export function clearAllCache() {
  cache.clear();
}

export function getCacheStats() {
  return {
    size: cache.size,
    keys: Array.from(cache.keys()),
  };
}
