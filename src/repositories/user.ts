import { eq } from 'drizzle-orm';
import { db } from '../db/index';
import { users } from '../db/schema';
import type { User, NewUser } from '../db/schema';
import bcrypt from 'bcryptjs';

export async function getUserByEmail(email: string) {
  const result = await db.select().from(users).where(eq(users.email, email));
  return result[0] || null;
}

export async function getUserById(id: number) {
  const result = await db.select().from(users).where(eq(users.id, id));
  return result[0] || null;
}

export async function getAllUsers() {
  return db.select().from(users).orderBy(users.createdAt);
}

export async function createUser(data: { email: string; password: string; name: string; role?: string; isActive?: boolean }) {
  const hashedPassword = await bcrypt.hash(data.password, 10);
  const result = await db.insert(users).values({
    email: data.email,
    password: hashedPassword,
    name: data.name,
    role: (data.role || 'kasir') as 'super_admin' | 'admin_restoran' | 'kasir' | 'waitress' | 'chef',
    isActive: data.isActive !== undefined ? data.isActive : true,
  });
  return result;
}

export async function updateUser(id: number, data: Partial<{ name: string; email: string; role: 'super_admin' | 'admin_restoran' | 'kasir' | 'waitress' | 'chef'; isActive: boolean }>) {
  await db.update(users).set(data).where(eq(users.id, id));
  const result = await db.select().from(users).where(eq(users.id, id));
  return result[0] || null;
}

export async function deleteUser(id: number) {
  await db.delete(users).where(eq(users.id, id));
}

export async function verifyPassword(password: string, hashedPassword: string) {
  return bcrypt.compare(password, hashedPassword);
}

export async function updatePassword(userId: number, newPassword: string) {
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await db.update(users).set({ password: hashedPassword }).where(eq(users.id, userId));
}

export async function updateUserLastLogin(userId: number) {
  await db.update(users).set({ lastLogin: new Date() }).where(eq(users.id, userId));
}

export async function getUsersWithStats() {
  const allUsers = await db.select().from(users).orderBy(users.createdAt);
  const total = allUsers.length;
  const active = allUsers.filter((u: any) => u.isActive).length;
  const inactive = total - active;
  const roleCounts: Record<string, number> = {};
  for (const u of allUsers) {
    roleCounts[u.role] = (roleCounts[u.role] || 0) + 1;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const newThisWeek = allUsers.filter((u: any) => {
    const created = new Date(u.createdAt);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return created >= weekAgo;
  }).length;
  return { users: allUsers, total, active, inactive, roleCounts, newThisWeek };
}