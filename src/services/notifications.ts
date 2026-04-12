import type { Server } from 'socket.io';
import { getLoggerWithRequestId } from '../utils/logger-with-context';

export class NotificationService {
  private logger = getLoggerWithRequestId();
  
  constructor(private io: Server) {}
  
  notifyKitchen(order: any) {
    this.io.to('kitchen').to('chef').emit('order:created', {
      namespace: 'orders',
      event: 'created',
      payload: order,
      timestamp: new Date().toISOString(),
    });
    this.logger.info({ orderId: order.id }, 'Order notification sent to kitchen');
  }
  
  notifyOrderStatusChanged(order: any) {
    const event = {
      namespace: 'orders',
      event: 'status-changed',
      payload: order,
      timestamp: new Date().toISOString(),
    };
    
    this.io.to('kitchen').to('chef').to('kasir').emit('order:status-changed', event);
    this.logger.info({ orderId: order.id, status: order.status }, 'Order status notification sent');
  }
  
  notifyOrderCompleted(order: any) {
    this.io.to('kasir').to('admin').emit('order:completed', {
      namespace: 'orders',
      event: 'completed',
      payload: order,
      timestamp: new Date().toISOString(),
    });
    this.logger.info({ orderId: order.id }, 'Order completion notification sent');
  }
  
  notifyPaymentReceived(order: any) {
    this.io.to('kasir').to('admin').emit('payment:received', {
      namespace: 'payments',
      event: 'received',
      payload: order,
      timestamp: new Date().toISOString(),
    });
    this.logger.info({ orderId: order.id, amount: order.amountPaid }, 'Payment notification sent');
  }
}

let notificationService: NotificationService | null = null;

export function getNotificationService(io?: Server): NotificationService {
  if (!notificationService && io) {
    notificationService = new NotificationService(io);
  }
  if (!notificationService) {
    throw new Error('Notification service not initialized');
  }
  return notificationService;
}
