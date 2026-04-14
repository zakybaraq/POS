import { describe, it, expect } from 'vitest';
import {
  calculateReorderPoint,
  calculateEOQ,
  DEFAULT_ORDERING_COST,
  DEFAULT_HOLDING_COST_PERCENT,
} from '../../src/services/reorder';

describe('Reorder Calculation Functions', () => {
  describe('calculateReorderPoint', () => {
    it('should calculate reorder point with standard values', () => {
      const result = calculateReorderPoint(7, 5, 10);
      expect(result).toBe(45);
    });

    it('should calculate reorder point with zero lead time', () => {
      const result = calculateReorderPoint(0, 5, 10);
      expect(result).toBe(10);
    });

    it('should calculate reorder point with zero daily usage', () => {
      const result = calculateReorderPoint(7, 0, 10);
      expect(result).toBe(10);
    });

    it('should calculate reorder point with zero safety stock', () => {
      const result = calculateReorderPoint(7, 5, 0);
      expect(result).toBe(35);
    });

    it('should handle fractional daily usage', () => {
      const result = calculateReorderPoint(7, 2.5, 10);
      expect(result).toBe(27.5);
    });

    it('should handle large values', () => {
      const result = calculateReorderPoint(30, 100, 500);
      expect(result).toBe(3500);
    });
  });

  describe('calculateEOQ', () => {
    it('should calculate EOQ with standard values', () => {
      const annualDemand = 3650;
      const orderingCost = 25;
      const holdingCostPercent = 20;
      const result = calculateEOQ(annualDemand, orderingCost, holdingCostPercent);
      const expected = Math.ceil(Math.sqrt((2 * 3650 * 25) / 0.2));
      expect(result).toBe(expected);
    });

    it('should use default values when not provided', () => {
      const annualDemand = 3650;
      const result = calculateEOQ(annualDemand);
      const expected = Math.ceil(
        Math.sqrt((2 * annualDemand * DEFAULT_ORDERING_COST) / (DEFAULT_HOLDING_COST_PERCENT / 100))
      );
      expect(result).toBe(expected);
    });

    it('should return 0 for zero annual demand', () => {
      const result = calculateEOQ(0, 25, 20);
      expect(result).toBe(0);
    });

    it('should return 0 for negative annual demand', () => {
      const result = calculateEOQ(-100, 25, 20);
      expect(result).toBe(0);
    });

    it('should return 0 for zero ordering cost', () => {
      const result = calculateEOQ(3650, 0, 20);
      expect(result).toBe(0);
    });

    it('should return 0 for zero holding cost', () => {
      const result = calculateEOQ(3650, 25, 0);
      expect(result).toBe(0);
    });

    it('should handle very small annual demand', () => {
      const result = calculateEOQ(10, 25, 20);
      const expected = Math.ceil(Math.sqrt((2 * 10 * 25) / 0.2));
      expect(result).toBe(expected);
      expect(result).toBeGreaterThan(0);
    });

    it('should handle very large annual demand', () => {
      const result = calculateEOQ(100000, 25, 20);
      const expected = Math.ceil(Math.sqrt((2 * 100000 * 25) / 0.2));
      expect(result).toBe(expected);
    });

    it('should round up to nearest integer', () => {
      const result = calculateEOQ(100, 25, 20);
      const exactEOQ = Math.sqrt((2 * 100 * 25) / 0.2);
      expect(result).toBe(Math.ceil(exactEOQ));
      expect(result).toBeGreaterThanOrEqual(exactEOQ);
    });
  });
});
