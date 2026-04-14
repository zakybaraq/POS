import { Elysia } from 'elysia';
import * as orderRepo from '../repositories/order';
import * as tableRepo from '../repositories/table';
import * as menuRepo from '../repositories/menu';
import { getDashboardMetrics, getHourlySalesTrend } from '../services/dashboard';
import { getUserFromRequest } from '../middleware/authorization';

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
  })
  .get('/metrics', async ({ cookie, headers, query }) => {
    const user = getUserFromRequest(cookie, headers);
    if (!user) return { error: 'Unauthorized' };

    const range = (query.range as string) || 'today';
    const startDate = query.startDate as string | undefined;
    const endDate = query.endDate as string | undefined;

    const metrics = await getDashboardMetrics(range, startDate, endDate);
    return metrics;
  })
  .get('/export', async ({ cookie, headers, query }) => {
    const user = getUserFromRequest(cookie, headers);
    if (!user) return { error: 'Unauthorized' };

    const range = (query.range as string) || 'today';
    const startDate = query.startDate as string | undefined;
    const endDate = query.endDate as string | undefined;

    const metrics = await getDashboardMetrics(range, startDate, endDate);
    const csvLines = ['Tanggal,Total Penjualan,Jumlah Pesanan,Menu Terlaris'];
    const dateLabel = new Date().toLocaleDateString('id-ID');
    const topMenu = metrics.topMenus?.[0]?.name || '-';
    csvLines.push(`${dateLabel},Rp ${(metrics.todaySales || 0).toLocaleString('id-ID')},${metrics.todayOrders || 0},${topMenu}`);

    const csv = csvLines.join('\n');
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="dashboard-${range}-${Date.now()}.csv"`,
      },
    });
  })
  .get('/metrics/hourly', async ({ cookie, headers }) => {
    const user = getUserFromRequest(cookie, headers);
    if (!user) return { error: 'Unauthorized' };

    const hourly = await getHourlySalesTrend();
    return hourly;
  });
