import { Elysia } from 'elysia';
import { db } from '../db/index';
import { logger } from '../logger';
import { sql } from 'drizzle-orm';

const startTime = Date.now();

export const healthRoutes = new Elysia({ prefix: '/health' })
  .get('/', async () => {
    const logger_local = logger;
    
    try {
      // Test database connectivity
      await db.execute(sql`SELECT 1`);
      
      const uptime = Math.floor((Date.now() - startTime) / 1000);
      
      const response = {
        status: 'healthy',
        uptime,
        database: 'connected',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      };
      
      logger_local.debug(response, 'Health check passed');
      return response;
    } catch (error) {
      logger_local.error({ err: error }, 'Health check failed');
      
      return {
        status: 'unhealthy',
        uptime: Math.floor((Date.now() - startTime) / 1000),
        database: 'disconnected',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });
