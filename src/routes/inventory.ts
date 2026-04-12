import { Elysia } from 'elysia';
import * as inv from '../repositories/inventory';
import { requireAdmin, getUserFromRequest } from '../middleware/authorization';
import { createIngredientSchema, updateIngredientSchema, createRecipeSchema, updateRecipeSchema, stockMovementSchema } from '../schemas/inventory';
import { validateBody } from '../schemas/index';

function stripSensitiveData(items: any[], user: any) {
  const isAdmin = user && ['super_admin', 'admin_restoran'].includes(user.role);
  return items.map(item => {
    if (isAdmin) return item;
    return { ...item, costPerUnit: undefined };
  });
}

export const inventoryRoutes = new Elysia({ prefix: '/api/inventory' })
  .get('/ingredients', async ({ cookie, headers }) => {
    const user = getUserFromRequest(cookie, headers);
    const items = await inv.getAllIngredients();
    return stripSensitiveData(items, user);
  })
  .get('/ingredients/low-stock', async ({ cookie, headers }) => {
    const user = getUserFromRequest(cookie, headers);
    const items = await inv.getLowStockIngredients();
    return stripSensitiveData(items, user);
  })
  .get('/ingredients/:id', async ({ params: { id }, cookie, headers }) => {
    const user = getUserFromRequest(cookie, headers);
    const item = await inv.getIngredientById(Number(id));
    if (!item) return { error: 'Ingredient not found' };
    const items = stripSensitiveData([item], user);
    return items[0];
  })
  .post('/ingredients', async ({ body, cookie, headers }) => {
    const user = getUserFromRequest(cookie, headers);
    if (!user) return { error: 'Unauthorized' };

    const validation = validateBody(createIngredientSchema)(body);
    if (!validation.success) {
      return { error: validation.error };
    }

    const { name, unit, currentStock, minStock, costPerUnit } = validation.data;
    return inv.createIngredient({
      name, unit,
      currentStock: String(currentStock || 0),
      minStock: String(minStock || 0),
      costPerUnit: costPerUnit || 0,
    });
  })
  .put('/ingredients/:id', async ({ params: { id }, body, cookie, headers }) => {
    const user = getUserFromRequest(cookie, headers);
    if (!user) return { error: 'Unauthorized' };

    const validation = validateBody(updateIngredientSchema)(body);
    if (!validation.success) {
      return { error: validation.error };
    }

    const updates: any = {};
    const data = validation.data;
    if (data.name) updates.name = data.name;
    if (data.unit) updates.unit = data.unit;
    if (data.currentStock !== undefined) updates.currentStock = String(data.currentStock);
    if (data.minStock !== undefined) updates.minStock = String(data.minStock);
    if (data.costPerUnit !== undefined) updates.costPerUnit = data.costPerUnit;
    return inv.updateIngredient(Number(id), updates);
  })
  .delete('/ingredients/:id', async ({ cookie, headers, params: { id } }) => {
    const user = getUserFromRequest(cookie, headers);
    if (!user) return { error: 'Unauthorized' };
    await inv.deleteIngredient(Number(id));
    return { success: true };
  })

  .get('/recipes/menu/:menuId', async ({ params: { menuId }, cookie, headers }) => {
    const user = getUserFromRequest(cookie, headers);
    const recipes = await inv.getRecipesByMenuId(Number(menuId));
    
    const isAdmin = user && ['super_admin', 'admin_restoran'].includes(user.role);
    return recipes.map(r => {
      if (isAdmin) return r;
      return { ...r, costPerUnit: undefined };
    });
  })
  .post('/recipes', async ({ body, cookie, headers }) => {
    const user = getUserFromRequest(cookie, headers);
    if (!user) return { error: 'Unauthorized' };

    const validation = validateBody(createRecipeSchema)(body);
    if (!validation.success) {
      return { error: validation.error };
    }

    const { menuId, ingredientId, quantity } = validation.data;
    return inv.createRecipe({ menuId, ingredientId, quantity: String(quantity) });
  })
  .put('/recipes/:id', async ({ params: { id }, body, cookie, headers }) => {
    const user = getUserFromRequest(cookie, headers);
    if (!user) return { error: 'Unauthorized' };

    const validation = validateBody(updateRecipeSchema)(body);
    if (!validation.success) {
      return { error: validation.error };
    }

    const updates: any = {};
    const data = validation.data;
    if (data.menuId) updates.menuId = data.menuId;
    if (data.ingredientId) updates.ingredientId = data.ingredientId;
    if (data.quantity !== undefined) updates.quantity = String(data.quantity);
    return inv.updateRecipe(Number(id), updates);
  })
  .delete('/recipes/:id', async ({ cookie, headers, params: { id } }) => {
    const user = getUserFromRequest(cookie, headers);
    if (!user) return { error: 'Unauthorized' };
    await inv.deleteRecipe(Number(id));
    return { success: true };
  })

  .post('/stock-movements', async ({ body, cookie, headers }) => {
    const user = getUserFromRequest(cookie, headers);
    if (!user) return { error: 'Unauthorized' };

    const validation = validateBody(stockMovementSchema)(body);
    if (!validation.success) {
      return { error: validation.error };
    }

    const { ingredientId, type, quantity, reason } = validation.data;
    return inv.adjustStock(Number(ingredientId), Number(quantity), type, reason || '', user.userId);
  })
  .get('/stock-movements', async ({ query, cookie, headers }) => {
    const user = getUserFromRequest(cookie, headers);
    const ingredientId = query?.ingredientId ? Number(query.ingredientId) : undefined;
    const movements = await inv.getStockMovements(ingredientId, 100);
    
    const isAdmin = user && ['super_admin', 'admin_restoran'].includes(user.role);
    if (!isAdmin) {
      return { error: 'Access denied. Admin role required.', status: 403 };
    }
    
    return movements;
  })

  .onBeforeHandle(requireAdmin());
