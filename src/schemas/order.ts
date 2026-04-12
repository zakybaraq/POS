import { z } from 'zod';

export const createOrderSchema = z.object({
  tableId: z.number().int().positive(),
  userId: z.number().int().positive(),
});

export const createOrderWithItemsSchema = z.object({
  tableId: z.number().int().positive().optional(),
  userId: z.number().int().positive(),
  customerId: z.number().int().positive().optional(),
  orderType: z.enum(['dine-in', 'takeaway']).optional(),
  items: z.array(z.object({
    menuId: z.number().int().positive(),
    quantity: z.number().int().positive(),
    notes: z.string().max(500).optional(),
  })).min(1, 'At least one item is required'),
});

export const createOrderFromTableSchema = z.object({
  userId: z.number().int().positive(),
});

export const addItemToOrderSchema = z.object({
  menuId: z.number().int().positive(),
  quantity: z.number().int().positive('Quantity must be at least 1').default(1),
  notes: z.string().max(500).optional(),
});

export const updateOrderItemSchema = z.object({
  quantity: z.number().int().positive().optional(),
  notes: z.string().max(500).optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(['active', 'completed', 'cancelled']),
});

export const transferOrderSchema = z.object({
  sourceTableId: z.number().int().positive('Valid source table ID required'),
  targetTableId: z.number().int().positive('Valid target table ID required'),
});

export const paymentSchema = z.object({
  amountPaid: z.number().positive('Amount must be greater than 0'),
});

export const cancelOrderSchema = z.object({
  reason: z.string().max(500).optional(),
});

export const cancelOrderSchema = z.object({
  reason: z.string().max(500).optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type CreateOrderWithItemsInput = z.infer<typeof createOrderWithItemsSchema>;
export type CreateOrderFromTableInput = z.infer<typeof createOrderFromTableSchema>;
export type AddItemToOrderInput = z.infer<typeof addItemToOrderSchema>;
export type UpdateOrderItemInput = z.infer<typeof updateOrderItemSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type TransferOrderInput = z.infer<typeof transferOrderSchema>;
export type PaymentInput = z.infer<typeof paymentSchema>;
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;