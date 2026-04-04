import { Elysia } from 'elysia';
import { htmlResponse } from '../templates/html';
import { getSidebarHtml } from '../templates/sidebar';
import { getNavbarHtml } from '../templates/navbar';
import { getFooterHtml } from '../templates/footer';
import { getCommonScripts } from '../templates/common-scripts';
import { getTokenFromCookies, verifyToken, redirectToLogin } from '../utils/auth';

export const ordersPage = new Elysia()
  .get('/orders', async ({ cookie, headers }) => {
    const token = getTokenFromCookies(cookie, headers);
    if (!token) return redirectToLogin();

    let user = null;
    try {
      user = verifyToken(token);
    } catch {
      return redirectToLogin();
    }

    const { getOrdersTodayWithTables } = await import('../repositories/order');
    const { getUserById } = await import('../repositories/user');
    const orders = await getOrdersTodayWithTables();

    const ordersWithUser = await Promise.all(orders.map(async (o: any) => {
      const user = o.orders?.userId ? await getUserById(o.orders.userId) : null;
      return { ...o, userName: user?.name || 'Unknown' };
    }));

    const todayTotal = ordersWithUser.filter((o: any) => o.orders?.status === 'completed').reduce((sum: number, o: any) => sum + (o.orders?.total || 0), 0);

    return htmlResponse(`
      <div class="app-layout">
        ${getSidebarHtml('orders', user)}
        <div class="app-content">
          ${getNavbarHtml('Pesanan Hari Ini', 'orders', user)}
          <main class="app-main">
            <div class="card">
              ${ordersWithUser.length === 0 ? '<p class="text-center text-secondary" style="padding: 40px;">Belum ada pesanan hari ini</p>' : `
                <div class="table-container">
                  <table class="table">
                    <thead>
                      <tr><th>Meja</th><th>Pelanggan</th><th>Total</th><th>Status</th><th>Waktu</th></tr>
                    </thead>
                    <tbody>
                      ${ordersWithUser.map((o: any) => `
                        <tr>
                          <td><strong>Meja ${o.tables?.tableNumber || '-'}</strong></td>
                          <td>${o.userName}</td>
                          <td>Rp ${(o.orders?.total || 0).toLocaleString('id-ID')}</td>
                          <td><span class="badge ${o.orders?.status === 'completed' ? 'badge-success' : o.orders?.status === 'cancelled' ? 'badge-error' : 'badge-warning'}">${o.orders?.status === 'active' ? 'Aktif' : o.orders?.status === 'completed' ? 'Selesai' : 'Dibatal'}</span></td>
                          <td>${new Date(o.orders?.createdAt).toLocaleString('id-ID')}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              `}
            </div>
          </main>
          ${getFooterHtml()}
        </div>
      </div>
      ${getCommonScripts()}
    `);
  });
