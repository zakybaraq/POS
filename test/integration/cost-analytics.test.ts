import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as analytics from '../../src/services/cost-analytics';
import * as supplierRepo from '../../src/repositories/supplier';

describe('Cost Analytics Service', () => {
  let testSupplierId: number;

  beforeEach(async () => {
    const supplier = await supplierRepo.createSupplier({
      name: 'Analytics Test Supplier',
      isActive: true,
    });
    testSupplierId = Number(supplier[0]?.insertId);
  });

  describe('getMonthlyCosts', () => {
    it('should return monthly cost data', async () => {
      const costs = await analytics.getMonthlyCosts(2026, 4);
      expect(costs).toHaveProperty('year');
      expect(costs).toHaveProperty('month');
      expect(costs).toHaveProperty('totalCost');
    });
  });

  afterEach(async () => {
    if (testSupplierId) {
      await supplierRepo.deleteSupplier(testSupplierId);
    }
  });
});