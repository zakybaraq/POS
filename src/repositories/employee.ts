import { eq, and, gte, lte, desc, asc, sql, sum, count, avg } from 'drizzle-orm';
import { db } from '../db/index';
import { employeeProfiles, shifts, attendance, orders, users } from '../db/schema';
import type { NewEmployeeProfile } from '../db/schema';

export async function getAllEmployees() {
  return db.select({
    id: employeeProfiles.id,
    userId: employeeProfiles.userId,
    position: employeeProfiles.position,
    phone: employeeProfiles.phone,
    salary: employeeProfiles.salary,
    hireDate: employeeProfiles.hireDate,
    emergencyContact: employeeProfiles.emergencyContact,
    notes: employeeProfiles.notes,
    isActive: employeeProfiles.isActive,
    name: users.name,
    email: users.email,
    role: users.role,
  })
  .from(employeeProfiles)
  .leftJoin(users, eq(employeeProfiles.userId, users.id))
  .orderBy(asc(users.name));
}

export async function getEmployeeByUserId(userId: number) {
  const result = await db.select().from(employeeProfiles).where(eq(employeeProfiles.userId, userId));
  return result[0] || null;
}

export async function getEmployeeById(id: number) {
  const result = await db.select().from(employeeProfiles).where(eq(employeeProfiles.id, id));
  return result[0] || null;
}

export async function createEmployeeProfile(data: NewEmployeeProfile) {
  return db.insert(employeeProfiles).values(data);
}

export async function updateEmployeeProfile(id: number, data: Record<string, any>) {
  await db.update(employeeProfiles).set({ ...data, updatedAt: new Date() }).where(eq(employeeProfiles.id, id));
  return db.select().from(employeeProfiles).where(eq(employeeProfiles.id, id));
}

export async function deactivateEmployee(id: number) {
  await db.update(employeeProfiles).set({ isActive: false, updatedAt: new Date() }).where(eq(employeeProfiles.id, id));
}

export async function getEmployeesByPosition(position: string) {
  return db.select().from(employeeProfiles).where(and(eq(employeeProfiles.position, position), eq(employeeProfiles.isActive, true)));
}

export async function getOpenShift(userId: number) {
  const result = await db.select().from(shifts).where(and(eq(shifts.userId, userId), eq(shifts.status, 'open')));
  return result[0] || null;
}

export async function openShift(userId: number, startingCash: number, notes?: string) {
  return db.insert(shifts).values({ userId, startingCash, notes: notes || '', status: 'open' });
}

export async function closeShift(shiftId: number, actualCash: number, closedBy: number, notes?: string) {
  const shift = await db.select().from(shifts).where(eq(shifts.id, shiftId));
  if (!shift.length) return { error: 'Shift not found' };
  const s = shift[0];
  if (!s) return { error: 'Shift not found' };

  const orderResult = await db.select({ total: sum(orders.total) })
    .from(orders)
    .where(and(
      eq(orders.userId, s.userId),
      gte(orders.createdAt, s.openedAt),
      eq(orders.status, 'completed')
    ));
  const totalSales = parseInt(orderResult[0]?.total || '0');
  const expectedCash = s.startingCash + totalSales;

  await db.update(shifts).set({
    closedAt: new Date(),
    actualCash,
    expectedCash,
    cashDifference: actualCash - expectedCash,
    notes: notes || s.notes,
    status: 'closed',
    closedBy,
  }).where(eq(shifts.id, shiftId));

  return db.select().from(shifts).where(eq(shifts.id, shiftId));
}

export async function getShiftById(id: number) {
  const result = await db.select().from(shifts).where(eq(shifts.id, id));
  return result[0] || null;
}

export async function getShiftsByDateRange(startDate: string, endDate: string) {
  return db.select({
    id: shifts.id,
    userId: shifts.userId,
    userName: users.name,
    openedAt: shifts.openedAt,
    closedAt: shifts.closedAt,
    startingCash: shifts.startingCash,
    expectedCash: shifts.expectedCash,
    actualCash: shifts.actualCash,
    cashDifference: shifts.cashDifference,
    notes: shifts.notes,
    status: shifts.status,
  })
  .from(shifts)
  .leftJoin(users, eq(shifts.userId, users.id))
  .where(and(gte(shifts.openedAt, new Date(startDate)), lte(shifts.openedAt, new Date(endDate))))
  .orderBy(desc(shifts.openedAt));
}

export async function getShiftsByUser(userId: number) {
  return db.select().from(shifts).where(eq(shifts.userId, userId)).orderBy(desc(shifts.openedAt));
}

export async function getAllOpenShifts() {
  return db.select({
    id: shifts.id,
    userId: shifts.userId,
    userName: users.name,
    openedAt: shifts.openedAt,
    startingCash: shifts.startingCash,
    notes: shifts.notes,
  })
  .from(shifts)
  .leftJoin(users, eq(shifts.userId, users.id))
  .where(eq(shifts.status, 'open'))
  .orderBy(desc(shifts.openedAt));
}

export async function clockIn(userId: number, notes?: string) {
  const existing = await db.select().from(attendance)
    .where(and(eq(attendance.userId, userId), sql`${attendance.clockOut} IS NULL`));
  if (existing.length) return { error: 'Already clocked in' };

  const now = new Date();
  const hour = now.getHours();
  const status = hour >= 9 ? 'late' : 'present';

  return db.insert(attendance).values({ userId, notes: notes || '', status });
}

export async function clockOut(userId: number, notes?: string) {
  const existing = await db.select().from(attendance)
    .where(and(eq(attendance.userId, userId), sql`${attendance.clockOut} IS NULL`))
    .orderBy(desc(attendance.clockIn));
  if (!existing.length) return { error: 'Not clocked in' };
  const att = existing[0];
  if (!att) return { error: 'Not clocked in' };

  const clockOut = new Date();
  const hours = (clockOut.getTime() - att.clockIn.getTime()) / (1000 * 60 * 60);

  await db.update(attendance).set({
    clockOut,
    totalHours: hours.toFixed(2),
    notes: notes || att.notes,
  }).where(eq(attendance.id, att.id));

  return db.select().from(attendance).where(eq(attendance.id, att.id));
}

export async function getTodayAttendance(userId: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const result = await db.select().from(attendance)
    .where(and(eq(attendance.userId, userId), gte(attendance.clockIn, today), lte(attendance.clockIn, tomorrow)))
    .orderBy(desc(attendance.clockIn));
  return result[0] || null;
}

export async function getAttendanceByDateRange(startDate: string, endDate: string) {
  return db.select({
    id: attendance.id,
    userId: attendance.userId,
    userName: users.name,
    clockIn: attendance.clockIn,
    clockOut: attendance.clockOut,
    totalHours: attendance.totalHours,
    notes: attendance.notes,
    status: attendance.status,
  })
  .from(attendance)
  .leftJoin(users, eq(attendance.userId, users.id))
  .where(and(gte(attendance.clockIn, new Date(startDate)), lte(attendance.clockIn, new Date(endDate))))
  .orderBy(desc(attendance.clockIn));
}

export async function getAttendanceByUser(userId: number, startDate: string, endDate: string) {
  return db.select()
    .from(attendance)
    .where(and(eq(attendance.userId, userId), gte(attendance.clockIn, new Date(startDate)), lte(attendance.clockIn, new Date(endDate))))
    .orderBy(desc(attendance.clockIn));
}

export async function getCashierPerformance(startDate: string, endDate: string) {
  return db.select({
    userId: orders.userId,
    userName: users.name,
    totalTransactions: count(orders.id).mapWith(Number),
    totalSales: sum(orders.total).mapWith(Number),
    avgOrderValue: avg(orders.total).mapWith(Number),
    completedOrders: sql<number>`SUM(CASE WHEN ${orders.status} = 'completed' THEN 1 ELSE 0 END)`,
    cancelledOrders: sql<number>`SUM(CASE WHEN ${orders.status} = 'cancelled' THEN 1 ELSE 0 END)`,
  })
  .from(orders)
  .leftJoin(users, eq(orders.userId, users.id))
  .where(and(gte(orders.createdAt, new Date(startDate)), lte(orders.createdAt, new Date(endDate))))
  .groupBy(orders.userId, users.name)
  .orderBy(desc(sum(orders.total)));
}
