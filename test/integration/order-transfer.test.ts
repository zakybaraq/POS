import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as orderRepo from '../../src/repositories/order';
import * as tableRepo from '../../src/repositories/table';
import { db } from '../../src/db/index';

describe('Order Transfer (Transactional)', () => {
  let orderId: number;
  const sourceTableId = 1;
  const targetTableId = 2;
  
  beforeEach(async () => {
    const order = await orderRepo.createOrder(sourceTableId, 1);
    if (!order) throw new Error('Failed to create test order');
    orderId = order.id;
  });
  
  it('should transfer order to new table atomically', async () => {
    await orderRepo.transferOrderToTable(orderId, sourceTableId, targetTableId);
    
    const order = await orderRepo.getOrderById(orderId);
    expect(order?.tableId).toBe(targetTableId);
    
    const sourceTable = await tableRepo.getTableById(sourceTableId);
    expect(sourceTable?.status).toBe('available');
    
    const targetTable = await tableRepo.getTableById(targetTableId);
    expect(targetTable?.status).toBe('occupied');
  });
  
  it('should rollback if target table occupied', async () => {
    await tableRepo.updateTableStatus(targetTableId, 'occupied');
    
    try {
      await orderRepo.transferOrderToTable(orderId, sourceTableId, targetTableId);
      expect.fail('Should have thrown');
    } catch (e: any) {
      expect(e.message).toContain('occupied');
    }
    
    const order = await orderRepo.getOrderById(orderId);
    expect(order?.tableId).toBe(sourceTableId);
  });
  
  it('should prevent transfer if order not on source table', async () => {
    try {
      await orderRepo.transferOrderToTable(orderId, 999, targetTableId);
      expect.fail('Should have thrown');
    } catch (e: any) {
      expect(e.message).toContain('not on table');
    }
  });
  
  afterEach(async () => {
    await orderRepo.deleteOrder(orderId);
    await tableRepo.updateTableStatus(sourceTableId, 'available');
    await tableRepo.updateTableStatus(targetTableId, 'available');
  });
});
