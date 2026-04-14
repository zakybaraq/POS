import { eq, sql, desc, and, gte } from 'drizzle-orm';
import { db } from '../db/index';
import { ingredients, suppliers, stockMovements, purchaseOrders, purchaseOrderItems, supplierPrices } from '../db/schema';
import { getIngredientById, getLowStockIngredients } from '../repositories/inventory';
import { getSupplierById } from '../repositories/supplier';
import type { Decimal } from 'drizzle-orm/mysql.columns';

// Default EOQ parameters
export const DEFAULT_ORDERING_COST = 25;
export const DEFAULT_HOLDING_COST_PERCENT = 20;
export const DEFAULT_LEAD_TIME_DAYS = 7;

// === Calculation Functions ===

export function calculateReorderPoint(leadTimeDays: number, dailyUsage: number, safetyStock: number): number {
  return (leadTimeDays * dailyUsage) + safetyStock;
}

export function calculateEOQ(annualDemand: number, orderingCost: number = DEFAULT_ORDERING_COST, holdingCostPercent: number = DEFAULT_HOLDING_COST_PERCENT): number {
  if (annualDemand <= 0 || orderingCost <= 0 || holdingCostPercent <= 0) return 0;
  const eoq = Math.sqrt((2 * annualDemand * orderingCost) / (holdingCostPercent / 100));
  return Math.ceil(eoq);
}

export async function calculateUsageRate(ingredientId: number, days: number = 30): Promise<number> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const result = await db
    .select({
      totalQuantity: sql`SUM(${stockMovements.quantity})`.mapWith(Number)
    })
    .from(stockMovements)
    .where(
      and(
        eq(stockMovements.ingredientId, ingredientId),
        eq(stockMovements.type, 'out'),
        gte(stockMovements.createdAt, startDate)
      )
    );
  
  const totalQuantity = result[0]?.totalQuantity || 0;
  return totalQuantity / days;
}

export async function calculateLeadTime(supplierId: number): Promise<number> {
  // Calculate from historical PO data
  const result = await db
    .select({
      avgLeadTime: sql`AVG(DATEDIFF(${purchaseOrders.expectedDeliveryDate}, ${purchaseOrders.orderDate}))`.mapWith(Number)
    })
    .from(purchaseOrders)
    .where(
      and(
        eq(purchaseOrders.supplierId, supplierId),
        sql`${purchaseOrders.expectedDeliveryDate} IS NOT NULL`,
        sql`${purchaseOrders.orderDate} IS NOT NULL`
      )
    );
  
  const avgLeadTime = result[0]?.avgLeadTime;
  if (avgLeadTime && avgLeadTime > 0) {
    return Math.round(avgLeadTime);
  }
  
  return DEFAULT_LEAD_TIME_DAYS;
}

export async function getUsageRate(ingredientId: number): Promise<number> {
  const ingredient = await getIngredientById(ingredientId);
  if (!ingredient) return 0;
  
  // Check for manual override first
  if (ingredient.usageOverride) {
    return Number(ingredient.usageOverride);
  }
  
  // Otherwise calculate from history
  return calculateUsageRate(ingredientId);
}

export async function setUsageRateOverride(ingredientId: number, dailyUsage: number): Promise<boolean> {
  await db.update(ingredients)
    .set({ usageOverride: String(dailyUsage) })
    .where(eq(ingredients.id, ingredientId));
  return true;
}

// === Main Service Functions ===

export interface ReorderSuggestion {
  ingredientId: number;
  ingredientName: string;
  unit: string;
  currentStock: number;
  minStock: number;
  reorderPoint: number;
  eoq: number;
  dailyUsage: number;
  supplierId: number | null;
  supplierName: string | null;
  leadTimeDays: number;
}

export async function getReorderSuggestions(): Promise<ReorderSuggestion[]> {
  // Get all low stock ingredients
  const lowStockIngredients = await getLowStockIngredients();
  
  const suggestions: ReorderSuggestion[] = [];
  
  for (const ingredient of lowStockIngredients) {
    const ingredientId = ingredient.id;
    const supplierId = ingredient.supplierId;
    
    // Get supplier info
    let supplierName: string | null = null;
    let leadTimeDays = DEFAULT_LEAD_TIME_DAYS;
    
    if (supplierId) {
      const supplier = await getSupplierById(supplierId);
      if (supplier) {
        supplierName = supplier.name;
        leadTimeDays = await calculateLeadTime(supplierId);
      }
    }
    
    // Calculate daily usage
    const dailyUsage = await getUsageRate(ingredientId);
    
    // Use minStock as safety stock
    const safetyStock = Number(ingredient.minStock) || 0;
    
    // Calculate reorder point
    const reorderPoint = calculateReorderPoint(leadTimeDays, dailyUsage, safetyStock);
    
    // Calculate EOQ (annual demand = daily usage * 365)
    const annualDemand = dailyUsage * 365;
    const eoq = calculateEOQ(annualDemand);
    
    suggestions.push({
      ingredientId,
      ingredientName: ingredient.name,
      unit: ingredient.unit,
      currentStock: Number(ingredient.currentStock),
      minStock: Number(ingredient.minStock),
      reorderPoint: Math.round(reorderPoint * 100) / 100,
      eoq,
      dailyUsage: Math.round(dailyUsage * 100) / 100,
      supplierId,
      supplierName,
      leadTimeDays
    });
  }
  
  return suggestions;
}

export async function calculateForIngredient(ingredientId: number): Promise<{
  ingredient: any;
  currentStock: number;
  minStock: number;
  dailyUsage: number;
  reorderPoint: number;
  eoq: number;
  leadTimeDays: number;
  supplier: any;
} | null> {
  const ingredient = await getIngredientById(ingredientId);
  if (!ingredient) return null;
  
  const supplierId = ingredient.supplierId;
  let supplier = null;
  let leadTimeDays = DEFAULT_LEAD_TIME_DAYS;
  
  if (supplierId) {
    supplier = await getSupplierById(supplierId);
    if (supplier) {
      leadTimeDays = await calculateLeadTime(supplierId);
    }
  }
  
  const dailyUsage = await getUsageRate(ingredientId);
  const safetyStock = Number(ingredient.minStock) || 0;
  const reorderPoint = calculateReorderPoint(leadTimeDays, dailyUsage, safetyStock);
  const annualDemand = dailyUsage * 365;
  const eoq = calculateEOQ(annualDemand);
  
  return {
    ingredient,
    currentStock: Number(ingredient.currentStock),
    minStock: Number(ingredient.minStock),
    dailyUsage: Math.round(dailyUsage * 100) / 100,
    reorderPoint: Math.round(reorderPoint * 100) / 100,
    eoq,
    leadTimeDays,
    supplier
  };
}
