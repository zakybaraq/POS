import { Elysia } from 'elysia';
import * as emp from '../repositories/employee';

export const attendanceRoutes = new Elysia({ prefix: '/api/attendance' })
  .post('/clock-in', async ({ body }) => {
    const b = body as any;
    if (!b.userId) return { error: 'userId required' };
    return emp.clockIn(Number(b.userId), b.notes);
  })
  .post('/clock-out', async ({ body }) => {
    const b = body as any;
    if (!b.userId) return { error: 'userId required' };
    return emp.clockOut(Number(b.userId), b.notes);
  })
  .get('/today', async ({ query }) => {
    const q = query as any;
    if (!q.userId) return { error: 'userId required' };
    const att = await emp.getTodayAttendance(Number(q.userId));
    return att || null;
  })
  .get('/', async ({ query }) => {
    const q = query as any;
    if (!q.startDate || !q.endDate) return { error: 'startDate and endDate required' };
    return emp.getAttendanceByDateRange(q.startDate, q.endDate);
  });
