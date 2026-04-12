import { Elysia } from 'elysia';
import { getMetrics } from '../metrics';
import { logger } from '../logger';

export const metricsRoutes = new Elysia({ prefix: '/metrics' })
  .get('/', async () => {
    try {
      const metrics = await getMetrics();
      logger.debug('Metrics endpoint called');
      return new Response(metrics, {
        headers: { 'Content-Type': 'text/plain; version=0.0.4; charset=utf-8' },
      });
    } catch (error) {
      logger.error({ err: error }, 'Metrics endpoint error');
      return new Response('Internal Server Error', { status: 500 });
    }
  });
