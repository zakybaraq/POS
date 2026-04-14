import { Elysia } from 'elysia';
import * as menuRepo from '../repositories/menu';
import { requireAdmin, requireSuperAdmin, getUserFromRequest } from '../middleware/authorization';
import { createMenuSchema, updateMenuSchema } from '../schemas/menu';
import { validateBody } from '../schemas/index';

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
        return menuRepo.getMenusByCategory(category);
      })
      .get('/:id', async ({ params: { id } }) => {
        const menu = await menuRepo.getMenuById(Number(id));
        if (!menu) {
          return { error: 'Menu not found' };
        }
        return menu;
      })
      .post('/', async ({ body, cookie, headers }) => {
        const user = getUserFromRequest(cookie, headers);
        if (!user) return { error: 'Unauthorized' };

        const validation = validateBody(createMenuSchema)(body);
        if (!validation.success) {
          return { error: validation.error };
        }

        const { name, price, category, description } = validation.data;
        return menuRepo.createMenu({ name, price, category, description: description || '', isAvailable: true });
      })
      .put('/:id', async ({ params: { id }, body, cookie, headers }) => {
        const user = getUserFromRequest(cookie, headers);
        if (!user) return { error: 'Unauthorized' };

        const validation = validateBody(updateMenuSchema)(body);
        if (!validation.success) {
          return { error: validation.error };
        }

        return menuRepo.updateMenu(Number(id), validation.data);
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