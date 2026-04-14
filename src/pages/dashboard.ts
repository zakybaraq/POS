import { Elysia } from 'elysia';
import { htmlResponse } from '../templates/html';
import { getSidebarHtml } from '../templates/sidebar';
import { getNavbarHtml } from '../templates/navbar';
import { getFooterHtml } from '../templates/footer';
import { getCommonScripts } from '../templates/common-scripts';
import { getTokenFromCookies, verifyToken, redirectToLogin } from '../utils/auth';
import * as orderRepo from '../repositories/order';
import * as tableRepo from '../repositories/table';
import * as menuRepo from '../repositories/menu';
import * as invRepo from '../repositories/inventory';
import * as custRepo from '../repositories/customer';
import { getHourlySalesTrend } from '../services/dashboard';

function getGreeting(name: string) {
  const hour = new Date().getHours();
  let greeting: string, emoji: string;
  if (hour >= 5 && hour < 12) { greeting = 'Selamat Pagi'; emoji = '☀️'; }
  else if (hour >= 12 && hour < 15) { greeting = 'Selamat Siang'; emoji = '🌤️'; }
  else if (hour >= 15 && hour < 18) { greeting = 'Selamat Sore'; emoji = '🌅'; }
  else { greeting = 'Selamat Malam'; emoji = '🌙'; }
  return `${greeting}, ${name}! ${emoji}`;
}

function renderHourlySalesChart(hourlyData: { hour: number; sales: number }[]) {
  if (!hourlyData || hourlyData.length === 0) {
    return '<p style="text-align: center; color: var(--color-text-secondary); padding: 40px;">Belum ada data penjualan hari ini</p>';
  }
  const maxSales = Math.max(...hourlyData.map(h => h.sales), 1);
  const width = 600, height = 180, padding = 40;
  const chartWidth = width - padding * 2, chartHeight = height - padding * 2;
  
  let points = '';
  hourlyData.forEach((d, i) => {
    const x = padding + (i / 23) * chartWidth;
    const y = padding + chartHeight - (d.sales / maxSales) * chartHeight;
    points += `${i === 0 ? 'M' : 'L'}${x},${y} `;
  });
  
  const maxLabel = (maxSales > 1000000 ? (maxSales / 1000000).toFixed(0) + 'jt' : maxSales > 1000 ? (maxSales / 1000).toFixed(0) + 'rb' : maxSales.toString());
  
  return `
    <svg viewBox="0 0 ${width} ${height}" style="width: 100%; height: 200px;" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--color-primary)" stop-opacity="0.3"/>
          <stop offset="100%" stop-color="var(--color-primary)" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <path d="${points} L${width - padding},${height - padding} L${padding},${height - padding} Z" fill="url(#chartGradient)"/>
      <path d="${points}" fill="none" stroke="var(--color-primary)" stroke-width="2"/>
      <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="var(--color-border)"/>
      <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="var(--color-border)"/>
      <text x="${padding}" y="${padding - 5}" fill="var(--color-text-secondary)" font-size="10">Rp ${maxLabel}</text>
      <text x="${padding}" y="${height - padding + 15}" fill="var(--color-text-secondary)" font-size="10">00:00</text>
      <text x="${width / 2}" y="${height - padding + 15}" fill="var(--color-text-secondary)" font-size="10">12:00</text>
      <text x="${width - padding}" y="${height - padding + 15}" fill="var(--color-text-secondary)" font-size="10" text-anchor="end">23:59</text>
    </svg>
  `;
}

function renderTopItemsBarChart(topItems: { name: string; totalSold: number }[]) {
  if (!topItems || topItems.length === 0) {
    return '<p style="text-align: center; color: var(--color-text-secondary); padding: 40px;">Belum ada data menu terlaris</p>';
  }
  const maxSold = Math.max(...topItems.map(i => i.totalSold), 1);
  let bars = '';
  const colors = ['#f59e0b', '#9ca3af', '#cd7f32', 'var(--color-primary)', 'var(--color-text-secondary)'];
  topItems.slice(0, 5).forEach((item, i) => {
    const width = (item.totalSold / maxSold) * 100;
    bars += `
      <div style="margin-bottom: 8px;">
        <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 2px;">
          <span>${i + 1}. ${item.name}</span>
          <span style="font-weight: 600;">${item.totalSold}</span>
        </div>
        <div style="height: 16px; background: var(--color-bg-alt); border-radius: 4px; overflow: hidden;">
          <div style="width: ${width}%; height: 100%; background: ${colors[i]}; border-radius: 4px;"></div>
        </div>
      </div>
    `;
  });
  return bars;
}

export const dashboardPage = new Elysia()
  .get('/', async ({ cookie, headers }) => {
    const token = getTokenFromCookies(cookie, headers);
    if (!token) return redirectToLogin();

    let user = null;
    try {
      user = verifyToken(token);
      if (!user.name) {
        const { getUserById } = await import('../repositories/user');
        const dbUser = await getUserById(user.userId);
        if (dbUser) {
          user.name = dbUser.name;
        }
      }
    } catch {
      return redirectToLogin();
    }

    const todaySales = await orderRepo.getTodaySales();
    const todayOrders = await orderRepo.getTodayOrders();
    const tableStats = await tableRepo.getTableStats();
    const menuStats = await menuRepo.getMenuStats();
    const recentOrders = await orderRepo.getRecentOrders(5);
    const topMenus = await orderRepo.getTopMenus(5);
    let hourlyTrend: any[] = [];
    try {
      hourlyTrend = await getHourlySalesTrend();
    } catch (e) {
      console.error('Failed to get hourly trend:', e);
    }

    const greeting = getGreeting(user.name);
    const lowStockItems = await invRepo.getLowStockIngredients();
    const customerStats = await custRepo.getCustomerStats();
    const tablePercent = tableStats.total > 0 ? Math.round((tableStats.occupied / tableStats.total) * 100) : 0;
    const filledBar = '█'.repeat(Math.round(tablePercent / 10));
    const emptyBar = '░'.repeat(10 - Math.round(tablePercent / 10));

    const statusBadge = (status: string) => {
      if (status === 'completed') return 'badge-success';
      if (status === 'cancelled') return 'badge-error';
      return 'badge-warning';
    };
    const statusLabel = (status: string) => {
      if (status === 'completed') return 'Selesai';
      if (status === 'cancelled') return 'Dibatal';
      return 'Aktif';
    };

    return htmlResponse(`
      <div class="app-layout">
        ${getSidebarHtml('dashboard', user)}
        <div class="app-content">
          ${getNavbarHtml('Dashboard', 'dashboard', user)}
          <main class="app-main">
            <div style="margin-bottom: 24px;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                <div>
                  <h2 style="margin: 0; font-size: 24px;">${greeting}</h2>
                  <p style="color: var(--color-text-secondary); margin: 4px 0 0;">Ringkasan bisnis restoran Anda hari ini</p>
                </div>
                <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                  <select id="date-filter-select" style="padding: 6px 12px; border: 1px solid var(--color-border); border-radius: 4px; font-size: 13px; background: var(--color-bg); color: var(--color-text); cursor: pointer; min-width: 120px;">
                    <option value="today">Hari Ini</option>
                    <option value="yesterday">Kemarin</option>
                    <option value="7days">7 Hari</option>
                    <option value="custom">Custom</option>
                  </select>
                  <span id="custom-date-container" style="display: none; gap: 4px; align-items: center;">
                    <input type="date" id="custom-date-start" style="padding: 4px 6px; border: 1px solid var(--color-border); border-radius: 4px; font-size: 12px; width: 120px;" />
                    <span style="color: var(--color-text-secondary);">-</span>
                    <input type="date" id="custom-date-end" style="padding: 4px 6px; border: 1px solid var(--color-border); border-radius: 4px; font-size: 12px; width: 120px;" />
                    <button id="apply-custom" class="btn btn-sm" style="padding: 4px 8px; background: var(--color-primary); color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">Apply</button>
                  </span>
                  <button id="exportBtn" class="btn btn-sm" style="padding: 6px 12px; background: var(--color-success); color: white; border: none; border-radius: 4px; cursor: pointer; margin-left: auto;">📥 Export CSV</button>
                </div>
              </div>
              ${lowStockItems.length > 0 ? `
              <div style="margin-top: 16px; padding: 12px 16px; background: rgba(245, 158, 11, 0.1); border: 1px solid var(--color-warning); border-radius: var(--radius-md); display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 18px;">⚠️</span>
                <span style="font-size: 14px; font-weight: 500;">${lowStockItems.length} bahan baku stok rendah: ${lowStockItems.map((i: any) => i.name).join(', ')}</span>
                <a href="/inventory" style="margin-left: auto; color: var(--color-warning); font-weight: 600; font-size: 13px; text-decoration: none;">Lihat →</a>
              </div>` : ''}
            </div>

            <div class="stats-grid">
              <div class="stats-card">
                <div class="stats-label">Total Penjualan</div>
                <div class="stats-value" id="today-sales">Rp ${todaySales.toLocaleString('id-ID')}</div>
                <a href="/reports" class="stats-link">Lihat Laporan →</a>
              </div>
              <div class="stats-card">
                <div class="stats-label">Total Pesanan</div>
                <div class="stats-value" id="today-orders">${todayOrders}</div>
                <a href="/reports" class="stats-link">Lihat Laporan →</a>
              </div>
              <div class="stats-card">
                <div class="stats-label">Meja Terpakai</div>
                <div class="stats-value" id="today-tables">${tableStats.occupied}</div>
                <a href="/reports" class="stats-link">Lihat Laporan →</a>
              </div>
              <div class="stats-card">
                <div class="stats-label">Menu Tersedia</div>
                <div class="stats-value" id="today-menus">${menuStats.available}</div>
                <a href="/reports" class="stats-link">Lihat Laporan →</a>
              </div>
            </div>

            <div class="card" style="margin-bottom: 24px;">
              <div class="card-header">
                <h3 class="card-title">Tren Penjualan per Jam</h3>
              </div>
              <div style="padding: 16px;">
                ${renderHourlySalesChart(hourlyTrend)}
              </div>
            </div>

            ${tableStats.total > 0 ? `
            <div class="card" style="margin-bottom: 24px;">
              <div class="card-header">
                <h3 class="card-title">Status Meja</h3>
              </div>
              <div style="padding: 16px;">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                  <div style="flex: 1; display: flex; border-radius: 8px; overflow: hidden; height: 24px; background: var(--color-bg-alt);">
                    <div style="width: ${tablePercent}%; background: var(--color-error); display: flex; align-items: center; justify-content: center; color: white; font-size: 11px; font-weight: 600;">${tablePercent > 15 ? tablePercent + '%' : ''}</div>
                    <div style="flex: 1; background: var(--color-success);"></div>
                  </div>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 14px;">
                  <span>🟢 Tersedia: <strong>${tableStats.available}</strong></span>
                  <span>🔴 Terisi: <strong>${tableStats.occupied}</strong></span>
                  <span style="color: var(--color-text-secondary);">${tablePercent}% terisi</span>
                </div>
              </div>
            </div>` : ''}

            <div class="card" style="margin-bottom: 24px;">
              <div class="card-header">
                <h3 class="card-title">Menu Cepat</h3>
              </div>
              <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;">
                <a href="/pos" class="quick-link">
                  <div class="quick-icon" style="background: var(--color-primary-10);">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="var(--color-primary)" stroke="none"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>
                  </div>
                  <span>Buka POS</span>
                </a>
                ${['super_admin', 'admin_restoran'].includes(user.role) ? `
                <a href="/menu" class="quick-link">
                  <div class="quick-icon" style="background: rgba(16, 185, 129, 0.1);">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="var(--color-success)" stroke="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                  </div>
                  <span>Kelola Menu</span>
                </a>` : ''}
                ${['super_admin', 'admin_restoran'].includes(user.role) ? `
                <a href="/tables" class="quick-link">
                  <div class="quick-icon" style="background: rgba(245, 158, 11, 0.1);">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="var(--color-warning)" stroke="none"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                  </div>
                  <span>Kelola Meja</span>
                </a>` : ''}
                <a href="/orders" class="quick-link">
                  <div class="quick-icon" style="background: rgba(139, 92, 246, 0.1);">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="#8b5cf6" stroke="none"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line></svg>
                  </div>
                  <span>Lihat Pesanan</span>
                </a>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
              <div class="card">
                <div class="card-header">
                  <h3 class="card-title">Pesanan Terbaru</h3>
                </div>
                ${recentOrders.length === 0 ? '<p class="text-center text-secondary" style="padding: 24px;">Belum ada pesanan hari ini</p>' : `
                <div class="table-container">
                  <table class="table">
                    <thead>
                      <tr><th>Pesanan</th><th>Total</th><th>Status</th><th>Waktu</th></tr>
                    </thead>
                    <tbody>
                      ${recentOrders.map((o: any) => `
                        <tr>
                          <td><strong>#${o.id}</strong></td>
                          <td>Rp ${(o.total || 0).toLocaleString('id-ID')}</td>
                          <td><span class="badge ${statusBadge(o.status)}">${statusLabel(o.status)}</span></td>
                          <td>${new Date(o.createdAt).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' })}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>`}
              </div>

              <div class="card">
                <div class="card-header">
                  <h3 class="card-title">Menu Terlaris Hari Ini</h3>
                </div>
                ${topMenus.length === 0 ? '<p class="text-center text-secondary" style="padding: 24px;">Belum ada data menu terlaris</p>' : `
                <div id="top-items-chart" style="padding: 16px;">
                  ${renderTopItemsBarChart(topMenus)}
                </div>`}
              </div>
            </div>
          </main>
          ${getFooterHtml()}
        </div>
      </div>
      <style>
        .quick-link {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          padding: 24px;
          border-radius: var(--radius-lg);
          background: var(--color-bg-alt);
          transition: var(--transition);
          text-decoration: none;
          color: var(--color-text);
        }
        .quick-link:hover {
          background: var(--color-bg-hover);
          transform: translateY(-2px);
        }
        .quick-icon {
          width: 48px;
          height: 48px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .quick-link span {
          font-weight: 500;
        }
        @media (max-width: 768px) {
          .stats-grid {
            grid-template-columns: 1fr !important;
          }
          .card > div[style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
          div[style*="repeat(4, 1fr)"] {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          #hourly-sales-chart {
            height: 150px;
          }
        }
      </style>
      ${getCommonScripts()}
      <script src="/socket.io/socket.io.js"></script>
      <script>
        let currentRange = 'today';
        let customStartDate = '';
        let customEndDate = '';
        
        const dateFilterSelect = document.getElementById('date-filter-select');
        const customContainer = document.getElementById('custom-date-container');
        
        dateFilterSelect?.addEventListener('change', () => {
          const value = dateFilterSelect.value;
          currentRange = value;
          if (value === 'custom') {
            if (customContainer) customContainer.style.display = 'flex';
          } else {
            if (customContainer) customContainer.style.display = 'none';
            refreshDashboard();
          }
        });
        
        document.getElementById('apply-custom')?.addEventListener('click', () => {
          const startEl = document.getElementById('custom-date-start');
          const endEl = document.getElementById('custom-date-end');
          if (startEl && endEl && startEl.value && endEl.value) {
            currentRange = 'custom';
            customStartDate = startEl.value;
            customEndDate = endEl.value;
            refreshDashboard();
          } else {
            alert('Pilih tanggal mulai dan selesai');
          }
        });
        
        function renderHourlySalesChart(hourlyData) {
          if (!hourlyData || hourlyData.length === 0) {
            return '<p style="text-align: center; color: var(--color-text-secondary); padding: 40px;">Belum ada data penjualan hari ini</p>';
          }
          const maxSales = Math.max(...hourlyData.map(h => h.sales), 1);
          const width = 600, height = 180, padding = 40;
          const chartWidth = width - padding * 2, chartHeight = height - padding * 2;
          
          let points = '';
          hourlyData.forEach((d, i) => {
            const x = padding + (i / 23) * chartWidth;
            const y = padding + chartHeight - (d.sales / maxSales) * chartHeight;
            points += (i === 0 ? 'M' : 'L') + x + ',' + y + ' ';
          });
          
          const maxLabel = (maxSales > 1000000 ? (maxSales / 1000000).toFixed(0) + 'jt' : maxSales > 1000 ? (maxSales / 1000).toFixed(0) + 'rb' : maxSales.toString());
          
          return '<svg viewBox="0 0 ' + width + ' ' + height + '" style="width: 100%; height: 200px;" preserveAspectRatio="xMidYMid meet">' +
            '<defs><linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0%" stop-color="var(--color-primary)" stop-opacity="0.3"/>' +
            '<stop offset="100%" stop-color="var(--color-primary)" stop-opacity="0"/>' +
            '</linearGradient></defs>' +
            '<path d="' + points + ' L' + (width - padding) + ',' + (height - padding) + ' L' + padding + ',' + (height - padding) + ' Z" fill="url(#chartGradient)"/>' +
            '<path d="' + points + '" fill="none" stroke="var(--color-primary)" stroke-width="2"/>' +
            '<line x1="' + padding + '" y1="' + (height - padding) + '" x2="' + (width - padding) + '" y2="' + (height - padding) + '" stroke="var(--color-border)"/>' +
            '<line x1="' + padding + '" y1="' + padding + '" x2="' + padding + '" y2="' + (height - padding) + '" stroke="var(--color-border)"/>' +
            '<text x="' + padding + '" y="' + (padding - 5) + '" fill="var(--color-text-secondary)" font-size="10">Rp ' + maxLabel + '</text>' +
            '<text x="' + padding + '" y="' + (height - padding + 15) + '" fill="var(--color-text-secondary)" font-size="10">00:00</text>' +
            '<text x="' + (width / 2) + '" y="' + (height - padding + 15) + '" fill="var(--color-text-secondary)" font-size="10">12:00</text>' +
            '<text x="' + (width - padding) + '" y="' + (height - padding + 15) + '" fill="var(--color-text-secondary)" font-size="10" text-anchor="end">23:59</text>' +
            '</svg>';
        }
        
        function renderTopItemsBarChart(topItems) {
          if (!topItems || topItems.length === 0) {
            return '<p style="text-align: center; color: var(--color-text-secondary); padding: 40px;">Belum ada data menu terlaris</p>';
          }
          const maxSold = Math.max(...topItems.map(i => i.totalSold), 1);
          let bars = '';
          const colors = ['#f59e0b', '#9ca3af', '#cd7f32', 'var(--color-primary)', 'var(--color-text-secondary)'];
          topItems.slice(0, 5).forEach((item, i) => {
            const widthPct = (item.totalSold / maxSold) * 100;
            bars += '<div style="margin-bottom: 8px;">' +
              '<div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 2px;">' +
              '<span>' + (i + 1) + '. ' + item.name + '</span>' +
              '<span style="font-weight: 600;">' + item.totalSold + '</span></div>' +
              '<div style="height: 16px; background: var(--color-bg-alt); border-radius: 4px; overflow: hidden;">' +
              '<div style="width: ' + widthPct + '%; height: 100%; background: ' + colors[i] + '; border-radius: 4px;"></div></div></div>';
          });
          return bars;
        }
        
        document.getElementById('exportBtn')?.addEventListener('click', async () => {
          try {
            const params = new URLSearchParams({ range: currentRange });
            const response = await fetch('/api/dashboard/export?' + params.toString(), { credentials: 'same-origin' });
            if (!response.ok) {
              alert('Gagal export CSV');
              return;
            }
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'dashboard-' + new Date().toISOString().split('T')[0] + '.csv';
            a.click();
            URL.revokeObjectURL(url);
          } catch (error) {
            console.error('Failed to export:', error);
            alert('Error export: ' + error);
          }
        });
        
        async function refreshDashboard() {
          try {
            console.log('Refreshing dashboard with range:', currentRange);
            const params = new URLSearchParams({ range: currentRange });
            if (currentRange === 'custom' && customStartDate && customEndDate) {
              params.set('startDate', customStartDate);
              params.set('endDate', customEndDate);
            }
            const url = '/api/dashboard/metrics?' + params.toString();
            console.log('Fetching:', url);
            const response = await fetch(url, { credentials: 'same-origin' });
            console.log('Response status:', response.status);
            if (response.ok) {
              const metrics = await response.json();
              console.log('Got metrics:', metrics);
              updateDashboardWidgets(metrics);
            } else {
              const text = await response.text();
              console.error('API error:', text);
              alert('Gagal memuat data: ' + response.status);
            }
          } catch (error) {
            console.error('Failed to refresh dashboard:', error);
            alert('Error: ' + error);
          }
        }

        let metricsInterval = setInterval(async () => {
          try {
            const params = new URLSearchParams({ range: currentRange });
            const response = await fetch('/api/dashboard/metrics?' + params.toString());
            if (response.ok) {
              const metrics = await response.json();
              updateDashboardWidgets(metrics);
            }
          } catch (error) {
            console.error('Failed to fetch dashboard metrics:', error);
          }
        }, 10000);

        function updateDashboardWidgets(metrics) {
          const salesEl = document.getElementById('today-sales');
          if (salesEl && metrics.todaySales !== undefined) {
            salesEl.textContent = 'Rp ' + metrics.todaySales.toLocaleString('id-ID');
          }
          const ordersEl = document.getElementById('today-orders');
          if (ordersEl && metrics.todayOrders !== undefined) {
            ordersEl.textContent = metrics.todayOrders;
          }
          const tablesEl = document.getElementById('today-tables');
          if (tablesEl && metrics.tableStats !== undefined) {
            tablesEl.textContent = metrics.tableStats.occupied;
          }
          const menusEl = document.getElementById('today-menus');
          if (menusEl && metrics.menuStats !== undefined) {
            menusEl.textContent = metrics.menuStats.available;
          }
          const lowStockEl = document.getElementById('low-stock-count');
          if (lowStockEl && metrics.lowStockCount !== undefined) {
            lowStockEl.textContent = metrics.lowStockCount;
          }
          if (metrics.topMenus) {
            const topItemsContainer = document.getElementById('top-items-chart');
            if (topItemsContainer) {
              topItemsContainer.innerHTML = renderTopItemsBarChart(metrics.topMenus);
            }
          }
          if (metrics.hourlyTrend) {
            const hourlyContainer = document.querySelector('.card .card-header h3');
            if (hourlyContainer && hourlyContainer.textContent.includes('Jam')) {
              let card = hourlyContainer.closest('.card');
              if (card) {
                const chartDiv = card.querySelector('div[style*="padding: 16px;"]');
                if (chartDiv) {
                  chartDiv.innerHTML = renderHourlySalesChart(metrics.hourlyTrend);
                }
              }
            }
          }
        }

        const socket = io();
        socket.on('connect', () => {
          socket.emit('subscribe-dashboard');
        });

        socket.on('dashboard:metrics-batch', (data) => {
          updateDashboardWidgets(data);
        });

        socket.on('kitchen:queue-update', (data) => {
          const pendingEl = document.getElementById('kitchen-pending');
          const cookingEl = document.getElementById('kitchen-cooking');
          const readyEl = document.getElementById('kitchen-ready');
          if (pendingEl && data.pending !== undefined) pendingEl.textContent = data.pending;
          if (cookingEl && data.cooking !== undefined) cookingEl.textContent = data.cooking;
          if (readyEl && data.ready !== undefined) readyEl.textContent = data.ready;
        });

        socket.on('orders:new', (order) => {
          showToast('Pesanan baru #' + order.id, 'info');
        });

        window.addEventListener('beforeunload', () => {
          clearInterval(metricsInterval);
          socket.emit('unsubscribe-dashboard');
          socket.disconnect();
        });
      </script>
    `);
  });
