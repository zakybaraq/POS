import { Elysia } from 'elysia';
import * as emp from '../repositories/employee';

export const employeeRoutes = new Elysia({ prefix: '/api/employees' })
  .get('/', async () => emp.getAllEmployees())
  .get('/:id', async ({ params }) => {
    const e = await emp.getEmployeeById(Number(params.id));
    if (!e) return { error: 'Employee not found' };
    return e;
  })
  .post('/', async ({ body }) => {
    const b = body as any;
    if (!b.userId || !b.position) return { error: 'userId and position are required' };
    return emp.createEmployeeProfile(b);
  })
  .put('/:id', async ({ params, body }) => emp.updateEmployeeProfile(Number(params.id), body as any))
  .delete('/:id', async ({ params }) => {
    await emp.deactivateEmployee(Number(params.id));
    return { success: true };
  })
  .get('/performance', async ({ query }) => {
    const q = query as any;
    if (!q.startDate || !q.endDate) return { error: 'startDate and endDate required' };
    return emp.getCashierPerformance(q.startDate, q.endDate);
  });
