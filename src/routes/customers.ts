import { Elysia, t } from 'elysia';
import * as custRepo from '../repositories/customer';
import { getUserFromRequest } from '../middleware/authorization';

export const customerRoutes = new Elysia({ prefix: '/api/customers' })
  .get('/', async () => custRepo.getAllCustomers())
  .get('/stats', async () => custRepo.getCustomerStats())
  .get('/search/:phone', async ({ params: { phone } }) => {
    const customer = await custRepo.getCustomerByPhone(decodeURIComponent(phone));
    return customer || { error: 'Customer not found' };
  })
  .get('/:id', async ({ params: { id } }) => {
    const customer = await custRepo.getCustomerById(Number(id));
    if (!customer) return { error: 'Customer not found' };
    return customer;
  })
  .post('/', async ({ cookie, headers, body }) => {
    const user = getUserFromRequest(cookie, headers);
    if (!user) return { error: 'Unauthorized' };
    const { name, phone, email, address, birthDate } = body as any;
    if (!name || !phone) return { error: 'Name and phone are required' };
    const existing = await custRepo.getCustomerByPhone(phone);
    if (existing) return { error: 'Phone number already exists' };
    return custRepo.createCustomer({ name, phone, email, address, birthDate: birthDate || null });
  }, {
    body: t.Object({
      name: t.String(),
      phone: t.String(),
      email: t.Optional(t.String()),
      address: t.Optional(t.String()),
      birthDate: t.Optional(t.String()),
    }),
  })
  .put('/:id', async ({ cookie, headers, params: { id }, body }) => {
    const user = getUserFromRequest(cookie, headers);
    if (!user) return { error: 'Unauthorized' };
    const updates: any = {};
    const { name, phone, email, address, birthDate, isActive } = body as any;
    if (name) updates.name = name;
    if (phone) updates.phone = phone;
    if (email !== undefined) updates.email = email;
    if (address !== undefined) updates.address = address;
    if (birthDate !== undefined) updates.birthDate = birthDate;
    if (isActive !== undefined) updates.isActive = isActive;
    return custRepo.updateCustomer(Number(id), updates);
  })
  .delete('/:id', async ({ cookie, headers, params: { id } }) => {
    const user = getUserFromRequest(cookie, headers);
    if (!user) return { error: 'Unauthorized' };
    await custRepo.deleteCustomer(Number(id));
    return { success: true };
  })
  .get('/:id/history', async ({ params: { id } }) => {
    return custRepo.getCustomerOrderHistory(Number(id));
  })
  .get('/:id/loyalty', async ({ params: { id } }) => {
    return custRepo.getLoyaltyTransactions(Number(id));
  })
  .post('/:id/loyalty/earn', async ({ cookie, headers, params: { id }, body }) => {
    const user = getUserFromRequest(cookie, headers);
    if (!user) return { error: 'Unauthorized' };
    const { points, reason } = body as any;
    if (!points || points <= 0) return { error: 'Points must be greater than 0' };
    await custRepo.addLoyaltyPoints(Number(id), points);
    return { success: true };
  }, {
    body: t.Object({
      points: t.Number(),
      reason: t.Optional(t.String()),
    }),
  })
  .post('/:id/loyalty/redeem', async ({ cookie, headers, params: { id }, body }) => {
    const user = getUserFromRequest(cookie, headers);
    if (!user) return { error: 'Unauthorized' };
    const { points, reason } = body as any;
    if (!points || points <= 0) return { error: 'Points must be greater than 0' };
    const result = await custRepo.redeemLoyaltyPoints(Number(id), points, reason);
    if (result?.error) return result;
    return { success: true };
  }, {
    body: t.Object({
      points: t.Number(),
      reason: t.Optional(t.String()),
    }),
  });
