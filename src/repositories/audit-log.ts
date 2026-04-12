import { eq, desc, gte, sql } from 'drizzle-orm';
import { db } from '../db/index';
import { auditLogs } from '../db/schema';
import type { NewAuditLog } from '../db/schema';

export async function createAuditLog(data: NewAuditLog) {
  return db.insert(auditLogs).values(data);
}

export async function getRecentAuditLogs(limit: number = 20) {
  const logs = await db.select().from(auditLogs)
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
  return logs.map(log => ({
    ...log,
    createdAt: new Date(log.createdAt.getTime() - 7 * 60 * 60 * 1000)
  }));
}

export async function getLogsByUserId(userId: number, limit: number = 20) {
  return db.select().from(auditLogs)
    .where(eq(auditLogs.userId, userId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
}

export async function getLogsToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return db.select().from(auditLogs)
    .where(gte(auditLogs.createdAt, today))
    .orderBy(desc(auditLogs.createdAt));
}
