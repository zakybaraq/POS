import { Elysia } from 'elysia';
import * as analytics from '../services/cost-analytics';
import { requireAdmin } from '../middleware/authorization';

export const analyticsRoutes = new Elysia({ prefix: '/api/analytics' })
  .get('/costs', async () => {
    return analytics.getAllIngredientCosts();
  })
  .get('/costs/ingredient/:id', async ({ params }) => {
    const history = await analytics.getIngredientCostHistory(Number(params.id));
    return history;
  })
  .get('/costs/variance', async ({ query }) => {
    const threshold = Number(query?.threshold) || 10;
    return analytics.getAllCostVariances(threshold);
  })
  .get('/costs/supplier/:supplierId', async ({ params }) => {
    return analytics.getSupplierCostComparison(Number(params.supplierId));
  })
  .get('/costs/monthly', async ({ query }) => {
    const year = Number(query?.year) || new Date().getFullYear();
    const month = Number(query?.month) || (new Date().getMonth() + 1);
    return analytics.getMonthlyCosts(year, month);
  })
  .onBeforeHandle(requireAdmin());