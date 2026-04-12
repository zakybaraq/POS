import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as orderRepo from '../../src/repositories/order';
import * as orderItemRepo from '../../src/repositories/order-item';
import * as inventoryRepo from '../../src/repositories/inventory';
import * as tableRepo from '../../src/repositories/table';
import { db } from '../../src/db/index';

describe('Order Cancellation with Stock Refund', () => {
  let orderId: number;
  const tableId = 1;
  
  beforeEach(async () => {
    const order = await orderRepo.createOrder(tableId, 1);
    if (!order) throw new Error('Failed to create test order');
    orderId = order.id;
  });
  
  it('should not refund stock if order not completed', async () => {
    const result = await db.transaction(async (tx: any) => {
      return inventoryRepo.refundStockForOrderTx(tx, orderId);
    });
    
    expect(result.refunded).toBe(false);
    expect(result.reason).toContain('not completed');
  });
  
  it('should refund stock when completed order is cancelled', async () => {
    await orderItemRepo.addItem(orderId, 1, 1);
    await orderRepo.calculateTotals(orderId);
    
    const completedOrder = await orderRepo.completeOrderWithPayment(orderId, 100000);
    expect(completedOrder?.status).toBe('completed');
    
    const result = await db.transaction(async (tx: any) => {
      return inventoryRepo.refundStockForOrderTx(tx, orderId);
    });
    
    expect(result.refunded).toBe(true);
  });
  
  it('should prevent double-refund', async () => {
    await orderItemRepo.addItem(orderId, 1, 1);
    await orderRepo.calculateTotals(orderId);
    await orderRepo.completeOrderWithPayment(orderId, 100000);
    
    const first = await db.transaction(async (tx: any) => {
      return inventoryRepo.refundStockForOrderTx(tx, orderId);
    });
    expect(first.refunded).toBe(true);
    
    const second = await db.transaction(async (tx: any) => {
      return inventoryRepo.refundStockForOrderTx(tx, orderId);
    });
    expect(second.refunded).toBe(false);
    expect(second.reason).toContain('Already refunded');
  });
  
  afterEach(async () => {
    await orderItemRepo.deleteItemsByOrderId(orderId);
    await orderRepo.deleteOrder(orderId);
    await tableRepo.updateTableStatus(tableId, 'available');
  });
});
