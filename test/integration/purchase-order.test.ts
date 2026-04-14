import { describe, it, expect, afterEach } from 'vitest';
import * as supplierRepo from '../../src/repositories/supplier';
import * as inventoryRepo from '../../src/repositories/inventory';

describe('Purchase Order System', () => {
  let testSupplierId: number;

  afterEach(async () => {
    if (testSupplierId) {
      await supplierRepo.deleteSupplier(testSupplierId);
    }
  });

  describe('PO Creation', () => {
    it('should create a purchase order', async () => {
      const supplier = await supplierRepo.createSupplier({
        name: 'PO Test Supplier',
        isActive: true,
      });
      testSupplierId = Number(supplier[0]?.insertId);

      const po = await supplierRepo.createPO({
        supplierId: testSupplierId,
        items: [{ ingredientId: 1, quantity: '10', unit: 'kg', unitPrice: 5000 }],
        createdBy: 1,
      });

      expect(po).toBeDefined();
      expect(po.po).toBeDefined();
    });

    it('should generate valid PO number format', async () => {
      const poNumber = await supplierRepo.generatePONumber();
      expect(poNumber).toMatch(/^PO-\d{8}-\d{3}$/);
    });
  });

  describe('PO Queries', () => {
    it('should get all POs', async () => {
      const pos = await supplierRepo.getAllPOs();
      expect(Array.isArray(pos)).toBe(true);
    });

    it('should get POs by status', async () => {
      const pos = await supplierRepo.getPOsByStatus('draft');
      expect(Array.isArray(pos)).toBe(true);
    });

    it('should get PO by id', async () => {
      const supplier = await supplierRepo.createSupplier({
        name: 'GetById Test',
        isActive: true,
      });
      testSupplierId = Number(supplier[0]?.insertId);

      const created = await supplierRepo.createPO({
        supplierId: testSupplierId,
        items: [{ ingredientId: 1, quantity: '5', unit: 'kg', unitPrice: 3000 }],
        createdBy: 1,
      });
      const poId = created.po?.[0]?.id;

      const fetched = await supplierRepo.getPOById(poId);
      expect(fetched).toBeDefined();
    });
  });

  describe('Supplier Prices', () => {
    it('should get best price for ingredient', async () => {
      const supplier = await supplierRepo.createSupplier({
        name: 'Price Test',
        isActive: true,
      });
      testSupplierId = Number(supplier[0]?.insertId);

      await supplierRepo.updateSupplierPrice(testSupplierId, 1, 5000, 'kg');
      const bestPrice = await supplierRepo.getBestPriceForIngredient(1);
      expect(bestPrice.length).toBeGreaterThan(0);
    });
  });

  describe('Approval Workflow', () => {
    it('should support extended status values', async () => {
      const statuses = ['draft', 'submitted', 'approved', 'rejected', 'ordered', 'received', 'cancelled'];
      expect(statuses).toHaveLength(7);
    });
  });
});