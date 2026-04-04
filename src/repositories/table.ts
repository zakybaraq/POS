import { eq } from 'drizzle-orm';
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

export async function deleteTable(id: number) {
  return db.delete(tables).where(eq(tables.id, id));
}