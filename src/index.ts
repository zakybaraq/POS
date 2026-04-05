import { Elysia } from 'elysia';
import { cookie } from '@elysiajs/cookie';
import { routes } from './routes';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { authPages } from './pages/auth';
import { dashboardPage } from './pages/dashboard';
import { posPage } from './pages/pos';
import { adminPage } from './pages/admin';
import { menuPage } from './pages/menu';
import { tablesPage } from './pages/tables';
import { ordersPage } from './pages/orders';
import { productsPage } from './pages/products';

import { customersPage } from './pages/customers';

import { inventoryPage } from './pages/inventory';
import { reportsPage } from './pages/reports';

const app = new Elysia()
  .use(routes)
  .get('/health', () => ({ status: 'ok', timestamp: new Date().toISOString() }))
  .get('/styles/:path', ({ params }) => {
    const stylesDir = join(__dirname, 'public/styles');
    const filePath = join(stylesDir, params.path);
    if (existsSync(filePath)) {
      const content = readFileSync(filePath, 'utf-8');
      return new Response(content, { headers: { 'Content-Type': 'text/css' } });
    }
    return new Response('Not found', { status: 404 });
  })
  .use(authPages)
  .use(dashboardPage)
  .use(posPage)
  .use(adminPage)
  .use(menuPage)
  .use(tablesPage)
  .use(ordersPage)
  .use(productsPage)
  .use(inventoryPage)
  .use(customersPage)
  .use(reportsPage)
  .listen(process.env.PORT || 3000);

console.log(`Server running at http://localhost:${process.env.PORT || 3000}`);

export type App = typeof app;
