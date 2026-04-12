import { eq, and, gte, lte, desc, sql, sum, count, avg } from 'drizzle-orm';
import { db } from '../db/index';
import { orders, orderItems, ingredients, stockMovements, purchaseOrders, purchaseOrderItems, employeeProfiles, users } from '../db/schema';

function dateStart(dateStr: string) {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dateEnd(dateStr: string) {
  const d = new Date(dateStr);
  d.setHours(23, 59, 59, 999);
  return d;
}

// Revenue Reports (Pemasukan)

export async function getRevenueReport(startDate: string, endDate: string) {
  const start = dateStart(startDate);
  const end = dateEnd(endDate);

  const result = await db.select({
    totalRevenue: sum(orders.total).mapWith(Number),
    totalTax: sum(orders.tax).mapWith(Number),
    totalOrders: count(orders.id).mapWith(Number),
    completedOrders: sql<number>`SUM(CASE WHEN ${orders.status} = 'completed' THEN 1 ELSE 0 END)`,
    avgOrderValue: sql<number>`AVG(CASE WHEN ${orders.status} = 'completed' THEN ${orders.total} ELSE NULL END)`,
  })
  .from(orders)
  .where(and(
    gte(orders.createdAt, start),
    lte(orders.createdAt, end),
    eq(orders.status, 'completed')
  ));

  return result[0] || {
    totalRevenue: 0,
    totalTax: 0,
    totalOrders: 0,
    completedOrders: 0,
    avgOrderValue: 0,
  };
}

// Expense Reports (Pengeluaran)

export async function getPurchaseOrderExpenses(startDate: string, endDate: string) {
  const start = dateStart(startDate);
  const end = dateEnd(endDate);

  const result = await db.select({
    totalExpenses: sum(purchaseOrders.subtotal).mapWith(Number),
    totalOrders: count(purchaseOrders.id).mapWith(Number),
    completedOrders: sql<number>`SUM(CASE WHEN ${purchaseOrders.status} = 'received' THEN 1 ELSE 0 END)`,
  })
  .from(purchaseOrders)
  .where(and(
    gte(purchaseOrders.createdAt, start),
    lte(purchaseOrders.createdAt, end)
  ));

  return result[0] || {
    totalExpenses: 0,
    totalOrders: 0,
    completedOrders: 0,
  };
}

export async function getEmployeeSalaryExpenses(startDate: string, endDate: string) {
  const start = dateStart(startDate);
  const end = dateEnd(endDate);

  const result = await db.select({
    totalSalaries: sum(employeeProfiles.salary).mapWith(Number),
    totalEmployees: count(employeeProfiles.id).mapWith(Number),
    avgSalary: avg(employeeProfiles.salary).mapWith(Number),
  })
  .from(employeeProfiles)
  .where(eq(employeeProfiles.isActive, true));

  return result[0] || {
    totalSalaries: 0,
    totalEmployees: 0,
    avgSalary: 0,
  };
}

// COGS (Cost of Goods Sold) - based on ingredient usage

export async function getCOGS(startDate: string, endDate: string) {
  const start = dateStart(startDate);
  const end = dateEnd(endDate);

  const movements = await db.select({
    ingredientId: stockMovements.ingredientId,
    totalQuantity: sum(sql`CAST(${stockMovements.quantity} AS DECIMAL(10,2))`).mapWith(Number),
  })
  .from(stockMovements)
  .where(and(
    eq(stockMovements.type, 'out'),
    gte(stockMovements.createdAt, start),
    lte(stockMovements.createdAt, end)
  ))
  .groupBy(stockMovements.ingredientId);

  let totalCOGS = 0;

  for (const movement of movements) {
    const ingredient = await db.select({
      averageCost: sql<number>`COALESCE(AVG(CAST(${stockMovements.quantity} AS DECIMAL(10,2)) * CAST(${stockMovements.stockBefore} AS DECIMAL(10,2))), 0)`,
    })
    .from(stockMovements)
    .where(eq(stockMovements.ingredientId, movement.ingredientId))
    .limit(1);

    const avgCost = ingredient[0]?.averageCost || 0;
    totalCOGS += (movement.totalQuantity || 0) * avgCost;
  }

  return {
    totalCOGS,
    ingredientCount: movements.length,
  };
}

// Comprehensive Profit/Loss Report

export async function getProfitLossReport(startDate: string, endDate: string) {
  const [revenue, purchases, salaries, cogs] = await Promise.all([
    getRevenueReport(startDate, endDate),
    getPurchaseOrderExpenses(startDate, endDate),
    getEmployeeSalaryExpenses(startDate, endDate),
    getCOGS(startDate, endDate),
  ]);

  const grossProfit = revenue.totalRevenue - cogs.totalCOGS;
  const totalExpenses = purchases.totalExpenses + salaries.totalSalaries;
  const netProfit = grossProfit - totalExpenses;
  const profitMargin = revenue.totalRevenue > 0 ? (netProfit / revenue.totalRevenue) * 100 : 0;

  return {
    period: { startDate, endDate },
    revenue: {
      totalRevenue: revenue.totalRevenue,
      totalTax: revenue.totalTax,
      netRevenue: revenue.totalRevenue - revenue.totalTax,
      completedOrders: revenue.completedOrders,
      avgOrderValue: Math.round(revenue.avgOrderValue || 0),
    },
    costOfGoodsSold: {
      totalCOGS: cogs.totalCOGS,
      ingredientCount: cogs.ingredientCount,
    },
    grossProfit,
    expenses: {
      purchases: purchases.totalExpenses,
      salaries: salaries.totalSalaries,
      totalExpenses,
    },
    netProfit,
    profitMargin: Math.round(profitMargin * 100) / 100,
  };
}

// Daily Breakdown

export async function getDailyFinancials(startDate: string, endDate: string) {
  const start = dateStart(startDate);
  const end = dateEnd(endDate);

  const revenue = await db.select({
    date: sql<string>`DATE(${orders.createdAt})`,
    revenue: sum(orders.total).mapWith(Number),
    tax: sum(orders.tax).mapWith(Number),
    orderCount: count(orders.id).mapWith(Number),
  })
  .from(orders)
  .where(and(
    gte(orders.createdAt, start),
    lte(orders.createdAt, end),
    eq(orders.status, 'completed')
  ))
  .groupBy(sql`DATE(${orders.createdAt})`);

  const expenses = await db.select({
    date: sql<string>`DATE(${purchaseOrders.createdAt})`,
    expenses: sum(purchaseOrders.subtotal).mapWith(Number),
  })
  .from(purchaseOrders)
  .where(and(
    gte(purchaseOrders.createdAt, start),
    lte(purchaseOrders.createdAt, end)
  ))
  .groupBy(sql`DATE(${purchaseOrders.createdAt})`);

  const expenseMap = new Map(expenses.map(e => [e.date, e.expenses || 0]));

  return revenue.map(r => ({
    date: r.date,
    revenue: r.revenue || 0,
    tax: r.tax || 0,
    netRevenue: (r.revenue || 0) - (r.tax || 0),
    expenses: expenseMap.get(r.date) || 0,
    profit: (r.revenue || 0) - (expenseMap.get(r.date) || 0),
    orderCount: r.orderCount || 0,
  }));
}

// Expense Breakdown by Category

export async function getExpenseBreakdown(startDate: string, endDate: string) {
  const [purchaseData, salaryData] = await Promise.all([
    getPurchaseOrderExpenses(startDate, endDate),
    getEmployeeSalaryExpenses(startDate, endDate),
  ]);

  const total = purchaseData.totalExpenses + salaryData.totalSalaries;

  return [
    {
      category: 'Bahan Baku (Purchase Orders)',
      amount: purchaseData.totalExpenses,
      percentage: total > 0 ? Math.round((purchaseData.totalExpenses / total) * 10000) / 100 : 0,
    },
    {
      category: 'Gaji Karyawan',
      amount: salaryData.totalSalaries,
      percentage: total > 0 ? Math.round((salaryData.totalSalaries / total) * 10000) / 100 : 0,
    },
  ];
}

// Monthly Comparison

export async function getMonthlyComparison(year: number) {
  const months = [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (let month = 0; month < 12; month++) {
    const startDate = new Date(year, month, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

    const report = await getProfitLossReport(startDate, endDate);

    months.push({
      month: monthNames[month],
      revenue: report.revenue.totalRevenue,
      expenses: report.expenses.totalExpenses,
      netProfit: report.netProfit,
      profitMargin: report.profitMargin,
    });
  }

  return months;
}

// Dashboard Summary (current month)

export async function getDashboardFinancialSummary() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const startDate = new Date(year, month, 1).toISOString().split('T')[0];
  const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

  const report = await getProfitLossReport(startDate, endDate);

  const prevMonthStart = new Date(year, month - 1, 1).toISOString().split('T')[0];
  const prevMonthEnd = new Date(year, month, 0).toISOString().split('T')[0];
  const prevReport = await getProfitLossReport(prevMonthStart, prevMonthEnd);

  return {
    currentMonth: report,
    previousMonth: prevReport,
    changes: {
      revenue: prevReport.revenue.totalRevenue > 0
        ? Math.round(((report.revenue.totalRevenue - prevReport.revenue.totalRevenue) / prevReport.revenue.totalRevenue) * 10000) / 100
        : 0,
      netProfit: prevReport.netProfit !== 0
        ? Math.round(((report.netProfit - prevReport.netProfit) / Math.abs(prevReport.netProfit)) * 10000) / 100
        : 0,
    },
  };
}
