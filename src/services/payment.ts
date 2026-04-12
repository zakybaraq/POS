import type { Order } from '../db/schema';
import * as orderRepo from '../repositories/order';
import * as tableRepo from '../repositories/table';
import { getLoggerWithRequestId } from '../utils/logger-with-context';

export function calculateChange(total: number, amountPaid: number): number {
  return amountPaid - total;
}

export async function processPayment(orderId: number, amountPaid: number) {
  const logger = getLoggerWithRequestId();
  
  logger.info({ orderId, amountPaid }, 'Payment processing initiated');
  
  const order = await orderRepo.getOrderById(orderId);
  if (!order) {
    logger.error({ orderId }, 'Payment failed - order not found');
    throw new Error('Order not found');
  }
  if (order.status !== 'active') {
    logger.error({ orderId, orderStatus: order.status }, 'Payment failed - order not active');
    throw new Error('Order is not active');
  }
  if (amountPaid < order.total) {
    logger.error({ orderId, amountPaid, orderTotal: order.total }, 'Payment failed - insufficient payment');
    throw new Error('Insufficient payment');
  }
  
  logger.info({ orderId, amountPaid, orderTotal: order.total, changeDue: calculateChange(order.total, amountPaid) }, 'Payment validated successfully');
  
  try {
    const result = await orderRepo.completeOrderWithPayment(orderId, amountPaid);
    logger.info({ orderId, amountPaid }, 'Payment processed and order completed successfully');
    return result;
  } catch (error) {
    logger.error({ orderId, amountPaid, err: error }, 'Payment processing failed during order completion');
    throw error;
  }
}

 export function generateReceipt(order: Order, items: any[], tableNumber: number): string {
   const now = new Date();
   const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
   
   let receipt = `================================\n`;
   receipt += `       RESTAURANT POS\n`;
   receipt += `================================\n`;
   receipt += `Meja: ${tableNumber}      Waktu: ${timeStr}\n`;
   receipt += `--------------------------------\n`;
   
   for (const item of items) {
     const itemTotal = item.priceAtOrder * item.quantity;
     const name = item.menuName || 'Unknown';
     const qty = item.quantity;
     const price = itemTotal.toLocaleString('id-ID');
     const spaces = ' '.repeat(Math.max(0, 25 - name.length - qty.toString().length - price.length));
     receipt += `${name}    x${qty}${spaces}${price}\n`;
   }
   
   receipt += `--------------------------------\n`;
   receipt += `Subtotal           ${(order.subtotal || 0).toLocaleString('id-ID')}\n`;
   receipt += `Pajak (10%)        ${(order.tax || 0).toLocaleString('id-ID')}\n`;
   receipt += `--------------------------------\n`;
   receipt += `TOTAL              ${(order.total || 0).toLocaleString('id-ID')}\n`;
   receipt += `--------------------------------\n`;
   receipt += `Uang Diterima      ${(order.amountPaid || 0).toLocaleString('id-ID')}\n`;
   receipt += `Kembalian          ${(order.changeDue || 0).toLocaleString('id-ID')}\n`;
   receipt += `================================\n`;
   receipt += `      TERIMA KASIH\n`;
   receipt += `================================`;
   
   return receipt;
 }
