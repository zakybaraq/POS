import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as orderRepo from '../../src/repositories/order';
import * as orderItemRepo from '../../src/repositories/order-item';
import * as tableRepo from '../../src/repositories/table';
import { db } from '../../src/db/index';

describe('Order Completion Payment Semantics', () => {
  let orderId: number;
  const tableId = 1;
  
  beforeEach(async () => {
    const order = await orderRepo.createOrder(tableId, 1);
    if (!order) throw new Error('Failed to create test order');
    orderId = order.id;
    
    await orderItemRepo.addItem(orderId, 1, 1);
    await orderRepo.calculateTotals(orderId);
  });
  
  it('should complete order with payment and decrement stock', async () => {
    const order = await orderRepo.getOrderById(orderId);
    const amountPaid = (order?.total || 0) + 10000;
    
    const completed = await orderRepo.completeOrderWithPayment(orderId, amountPaid);
    
    expect(completed?.status).toBe('completed');
    expect(completed?.amountPaid).toBe(amountPaid);
    expect(completed?.changeDue).toBe(10000);
  });
  
  it('should reject payment if insufficient amount', async () => {
    const order = await orderRepo.getOrderById(orderId);
    const insufficientAmount = (order?.total || 0) - 1000;
    
    try {
      await orderRepo.completeOrderWithPayment(orderId, insufficientAmount);
      expect.fail('Should have thrown');
    } catch (e: any) {
      expect(e.message).toContain('insufficient');
    }
  });
  
  it('should finish order without payment', async () => {
    const completed = await orderRepo.finishOrderWithoutPayment(orderId);
    
    expect(completed?.status).toBe('completed');
    expect(completed?.amountPaid).toBeNull();
  });
  
  afterEach(async () => {
    await orderItemRepo.deleteItemsByOrderId(orderId);
    await orderRepo.deleteOrder(orderId);
    await tableRepo.updateTableStatus(tableId, 'available');
  });
});
