import { Elysia, t } from 'elysia';
import * as inv from '../repositories/inventory';
import { requireAdmin, getUserFromRequest } from '../middleware/authorization';

export const inventoryRoutes = new Elysia({ prefix: '/api/inventory' })
  .get('/ingredients', async () => inv.getAllIngredients())
  .get('/ingredients/low-stock', async () => inv.getLowStockIngredients())
  .get('/ingredients/:id', async ({ params: { id } }) => {
    const item = await inv.getIngredientById(Number(id));
    if (!item) return { error: 'Ingredient not found' };
    return item;
  })
  .post('/ingredients', async ({ cookie, headers, body }) => {
    const user = getUserFromRequest(cookie, headers);
    if (!user) return { error: 'Unauthorized' };
    const { name, unit, currentStock, minStock, costPerUnit } = body as any;
    if (!name || !unit) return { error: 'Name and unit are required' };
    return inv.createIngredient({
      name, unit,
      currentStock: String(currentStock || 0),
      minStock: String(minStock || 0),
      costPerUnit: costPerUnit || 0,
    });
  }, {
    body: t.Object({
      name: t.String(),
      unit: t.String(),
      currentStock: t.Optional(t.Number()),
      minStock: t.Optional(t.Number()),
      costPerUnit: t.Optional(t.Number()),
    }),
  })
  .put('/ingredients/:id', async ({ cookie, headers, params: { id }, body }) => {
    const user = getUserFromRequest(cookie, headers);
    if (!user) return { error: 'Unauthorized' };
    const updates: any = {};
    const { name, unit, currentStock, minStock, costPerUnit } = body as any;
    if (name) updates.name = name;
    if (unit) updates.unit = unit;
    if (currentStock !== undefined) updates.currentStock = String(currentStock);
    if (minStock !== undefined) updates.minStock = String(minStock);
    if (costPerUnit !== undefined) updates.costPerUnit = costPerUnit;
    return inv.updateIngredient(Number(id), updates);
  })
  .delete('/ingredients/:id', async ({ cookie, headers, params: { id } }) => {
    const user = getUserFromRequest(cookie, headers);
    if (!user) return { error: 'Unauthorized' };
    await inv.deleteIngredient(Number(id));
    return { success: true };
  })

  .get('/recipes/menu/:menuId', async ({ params: { menuId } }) => inv.getRecipesByMenuId(Number(menuId)))
  .post('/recipes', async ({ cookie, headers, body }) => {
    const user = getUserFromRequest(cookie, headers);
    if (!user) return { error: 'Unauthorized' };
    const { menuId, ingredientId, quantity } = body as any;
    if (!menuId || !ingredientId || quantity === undefined) return { error: 'menuId, ingredientId, and quantity are required' };
    return inv.createRecipe({ menuId, ingredientId, quantity: String(quantity) });
  }, {
    body: t.Object({
      menuId: t.Number(),
      ingredientId: t.Number(),
      quantity: t.Number(),
    }),
  })
  .put('/recipes/:id', async ({ cookie, headers, params: { id }, body }) => {
    const user = getUserFromRequest(cookie, headers);
    if (!user) return { error: 'Unauthorized' };
    const updates: any = {};
    const { menuId, ingredientId, quantity } = body as any;
    if (menuId) updates.menuId = menuId;
    if (ingredientId) updates.ingredientId = ingredientId;
    if (quantity !== undefined) updates.quantity = String(quantity);
    return inv.updateRecipe(Number(id), updates);
  })
  .delete('/recipes/:id', async ({ cookie, headers, params: { id } }) => {
    const user = getUserFromRequest(cookie, headers);
    if (!user) return { error: 'Unauthorized' };
    await inv.deleteRecipe(Number(id));
    return { success: true };
  })

  .post('/stock-movements', async ({ cookie, headers, body }) => {
    const user = getUserFromRequest(cookie, headers);
    if (!user) return { error: 'Unauthorized' };
    const { ingredientId, type, quantity, reason } = body as any;
    if (!ingredientId || !type || quantity === undefined) return { error: 'ingredientId, type, and quantity are required' };
    return inv.adjustStock(Number(ingredientId), Number(quantity), type, reason || '', user.userId);
  }, {
    body: t.Object({
      ingredientId: t.Number(),
      type: t.Union([t.Literal('in'), t.Literal('out'), t.Literal('adjustment'), t.Literal('waste')]),
      quantity: t.Number(),
      reason: t.Optional(t.String()),
    }),
  })
  .get('/stock-movements', async ({ query }) => {
    const ingredientId = query?.ingredientId ? Number(query.ingredientId) : undefined;
    return inv.getStockMovements(ingredientId, 100);
  }, {
    query: t.Object({
      ingredientId: t.Optional(t.String()),
    }),
  })

  .onBeforeHandle(requireAdmin());
