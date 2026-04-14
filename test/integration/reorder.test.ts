import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as reorderService from '../../src/services/reorder';
import * as inventoryRepo from '../../src/repositories/inventory';
import * as supplierRepo from '../../src/repositories/supplier';
import { db } from '../../src/db/index';
import { stockMovements, purchaseOrders, ingredients } from '../../src/db/schema';
import { eq } from 'drizzle-orm';

describe('Reorder Service Integration', () => {
  let testIngredientId: number;
  let testSupplierId: number;

  beforeEach(async () => {
    const createdSupplier = await supplierRepo.createSupplier({
      name: 'Test Supplier for Reorder',
      isActive: true,
    });
    testSupplierId = Number(createdSupplier[0]?.insertId);

    const createdIngredient = await inventoryRepo.createIngredient({
      name: 'Test Ingredient for Reorder',
      unit: 'kg',
      currentStock: '5',
      minStock: '10',
      isActive: true,
      supplierId: testSupplierId,
    });
    testIngredientId = Number(createdIngredient?.id);
  });

  afterEach(async () => {
    if (testIngredientId) {
      await db.delete(stockMovements).where(eq(stockMovements.ingredientId, testIngredientId));
      await db.delete(ingredients).where(eq(ingredients.id, testIngredientId));
    }
    if (testSupplierId) {
      await db.delete(purchaseOrders).where(eq(purchaseOrders.supplierId, testSupplierId));
      await supplierRepo.deleteSupplier(testSupplierId);
    }
  });

  describe('calculateUsageRate', () => {
    it('should return 0 when no stock movements exist', async () => {
      const usageRate = await reorderService.calculateUsageRate(testIngredientId, 30);
      expect(usageRate).toBe(0);
    });

    it('should calculate usage from stock movements', async () => {
      await db.insert(stockMovements).values({
        ingredientId: testIngredientId,
        type: 'out',
        quantity: '30',
        reason: 'Test usage',
        createdAt: new Date(),
      });

      const usageRate = await reorderService.calculateUsageRate(testIngredientId, 30);
      expect(usageRate).toBe(1);
    });

    it('should only count outbound movements', async () => {
      await db.insert(stockMovements).values({
        ingredientId: testIngredientId,
        type: 'in',
        quantity: '100',
        reason: 'Test inbound',
        createdAt: new Date(),
      });

      await db.insert(stockMovements).values({
        ingredientId: testIngredientId,
        type: 'out',
        quantity: '30',
        reason: 'Test outbound',
        createdAt: new Date(),
      });

      const usageRate = await reorderService.calculateUsageRate(testIngredientId, 30);
      expect(usageRate).toBe(1);
    });

    it('should respect date range', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 40);

      await db.insert(stockMovements).values({
        ingredientId: testIngredientId,
        type: 'out',
        quantity: '100',
        reason: 'Old movement',
        createdAt: oldDate,
      });

      await db.insert(stockMovements).values({
        ingredientId: testIngredientId,
        type: 'out',
        quantity: '30',
        reason: 'Recent movement',
        createdAt: new Date(),
      });

      const usageRate = await reorderService.calculateUsageRate(testIngredientId, 30);
      expect(usageRate).toBe(1);
    });
  });

  describe('getUsageRate', () => {
    it('should return 0 for non-existent ingredient', async () => {
      const usageRate = await reorderService.getUsageRate(99999);
      expect(usageRate).toBe(0);
    });

    it('should return calculated usage when no override exists', async () => {
      await db.insert(stockMovements).values({
        ingredientId: testIngredientId,
        type: 'out',
        quantity: '60',
        reason: 'Test usage',
        createdAt: new Date(),
      });

      const usageRate = await reorderService.getUsageRate(testIngredientId);
      expect(usageRate).toBe(2);
    });

    it('should return manual override when set', async () => {
      await reorderService.setUsageRateOverride(testIngredientId, 15.5);

      const usageRate = await reorderService.getUsageRate(testIngredientId);
      expect(usageRate).toBe(15.5);
    });
  });

  describe('setUsageRateOverride', () => {
    it('should set usage override successfully', async () => {
      const result = await reorderService.setUsageRateOverride(testIngredientId, 10);
      expect(result).toBe(true);

      const ingredient = await inventoryRepo.getIngredientById(testIngredientId);
      expect(Number(ingredient?.usageOverride)).toBe(10);
    });

    it('should update existing override', async () => {
      await reorderService.setUsageRateOverride(testIngredientId, 5);
      await reorderService.setUsageRateOverride(testIngredientId, 20);

      const ingredient = await inventoryRepo.getIngredientById(testIngredientId);
      expect(Number(ingredient?.usageOverride)).toBe(20);
    });
  });

  describe('calculateLeadTime', () => {
    it('should return default lead time when no POs exist', async () => {
      const leadTime = await reorderService.calculateLeadTime(testSupplierId);
      expect(leadTime).toBe(7);
    });

    it('should calculate average lead time from historical POs', async () => {
      const orderDate1 = new Date('2026-04-01');
      const deliveryDate1 = new Date('2026-04-08');

      const orderDate2 = new Date('2026-04-10');
      const deliveryDate2 = new Date('2026-04-18');

      await db.insert(purchaseOrders).values({
        poNumber: 'PO-TEST-001',
        supplierId: testSupplierId,
        status: 'received',
        orderDate: orderDate1,
        expectedDeliveryDate: deliveryDate1,
        totalAmount: '100000',
        createdBy: 1,
      });

      await db.insert(purchaseOrders).values({
        poNumber: 'PO-TEST-002',
        supplierId: testSupplierId,
        status: 'received',
        orderDate: orderDate2,
        expectedDeliveryDate: deliveryDate2,
        totalAmount: '200000',
        createdBy: 1,
      });

      const leadTime = await reorderService.calculateLeadTime(testSupplierId);
      expect(leadTime).toBe(8);
    });
  });

  describe('getReorderSuggestions', () => {
    it('should return empty array when no low stock ingredients', async () => {
      await inventoryRepo.updateIngredient(testIngredientId, {
        currentStock: '100',
        minStock: '10',
      });

      const suggestions = await reorderService.getReorderSuggestions();
      const hasTestIngredient = suggestions.some((s) => s.ingredientId === testIngredientId);
      expect(hasTestIngredient).toBe(false);
    });

    it('should include low stock ingredients in suggestions', async () => {
      await inventoryRepo.updateIngredient(testIngredientId, {
        currentStock: '5',
        minStock: '10',
      });

      await db.insert(stockMovements).values({
        ingredientId: testIngredientId,
        type: 'out',
        quantity: '30',
        reason: 'Test usage',
        createdAt: new Date(),
      });

      const suggestions = await reorderService.getReorderSuggestions();
      const suggestion = suggestions.find((s) => s.ingredientId === testIngredientId);

      expect(suggestion).toBeDefined();
      expect(suggestion?.ingredientName).toBe('Test Ingredient for Reorder');
      expect(suggestion?.currentStock).toBe(5);
      expect(suggestion?.minStock).toBe(10);
      expect(suggestion?.supplierId).toBe(testSupplierId);
      expect(suggestion?.dailyUsage).toBeGreaterThan(0);
      expect(suggestion?.reorderPoint).toBeGreaterThan(0);
      expect(suggestion?.eoq).toBeGreaterThan(0);
    });
  });

  describe('calculateForIngredient', () => {
    it('should return null for non-existent ingredient', async () => {
      const result = await reorderService.calculateForIngredient(99999);
      expect(result).toBeNull();
    });

    it('should return complete calculation for valid ingredient', async () => {
      await db.insert(stockMovements).values({
        ingredientId: testIngredientId,
        type: 'out',
        quantity: '60',
        reason: 'Test usage',
        createdAt: new Date(),
      });

      const result = await reorderService.calculateForIngredient(testIngredientId);

      expect(result).toBeDefined();
      expect(result?.ingredient.id).toBe(testIngredientId);
      expect(result?.currentStock).toBe(5);
      expect(result?.minStock).toBe(10);
      expect(result?.dailyUsage).toBe(2);
      expect(result?.reorderPoint).toBeGreaterThan(0);
      expect(result?.eoq).toBeGreaterThan(0);
      expect(result?.leadTimeDays).toBe(7);
      expect(result?.supplier).toBeDefined();
    });
  });
});
