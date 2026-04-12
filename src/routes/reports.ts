import { Elysia } from 'elysia';
import * as reportRepo from '../repositories/report';
import * as financialRepo from '../repositories/financial-report';
import { parsePaginationQuery, createPaginatedResult } from '../utils/pagination';

export const reportRoutes = new Elysia({ prefix: '/api/reports' })
  .get('/sales/daily', async ({ query }) => {
    const date = (query as any)?.date;
    return reportRepo.getDailySales(date);
  })
  .get('/sales/weekly', async ({ query }) => {
    const startDate = (query as any)?.startDate;
    const endDate = (query as any)?.endDate;
    return reportRepo.getWeeklySales(startDate, endDate);
  })
  .get('/sales/monthly', async ({ query }) => {
    const year = (query as any)?.year ? parseInt((query as any).year) : undefined;
    const month = (query as any)?.month ? parseInt((query as any).month) : undefined;
    return reportRepo.getMonthlySales(year, month);
  })
  .get('/sales/custom', async ({ query }) => {
    const startDate = (query as any)?.startDate;
    const endDate = (query as any)?.endDate;
    if (!startDate || !endDate) {
      return { error: 'startDate and endDate are required' };
    }
    const { page, limit } = parsePaginationQuery(query as any);
    const data = await reportRepo.getSalesByDateRangePaginated(startDate, endDate, page, limit);
    return createPaginatedResult(data, data.length, page, limit);
  })
  .get('/menus/top-quantity', async ({ query }) => {
    const startDate = (query as any)?.startDate;
    const endDate = (query as any)?.endDate;
    const limit = (query as any)?.limit ? parseInt((query as any).limit) : 10;
    if (!startDate || !endDate) {
      return { error: 'startDate and endDate are required' };
    }
    return reportRepo.getTopMenusByQuantity(startDate, endDate, limit);
  })
  .get('/menus/top-revenue', async ({ query }) => {
    const startDate = (query as any)?.startDate;
    const endDate = (query as any)?.endDate;
    if (!startDate || !endDate) {
      return { error: 'startDate and endDate are required' };
    }
    const { page, limit } = parsePaginationQuery(query as any);
    const data = await reportRepo.getTopMenusByRevenuePaginated(startDate, endDate, page, limit);
    return createPaginatedResult(data, data.length, page, limit);
  })
  .get('/menus/category', async ({ query }) => {
    const startDate = (query as any)?.startDate;
    const endDate = (query as any)?.endDate;
    if (!startDate || !endDate) {
      return { error: 'startDate and endDate are required' };
    }
    return reportRepo.getMenuCategoryBreakdown(startDate, endDate);
  })
  .get('/cashiers', async ({ query }) => {
    const startDate = (query as any)?.startDate;
    const endDate = (query as any)?.endDate;
    if (!startDate || !endDate) {
      return { error: 'startDate and endDate are required' };
    }
    return reportRepo.getCashierPerformance(startDate, endDate);
  })
  .get('/tables/occupancy', async ({ query }) => {
    const startDate = (query as any)?.startDate;
    const endDate = (query as any)?.endDate;
    if (!startDate || !endDate) {
      return { error: 'startDate and endDate are required' };
    }
    return reportRepo.getTableOccupancy(startDate, endDate);
  })
  .get('/summary', async ({ query }) => {
    const startDate = (query as any)?.startDate;
    const endDate = (query as any)?.endDate;
    if (!startDate || !endDate) {
      return { error: 'startDate and endDate are required' };
    }
    return reportRepo.getSalesSummary(startDate, endDate);
  })
  .get('/financial/profit-loss', async ({ query }) => {
    const startDate = (query as any)?.startDate;
    const endDate = (query as any)?.endDate;
    if (!startDate || !endDate) {
      return { error: 'startDate and endDate are required' };
    }
    return financialRepo.getProfitLossReport(startDate, endDate);
  })
  .get('/financial/daily', async ({ query }) => {
    const startDate = (query as any)?.startDate;
    const endDate = (query as any)?.endDate;
    if (!startDate || !endDate) {
      return { error: 'startDate and endDate are required' };
    }
    return financialRepo.getDailyFinancials(startDate, endDate);
  })
  .get('/financial/expense-breakdown', async ({ query }) => {
    const startDate = (query as any)?.startDate;
    const endDate = (query as any)?.endDate;
    if (!startDate || !endDate) {
      return { error: 'startDate and endDate are required' };
    }
    return financialRepo.getExpenseBreakdown(startDate, endDate);
  })
  .get('/financial/monthly-comparison', async ({ query }) => {
    const year = (query as any)?.year ? parseInt((query as any).year) : new Date().getFullYear();
    return financialRepo.getMonthlyComparison(year);
  })
  .get('/financial/dashboard', async () => {
    return financialRepo.getDashboardFinancialSummary();
  });