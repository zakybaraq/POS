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

export async function createUser(data: { email: string; password: string; name: string; role?: string }) {
  const hashedPassword = await bcrypt.hash(data.password, 10);
  const result = await db.insert(users).values({
    email: data.email,
    password: hashedPassword,
    name: data.name,
    role: (data.role || 'kasir') as 'super_admin' | 'admin_restoran' | 'kasir' | 'waitress' | 'chef',
  });
  return result;
}

export async function verifyPassword(password: string, hashedPassword: string) {
  return bcrypt.compare(password, hashedPassword);
}

export async function updatePassword(userId: number, newPassword: string) {
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await db.update(users).set({ password: hashedPassword }).where(eq(users.id, userId));
}

export async function updateUserLastLogin(userId: number) {
  await db.update(users).set({ updatedAt: new Date() }).where(eq(users.id, userId));
}