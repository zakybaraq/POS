import type { Server } from 'socket.io';
import { getLoggerWithRequestId } from '../utils/logger-with-context';

let ioInstance: Server | null = null;
const logger = getLoggerWithRequestId();

export function setSocketIO(io: Server) {
  ioInstance = io;
}

function getIO(): Server {
  if (!ioInstance) {
    throw new Error('Socket.io not initialized. Call setSocketIO() first.');
  }
  return ioInstance;
}

export function notifyKitchen(order: any) {
  try {
    const io = getIO();
    io.to('kitchen').to('chef').emit('order:created', {
      namespace: 'orders',
      event: 'created',
      payload: order,
      timestamp: new Date().toISOString(),
    });
    logger.info({ orderId: order.id }, 'Order notification sent to kitchen');
  } catch (e) {
    logger.warn({ orderId: order.id }, 'Failed to notify kitchen (WebSocket not ready)');
  }
}

export function notifyOrderStatusChanged(order: any) {
  try {
    const io = getIO();
    io.to('kitchen').to('chef').to('kasir').emit('order:status-changed', {
      namespace: 'orders',
      event: 'status-changed',
      payload: order,
      timestamp: new Date().toISOString(),
    });
    logger.info({ orderId: order.id, status: order.status }, 'Order status notification sent');
  } catch (e) {
    logger.warn({ orderId: order.id }, 'Failed to notify status change (WebSocket not ready)');
  }
}

export function notifyOrderCompleted(order: any) {
  try {
    const io = getIO();
    io.to('kasir').to('admin').emit('order:completed', {
      namespace: 'orders',
      event: 'completed',
      payload: order,
      timestamp: new Date().toISOString(),
    });
    logger.info({ orderId: order.id }, 'Order completion notification sent');
  } catch (e) {
    logger.warn({ orderId: order.id }, 'Failed to notify completion (WebSocket not ready)');
  }
}

export function notifyPaymentReceived(order: any) {
  try {
    const io = getIO();
    io.to('kasir').to('admin').emit('payment:received', {
      namespace: 'payments',
      event: 'received',
      payload: order,
      timestamp: new Date().toISOString(),
    });
    logger.info({ orderId: order.id, amount: order.amountPaid }, 'Payment notification sent');
  } catch (e) {
    logger.warn({ orderId: order.id }, 'Failed to notify payment (WebSocket not ready)');
  }
}
