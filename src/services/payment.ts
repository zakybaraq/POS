import type { Order } from '../db/schema';
import * as orderRepo from '../repositories/order';
import * as tableRepo from '../repositories/table';

export function calculateChange(total: number, amountPaid: number): number {
  return amountPaid - total;
}

export async function processPayment(orderId: number, amountPaid: number) {
  const order = await orderRepo.getOrderById(orderId);
  if (!order) {
    throw new Error('Order not found');
  }
  if (order.status !== 'active') {
    throw new Error('Order is not active');
  }
  if (amountPaid < order.total) {
    throw new Error('Insufficient payment');
  }
  
  const shouldComplete = !order.tableId || order.tableId === 0;
  const completedOrder = await orderRepo.completeOrder(orderId, amountPaid, shouldComplete);
  
  return completedOrder;
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