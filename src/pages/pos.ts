import { Elysia } from 'elysia';
import { htmlResponse } from '../templates/html';
import { getSidebarHtml } from '../templates/sidebar';
import { getNavbarHtml } from '../templates/navbar';
import { getFooterHtml } from '../templates/footer';
import { getCommonScripts } from '../templates/common-scripts';
import { getTokenFromCookies, verifyToken, redirectToLogin } from '../utils/auth';

export const posPage = new Elysia()
  .get('/pos', async ({ cookie, headers }) => {
    const token = getTokenFromCookies(cookie, headers);
    if (!token) return redirectToLogin();

    let user = null;
    try {
      user = verifyToken(token);
    } catch {
      return redirectToLogin();
    }

    const posRoles = ['super_admin', 'admin_restoran', 'kasir'];
    if (!posRoles.includes(user.role)) {
      return new Response('Akses ditolak: halaman ini hanya untuk Super Admin, Admin Restoran, dan Kasir', { status: 403 });
    }

    const { getAllTables } = await import('../repositories/table');
    const { getAvailableMenus } = await import('../repositories/menu');
    const { getOrdersToday } = await import('../repositories/order');

    const tables = await getAllTables();
    const menus = await getAvailableMenus();
    const orders = await getOrdersToday();

    const todayTotal = orders.filter(o => o.status === 'completed').reduce((sum, o) => sum + (o.total || 0), 0);

    return htmlResponse(`
      <div class="app-layout">
        ${getSidebarHtml('pos', user)}
        <div class="app-content">
          ${getNavbarHtml('Point of Sale', 'pos', user)}
          <main class="app-main pos-main">
            <div class="pos-tables">
              <div class="pos-tables-header">
                <h3>Meja</h3>
                ${['super_admin', 'admin_restoran'].includes(user.role) ? `<button class="btn btn-sm btn-secondary" onclick="addTable()" title="Tambah Meja">+</button>` : ''}
              </div>
              <div class="tables-grid">
                ${tables.map(t => `<button class="table-btn ${t.status === 'available' ? 'available' : 'occupied'}" data-table-id="${t.id}" data-status="${t.status}" onclick="selectTable(${t.id}, ${t.tableNumber}, '${t.status}')">${t.tableNumber}</button>`).join('')}
              </div>
              ${tables.length === 0 ? '<p class="text-secondary text-center" style="padding: 16px;">Belum ada meja</p>' : ''}
            </div>
            <div class="pos-menu-area">
              <div class="pos-menu-header">
                <div class="category-tabs">
                  <button class="category-tab active" onclick="filterMenu('all', this)">Semua</button>
                  <button class="category-tab" onclick="filterMenu('makanan', this)">Makanan</button>
                  <button class="category-tab" onclick="filterMenu('minuman', this)">Minuman</button>
                </div>
                <div class="pos-search">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><path d="M21 21l-4.35-4.35"></path></svg>
                  <input type="text" id="menu-search" placeholder="Cari menu..." oninput="searchMenu(this.value)">
                </div>
              </div>
              <div class="menu-grid" id="menu-grid">
                ${menus.map(m => `
                  <button class="menu-item" data-category="${m.category}" data-name="${m.name.toLowerCase()}" onclick="addToCart(${m.id}, '${m.name.replace(/'/g, "\\'")}', ${m.price})">
                    <div class="menu-item-name">${m.name}</div>
                    <div class="menu-item-price">${m.price.toLocaleString('id-ID')}</div>
                  </button>
                `).join('')}
              </div>
              ${menus.length === 0 ? '<p class="text-center text-secondary" style="padding: 40px;">Menu kosong</p>' : ''}
            </div>
            <div class="pos-cart">
              <div class="cart-header">
                <h3>Cart</h3>
                <span class="cart-count" id="cart-count" style="display: none;">0</span>
              </div>
              <div class="cart-zone" id="cart-zone">
                <div class="cart-empty">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--color-text-secondary); margin-bottom: 12px;">
                    <circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                  </svg>
                  <p>Pilih meja terlebih dahulu</p>
                </div>
              </div>
            </div>
          </main>
          ${getFooterHtml()}
        </div>
      </div>
      <style>
        .pos-main { padding: 0; display: flex; height: calc(100vh - 128px); gap: 0; }
        .pos-tables { width: 140px; background: var(--color-bg-alt); padding: 16px; border-right: 1px solid var(--color-border); overflow-y: auto; flex-shrink: 0; }
        .pos-tables-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
        .pos-tables-header h3 { font-size: 14px; font-weight: 600; margin: 0; }
        .btn-sm { padding: 4px 8px; font-size: 12px; }
        .tables-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
        .table-btn { aspect-ratio: 1; border-radius: 12px; border: 2px solid transparent; cursor: pointer; font-weight: 700; font-size: 18px; transition: var(--transition); display: flex; align-items: center; justify-content: center; }
        .table-btn.available { background: var(--color-success); color: white; }
        .table-btn.occupied { background: var(--color-error); color: white; }
        .table-btn.selected { border-color: var(--color-primary); box-shadow: 0 0 0 3px var(--color-primary-30); }
        .table-btn:hover { transform: scale(1.05); }
        .pos-menu-area { flex: 1; padding: 16px; overflow-y: auto; background: var(--color-bg); }
        .pos-menu-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; gap: 16px; }
        .category-tabs { display: flex; gap: 8px; }
        .category-tab { padding: 8px 16px; border: none; background: var(--color-bg-alt); border-radius: var(--radius-md); cursor: pointer; font-weight: 500; transition: var(--transition); }
        .category-tab:hover { background: var(--color-bg-hover); }
        .category-tab.active { background: var(--color-primary); color: white; }
        .pos-search { display: flex; align-items: center; gap: 8px; background: var(--color-bg-alt); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 8px 12px; width: 200px; }
        .pos-search svg { color: var(--color-text-secondary); flex-shrink: 0; }
        .pos-search input { border: none; background: transparent; outline: none; font-size: 14px; width: 100%; }
        .menu-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; }
        .menu-item { background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 16px; cursor: pointer; transition: var(--transition); text-align: center; }
        .menu-item:hover { border-color: var(--color-primary); transform: translateY(-2px); box-shadow: var(--shadow-md); }
        .menu-item:active { transform: scale(0.98); }
        .menu-item-name { font-weight: 600; font-size: 14px; margin-bottom: 4px; color: var(--color-text); }
        .menu-item-price { color: var(--color-primary); font-weight: 700; font-size: 16px; }
        .pos-cart { width: 300px; background: var(--color-bg); border-left: 1px solid var(--color-border); padding: 16px; display: flex; flex-direction: column; flex-shrink: 0; }
        .cart-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 16px; border-bottom: 1px solid var(--color-border); margin-bottom: 16px; }
        .cart-header h3 { margin: 0; font-size: 16px; }
        .cart-count { background: var(--color-primary); color: white; font-size: 12px; font-weight: 600; padding: 2px 8px; border-radius: 12px; }
        .cart-zone { flex: 1; overflow-y: auto; }
        .cart-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; text-align: center; }
        .cart-empty p { color: var(--color-text-secondary); margin: 0; }
        .cart-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--color-border); }
        .cart-item:last-child { border-bottom: none; }
        .cart-item-info { flex: 1; }
        .cart-item-name { font-weight: 600; font-size: 14px; }
        .cart-item-qty { font-size: 12px; color: var(--color-text-secondary); }
        .cart-item-price { font-weight: 600; font-size: 14px; text-align: right; }
        .cart-item-actions { margin-left: 8px; }
        .cart-item-btn { background: none; border: none; color: var(--color-error); cursor: pointer; padding: 4px; font-size: 16px; }
        .cart-summary { border-top: 1px solid var(--color-border); padding-top: 16px; margin-top: 16px; }
        .cart-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
        .cart-row.total { font-size: 18px; font-weight: 700; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--color-border); }
        .cart-input-group { margin-top: 16px; }
        .cart-input-group label { display: block; font-weight: 600; font-size: 14px; margin-bottom: 8px; }
        .cart-input-group input { width: 100%; }
        .cart-change { font-size: 13px; color: var(--color-text-secondary); margin-top: 8px; text-align: right; }
        .cart-actions { display: flex; gap: 8px; margin-top: 16px; }
        .cart-actions .btn { flex: 1; }
        @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(0.95); } 100% { transform: scale(1); } }
        .menu-item.added { animation: pulse 0.2s ease; background: var(--color-primary-10); }
      </style>
      <script>
        let currentOrderId = null;
        let currentUserId = ${user.userId};
        let selectedTableId = null;
        let currentTableNumber = null;

        function filterMenu(category, btn) {
          document.querySelectorAll('.category-tab').forEach(tab => tab.classList.remove('active'));
          btn.classList.add('active');
          document.querySelectorAll('.menu-item').forEach(item => {
            const matchesCategory = category === 'all' || item.dataset.category === category;
            const matchesSearch = !document.getElementById('menu-search')?.value || item.dataset.name.includes(document.getElementById('menu-search').value.toLowerCase());
            item.style.display = (matchesCategory && matchesSearch) ? '' : 'none';
          });
        }

        function searchMenu(query) {
          query = query.toLowerCase();
          document.querySelectorAll('.menu-item').forEach(item => {
            const activeTab = document.querySelector('.category-tab.active');
            const category = activeTab?.textContent === 'Makanan' ? 'makanan' : activeTab?.textContent === 'Minuman' ? 'minuman' : 'all';
            const matchesCategory2 = category === 'all' || item.dataset.category === category;
            item.style.display = (!query || item.dataset.name.includes(query)) && matchesCategory2 ? '' : 'none';
          });
        }

        async function selectTable(tableId, tableNumber, status) {
          document.querySelectorAll('.table-btn').forEach(btn => btn.classList.remove('selected'));
          document.querySelector(\`[data-table-id="\${tableId}"]\`).classList.add('selected');
          selectedTableId = tableId;
          currentTableNumber = tableNumber;
          if (status === 'occupied') {
            const orderRes = await fetch('/api/orders/table/' + tableId);
            const orderData = await orderRes.json();
            if (orderData.order) { currentOrderId = orderData.order.id; renderCart(orderData.order, orderData.items); }
            return;
          }
          const createRes = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tableId: parseInt(tableId), userId: currentUserId })
          });
          const newOrder = await createRes.json();
          currentOrderId = newOrder.id;
          renderCart(newOrder, []);
        }

        async function addToCart(menuId, name, price) {
          if (!currentOrderId) { alert('Pilih meja terlebih dahulu!'); return; }
          const btn = event.target.closest('.menu-item');
          if (btn) { btn.classList.add('added'); setTimeout(() => btn.classList.remove('added'), 200); }
          const response = await fetch('/api/orders/' + currentOrderId + '/items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ menuId, quantity: 1 })
          });
          if (response.ok) { const data = await response.json(); renderCart(data.order, data.items); }
        }

        function renderCart(order, items) {
          const cartZone = document.getElementById('cart-zone');
          const cartCount = document.getElementById('cart-count');
          if (!order || !items.length) {
            cartZone.innerHTML = '<div class="cart-empty"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--color-text-secondary); margin-bottom: 12px;"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg><p>Cart kosong</p></div>';
            cartCount.style.display = 'none';
            return;
          }
          cartCount.style.display = 'inline';
          cartCount.textContent = items.length;
          let html = '<div style="display: flex; flex-direction: column; gap: 8px;">';
          items.forEach(item => {
            html += \`<div class="cart-item">
              <div class="cart-item-info">
                <div class="cart-item-name">\${item.menuName || 'Item'}</div>
                <div class="cart-item-qty">x\${item.quantity}</div>
              </div>
              <div class="cart-item-price">\${(item.priceAtOrder * item.quantity).toLocaleString('id-ID')}</div>
              <div class="cart-item-actions">
                <button class="cart-item-btn" onclick="removeItem(\${item.id})" title="Hapus">x</button>
              </div>
            </div>\`;
          });
          html += '</div>';
          const subtotal = order.subtotal || 0, tax = order.tax || 0, total = order.total || 0;
          html += \`<div class="cart-summary">
            <div class="cart-row"><span>Subtotal</span><span>\${subtotal.toLocaleString('id-ID')}</span></div>
            <div class="cart-row"><span>Pajak (10%)</span><span>\${tax.toLocaleString('id-ID')}</span></div>
            <div class="cart-row total"><span>Total</span><span>\${total.toLocaleString('id-ID')}</span></div>
          </div>\`;
          html += \`<div class="cart-input-group">
            <label>Uang Diterima</label>
            <input type="number" id="amount-paid" class="input" placeholder="0">
            <div class="cart-change">Kembalian: <span id="change-due">0</span></div>
          </div>\`;
          html += \`<div class="cart-actions">
            <button onclick="cancelOrder()" class="btn btn-danger">Batal</button>
            <button onclick="processPayment()" class="btn btn-primary">Bayar</button>
          </div>\`;
          cartZone.innerHTML = html;
          document.getElementById('amount-paid').addEventListener('input', function() {
            const paid = parseInt(this.value) || 0;
            document.getElementById('change-due').textContent = (paid - total >= 0 ? (paid - total).toLocaleString('id-ID') : 'Kurang ' + (total - paid).toLocaleString('id-ID'));
          });
        }

        async function removeItem(itemId) {
          if (!currentOrderId) return;
          await fetch('/api/orders/' + currentOrderId + '/items/' + itemId, { method: 'DELETE' });
          const response = await fetch('/api/orders/' + currentOrderId);
          const data = await response.json();
          if (data.order) renderCart(data.order, data.items);
        }

        async function processPayment() {
          const amount = parseInt(document.getElementById('amount-paid').value);
          if (!amount || amount <= 0) { alert('Masukkan jumlah uang yang dibayar!'); return; }
          const response = await fetch('/api/orders/' + currentOrderId + '/pay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amountPaid: amount })
          });
          const data = await response.json();
          if (data.error) { alert(data.error); }
          else { alert('Pembayaran berhasil!\\n\\n' + data.receipt); currentOrderId = null; document.getElementById('cart-zone').innerHTML = '<div class="cart-empty"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--color-text-secondary); margin-bottom: 12px;"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg><p>Pilih meja terlebih dahulu</p></div>'; location.reload(); }
        }

        async function cancelOrder() {
          if (!currentOrderId || !confirm('Batalkan pesanan?')) return;
          await fetch('/api/orders/' + currentOrderId + '/cancel', { method: 'POST' });
          currentOrderId = null;
          document.getElementById('cart-zone').innerHTML = '<div class="cart-empty"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--color-text-secondary); margin-bottom: 12px;"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg><p>Pilih meja terlebih dahulu</p></div>';
          location.reload();
        }

        async function addTable() {
          const num = parseInt(prompt('Nomor Meja:'));
          if (!num) return;
          await fetch('/api/tables', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tableNumber: num }) });
          location.reload();
        }
      </script>
      ${getCommonScripts()}
    `);
  });
