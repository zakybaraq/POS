import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as supplierRepo from '../../src/repositories/supplier';
import * as inventoryRepo from '../../src/repositories/inventory';
import { db } from '../../src/db/index';
import { eq } from 'drizzle-orm';
import { suppliers, ingredients } from '../../src/db/schema';

describe('Supplier Management', () => {
  let testSupplierId: number;
  let testIngredientId: number;

  afterEach(async () => {
    if (testSupplierId) {
      await supplierRepo.deleteSupplier(testSupplierId);
    }
  });

  describe('Supplier CRUD', () => {
    it('should create a new supplier', async () => {
      const supplier = await supplierRepo.createSupplier({
        name: 'Test Supplier',
        contactPerson: 'John Doe',
        phone: '081234567890',
        email: 'test@supplier.com',
        address: 'Test Address 123',
        category: 'sayuran',
        notes: 'Test notes',
        isActive: true,
      });

      expect(supplier).toBeDefined();
      testSupplierId = Number(supplier[0]?.insertId);
      expect(testSupplierId).toBeGreaterThan(0);
    });

    it('should get all suppliers', async () => {
      const allSuppliers = await supplierRepo.getAllSuppliers();
      expect(Array.isArray(allSuppliers)).toBe(true);
    });

    it('should get active suppliers only', async () => {
      const activeSuppliers = await supplierRepo.getActiveSuppliers();
      expect(Array.isArray(activeSuppliers)).toBe(true);
    });

    it('should get supplier by id', async () => {
      const created = await supplierRepo.createSupplier({
        name: 'Get By ID Test',
        isActive: true,
      });
      testSupplierId = Number(created[0]?.insertId);

      const fetched = await supplierRepo.getSupplierById(testSupplierId);
      expect(fetched).toBeDefined();
      expect(fetched?.name).toBe('Get By ID Test');
    });

    it('should update supplier', async () => {
      const created = await supplierRepo.createSupplier({
        name: 'Update Test',
        isActive: true,
      });
      testSupplierId = Number(created[0]?.insertId);

      const updated = await supplierRepo.updateSupplier(testSupplierId, {
        name: 'Updated Name',
        contactPerson: 'Jane Doe',
      });

      expect(updated[0]?.name).toBe('Updated Name');
    });

    it('should soft delete supplier (set isActive to false)', async () => {
      const created = await supplierRepo.createSupplier({
        name: 'Delete Test',
        isActive: true,
      });
      testSupplierId = Number(created[0]?.insertId);

      await supplierRepo.deleteSupplier(testSupplierId);

      const fetched = await supplierRepo.getSupplierById(testSupplierId);
      expect(fetched?.isActive).toBe(false);
    });
  });

  describe('Preferred Supplier Link', () => {
    it('should link ingredient to preferred supplier', async () => {
      const created = await supplierRepo.createSupplier({
        name: 'Preferred Supplier Test',
        isActive: true,
      });
      testSupplierId = Number(created[0]?.insertId);

      await inventoryRepo.updateIngredient(1, { supplierId: testSupplierId });

      const ingredient = await inventoryRepo.getIngredientById(1);
      expect(ingredient?.supplierId).toBe(testSupplierId);
    });

    it('should allow setting supplierId to null', async () => {
      await inventoryRepo.updateIngredient(1, { supplierId: null });

      const ingredient = await inventoryRepo.getIngredientById(1);
      expect(ingredient?.supplierId).toBeNull();
    });
  });
});

describe('Supplier Prices', () => {
  let testSupplierId: number;
  let testIngredientId = 1;

  afterEach(async () => {
    if (testSupplierId) {
      await supplierRepo.deleteSupplier(testSupplierId);
    }
  });

  it('should get best price for ingredient', async () => {
    const created = await supplierRepo.createSupplier({
      name: 'Best Price Supplier',
      isActive: true,
    });
    testSupplierId = Number(created[0]?.insertId);

    await supplierRepo.updateSupplierPrice(testSupplierId, testIngredientId, 5000, 'kg');

    const bestPrice = await supplierRepo.getBestPriceForIngredient(testIngredientId);
    expect(bestPrice.length).toBeGreaterThan(0);
  });
});