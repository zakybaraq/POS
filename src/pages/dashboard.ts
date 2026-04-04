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

function getGreeting(name: string) {
  const hour = new Date().getHours();
  let greeting: string, emoji: string;
  if (hour >= 5 && hour < 12) { greeting = 'Selamat Pagi'; emoji = '☀️'; }
  else if (hour >= 12 && hour < 15) { greeting = 'Selamat Siang'; emoji = '🌤️'; }
  else if (hour >= 15 && hour < 18) { greeting = 'Selamat Sore'; emoji = '🌅'; }
  else { greeting = 'Selamat Malam'; emoji = '🌙'; }
  return `${greeting}, ${name}! ${emoji}`;
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
              <h2 style="margin: 0; font-size: 24px;">${greeting}</h2>
              <p style="color: var(--color-text-secondary); margin: 4px 0 0;">Ringkasan bisnis restoran Anda hari ini</p>
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
                <div class="stats-value">Rp ${todaySales.toLocaleString('id-ID')}</div>
                <div class="stats-change">Hari ini</div>
              </div>
              <div class="stats-card">
                <div class="stats-label">Total Pesanan</div>
                <div class="stats-value">${todayOrders}</div>
                <div class="stats-change">Hari ini</div>
              </div>
              <div class="stats-card">
                <div class="stats-label">Meja Terpakai</div>
                <div class="stats-value">${tableStats.occupied}</div>
                <div class="stats-change">Dari ${tableStats.total} total</div>
              </div>
              <div class="stats-card">
                <div class="stats-label">Menu Tersedia</div>
                <div class="stats-value">${menuStats.available}</div>
                <div class="stats-change">Dari ${menuStats.total} total</div>
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
                      <tr><th>Meja</th><th>Total</th><th>Status</th><th>Waktu</th></tr>
                    </thead>
                    <tbody>
                      ${recentOrders.map((o: any) => `
                        <tr>
                          <td><strong>Meja ${o.tableNumber || '-'}</strong></td>
                          <td>Rp ${(o.total || 0).toLocaleString('id-ID')}</td>
                          <td><span class="badge ${statusBadge(o.status)}">${statusLabel(o.status)}</span></td>
                          <td>${new Date(o.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</td>
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
                <div style="padding: 8px 16px;">
                  ${topMenus.map((m: any, i: number) => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--color-border);">
                      <div style="display: flex; align-items: center; gap: 12px;">
                        <span style="width: 24px; height: 24px; border-radius: 50%; background: ${i === 0 ? 'var(--color-warning)' : i === 1 ? 'var(--color-text-secondary)' : i === 2 ? '#cd7f32' : 'var(--color-bg-alt)'}; color: ${i < 3 ? 'white' : 'var(--color-text)'}; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600;">${i + 1}</span>
                        <span style="font-weight: 500;">${m.name || 'Unknown'}</span>
                      </div>
                      <div style="text-align: right;">
                        <div style="font-weight: 600; font-size: 14px;">${m.totalSold} porsi</div>
                        <div style="font-size: 12px; color: var(--color-text-secondary);">Rp ${(m.revenue || 0).toLocaleString('id-ID')}</div>
                      </div>
                    </div>
                  `).join('')}
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
      </style>
      ${getCommonScripts()}
    `);
  });
