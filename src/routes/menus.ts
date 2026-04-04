import { Elysia, t } from 'elysia';
import * as menuRepo from '../repositories/menu';
import { requireAdmin, requireSuperAdmin, getUserFromRequest } from '../middleware/authorization';

export const menuRoutes = new Elysia({ prefix: '/api/menus' })
  .group('', (app) => 
    app
      .get('/', async () => {
        return menuRepo.getAllMenus();
      })
      .get('/available', async () => {
        return menuRepo.getAvailableMenus();
      })
      .get('/category/:category', async ({ params: { category } }) => {
        if (category !== 'makanan' && category !== 'minuman') {
          return { error: 'Invalid category' };
        }
        return menuRepo.getMenusByCategory(category);
      })
      .get('/:id', async ({ params: { id } }) => {
        const menu = await menuRepo.getMenuById(Number(id));
        if (!menu) {
          return { error: 'Menu not found' };
        }
        return menu;
      })
      .post('/', async ({ cookie, headers, body }) => {
        const user = getUserFromRequest(cookie, headers);
        if (!user) return { error: 'Unauthorized' };
        const { name, price, category, description } = body as any;
        if (!name || !price || !category) {
          return { error: 'Missing required fields' };
        }
        if (price <= 0) {
          return { error: 'Price must be greater than 0' };
        }
        if (category !== 'makanan' && category !== 'minuman') {
          return { error: 'Invalid category' };
        }
        return menuRepo.createMenu({ name, price, category, description: description || '', isAvailable: true });
      }, {
        body: t.Object({
          name: t.String(),
          price: t.Number(),
          category: t.Union([t.Literal('makanan'), t.Literal('minuman')]),
          description: t.Optional(t.String()),
        }),
      })
      .put('/:id', async ({ cookie, headers, params: { id }, body }) => {
        const user = getUserFromRequest(cookie, headers);
        if (!user) return { error: 'Unauthorized' };
        const { name, price, category, isAvailable, description } = body as any;
        const updates: any = {};
        if (name) updates.name = name;
        if (price) updates.price = price;
        if (category) updates.category = category;
        if (isAvailable !== undefined) updates.isAvailable = isAvailable;
        if (description !== undefined) updates.description = description;
        return menuRepo.updateMenu(Number(id), updates);
      })
      .delete('/:id', async ({ cookie, headers, params: { id } }) => {
        const user = getUserFromRequest(cookie, headers);
        if (!user) return { error: 'Unauthorized' };
        await menuRepo.deleteMenu(Number(id));
        return { success: true };
      })
      .patch('/:id/toggle', async ({ cookie, headers, params: { id } }) => {
        const user = getUserFromRequest(cookie, headers);
        if (!user) return { error: 'Unauthorized' };
        return menuRepo.toggleAvailability(Number(id));
      })
  )
  .onBeforeHandle(requireAdmin());