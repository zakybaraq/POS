import { Elysia, t } from 'elysia';
import * as tableRepo from '../repositories/table';

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
  .post('/', async ({ body }) => {
    const { tableNumber } = body as any;
    if (!tableNumber) {
      return { error: 'tableNumber is required' };
    }
    const existing = await tableRepo.getTableByNumber(tableNumber);
    if (existing) {
      return { error: 'Table number already exists' };
    }
    return tableRepo.createTable({ tableNumber, status: 'available' });
  }, {
    body: t.Object({
      tableNumber: t.Number(),
    }),
  })
  .put('/:id', async ({ params: { id }, body }) => {
    const { status } = body as any;
    if (status !== 'available' && status !== 'occupied') {
      return { error: 'Invalid status' };
    }
    return tableRepo.updateTableStatus(Number(id), status);
  })
  .delete('/:id', async ({ params: { id } }) => {
    await tableRepo.deleteTable(Number(id));
    return { success: true };
  });