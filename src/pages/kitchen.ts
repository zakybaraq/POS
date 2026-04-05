import { Elysia } from 'elysia';
import { htmlResponse } from '../templates/html';
import { getSidebarHtml } from '../templates/sidebar';
import { getNavbarHtml } from '../templates/navbar';
import { getFooterHtml } from '../templates/footer';
import { getCommonScripts } from '../templates/common-scripts';
import { getTokenFromCookies, verifyToken, redirectToLogin } from '../utils/auth';

export const kitchenPage = new Elysia()
  .get('/kitchen', async ({ cookie, headers }) => {
    const token = getTokenFromCookies(cookie, headers);
    if (!token) return redirectToLogin();
    let user = null;
    try {
      user = verifyToken(token);
      if (!user.name) {
        const { getUserById } = await import('../repositories/user');
        const dbUser = await getUserById(user.userId);
        if (dbUser) user.name = dbUser.name;
      }
    } catch { return redirectToLogin(); }
    if (!['super_admin', 'admin_restoran', 'chef'].includes(user.role)) return new Response('Akses ditolak', { status: 403 });

    return htmlResponse(`
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Kitchen Display System</title>
        <link rel="stylesheet" href="/styles/global.css">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { background: #1a1a2e; color: #eee; font-family: system-ui, sans-serif; min-height: 100vh; }
          .kds-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 24px; background: #16213e; border-bottom: 2px solid #0f3460; }
          .kds-header h1 { font-size: 24px; color: #e94560; }
          .kds-stats { display: flex; gap: 24px; }
          .kds-stat { text-align: center; }
          .kds-stat-value { font-size: 28px; font-weight: 700; }
          .kds-stat-label { font-size: 12px; color: #888; text-transform: uppercase; }
          .kds-stat.pending .kds-stat-value { color: #f0ad4e; }
          .kds-stat.cooking .kds-stat-value { color: #e94560; }
          .kds-stat.ready .kds-stat-value { color: #5cb85c; }
          .kds-toolbar { display: flex; gap: 8px; padding: 12px 24px; background: #16213e; border-bottom: 1px solid #0f3460; }
          .kds-filter { padding: 8px 20px; border: 1px solid #0f3460; background: #1a1a2e; color: #eee; border-radius: 6px; cursor: pointer; font-size: 14px; }
          .kds-filter.active { background: #e94560; border-color: #e94560; }
          .kds-refresh { padding: 8px 20px; background: #0f3460; color: #eee; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; margin-left: auto; }
          .kds-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; padding: 24px; }
          .kds-card { background: #16213e; border-radius: 12px; overflow: hidden; border-left: 6px solid; transition: all 0.3s; }
          .kds-card.pending { border-left-color: #f0ad4e; }
          .kds-card.cooking { border-left-color: #e94560; }
          .kds-card.ready { border-left-color: #5cb85c; }
          .kds-card.overdue { animation: flash 1s infinite; }
          @keyframes flash { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
          .kds-card-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: rgba(0,0,0,0.2); }
          .kds-order-id { font-size: 20px; font-weight: 700; }
          .kds-timer { font-size: 16px; font-weight: 600; }
          .kds-timer.warning { color: #f0ad4e; }
          .kds-timer.danger { color: #e94560; }
          .kds-timer.overdue { color: #ff0000; }
          .kds-card-info { display: flex; gap: 16px; padding: 8px 16px; font-size: 13px; color: #888; }
          .kds-card-status { padding: 8px 16px; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
          .kds-card-status.pending { background: rgba(240,173,78,0.2); color: #f0ad4e; }
          .kds-card-status.cooking { background: rgba(233,69,96,0.2); color: #e94560; }
          .kds-card-status.ready { background: rgba(92,184,92,0.2); color: #5cb85c; }
          .kds-card-items { padding: 12px 16px; }
          .kds-item { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 15px; }
          .kds-item:last-child { border-bottom: none; }
          .kds-item-qty { font-weight: 700; color: #e94560; min-width: 30px; }
          .kds-item-name { flex: 1; margin: 0 8px; }
          .kds-item-notes { font-size: 12px; color: #f0ad4e; font-style: italic; }
          .kds-card-actions { padding: 12px 16px; display: flex; gap: 8px; }
          .kds-btn { flex: 1; padding: 12px; border: none; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
          .kds-btn-start { background: #e94560; color: white; }
          .kds-btn-start:hover { background: #c73a52; }
          .kds-btn-ready { background: #5cb85c; color: white; }
          .kds-btn-ready:hover { background: #4cae4c; }
          .kds-btn-serve { background: #0f3460; color: white; }
          .kds-btn-serve:hover { background: #1a4a7a; }
          .kds-empty { text-align: center; padding: 80px 24px; color: #888; font-size: 20px; grid-column: 1 / -1; }
          .kds-empty-icon { font-size: 60px; margin-bottom: 16px; }
          .kds-overdue-badge { display: inline-block; background: #ff0000; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; margin-left: 8px; animation: flash 1s infinite; }
        </style>
      </head>
      <body>
        <div class="kds-header">
          <h1>🍳 Kitchen Display System</h1>
          <div class="kds-stats">
            <div class="kds-stat pending"><div class="kds-stat-value" id="stat-pending">0</div><div class="kds-stat-label">Pending</div></div>
            <div class="kds-stat cooking"><div class="kds-stat-value" id="stat-cooking">0</div><div class="kds-stat-label">Cooking</div></div>
            <div class="kds-stat ready"><div class="kds-stat-value" id="stat-ready">0</div><div class="kds-stat-label">Ready</div></div>
          </div>
        </div>
        <div class="kds-toolbar">
          <button class="kds-filter active" data-filter="all" onclick="setFilter('all')">Semua</button>
          <button class="kds-filter" data-filter="makanan" onclick="setFilter('makanan')">🍔 Makanan</button>
          <button class="kds-filter" data-filter="minuman" onclick="setFilter('minuman')">🥤 Minuman</button>
          <button class="kds-refresh" onclick="loadOrders()">🔄 Refresh</button>
        </div>
        <div class="kds-grid" id="kds-grid">
          <div class="kds-empty"><div class="kds-empty-icon">⏳</div>Loading pesanan...</div>
        </div>
        <script>
          let currentFilter = 'all';
          let ordersData = [];
          let refreshInterval;

          function setFilter(filter) {
            currentFilter = filter;
            document.querySelectorAll('.kds-filter').forEach(b => b.classList.remove('active'));
            document.querySelector('[data-filter="' + filter + '"]').classList.add('active');
            renderOrders();
          }

          async function loadOrders() {
            try {
              const res = await fetch('/api/kitchen/orders');
              ordersData = await res.json();
              if (!ordersData) ordersData = [];
              renderOrders();
              loadStats();
            } catch (e) { console.error('Failed to load orders:', e); }
          }

          async function loadStats() {
            try {
              const res = await fetch('/api/kitchen/stats');
              const stats = await res.json();
              if (stats) {
                document.getElementById('stat-pending').textContent = stats.pendingOrders || 0;
                document.getElementById('stat-cooking').textContent = stats.cookingOrders || 0;
                document.getElementById('stat-ready').textContent = stats.readyOrders || 0;
              }
            } catch (e) {}
          }

          async function loadItems(orderId) {
            try {
              const res = await fetch('/api/kitchen/orders/' + orderId + '/items');
              return await res.json();
            } catch (e) { return []; }
          }

          function getTimerMinutes(createdAt) {
            return Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
          }

          function renderOrders() {
            const grid = document.getElementById('kds-grid');
            let filtered = ordersData;
            if (currentFilter !== 'all') {
              filtered = ordersData.filter(o => o._category === currentFilter || !o._category);
            }
            if (!filtered || !filtered.length) {
              grid.innerHTML = '<div class="kds-empty"><div class="kds-empty-icon">✅</div>Tidak ada pesanan aktif</div>';
              return;
            }
            grid.innerHTML = filtered.map(o => {
              const mins = getTimerMinutes(o.createdAt);
              let timerClass = '';
              let overdueBadge = '';
              if (mins > 35) { timerClass = 'overdue'; overdueBadge = '<span class="kds-overdue-badge">OVERDUE!</span>'; }
              else if (mins > 25) timerClass = 'danger';
              else if (mins > 15) timerClass = 'warning';

              let statusLabel = {pending:'🟡 PENDING',cooking:'🔴 COOKING',ready:'🟢 READY'}[o.kitchenStatus]||o.kitchenStatus;
              let actionBtn = '';
              if (o.kitchenStatus === 'pending') actionBtn = '<button class="kds-btn kds-btn-start" onclick="updateStatus(' + o.id + ',\'cooking\')">▶ Mulai Masak</button>';
              else if (o.kitchenStatus === 'cooking') actionBtn = '<button class="kds-btn kds-btn-ready" onclick="updateStatus(' + o.id + ',\'ready\')">✅ Siap Saji</button>';
              else if (o.kitchenStatus === 'ready') actionBtn = '<button class="kds-btn kds-btn-serve" onclick="updateStatus(' + o.id + ',\'served\')">🍽️ Sajikan</button>';

              let itemsHtml = (o._items || []).map(item => '<div class="kds-item"><span class="kds-item-qty">' + item.quantity + 'x</span><span class="kds-item-name">' + item.menuName + '</span>' + (item.notes ? '<span class="kds-item-notes">(' + item.notes + ')</span>' : '') + '</div>').join('');

              return '<div class="kds-card ' + o.kitchenStatus + (mins > 25 ? ' overdue' : '') + '">' +
                '<div class="kds-card-header"><span class="kds-order-id">#' + o.id + overdueBadge + '</span><span class="kds-timer ' + timerClass + '">⏱️ ' + mins + ' min</span></div>' +
                '<div class="kds-card-info"><span>Meja ' + (o.tableNumber || '-') + '</span><span>' + new Date(o.createdAt).toLocaleTimeString('id-ID', {hour:'2-digit',minute:'2-digit'}) + '</span><span>' + (o.servedBy || '') + '</span></div>' +
                '<div class="kds-card-status ' + o.kitchenStatus + '">' + statusLabel + '</div>' +
                '<div class="kds-card-items">' + itemsHtml + '</div>' +
                '<div class="kds-card-actions">' + actionBtn + '</div></div>';
            }).join('');
          }

          async function updateStatus(id, status) {
            await fetch('/api/kitchen/orders/' + id + '/status', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
            loadOrders();
          }

          async function preloadItems() {
            for (const o of ordersData) {
              if (!o._items) {
                o._items = await loadItems(o.id);
                if (o._items && o._items.length) {
                  o._category = o._items[0].category;
                }
              }
            }
            renderOrders();
          }

          loadOrders().then(() => preloadItems());
          refreshInterval = setInterval(() => { loadOrders().then(() => preloadItems()); }, 5000);
        </script>
      </body>
      </html>
    `);
  });
