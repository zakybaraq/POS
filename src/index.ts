import { Elysia } from 'elysia';
import { cookie } from '@elysiajs/cookie';
import { routes } from './routes';
import { categoryRoutes } from './routes/categories';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { authPages } from './pages/auth';
import { dashboardPage } from './pages/dashboard';
import { posPage } from './pages/pos';
import { adminPage } from './pages/admin';
import { menuPage } from './pages/menu';
import { categoriesPage } from './pages/categories';
import { tablesPage } from './pages/tables';
import { ordersPage } from './pages/orders';
import { productsPage } from './pages/products';

import { customersPage } from './pages/customers';

import { inventoryPage } from './pages/inventory';
import { reportsPage } from './pages/reports';
import { settingsPage } from './pages/settings';
import { suppliersPage } from './pages/suppliers';
import { purchaseOrdersPage } from './pages/purchase-orders';
import { employeesPage } from './pages/employees';
import { shiftsPage } from './pages/shifts';
import { attendancePage } from './pages/attendance';
import { kitchenPage } from './pages/kitchen';
import { seedDefaultSettings } from './repositories/settings';
import { seedDefaultCategories } from './repositories/category';
import { logger } from './logger';

seedDefaultSettings().catch(err => 
  logger.error({ err }, 'Failed to seed settings')
);
seedDefaultCategories().catch(err => 
  logger.error({ err }, 'Failed to seed categories')
);

const app = new Elysia()
  .use(routes)
  .use(categoryRoutes)
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
  .get('/pages/:path', ({ params }) => {
    const pagesDir = join(__dirname, 'pages');
    const filePath = join(pagesDir, params.path);
    if (existsSync(filePath)) {
      const content = readFileSync(filePath, 'utf-8');
      return new Response(content, { headers: { 'Content-Type': 'application/javascript' } });
    }
    return new Response('Not found', { status: 404 });
  })
  .use(authPages)
  .use(dashboardPage)
  .use(posPage)
  .use(adminPage)
.use(menuPage)
.use(categoriesPage)
.use(tablesPage)
  .use(ordersPage)
  .use(productsPage)
  .use(inventoryPage)
  .use(customersPage)
  .use(reportsPage)
  .use(settingsPage)
  .use(suppliersPage)
  .use(purchaseOrdersPage)
  .use(employeesPage)
  .use(shiftsPage)
  .use(attendancePage)
  .use(kitchenPage)
  .listen(process.env.PORT || 3000);

logger.info({ port: process.env.PORT || 3000 }, 'Server running');

export type App = typeof app;
