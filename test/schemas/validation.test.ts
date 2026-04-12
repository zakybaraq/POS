import { describe, it, expect } from 'vitest';
import { registerSchema, loginSchema, changePasswordSchema } from '../../src/schemas/auth';
import { createOrderSchema, addItemToOrderSchema } from '../../src/schemas/order';
import { createIngredientSchema, stockMovementSchema } from '../../src/schemas/inventory';
import { createMenuSchema } from '../../src/schemas/menu';

describe('Auth Schemas', () => {
  describe('registerSchema', () => {
    it('should validate valid registration data', () => {
      const data = { email: 'test@test.com', password: '123456', name: 'Test User' };
      const result = registerSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const data = { email: 'not-an-email', password: '123456', name: 'Test' };
      const result = registerSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject short password', () => {
      const data = { email: 'test@test.com', password: '123', name: 'Test' };
      const result = registerSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject short name', () => {
      const data = { email: 'test@test.com', password: '123456', name: 'A' };
      const result = registerSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('loginSchema', () => {
    it('should validate valid login data', () => {
      const data = { email: 'test@test.com', password: 'password' };
      const result = loginSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject missing email', () => {
      const data = { password: 'password' };
      const result = loginSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('changePasswordSchema', () => {
    it('should validate password change with both passwords meeting minimum', () => {
      const data = { oldPassword: 'old123456', newPassword: 'new123456' };
      const result = changePasswordSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject short old password', () => {
      const data = { oldPassword: '123', newPassword: 'new123456' };
      const result = changePasswordSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });
});

describe('Order Schemas', () => {
  describe('createOrderSchema', () => {
    it('should validate valid order data', () => {
      const data = { tableId: 1, userId: 1 };
      const result = createOrderSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject negative tableId', () => {
      const data = { tableId: -1, userId: 1 };
      const result = createOrderSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('addItemToOrderSchema', () => {
    it('should validate valid order item', () => {
      const data = { menuId: 1, quantity: 2 };
      const result = addItemToOrderSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject negative quantity', () => {
      const data = { menuId: 1, quantity: -1 };
      const result = addItemToOrderSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });
});

describe('Inventory Schemas', () => {
  describe('createIngredientSchema', () => {
    it('should validate valid ingredient', () => {
      const data = { name: 'Tepung', unit: 'kg', currentStock: 100, minStock: 10, costPerUnit: 5000 };
      const result = createIngredientSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject negative stock', () => {
      const data = { name: 'Tepung', unit: 'kg', currentStock: -10, minStock: 10, costPerUnit: 5000 };
      const result = createIngredientSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('stockMovementSchema', () => {
    it('should validate valid stock movement', () => {
      const data = { ingredientId: 1, type: 'out', quantity: 5, reason: 'Order completion' };
      const result = stockMovementSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject negative quantity', () => {
      const data = { ingredientId: 1, type: 'out', quantity: -5 };
      const result = stockMovementSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });
});

describe('Menu Schemas', () => {
  describe('createMenuSchema', () => {
    it('should validate valid menu item', () => {
      const data = { name: 'Nasi Goreng', price: 25000, category: 'Makanan' };
      const result = createMenuSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject zero price', () => {
      const data = { name: 'Nasi Goreng', price: 0, category: 'Makanan' };
      const result = createMenuSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject negative price', () => {
      const data = { name: 'Nasi Goreng', price: -10000, category: 'Makanan' };
      const result = createMenuSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });
});