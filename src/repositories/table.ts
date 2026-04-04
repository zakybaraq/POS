import { eq, sql } from 'drizzle-orm';
import { db } from '../db/index';
import { tables } from '../db/schema';
import type { Table, NewTable } from '../db/schema';

export async function getAllTables() {
  return db.select().from(tables);
}

export async function getTableById(id: number) {
  const result = await db.select().from(tables).where(eq(tables.id, id));
  return result[0] || null;
}

export async function getTableByNumber(tableNumber: number) {
  const result = await db.select().from(tables).where(eq(tables.tableNumber, tableNumber));
  return result[0] || null;
}

export async function createTable(data: NewTable) {
  const result = await db.insert(tables).values(data);
  const insertId = result[0]?.insertId;
  if (insertId) {
    return getTableById(Number(insertId));
  }
  return null;
}

export async function updateTableStatus(id: number, status: 'available' | 'occupied') {
  await db.update(tables).set({ status }).where(eq(tables.id, id));
  return getTableById(id);
}

export async function updateTable(id: number, data: Partial<{ tableNumber: number; capacity: number; area: 'indoor' | 'outdoor' | 'vip'; status: 'available' | 'occupied' }>) {
  await db.update(tables).set(data).where(eq(tables.id, id));
  return getTableById(id);
}

export async function deleteTable(id: number) {
  return db.delete(tables).where(eq(tables.id, id));
}

export async function getTableStats() {
  const allTables = await db.select().from(tables);
  const total = allTables.length;
  const occupied = allTables.filter(t => t.status === 'occupied').length;
  const available = total - occupied;
  return { total, occupied, available };
}