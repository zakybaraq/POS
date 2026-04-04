import { Elysia } from 'elysia';
import { cookie } from '@elysiajs/cookie';
import { menuRoutes } from './menus';
import { tableRoutes } from './tables';
import { orderRoutes } from './orders';
import { authRoutes } from './auth';

export const routes = new Elysia()
  .use(cookie())
  .use(menuRoutes)
  .use(tableRoutes)
  .use(orderRoutes)
  .use(authRoutes);
