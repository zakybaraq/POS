import { Elysia } from 'elysia';
import * as orderRepo from '../repositories/order';
import * as tableRepo from '../repositories/table';
import * as menuRepo from '../repositories/menu';

export const dashboardRoutes = new Elysia({ prefix: '/api/dashboard' })
  .get('/stats', async () => {
    const todaySales = await orderRepo.getTodaySales();
    const todayOrders = await orderRepo.getTodayOrders();
    const tableStats = await tableRepo.getTableStats();
    const menuStats = await menuRepo.getMenuStats();
    const recentOrders = await orderRepo.getRecentOrders(5);
    const topMenus = await orderRepo.getTopMenus(5);

    return {
      todaySales,
      todayOrders,
      occupiedTables: tableStats.occupied,
      totalTables: tableStats.total,
      availableMenus: menuStats.available,
      totalMenus: menuStats.total,
      recentOrders,
      topMenus,
    };
  });
