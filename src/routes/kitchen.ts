import { Elysia } from 'elysia';
import * as kitchen from '../repositories/kitchen';

export const kitchenRoutes = new Elysia({ prefix: '/api/kitchen' })
  .get('/orders', async () => kitchen.getActiveKitchenOrders())
  .get('/orders/:category', async ({ params }) => {
    const cat = params.category as 'makanan' | 'minuman';
    if (cat !== 'makanan' && cat !== 'minuman') return { error: 'Invalid category' };
    return kitchen.getKitchenOrdersByCategory(cat);
  })
  .get('/orders/:id/items', async ({ params }) => {
    return kitchen.getKitchenOrderItems(Number(params.id));
  })
  .patch('/orders/:id/status', async ({ params, body }) => {
    const b = body as any;
    if (!b.status || !['cooking', 'ready', 'served'].includes(b.status)) return { error: 'Invalid status' };
    return kitchen.updateKitchenStatus(Number(params.id), b.status);
  })
  .get('/stats', async () => kitchen.getKitchenStats());
