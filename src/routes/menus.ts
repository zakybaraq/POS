import { Elysia, t } from 'elysia';
import * as menuRepo from '../repositories/menu';

export const menuRoutes = new Elysia({ prefix: '/api/menus' })
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
  .post('/', async ({ body }) => {
    const { name, price, category } = body as any;
    if (!name || !price || !category) {
      return { error: 'Missing required fields' };
    }
    if (price <= 0) {
      return { error: 'Price must be greater than 0' };
    }
    if (category !== 'makanan' && category !== 'minuman') {
      return { error: 'Invalid category' };
    }
    return menuRepo.createMenu({ name, price, category, isAvailable: true });
  }, {
    body: t.Object({
      name: t.String(),
      price: t.Number(),
      category: t.Union([t.Literal('makanan'), t.Literal('minuman')]),
    }),
  })
  .put('/:id', async ({ params: { id }, body }) => {
    const { name, price, category, isAvailable } = body as any;
    const updates: any = {};
    if (name) updates.name = name;
    if (price) updates.price = price;
    if (category) updates.category = category;
    if (isAvailable !== undefined) updates.isAvailable = isAvailable;
    return menuRepo.updateMenu(Number(id), updates);
  })
  .delete('/:id', async ({ params: { id } }) => {
    await menuRepo.deleteMenu(Number(id));
    return { success: true };
  })
  .patch('/:id/toggle', async ({ params: { id } }) => {
    return menuRepo.toggleAvailability(Number(id));
  });