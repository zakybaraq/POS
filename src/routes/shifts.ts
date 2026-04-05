import { Elysia } from 'elysia';
import * as emp from '../repositories/employee';

export const shiftRoutes = new Elysia({ prefix: '/api/shifts' })
  .get('/open', async ({ query }) => {
    const q = query as any;
    if (!q.userId) return { error: 'userId required' };
    return emp.getOpenShift(Number(q.userId));
  })
  .get('/all-open', async () => emp.getAllOpenShifts())
  .post('/open', async ({ body }) => {
    const b = body as any;
    if (!b.userId || b.startingCash === undefined) return { error: 'userId and startingCash required' };
    return emp.openShift(Number(b.userId), Number(b.startingCash), b.notes);
  })
  .post('/:id/close', async ({ params, body }) => {
    const b = body as any;
    if (!b.actualCash || !b.closedBy) return { error: 'actualCash and closedBy required' };
    return emp.closeShift(Number(params.id), Number(b.actualCash), Number(b.closedBy), b.notes);
  })
  .get('/:id', async ({ params }) => {
    const s = await emp.getShiftById(Number(params.id));
    if (!s) return { error: 'Shift not found' };
    return s;
  })
  .get('/', async ({ query }) => {
    const q = query as any;
    if (!q.startDate || !q.endDate) return { error: 'startDate and endDate required' };
    return emp.getShiftsByDateRange(q.startDate, q.endDate);
  });
