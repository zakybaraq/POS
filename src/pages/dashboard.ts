import { Elysia } from 'elysia';
import { htmlResponse } from '../templates/html';
import { getSidebarHtml } from '../templates/sidebar';
import { getNavbarHtml } from '../templates/navbar';
import { getFooterHtml } from '../templates/footer';
import { getCommonScripts } from '../templates/common-scripts';
import { getTokenFromCookies, verifyToken, redirectToLogin } from '../utils/auth';

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

    return htmlResponse(`
      <div class="app-layout">
        ${getSidebarHtml('dashboard', user)}
        <div class="app-content">
          ${getNavbarHtml('Dashboard', 'dashboard', user)}
          <main class="app-main">
            <div class="stats-grid">
              <div class="stats-card">
                <div class="stats-label">Total Penjualan</div>
                <div class="stats-value">Rp 0</div>
                <div class="stats-change">Hari ini</div>
              </div>
              <div class="stats-card">
                <div class="stats-label">Total Pesanan</div>
                <div class="stats-value">0</div>
                <div class="stats-change">Hari ini</div>
              </div>
              <div class="stats-card">
                <div class="stats-label">Meja Terpakai</div>
                <div class="stats-value">0</div>
                <div class="stats-change">Dari 0 total</div>
              </div>
              <div class="stats-card">
                <div class="stats-label">Menu Tersedia</div>
                <div class="stats-value">0</div>
                <div class="stats-change">Total menu</div>
              </div>
            </div>
            <div class="card">
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
