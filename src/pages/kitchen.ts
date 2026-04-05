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
        <title>Dapur Kitchen Display</title>
        <link rel="stylesheet" href="/styles/global.css">
        <style>
          /* KDS Full-Screen Mode - Clean & Simple */
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
            padding: 16px;
            gap: 12px;
          }
          
          /* Header */
          .kds-header { 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            padding: 16px 24px; 
            background: var(--color-card); 
            border-radius: var(--radius-lg); 
            box-shadow: var(--shadow-sm);
            border: 1px solid var(--color-border);
          }
          .kds-header-left { display: flex; align-items: center; gap: 16px; }
          .kds-header h1 { 
            font-size: 20px; 
            font-weight: 700;
            color: var(--color-text); 
          }
          
          /* Back Button */
          .kds-back-btn { 
            padding: 8px 16px; 
            background: var(--color-bg-secondary); 
            border: 1px solid var(--color-border); 
            border-radius: var(--radius-md); 
            color: var(--color-text); 
            text-decoration: none; 
            font-size: 13px; 
            font-weight: 500;
            transition: all 0.2s;
          }
          .kds-back-btn:hover { 
            background: var(--color-primary); 
            color: white;
            border-color: var(--color-primary);
          }
          
          /* Stats */
          .kds-stats { display: flex; gap: 12px; }
          .kds-stat { 
            text-align: center; 
            padding: 8px 20px; 
            background: var(--color-bg-secondary); 
            border-radius: var(--radius-md);
            min-width: 100px;
          }
          .kds-stat-value { font-size: 24px; font-weight: 700; }
          .kds-stat-label { font-size: 12px; color: var(--color-text-secondary); font-weight: 500; }
          
          /* Status colors */
          .kds-stat.pending .kds-stat-value { color: var(--color-warning); }
          .kds-stat.cooking .kds-stat-value { color: var(--color-error); }
          .kds-stat.ready .kds-stat-value { color: var(--color-success); }
          
          /* Toolbar */
          .kds-toolbar { 
            display: flex; 
            gap: 8px; 
            padding: 12px 20px; 
            background: var(--color-card); 
            border-radius: var(--radius-lg); 
            border: 1px solid var(--color-border);
            box-shadow: var(--shadow-sm);
          }
          
          /* Filter Buttons */
          .kds-filter { 
            padding: 10px 20px; 
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
          .kds-filter.active { 
            background: var(--color-primary); 
            border-color: var(--color-primary); 
            color: white; 
          }
          
          /* Refresh Button */
          .kds-refresh { 
            padding: 10px 20px; 
            background: var(--color-primary); 
            color: white; 
            border: none; 
            border-radius: var(--radius-md); 
            cursor: pointer; 
            font-size: 14px; 
            font-weight: 600; 
            margin-left: auto;
            transition: all 0.2s;
          }
          .kds-refresh:hover { opacity: 0.9; }
          
          /* List View - Lebih compact dan responsive */
          .kds-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
            flex: 1;
            overflow-y: auto;
            padding-right: 4px;
          }

          .kds-list-item {
            display: grid;
            grid-template-columns: 60px 80px 80px 1fr 130px;
            align-items: center;
            gap: 12px;
            padding: 14px 16px;
            background: var(--color-card);
            border: 1px solid var(--color-border);
            border-radius: var(--radius-md);
            border-left: 4px solid var(--color-border);
            transition: all 0.2s;
          }

          .kds-list-item.pending { border-left-color: var(--color-warning); }
          .kds-list-item.cooking { border-left-color: var(--color-error); }
          .kds-list-item.ready { border-left-color: var(--color-success); }
          .kds-list-item.overdue { 
            border-left-color: var(--color-error); 
            animation: flash 1s infinite; 
          }

          .kds-col-id { font-size: 16px; font-weight: 700; }
          .kds-col-timer { font-size: 14px; font-weight: 600; }
          .kds-col-timer.warning { color: var(--color-warning); }
          .kds-col-timer.danger { color: var(--color-error); }
          .kds-col-timer.overdue { color: var(--color-error); font-weight: 700; }

          .kds-col-table { font-size: 13px; color: var(--color-text-secondary); }

          .kds-col-status { 
            font-size: 11px; 
            font-weight: 700; 
            padding: 4px 10px;
            border-radius: 4px;
            text-align: center;
          }
          .kds-col-status.pending { background: rgba(245, 158, 11, 0.15); color: var(--color-warning); }
          .kds-col-status.cooking { background: rgba(239, 68, 68, 0.15); color: var(--color-error); }
          .kds-col-status.ready { background: rgba(34, 197, 94, 0.15); color: var(--color-success); }

          .kds-col-items { font-size: 13px; line-height: 1.5; }
          .kds-col-items span { display: block; }
          .kds-item-note { font-size: 11px; color: var(--color-warning); font-style: italic; }

          .kds-col-action { 
            display: flex; 
            justify-content: flex-end;
          }

          .kds-btn { 
            padding: 10px 20px; 
            border: none; 
            border-radius: var(--radius-md); 
            font-size: 13px; 
            font-weight: 600; 
            cursor: pointer; 
            transition: all 0.2s;
            white-space: nowrap;
          }
          .kds-btn-start { background: var(--color-error); color: white; }
          .kds-btn-ready { background: var(--color-success); color: white; }
          .kds-btn-serve { background: var(--color-primary); color: white; }

          .kds-list-empty {
            text-align: center;
            padding: 40px;
            color: var(--color-text-secondary);
            font-size: 16px;
          }
          
          .kds-list::-webkit-scrollbar { width: 8px; }
          .kds-list::-webkit-scrollbar-track { background: var(--color-bg-secondary); border-radius: 4px; }
          .kds-list::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 4px; }
          .kds-list::-webkit-scrollbar-thumb:hover { background: var(--color-text-secondary); }
          
          .kds-pagination {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 8px;
            padding: 12px;
            background: var(--color-card);
            border-radius: var(--radius-md);
            border: 1px solid var(--color-border);
          }
          .kds-page-btn {
            padding: 8px 12px;
            background: var(--color-bg);
            border: 1px solid var(--color-border);
            border-radius: var(--radius-md);
            color: var(--color-text);
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            transition: all 0.2s;
          }
          .kds-page-btn:hover:not(:disabled) {
            background: var(--color-primary);
            color: white;
            border-color: var(--color-primary);
          }
          .kds-page-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
          .kds-page-btn.active {
            background: var(--color-primary);
            color: white;
            border-color: var(--color-primary);
          }
          .kds-page-info {
            font-size: 13px;
            color: var(--color-text-secondary);
            padding: 0 8px;
          }
        </style>
      </head>
      <body>
        <div class="kds-fullscreen">
          <div class="kds-header">
            <div class="kds-header-left">
              <a href="/" class="kds-back-btn">Dashboard</a>
              <h1>Dapur Kitchen Display</h1>
            </div>
            <div class="kds-stats">
              <div class="kds-stat pending">
                <div class="kds-stat-value" id="stat-pending">0</div>
                <div class="kds-stat-label">Pending</div>
              </div>
              <div class="kds-stat cooking">
                <div class="kds-stat-value" id="stat-cooking">0</div>
                <div class="kds-stat-label">Cooking</div>
              </div>
              <div class="kds-stat ready">
                <div class="kds-stat-value" id="stat-ready">0</div>
                <div class="kds-stat-label">Ready</div>
              </div>
            </div>
          </div>
          <div class="kds-toolbar">
            <button class="kds-filter active" data-filter="all" onclick="setFilter('all')">Semua</button>
            <button class="kds-filter" data-filter="makanan" onclick="setFilter('makanan')">Makanan</button>
            <button class="kds-filter" data-filter="minuman" onclick="setFilter('minuman')">Minuman</button>
            <button class="kds-refresh" onclick="loadOrders()">Refresh</button>
          </div>
          <div class="kds-list" id="kds-list">
            <div class="kds-list-empty">Loading pesanan...</div>
          </div>
          <div class="kds-pagination" id="kds-pagination"></div>
        </div>
        <script>
          let currentFilter = 'all';
          let ordersData = [];
          let refreshInterval;
          let currentPage = 1;
          const itemsPerPage = 10;

          function renderOrders() {
            const list = document.getElementById('kds-list');
            const pagination = document.getElementById('kds-pagination');
            let filtered = ordersData;
            if (currentFilter !== 'all') {
              filtered = ordersData.filter(o => o._category === currentFilter || !o._category);
            }
            if (!filtered || !filtered.length) {
              list.innerHTML = '<div class="kds-list-empty">Tidak ada pesanan aktif</div>';
              pagination.innerHTML = '';
              return;
            }
            
            const totalPages = Math.ceil(filtered.length / itemsPerPage);
            const startIdx = (currentPage - 1) * itemsPerPage;
            const endIdx = startIdx + itemsPerPage;
            const pageItems = filtered.slice(startIdx, endIdx);
            
            list.innerHTML = pageItems.map(o => {
              const mins = Math.floor((Date.now() - new Date(o.createdAt).getTime()) / 60000);
              let timerClass = '';
              if (mins > 35) timerClass = 'overdue';
              else if (mins > 25) timerClass = 'danger';
              else if (mins > 15) timerClass = 'warning';
              
              let actionBtn = '';
              if (o.kitchenStatus === 'pending') {
                actionBtn = '<button class="kds-btn kds-btn-start" onclick="updateStatus(' + o.id + ',&quot;cooking&quot;)">Mulai Masak</button>';
              } else if (o.kitchenStatus === 'cooking') {
                actionBtn = '<button class="kds-btn kds-btn-ready" onclick="updateStatus(' + o.id + ',&quot;ready&quot;)">Siap Saji</button>';
              } else if (o.kitchenStatus === 'ready') {
                actionBtn = '<button class="kds-btn kds-btn-serve" onclick="updateStatus(' + o.id + ',&quot;served&quot;)">Sajikan</button>';
              }
              
              let itemsHtml = (o._items || []).map(item => 
                '<span>' + item.quantity + 'x ' + item.menuName + (item.notes ? ' <em class="kds-item-note">(' + item.notes + ')</em>' : '') + '</span>'
              ).join('');
              
              return '<div class="kds-list-item ' + o.kitchenStatus + (mins > 25 ? ' overdue' : '') + '">' +
                '<div class="kds-col-id">#' + o.id + '</div>' +
                '<div class="kds-col-timer ' + timerClass + '">' + mins + ' menit</div>' +
                '<div class="kds-col-table">Meja ' + (o.tableNumber || '-') + '</div>' +
                '<div class="kds-col-items">' + itemsHtml + '</div>' +
                '<div class="kds-col-action">' + actionBtn + '</div>' +
              '</div>';
            }).join('');
            
            let paginationHtml = '';
            paginationHtml += '<button class="kds-page-btn" onclick="goToPage(' + (currentPage - 1) + ')" ' + (currentPage === 1 ? 'disabled' : '') + '>Prev</button>';
            for (let i = 1; i <= totalPages; i++) {
              paginationHtml += '<button class="kds-page-btn ' + (i === currentPage ? 'active' : '') + '" onclick="goToPage(' + i + ')">' + i + '</button>';
            }
            paginationHtml += '<button class="kds-page-btn" onclick="goToPage(' + (currentPage + 1) + ')" ' + (currentPage === totalPages ? 'disabled' : '') + '>Next</button>';
            paginationHtml += '<span class="kds-page-info">Halaman ' + currentPage + ' dari ' + totalPages + ' (' + filtered.length + ' pesanan)</span>';
            pagination.innerHTML = paginationHtml;
          }

          function goToPage(page) {
            const filtered = currentFilter !== 'all' ? ordersData.filter(o => o._category === currentFilter || !o._category) : ordersData;
            const totalPages = Math.ceil(filtered.length / itemsPerPage);
            if (page < 1 || page > totalPages) return;
            currentPage = page;
            renderOrders();
          }

          async function updateStatus(id, status) {
            await fetch('/api/kitchen/orders/' + id + '/status', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
            loadOrders();
          }

          function setFilter(filter) {
            currentFilter = filter;
            currentPage = 1;
            document.querySelectorAll('.kds-filter').forEach(b => b.classList.remove('active'));
            document.querySelector('[data-filter="' + filter + '"]').classList.add('active');
            renderOrders();
          }

          let loadTimeout;
          
          async function loadOrders() {
            try {
              const res = await fetch('/api/kitchen/orders');
              if (!res.ok) {
                const text = await res.text();
                console.error('Failed to load orders, status:', res.status, 'text:', text);
                document.getElementById('kds-list').innerHTML = '<div class="kds-list-empty">Gagal memuat pesanan: ' + res.status + ' - ' + text + '</div>';
                return;
              }
              const data = await res.json();
              ordersData = Array.isArray(data) ? data : [];
              
              if (loadTimeout) clearTimeout(loadTimeout);
              
              renderOrders();
              loadStats();
              preloadItems();
            } catch (e) { 
              console.error('Failed to load orders:', e); 
              document.getElementById('kds-list').innerHTML = '<div class="kds-list-empty">Gagal memuat pesanan: ' + e.message + '</div>';
            }
          }

          loadTimeout = setTimeout(() => {
            if (!ordersData || ordersData.length === 0) {
              document.getElementById('kds-list').innerHTML = '<div class="kds-list-empty">Tidak ada pesanan aktif</div>';
            }
          }, 10000);

          async function loadStats() {
            const pending = ordersData.filter(o => o.kitchenStatus === 'pending').length;
            const cooking = ordersData.filter(o => o.kitchenStatus === 'cooking').length;
            const ready = ordersData.filter(o => o.kitchenStatus === 'ready').length;
            document.getElementById('stat-pending').textContent = pending;
            document.getElementById('stat-cooking').textContent = cooking;
            document.getElementById('stat-ready').textContent = ready;
          }

          async function loadItems(orderId) {
            try {
              const res = await fetch('/api/kitchen/orders/' + orderId + '/items');
              if (!res.ok) return [];
              return await res.json();
            } catch (e) { 
              console.error('Failed to load items for order', orderId, e); 
              return []; 
            }
          }

          async function preloadItems() {
            if (!ordersData || !ordersData.length) {
              renderOrders();
              return;
            }
            for (const o of ordersData) {
              if (!o._items) {
                o._items = await loadItems(o.id);
                if (o._items && o._items.length) {
                  o._category = o._items[0].category;
                }
              }
            }
            currentPage = 1;
            renderOrders();
          }

          loadOrders();
          refreshInterval = setInterval(loadOrders, 5000);
        </script>
      </body>
      </html>
    `);
  });
