import { db } from '../infrastructure/database/index';
import { supplierPrices, suppliers, ingredients, purchaseOrders } from '../infrastructure/database/schema';
import { eq, desc, asc, gte, lte, and } from 'drizzle-orm';

const DEFAULT_VARIANCE_THRESHOLD = 10;

export async function getMonthlyCosts(year: number, month: number) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const pos = await db.select({
    poId: purchaseOrders.id,
    supplierId: purchaseOrders.supplierId,
    supplierName: suppliers.name,
    subtotal: purchaseOrders.subtotal,
    orderDate: purchaseOrders.orderDate,
  })
    .from(purchaseOrders)
    .innerJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
    .where(and(
      gte(purchaseOrders.orderDate, startDate),
      lte(purchaseOrders.orderDate, endDate)
    ));

  const totalCost = pos.reduce((sum, po) => sum + (po.subtotal || 0), 0);
  return {
    year,
    month,
    totalCost,
    orderCount: pos.length,
    averageOrderValue: pos.length > 0 ? Math.round(totalCost / pos.length) : 0,
  };
}