import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as orderRepo from '../../src/repositories/order';
import * as orderItemRepo from '../../src/repositories/order-item';
import { db } from '../../src/db/index';
import { orderItems } from '../../src/db/schema';
import { eq } from 'drizzle-orm';

describe('Order Item Operations (Transactional)', () => {
  let orderId: number;
  
  beforeEach(async () => {
    const order = await orderRepo.createOrder(1, 1);
    if (!order) throw new Error('Failed to create test order');
    orderId = order.id;
  });
  
  it('should add item to order atomically', async () => {
    const result = await db.transaction(async (tx: any) => {
      await orderItemRepo.addItemTx(tx, orderId, 1, 2);
      const items = await tx.select().from(orderItems)
        .where(eq(orderItems.orderId, orderId));
      expect(items).toHaveLength(1);
      return items[0];
    });
    
    expect(result.quantity).toBe(2);
  });
  
  it('should prevent duplicate items and increase quantity', async () => {
    await orderItemRepo.addItem(orderId, 1, 2);
    await orderItemRepo.addItem(orderId, 1, 3);
    
    const items = await orderItemRepo.getItemsByOrderId(orderId);
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(5);
  });
  
  it('should roll back on transaction failure', async () => {
    try {
      await db.transaction(async (tx: any) => {
        await orderItemRepo.addItemTx(tx, orderId, 1, 1);
        throw new Error('Simulated failure');
      });
    } catch (e) {
      // Expected
    }
    
    const items = await orderItemRepo.getItemsByOrderId(orderId);
    expect(items).toHaveLength(0);
  });
  
  it('should update quantity atomically', async () => {
    await orderItemRepo.addItem(orderId, 1, 2);
    const items = await orderItemRepo.getItemsByOrderId(orderId);
    const itemId = items[0].id;
    
    await orderItemRepo.updateQuantity(itemId, 5);
    const updated = await orderItemRepo.getItemsByOrderId(orderId);
    expect(updated[0].quantity).toBe(5);
  });
  
  it('should remove item when quantity set to 0', async () => {
    await orderItemRepo.addItem(orderId, 1, 2);
    const items = await orderItemRepo.getItemsByOrderId(orderId);
    const itemId = items[0].id;
    
    await orderItemRepo.updateQuantity(itemId, 0);
    const remaining = await orderItemRepo.getItemsByOrderId(orderId);
    expect(remaining).toHaveLength(0);
  });
  
  afterEach(async () => {
    await orderItemRepo.deleteItemsByOrderId(orderId);
    await orderRepo.deleteOrder(orderId);
  });
});
