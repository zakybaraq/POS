import { Elysia } from 'elysia';
import * as categoryRepo from '../repositories/category';

export const categoryRoutes = new Elysia({ prefix: '/categories' })
  .get('/', async () => {
    return categoryRepo.getAllCategories();
  })
  .get('/:id', async ({ params: { id } }) => {
    const category = await categoryRepo.getCategoryById(Number(id));
    if (!category) return { error: 'Category not found' };
    return category;
  })
  .post('/', async ({ body }) => {
    const { name, emoji, color, sortOrder } = body as Record<string, unknown>;
    if (!name) return { error: 'Name is required' };
    
    const existing = await categoryRepo.getCategoryByName(name as string);
    if (existing) return { error: 'Category already exists' };
    
    await categoryRepo.createCategory({
      name: name as string,
      emoji: emoji as string | undefined,
      color: color as string | undefined,
      sortOrder: sortOrder as number | undefined,
    });
    return { success: true };
  })
  .put('/:id', async ({ params: { id }, body }) => {
    const { name, emoji, color, sortOrder } = body as Record<string, unknown>;
    
    await categoryRepo.updateCategory(Number(id), {
      name: name as string | undefined,
      emoji: emoji as string | undefined,
      color: color as string | undefined,
      sortOrder: sortOrder as number | undefined,
    });
    return { success: true };
  })
  .delete('/:id', async ({ params: { id } }) => {
    await categoryRepo.deleteCategory(Number(id));
    return { success: true };
  });