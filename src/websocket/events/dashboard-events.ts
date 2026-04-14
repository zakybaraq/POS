import { getIO } from '../index';
import { invalidateCache } from '../../services/dashboard';

const batcher = new Map<string, any>();
let batchTimer: NodeJS.Timeout | null = null;
const BATCH_INTERVAL = 5000;

export function queueDashboardUpdate(event: string, data: any) {
  batcher.set(event, data);

  if (!batchTimer) {
    batchTimer = setTimeout(() => {
      flushDashboardBatch();
    }, BATCH_INTERVAL);
  }
}

function flushDashboardBatch() {
  try {
    const io = getIO();
    if (io && batcher.size > 0) {
      io.to('dashboard').emit('dashboard:metrics-batch', Object.fromEntries(batcher));
      batcher.clear();
    }
  } catch (error) {
    console.error('Failed to emit dashboard batch:', error);
  } finally {
    batchTimer = null;
  }
}

export function emitKitchenQueueUpdate(queueData: { pending: number; cooking: number; ready: number }) {
  try {
    const io = getIO();
    if (io) {
      io.to('dashboard').to('kitchen').emit('kitchen:queue-update', queueData);
    }
  } catch (error) {
    console.error('Failed to emit kitchen queue update:', error);
  }

  queueDashboardUpdate('kitchenQueue', queueData);
}

export function emitNewOrder(order: { id: number; tableNumber?: number; total: number; status: string }) {
  try {
    const io = getIO();
    if (io) {
      io.to('dashboard').to('kitchen').emit('orders:new', {
        id: order.id,
        tableNumber: order.tableNumber,
        total: order.total,
        status: order.status,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('Failed to emit new order:', error);
  }

  invalidateCache('today-orders');
  invalidateCache('active-orders');
  invalidateCache('kitchen-queue');
  invalidateCache('today-sales');
}

export function emitOrderStatusChange(orderId: number, oldStatus: string, newStatus: string, orderData?: { tableNumber?: number; total?: number }) {
  try {
    const io = getIO();
    if (io) {
      io.to('dashboard').to('kitchen').emit('orders:status-change', {
        orderId,
        oldStatus,
        newStatus,
        tableNumber: orderData?.tableNumber,
        total: orderData?.total,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('Failed to emit order status change:', error);
  }

  invalidateCache('kitchen-queue');
  invalidateCache('today-sales');
  invalidateCache('today-orders');
  invalidateCache('active-orders');

  if (newStatus === 'completed') {
    queueDashboardUpdate('orderCompleted', { orderId, timestamp: new Date().toISOString() });
  }
}

export function emitLowStockAlert(ingredient: { id: number; name: string; currentStock: number; minStock: number }) {
  try {
    const io = getIO();
    if (io) {
      io.to('dashboard').to('admin').emit('inventory:low-stock', {
        namespace: 'inventory',
        event: 'low-stock',
        payload: {
          ingredientId: ingredient.id,
          name: ingredient.name,
          currentStock: ingredient.currentStock,
          threshold: ingredient.minStock,
          shortfall: ingredient.minStock - ingredient.currentStock,
        },
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('Failed to emit low stock alert:', error);
  }

  invalidateCache('low-stock-count');
  queueDashboardUpdate('lowStock', { count: 1, ingredient: ingredient.name });
}
