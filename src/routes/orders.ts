import { Elysia, t } from 'elysia';
import * as orderRepo from '../repositories/order';
import * as orderItemRepo from '../repositories/order-item';
import * as tableRepo from '../repositories/table';
import * as paymentService from '../services/payment';
import { requireRole, getUserFromRequest } from '../middleware/authorization';

const requireOrderCreate = () => requireRole(['super_admin', 'admin_restoran', 'kasir', 'waitress']);
const requirePayment = () => requireRole(['super_admin', 'admin_restoran', 'kasir']);
const requireCancel = () => requireRole(['super_admin', 'admin_restoran', 'kasir', 'waitress']);

export const orderRoutes = new Elysia({ prefix: '/api/orders' })
  .get('/', async () => {
    return orderRepo.getOrdersToday();
  })
  .get('/today', async () => {
    return orderRepo.getOrdersTodayWithTables();
  })
  .get('/table/:tableId', async ({ params: { tableId } }) => {
    const table = await tableRepo.getTableById(Number(tableId));
    if (!table) {
      return { error: 'Table not found' };
    }
    if (table.status === 'available') {
      return { table, order: null };
    }
    const order = await orderRepo.getActiveOrderByTableId(Number(tableId));
    if (order) {
      const items = await orderItemRepo.getItemsWithMenuByOrderId(order.id);
      return { table, order, items };
    }
    return { table, order: null };
  })
  .get('/:id', async ({ params: { id } }) => {
    const order = await orderRepo.getOrderById(Number(id));
    if (!order) {
      return { error: 'Order not found' };
    }
    const items = await orderItemRepo.getItemsWithMenuByOrderId(Number(id));
    const table = order.tableId ? await tableRepo.getTableById(order.tableId) : null;
    return { order, items, table };
  })
  .post('/', async ({ cookie, headers, body }) => {
    const user = getUserFromRequest(cookie, headers);
    if (!user) return { error: 'Unauthorized' };
    const { tableId, userId } = body as any;
    if (!tableId || !userId) {
      return { error: 'tableId and userId are required' };
    }
    const table = await tableRepo.getTableById(tableId);
    if (!table) {
      return { error: 'Table not found' };
    }
    if (table.status === 'occupied') {
      return { error: 'Table is occupied' };
    }
    const order = await orderRepo.createOrder(tableId, userId);
    await tableRepo.updateTableStatus(tableId, 'occupied');
    return order;
  }, {
    body: t.Object({
      tableId: t.Number(),
      userId: t.Number(),
    }),
  })
  .post('/with-items', async ({ cookie, headers, body }) => {
    const user = getUserFromRequest(cookie, headers);
    if (!user) return { error: 'Unauthorized' };
    const { tableId, userId, items } = body as any;
    if (!tableId || !userId || !items || items.length === 0) {
      return { error: 'tableId, userId, and items are required' };
    }
    const table = await tableRepo.getTableById(tableId);
    if (!table) return { error: 'Table not found' };

    const order = await orderRepo.createOrder(tableId, userId);
    if (!order) return { error: 'Failed to create order' };

    for (const item of items) {
      const { getAvailableMenus } = await import('../repositories/menu');
      const menus = await getAvailableMenus();
      const menu = menus.find((m: any) => m.id === item.menuId);
      if (!menu) continue;
      await orderItemRepo.addItem(Number(order.id), item.menuId, item.quantity || 1);
      if (item.notes) {
        await orderItemRepo.updateItemNotes(Number(order.id), item.menuId, item.notes);
      }
    }

    await orderRepo.calculateTotals(Number(order.id));
    await tableRepo.updateTableStatus(tableId, 'occupied');
    await orderRepo.updateOrderStatus(Number(order.id), 'active');

    const { decrementStockForOrder } = await import('../repositories/inventory');
    await decrementStockForOrder(Number(order.id));

    const finalOrder = await orderRepo.getOrderById(Number(order.id));
    const orderItems = await orderItemRepo.getItemsWithMenuByOrderId(Number(order.id));
    return { order: finalOrder, items: orderItems };
  }, {
    body: t.Object({
      tableId: t.Number(),
      userId: t.Number(),
      items: t.Array(t.Object({
        menuId: t.Number(),
        quantity: t.Number(),
        notes: t.Optional(t.String()),
      })),
    }),
  })
  .put('/:id', async ({ params: { id }, body }) => {
    const { status } = body as any;
    if (!status || !['active', 'completed', 'cancelled'].includes(status)) {
      return { error: 'Invalid status' };
    }
    return orderRepo.updateOrderStatus(Number(id), status);
  })
  .post('/:id/items', async ({ cookie, headers, params: { id }, body }) => {
    const user = getUserFromRequest(cookie, headers);
    if (!user) return { error: 'Unauthorized' };
    const { menuId, quantity } = body as any;
    if (!menuId) {
      return { error: 'menuId is required' };
    }
    const order = await orderRepo.getOrderById(Number(id));
    if (!order) {
      return { error: 'Order not found' };
    }
    if (order.status !== 'active') {
      return { error: 'Order is not active' };
    }
    const item = await orderItemRepo.addItem(Number(id), menuId, quantity || 1);
    if (!item) {
      return { error: 'Failed to add item' };
    }
    await orderRepo.calculateTotals(Number(id));
    const items = await orderItemRepo.getItemsWithMenuByOrderId(Number(id));
    const updatedOrder = await orderRepo.getOrderById(Number(id));
    return { order: updatedOrder, items };
  }, {
    body: t.Object({
      menuId: t.Number(),
      quantity: t.Optional(t.Number()),
    }),
  })
  .delete('/:id/items/:itemId', async ({ cookie, headers, params: { id, itemId } }) => {
    const user = getUserFromRequest(cookie, headers);
    if (!user) return { error: 'Unauthorized' };
    await orderItemRepo.removeItem(Number(itemId));
    await orderRepo.calculateTotals(Number(id));
    const items = await orderItemRepo.getItemsWithMenuByOrderId(Number(id));
    const order = await orderRepo.getOrderById(Number(id));
    return { order, items };
  })
  .put('/:id/items/:itemId', async ({ cookie, headers, params: { id, itemId }, body }) => {
    const user = getUserFromRequest(cookie, headers);
    if (!user) return { error: 'Unauthorized' };
    const { quantity } = body as any;
    if (quantity === undefined) {
      return { error: 'quantity is required' };
    }
    await orderItemRepo.updateQuantity(Number(itemId), quantity);
    await orderRepo.calculateTotals(Number(id));
    const items = await orderItemRepo.getItemsWithMenuByOrderId(Number(id));
    const order = await orderRepo.getOrderById(Number(id));
    return { order, items };
  })
  .post('/:id/pay', async ({ cookie, headers, params: { id }, body }) => {
    const user = getUserFromRequest(cookie, headers);
    if (!user) return { error: 'Unauthorized' };
    if (!['super_admin', 'admin_restoran', 'kasir'].includes(user.role)) {
      return { error: 'Akses ditolak: hanya kasir dan admin yang dapat memproses pembayaran' };
    }
    const { amountPaid } = body as any;
    if (!amountPaid || amountPaid <= 0) {
      return { error: 'Invalid amount paid' };
    }
    try {
      const completedOrder = await paymentService.processPayment(Number(id), amountPaid);
      const items = await orderItemRepo.getItemsWithMenuByOrderId(Number(id));
      const table = completedOrder ? await tableRepo.getTableById(completedOrder.tableId) : null;
      const receipt = completedOrder ? paymentService.generateReceipt(completedOrder, items, table?.tableNumber || 0) : '';
      return { order: completedOrder, items, receipt };
    } catch (e: any) {
      return { error: e.message };
    }
  }, {
    body: t.Object({
      amountPaid: t.Number(),
    }),
  })
  .post('/:id/cancel', async ({ cookie, headers, params: { id } }) => {
    const user = getUserFromRequest(cookie, headers);
    if (!user) return { error: 'Unauthorized' };
    if (!['super_admin', 'admin_restoran', 'kasir', 'waitress'].includes(user.role)) {
      return { error: 'Akses ditolak: hanya kasir, waitress, dan admin yang dapat membatalkan pesanan' };
    }
    const order = await orderRepo.getOrderById(Number(id));
    if (!order) {
      return { error: 'Order not found' };
    }
    if (order.status !== 'active') {
      return { error: 'Order cannot be cancelled' };
    }
    await orderItemRepo.deleteItemsByOrderId(Number(id));
    await orderRepo.updateOrderStatus(Number(id), 'cancelled');
    await tableRepo.updateTableStatus(order.tableId, 'available');
    return { success: true };
  })
  .put('/:id/transfer', async ({ cookie, headers, params: { id }, body }) => {
    const user = getUserFromRequest(cookie, headers);
    if (!user) return { error: 'Unauthorized' };
    const { newTableId } = body as any;
    if (!newTableId) return { error: 'newTableId is required' };
    const order = await orderRepo.getOrderById(Number(id));
    if (!order) return { error: 'Order not found' };
    if (order.status !== 'active') return { error: 'Only active orders can be transferred' };
    const newTable = await tableRepo.getTableById(newTableId);
    if (!newTable) return { error: 'Target table not found' };
    if (newTable.status === 'occupied') return { error: 'Target table is occupied' };
    await tableRepo.updateTableStatus(order.tableId, 'available');
    await tableRepo.updateTableStatus(newTableId, 'occupied');
    await orderRepo.updateOrder(Number(id), { tableId: newTableId });
    const updatedOrder = await orderRepo.getOrderById(Number(id));
    return { success: true, order: updatedOrder };
  });