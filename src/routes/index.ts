import { Elysia } from 'elysia';
import { cookie } from '@elysiajs/cookie';
import { menuRoutes } from './menus';
import { tableRoutes } from './tables';
import { orderRoutes } from './orders';
import { authRoutes } from './auth';
import { userRoutes } from './users';
import { dashboardRoutes } from './dashboard';
import { auditLogRoutes } from './audit-log';
import { inventoryRoutes } from './inventory';

import { customerRoutes } from './customers';
import { reportRoutes } from './reports';
import { settingsRoutes } from './settings';
import { supplierRoutes } from './suppliers';
import { purchaseOrderRoutes } from './purchase-orders';
import { employeeRoutes } from './employees';
import { shiftRoutes } from './shifts';
import { attendanceRoutes } from './attendance';
import { kitchenRoutes } from './kitchen';

export const routes = new Elysia()
  .use(cookie())
  .use(menuRoutes)
  .use(tableRoutes)
  .use(orderRoutes)
  .use(authRoutes)
  .use(userRoutes)
  .use(dashboardRoutes)
  .use(auditLogRoutes)
  .use(inventoryRoutes)
  .use(customerRoutes)
  .use(reportRoutes)
  .use(settingsRoutes)
  .use(supplierRoutes)
  .use(purchaseOrderRoutes)
  .use(employeeRoutes)
  .use(shiftRoutes)
  .use(attendanceRoutes)
  .use(kitchenRoutes);
