import { db } from '../db';
import { categories } from '../db/schema';
import { eq, asc } from 'drizzle-orm';

export async function getAllCategories() {
  return db.select().from(categories).orderBy(asc(categories.sortOrder));
}

export async function getCategoryById(id: number) {
  const result = await db.select().from(categories).where(eq(categories.id, id));
  return result[0] || null;
}

export async function getCategoryByName(name: string) {
  const result = await db.select().from(categories).where(eq(categories.name, name.toLowerCase()));
  return result[0] || null;
}

export async function createCategory(data: {
  name: string;
  isAvailable?: boolean;
  sortOrder?: number;
}) {
  const result = await db.insert(categories).values({
    name: data.name.toLowerCase(),
    isAvailable: data.isAvailable !== undefined ? data.isAvailable : true,
    sortOrder: data.sortOrder || 0,
  });
  return result;
}

export async function updateCategory(id: number, data: {
  name?: string;
  isAvailable?: boolean;
  sortOrder?: number;
}) {
  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name.toLowerCase();
  if (data.isAvailable !== undefined) updateData.isAvailable = data.isAvailable;
  if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;

  await db.update(categories).set(updateData).where(eq(categories.id, id));
}

export async function deleteCategory(id: number) {
  await db.delete(categories).where(eq(categories.id, id));
}

export async function seedDefaultCategories() {
  const existing = await getAllCategories();
  if (existing.length > 0) return;
  
  const defaultCategories = [
    { name: 'makanan', isAvailable: true, sortOrder: 1 },
    { name: 'minuman', isAvailable: true, sortOrder: 2 },
  ];
  
  for (const cat of defaultCategories) {
    await createCategory(cat);
  }
}