import { Elysia } from 'elysia';
import * as auditRepo from '../repositories/audit-log';
import { requireSuperAdmin, getUserFromRequest } from '../middleware/authorization';

export const auditLogRoutes = new Elysia({ prefix: '/api/audit-logs' })
  .get('/', async () => {
    return auditRepo.getRecentAuditLogs(50);
  })
  .onBeforeHandle(requireSuperAdmin());
