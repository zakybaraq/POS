import { Elysia, t } from 'elysia';
import * as tableRepo from '../repositories/table';
import { requireAdmin, requireOrderAccess, requirePosAccess, getUserFromRequest } from '../middleware/authorization';

export const tableRoutes = new Elysia({ prefix: '/api/tables' })
  .get('/', async () => {
    return tableRepo.getAllTables();
  })
  .get('/:id', async ({ params: { id } }) => {
    const table = await tableRepo.getTableById(Number(id));
    if (!table) {
      return { error: 'Table not found' };
    }
    return table;
  })
  .post('/', async ({ cookie, headers, body }) => {
    const user = getUserFromRequest(cookie, headers);
    if (!user) return { error: 'Unauthorized' };
    const { tableNumber, capacity, area } = body as any;
    if (!tableNumber) {
      return { error: 'tableNumber is required' };
    }
    const existing = await tableRepo.getTableByNumber(tableNumber);
    if (existing) {
      return { error: 'Table number already exists' };
    }
    return tableRepo.createTable({ tableNumber, capacity: capacity || 4, area: area || 'indoor', status: 'available' });
  }, {
    body: t.Object({
      tableNumber: t.Number(),
      capacity: t.Optional(t.Number()),
      area: t.Optional(t.Union([t.Literal('indoor'), t.Literal('outdoor'), t.Literal('vip')])),
    }),
  })
  .put('/:id', async ({ cookie, headers, params: { id }, body }) => {
    const user = getUserFromRequest(cookie, headers);
    if (!user) return { error: 'Unauthorized' };
    const { tableNumber, capacity, area, status } = body as any;
    const updates: any = {};
    if (tableNumber) updates.tableNumber = tableNumber;
    if (capacity) updates.capacity = capacity;
    if (area) updates.area = area;
    if (status && ['available', 'occupied'].includes(status)) updates.status = status;
    return tableRepo.updateTable(Number(id), updates);
  }, {
    body: t.Object({
      tableNumber: t.Optional(t.Number()),
      capacity: t.Optional(t.Number()),
      area: t.Optional(t.Union([t.Literal('indoor'), t.Literal('outdoor'), t.Literal('vip')])),
      status: t.Optional(t.Union([t.Literal('available'), t.Literal('occupied')])),
    }),
  })
  .delete('/:id', async ({ params: { id } }) => {
    await tableRepo.deleteTable(Number(id));
    return { success: true };
  })
  .onBeforeHandle(requirePosAccess());