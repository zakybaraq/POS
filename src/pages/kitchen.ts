import { Elysia } from 'elysia';
import { htmlResponse } from '../templates/html';
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
        <title>Dapur (KDS) - Kitchen Display System</title>
        <link rel="stylesheet" href="/styles/global.css">
        <style>
          /* KDS Full-Screen Mode - No sidebar, no navbar */
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { height: 100%; overflow: hidden; }
          body { 
            background: var(--color-bg); 
            color: var(--color-text); 
            font-family: system-ui, -apple-system, sans-serif;
          }
          .kds-fullscreen {
            display: flex;
            flex-direction: column;
            height: 100vh;
            padding: 12px;
          }
          .kds-header { 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            padding: 12px 20px; 
            background: var(--color-card); 
            border-radius: var(--radius-lg); 
            margin-bottom: 12px;
            box-shadow: var(--shadow-sm);
          }
          .kds-header-left { display: flex; align-items: center; gap: 16px; }
          .kds-header h1 { 
            font-size: 20px; 
            color: var(--color-text); 
            margin: 0; 
            display: flex; 
            align-items: center; 
            gap: 8px; 
          }
          .kds-header h1 span { color: var(--color-primary); }
          .kds-back-btn { 
            display: flex; 
            align-items: center; 
            gap: 6px; 
            padding: 8px 14px; 
            background: var(--color-bg-secondary); 
            border: 1px solid var(--color-border); 
            border-radius: var(--radius-md); 
            color: var(--color-text); 
            text-decoration: none; 
            font-size: 13px; 
            font-weight: 500;
          }
          .kds-back-btn:hover { border-color: var(--color-primary); color: var(--color-primary); }
          .kds-stats { display: flex; gap: 16px; }
          .kds-stat { 
            text-align: center; 
            padding: 8px 20px; 
            background: var(--color-bg-secondary); 
            border-radius: var(--radius-md); 
          }
          .kds-stat-value { font-size: 22px; font-weight: 700; }
          .kds-stat-label { font-size: 11px; color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.5px; }
          .kds-stat.pending .kds-stat-value { color: var(--color-warning); }
          .kds-stat.cooking .kds-stat-value { color: var(--color-error); }
          .kds-stat.ready .kds-stat-value { color: var(--color-success); }
          .kds-toolbar { 
            display: flex; 
            gap: 8px; 
            padding: 10px 20px; 
            background: var(--color-card); 
            border-radius: var(--radius-lg); 
            margin-bottom: 12px; 
            flex-wrap: wrap;
            box-shadow: var(--shadow-sm);
          }
          .kds-filter { 
            padding: 10px 18px; 
            border: 2px solid var(--color-border); 
            background: var(--color-bg); 
            color: var(--color-text); 
            border-radius: var(--radius-md); 
            cursor: pointer; 
            font-size: 14px; 
            font-weight: 600; 
            transition: all 0.2s; 
          }
          .kds-filter:hover { border-color: var(--color-primary); }
          .kds-filter.active { background: var(--color-primary); border-color: var(--color-primary); color: white; }
          .kds-refresh { 
            padding: 10px 18px; 
            background: var(--color-primary); 
            color: white; 
            border: none; 
            border-radius: var(--radius-md); 
            cursor: pointer; 
            font-size: 14px; 
            font-weight: 600; 
            margin-left: auto; 
          }
          .kds-refresh:hover { opacity: 0.9; }
          .kds-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); 
            gap: 12px; 
            flex: 1;
            overflow-y: auto;
            padding-right: 4px;
          }
          .kds-card { 
            background: var(--color-card); 
            border-radius: var(--radius-lg); 
            overflow: hidden; 
            border-left: 5px solid var(--color-border); 
            transition: all 0.3s; 
            box-shadow: var(--shadow-sm); 
            display: flex;
            flex-direction: column;
          }
          .kds-card.pending { border-left-color: var(--color-warning); }
          .kds-card.cooking { border-left-color: var(--color-error); }
          .kds-card.ready { border-left-color: var(--color-success); }
          .kds-card.overdue { animation: flash 1s infinite; }
          @keyframes flash { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
          .kds-card-header { 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            padding: 12px 16px; 
            background: var(--color-bg-secondary); 
          }
          .kds-order-id { font-size: 18px; font-weight: 700; color: var(--color-text); }
          .kds-timer { font-size: 14px; font-weight: 600; padding: 4px 10px; border-radius: var(--radius-sm); }
          .kds-timer.warning { background: rgba(245, 158, 11, 0.15); color: var(--color-warning); }
          .kds-timer.danger { background: rgba(233, 69, 96, 0.15); color: var(--color-error); }
          .kds-timer.overdue { background: rgba(255, 0, 0, 0.15); color: #ff0000; }
          .kds-card-info { 
            display: flex; 
            gap: 16px; 
            padding: 8px 16px; 
            font-size: 12px; 
            color: var(--color-text-secondary); 
            border-bottom: 1px solid var(--color-border); 
          }
          .kds-card-status { 
            padding: 8px 16px; 
            font-size: 13px; 
            font-weight: 600; 
            text-transform: uppercase; 
            letter-spacing: 1px; 
          }
          .kds-card-status.pending { background: rgba(245, 158, 11, 0.1); color: var(--color-warning); }
          .kds-card-status.cooking { background: rgba(233, 69, 96, 0.1); color: var(--color-error); }
          .kds-card-status.ready { background: rgba(92, 184, 92, 0.1); color: var(--color-success); }
          .kds-card-items { 
            padding: 12px 16px; 
            flex: 1;
          }
          .kds-item { 
            display: flex; 
            justify-content: space-between; 
            align-items: flex-start; 
            padding: 6px 0; 
            border-bottom: 1px solid var(--color-border); 
            font-size: 14px; 
          }
          .kds-item:last-child { border-bottom: none; }
          .kds-item-qty { font-weight: 700; color: var(--color-primary); min-width: 26px; }
          .kds-item-name { flex: 1; margin: 0 10px; color: var(--color-text); }
          .kds-item-notes { font-size: 12px; color: var(--color-warning); font-style: italic; }
          .kds-card-actions { 
            padding: 12px 16px; 
            display: flex; 
            gap: 8px; 
            border-top: 1px solid var(--color-border); 
          }
          .kds-btn { 
            flex: 1; 
            padding: 14px; 
            border: none; 
            border-radius: var(--radius-md); 
            font-size: 14px; 
            font-weight: 600; 
            cursor: pointer; 
            transition: all 0.2s; 
            touch-action: manipulation;
          }
          .kds-btn-start { background: var(--color-error); color: white; }
          .kds-btn-start:hover { opacity: 0.9; }
          .kds-btn-ready { background: var(--color-success); color: white; }
          .kds-btn-ready:hover { opacity: 0.9; }
          .kds-btn-serve { background: var(--color-primary); color: white; }
          .kds-btn-serve:hover { opacity: 0.9; }
          .kds-empty { 
            text-align: center; 
            padding: 60px 24px; 
            color: var(--color-text-secondary); 
            font-size: 18px; 
            grid-column: 1 / -1; 
          }
          .kds-empty-icon { font-size: 48px; margin-bottom: 12px; }
          .kds-overdue-badge { 
            display: inline-block; 
            background: #ff0000; 
            color: white; 
            padding: 3px 8px; 
            border-radius: 4px; 
            font-size: 11px; 
            font-weight: 700; 
            margin-left: 8px; 
            animation: flash 1s infinite; 
          }
          /* Scrollbar styling */
          .kds-grid::-webkit-scrollbar { width: 8px; }
          .kds-grid::-webkit-scrollbar-track { background: var(--color-bg-secondary); border-radius: 4px; }
          .kds-grid::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 4px; }
          .kds-grid::-webkit-scrollbar-thumb:hover { background: var(--color-text-secondary); }
        </style>
      </head>
      <body>
        <div class="kds-fullscreen">
          <div class="kds-header">
            <div class="kds-header-left">
              <a href="/" class="kds-back-btn">← Dashboard</a>
              <h1>🍳 <span>Dapur</span> Kitchen Display</h1>
            </div>
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
              if (o.kitchenStatus === 'pending') actionBtn = '<button class="kds-btn kds-btn-start" onclick="updateStatus(' + o.id + ',\\\'cooking\\\')">▶ Mulai Masak</button>';
              else if (o.kitchenStatus === 'cooking') actionBtn = '<button class="kds-btn kds-btn-ready" onclick="updateStatus(' + o.id + ',\\\'ready\\\')">✅ Siap Saji</button>';
              else if (o.kitchenStatus === 'ready') actionBtn = '<button class="kds-btn kds-btn-serve" onclick="updateStatus(' + o.id + ',\\\'served\\\')">🍽️ Sajikan</button>';

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
