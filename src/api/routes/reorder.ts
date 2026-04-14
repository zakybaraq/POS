import { Elysia } from 'elysia';
import * as reorderService from '../services/reorder';
import { getUserFromRequest } from '../middleware/authorization';

export const reorderRoutes = new Elysia({ prefix: '/api/reorder' })
  .get('/suggestions', async ({ cookie, headers }) => {
    const user = getUserFromRequest(cookie, headers);
    if (!user) return { error: 'Unauthorized' };
    return reorderService.getReorderSuggestions();
  })
  .get('/usage/:id', async ({ params }) => {
    const usageRate = await reorderService.getUsageRate(Number(params.id));
    return { ingredientId: Number(params.id), usageRate };
  })
  .post('/usage/:id', async ({ params, body, cookie, headers }) => {
    const user = getUserFromRequest(cookie, headers);
    if (!user) return { error: 'Unauthorized' };
    const { dailyUsage } = body as { dailyUsage?: number };
    if (!dailyUsage) return { error: 'dailyUsage required' };
    const result = await reorderService.setUsageRateOverride(Number(params.id), dailyUsage);
    return { success: result };
  })
  .get('/calculate/:id', async ({ params }) => {
    const result = await reorderService.calculateForIngredient(Number(params.id));
    return result || { error: 'Ingredient not found' };
  });
