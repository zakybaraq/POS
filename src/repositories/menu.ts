import { eq, and } from 'drizzle-orm';
import { db } from '../db/index';
import { menus } from '../db/schema';
import type { Menu, NewMenu } from '../db/schema';

export async function getAllMenus() {
  return db.select().from(menus);
}

export async function getAvailableMenus() {
  return db.select().from(menus).where(eq(menus.isAvailable, true));
}

export async function getMenusByCategory(category: 'makanan' | 'minuman') {
  return db.select().from(menus).where(and(eq(menus.category, category), eq(menus.isAvailable, true)));
}

export async function getMenuById(id: number) {
  const result = await db.select().from(menus).where(eq(menus.id, id));
  return result[0] || null;
}

export async function createMenu(data: NewMenu) {
  const result = await db.insert(menus).values(data);
  const insertId = result[0]?.insertId;
  if (insertId) {
    return getMenuById(Number(insertId));
  }
  return null;
}

export async function updateMenu(id: number, data: Partial<NewMenu>) {
  await db.update(menus).set(data).where(eq(menus.id, id));
  return getMenuById(id);
}

export async function deleteMenu(id: number) {
  return db.delete(menus).where(eq(menus.id, id));
}

export async function toggleAvailability(id: number) {
  const menu = await getMenuById(id);
  if (!menu) return null;
  await db.update(menus).set({ isAvailable: !menu.isAvailable }).where(eq(menus.id, id));
  return getMenuById(id);
}

export async function getMenuStats() {
  const allMenus = await db.select().from(menus);
  const total = allMenus.length;
  const available = allMenus.filter(m => m.isAvailable).length;
  return { total, available };
}