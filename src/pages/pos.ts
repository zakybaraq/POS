import { Elysia } from 'elysia';
import { htmlResponse } from '../templates/html';
import { getSidebarHtml } from '../templates/sidebar';
import { getNavbarHtml } from '../templates/navbar';
import { getFooterHtml } from '../templates/footer';
import { getCommonScripts } from '../templates/common-scripts';
import { getTokenFromCookies, verifyToken, redirectToLogin } from '../utils/auth';

const MENU_EMOJI: Record<string, string[]> = {
  makanan: ['🍛', '🍜', '🍗', '🍚', '🥘', '🍲', '🥩', '🍖', '🌮', '🍔'],
  minuman: ['🥤', '🧃', '☕', '🍵', '🥛', '🧊', '🍹', '🥝', '🍋', '🫖'],
};

function getMenuEmoji(category: string, index: number) {
  const list = MENU_EMOJI[category] ?? ['🍽️'];
  return list[index % list.length];
}

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

    const tables = await getAllTables();
    const menus = await getAvailableMenus();

    return htmlResponse(`
      <div class="app-layout">
        ${getSidebarHtml('pos', user)}
        <div class="app-content">
          ${getNavbarHtml('Point of Sale', 'pos', user)}
          <main class="app-main pos-main">
            <div class="pos-left">
              <div class="pos-panels">
                <div class="pos-tables-panel">
                  <div class="panel-header">
                    <h3>Meja</h3>
                    ${['super_admin', 'admin_restoran'].includes(user.role) ? `<button class="btn-icon" onclick="addTable()" title="Tambah Meja">+</button>` : ''}
                  </div>
                  <div class="tables-grid">
                    ${tables.map(t => `<button class="table-btn ${t.status === 'available' ? 'available' : 'occupied'}" data-table-id="${t.id}" data-status="${t.status}" onclick="selectTable(${t.id}, ${t.tableNumber}, '${t.status}')">${t.tableNumber}</button>`).join('')}
                  </div>
                  ${tables.length === 0 ? '<p class="text-muted text-center" style="padding: 16px;">Belum ada meja</p>' : ''}
                  <div class="table-legend">
                    <span class="legend-item"><span class="legend-dot available"></span> Tersedia</span>
                    <span class="legend-item"><span class="legend-dot occupied"></span> Terisi</span>
                    <span class="legend-item"><span class="legend-dot selected"></span> Dipilih</span>
                  </div>
                </div>

                <div class="pos-menu-panel">
                  <div class="pos-menu-header">
                    <div class="category-tabs">
                      <button class="category-tab active" onclick="filterMenu('all', this)">🍽️ Semua</button>
                      <button class="category-tab" onclick="filterMenu('makanan', this)">🍛 Makanan</button>
                      <button class="category-tab" onclick="filterMenu('minuman', this)">🥤 Minuman</button>
                    </div>
                    <div class="pos-search">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><path d="M21 21l-4.35-4.35"></path></svg>
                      <input type="text" id="menu-search" placeholder="Cari menu... (Ctrl+F)" oninput="searchMenu(this.value)">
                    </div>
                  </div>
                  <div class="menu-grid" id="menu-grid">
                    ${menus.map((m, i) => `
                      <button class="menu-card" data-category="${m.category}" data-name="${m.name.toLowerCase()}" onclick="addToCart(${m.id}, '${m.name.replace(/'/g, "\\'")}', ${m.price})">
                        <div class="menu-card-emoji">${getMenuEmoji(m.category, i)}</div>
                        <div class="menu-card-name">${m.name}</div>
                        <div class="menu-card-price">${m.price.toLocaleString('id-ID')}</div>
                      </button>
                    `).join('')}
                  </div>
                  ${menus.length === 0 ? '<p class="text-muted text-center" style="padding: 40px;">Menu kosong</p>' : ''}
                </div>
              </div>
            </div>

            <div class="pos-right">
              <div class="cart-panel">
                <div class="cart-header">
                  <div class="cart-title">
                    <span id="cart-table-info">Pilih Meja</span>
                    <span id="cart-order-type" class="badge badge-primary" style="display: none;">Dine-in</span>
                  </div>
                  <div class="cart-actions-header">
                    <button class="btn-icon" onclick="showHeldOrdersModal()" title="Recall">📋 <span id="held-count" style="display: none;">0</span></button>
                    <button class="btn-icon" onclick="showTransferModal()" title="Transfer Meja" id="btn-transfer" style="display: none;">↔️</button>
                  </div>
                </div>

                <div class="cart-meta" id="cart-meta" style="display: none;">
                  <div class="meta-row">
                    <label>Tamu</label>
                    <input type="number" id="guest-count" class="meta-input" value="1" min="1" max="20" onchange="updateGuestCount(this.value)">
                  </div>
                  <div class="meta-row">
                    <label>Tipe</label>
                    <select id="order-type" class="meta-input" onchange="updateOrderType(this.value)">
                      <option value="dine-in">Dine-in</option>
                      <option value="takeaway">Takeaway</option>
                    </select>
                  </div>
                </div>

                <div class="cart-zone" id="cart-zone">
                  <div class="cart-empty">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--color-text-secondary); margin-bottom: 12px;">
                      <circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                    </svg>
                    <p>Pilih meja terlebih dahulu</p>
                  </div>
                </div>

                <div class="cart-footer" id="cart-footer" style="display: none;">
                  <div class="cart-summary">
                    <div class="cart-row"><span>Subtotal</span><span id="summary-subtotal">0</span></div>
                    <div class="cart-row"><span>Pajak (10%)</span><span id="summary-tax">0</span></div>
                    <div class="cart-discount-row">
                      <input type="number" id="discount-amount" class="discount-input" placeholder="Diskon" value="0" onchange="renderCartFromLocal()">
                      <select id="discount-type" class="discount-select" onchange="renderCartFromLocal()">
                        <option value="fixed">Rp</option>
                        <option value="percentage">%</option>
                      </select>
                    </div>
                    <div class="cart-row total"><span>TOTAL</span><span id="summary-total">0</span></div>
                  </div>

                  <div class="payment-section" id="payment-section" style="display: none;">
                    <div style="margin-bottom: 6px;">
                      <input type="number" id="amount-paid-input" class="discount-input" placeholder="Masukkan nominal..." oninput="updatePaidAmount(this.value)" style="width: 100%; padding: 8px 12px; font-size: 14px; font-weight: 600;">
                    </div>
                    <div class="cart-row"><span>Bayar</span><span id="summary-paid">0</span></div>
                    <div class="cart-row"><span>Kembali</span><span id="summary-change" style="color: var(--color-success);">0</span></div>
                    <div class="quick-pay-buttons">
                      <button class="quick-pay-btn" onclick="setQuickPayment('exact')">Uang Pas</button>
                      <button class="quick-pay-btn" onclick="setQuickPayment(50000)">50K</button>
                      <button class="quick-pay-btn" onclick="setQuickPayment(100000)">100K</button>
                      <button class="quick-pay-btn" onclick="setQuickPayment(200000)">200K</button>
                    </div>
                    <button class="btn btn-primary" style="width: 100%; margin-top: 8px;" onclick="processPaymentManual()">💳 Bayar Sekarang</button>
                  </div>

                  <div class="cart-buttons">
                    <button class="btn btn-secondary btn-hold" onclick="holdOrder()">📋 Hold</button>
                    <button class="btn btn-primary btn-pay" onclick="showPayment()">💳 Bayar</button>
                    <button class="btn btn-danger btn-cancel" onclick="cancelOrder()">↩️ Batal</button>
                  </div>
                </div>
              </div>
            </div>
          </main>
          ${getFooterHtml()}
        </div>
      </div>

      <div id="toast-container" class="toast-container"></div>

      <div class="modal" id="held-orders-modal">
        <div class="modal-backdrop" onclick="closeHeldOrdersModal()"></div>
        <div class="modal-content" style="max-width: 500px;">
          <div class="modal-header">
            <h3>Pesanan Ditahan (Hold)</h3>
            <button class="modal-close" onclick="closeHeldOrdersModal()">&times;</button>
          </div>
          <div class="modal-body" id="held-orders-list"></div>
        </div>
      </div>

      <div class="modal" id="transfer-modal">
        <div class="modal-backdrop" onclick="closeTransferModal()"></div>
        <div class="modal-content" style="max-width: 400px;">
          <div class="modal-header">
            <h3>Transfer Meja</h3>
            <button class="modal-close" onclick="closeTransferModal()">&times;</button>
          </div>
          <div class="modal-body">
            <p style="margin-bottom: 16px; color: var(--color-text-secondary);">Pindah pesanan dari Meja <strong id="transfer-from"></strong> ke:</p>
            <div id="transfer-tables" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;"></div>
          </div>
        </div>
      </div>

      <div class="modal" id="receipt-modal">
        <div class="modal-backdrop" onclick="closeReceiptModal()"></div>
        <div class="modal-content" style="max-width: 380px;">
          <div class="modal-header">
            <h3>Struk Pembayaran</h3>
            <button class="modal-close" onclick="closeReceiptModal()">&times;</button>
          </div>
          <div class="modal-body">
            <div id="receipt-content" style="font-family: monospace; font-size: 13px; background: var(--color-bg-alt); padding: 20px; border-radius: var(--radius-md);"></div>
          </div>
          <div class="modal-footer">
            <button onclick="printReceipt()" class="btn btn-secondary">🖨️ Print</button>
            <button onclick="closeReceiptModal()" class="btn btn-primary">Tutup</button>
          </div>
        </div>
      </div>

      <style>
        .app-content { height: 100vh !important; min-height: 100vh !important; padding-bottom: 48px !important; }
        .app-main.pos-main { height: calc(100vh - 64px - 48px) !important; min-height: calc(100vh - 64px - 48px) !important; display: flex !important; padding: 0 !important; gap: 0; background: var(--color-bg); overflow: hidden; }
        .pos-left { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
        .pos-panels { display: flex; flex: 1; overflow: hidden; }
        .pos-tables-panel { width: 200px; background: var(--color-bg-alt); border-right: 1px solid var(--color-border); display: flex; flex-direction: column; flex-shrink: 0; overflow-y: auto; }
        .panel-header { display: flex; justify-content: space-between; align-items: center; padding: 16px; border-bottom: 1px solid var(--color-border); }
        .panel-header h3 { font-size: 14px; font-weight: 600; margin: 0; }
        .btn-icon { background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-md); width: 28px; height: 28px; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; transition: var(--transition); }
        .btn-icon:hover { background: var(--color-bg-hover); }
        .tables-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; padding: 12px; }
        .table-btn { aspect-ratio: 1; border-radius: 10px; border: 2px solid transparent; cursor: pointer; font-weight: 700; font-size: 16px; transition: var(--transition); display: flex; align-items: center; justify-content: center; }
        .table-btn.available { background: var(--color-success); color: white; }
        .table-btn.occupied { background: var(--color-error); color: white; }
        .table-btn.selected { border-color: var(--color-primary); box-shadow: 0 0 0 3px var(--color-primary-30); }
        .table-btn:hover { transform: scale(1.05); }
        .table-legend { display: flex; flex-direction: column; gap: 6px; padding: 12px; border-top: 1px solid var(--color-border); margin-top: auto; }
        .legend-item { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--color-text-secondary); }
        .legend-dot { width: 10px; height: 10px; border-radius: 50%; }
        .legend-dot.available { background: var(--color-success); }
        .legend-dot.occupied { background: var(--color-error); }
        .legend-dot.selected { background: var(--color-primary); }
        .pos-menu-panel { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
        .pos-menu-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid var(--color-border); gap: 12px; flex-shrink: 0; }
        .category-tabs { display: flex; gap: 6px; }
        .category-tab { padding: 6px 12px; border: 1px solid var(--color-border); background: var(--color-bg); border-radius: var(--radius-md); cursor: pointer; font-weight: 500; transition: var(--transition); font-size: 13px; }
        .category-tab:hover { background: var(--color-bg-hover); }
        .category-tab.active { background: var(--color-primary); color: white; border-color: var(--color-primary); }
        .pos-search { display: flex; align-items: center; gap: 8px; background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 6px 12px; width: 220px; }
        .pos-search svg { color: var(--color-text-secondary); flex-shrink: 0; }
        .pos-search input { border: none; background: transparent; outline: none; font-size: 13px; width: 100%; }
        .menu-grid { flex: 1; padding: 12px; overflow-y: auto; display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 10px; align-content: start; }
        .menu-card { background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 12px; cursor: pointer; transition: var(--transition); text-align: center; display: flex; flex-direction: column; align-items: center; }
        .menu-card:hover { border-color: var(--color-primary); transform: translateY(-2px); box-shadow: var(--shadow-md); }
        .menu-card:active { transform: scale(0.96); }
        .menu-card-emoji { font-size: 32px; margin-bottom: 6px; }
        .menu-card-name { font-weight: 600; font-size: 12px; color: var(--color-text); margin-bottom: 4px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.3; }
        .menu-card-price { color: var(--color-primary); font-weight: 700; font-size: 13px; }
        .pos-right { width: 320px; background: var(--color-bg); border-left: 1px solid var(--color-border); display: flex; flex-direction: column; flex-shrink: 0; }
        .cart-panel { display: flex; flex-direction: column; height: 100%; }
        .cart-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid var(--color-border); }
        .cart-title { display: flex; align-items: center; gap: 8px; }
        #cart-table-info { font-weight: 600; font-size: 14px; }
        .cart-actions-header { display: flex; gap: 6px; }
        .cart-meta { padding: 8px 16px; border-bottom: 1px solid var(--color-border); display: flex; gap: 12px; }
        .meta-row { display: flex; align-items: center; gap: 6px; flex: 1; }
        .meta-row label { font-size: 12px; font-weight: 500; color: var(--color-text-secondary); white-space: nowrap; }
        .meta-input { flex: 1; padding: 4px 8px; font-size: 12px; border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-bg-alt); }
        .cart-zone { flex: 1; overflow-y: auto; padding: 8px 16px; }
        .cart-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; text-align: center; }
        .cart-empty p { color: var(--color-text-secondary); margin: 0; }
        .cart-item { display: flex; justify-content: space-between; align-items: flex-start; padding: 10px 0; border-bottom: 1px solid var(--color-border); }
        .cart-item:last-child { border-bottom: none; }
        .cart-item-info { flex: 1; }
        .cart-item-name { font-weight: 600; font-size: 13px; }
        .cart-item-notes { margin-top: 4px; }
        .cart-item-notes input { width: 100%; padding: 3px 6px; font-size: 11px; border: 1px solid var(--color-border); border-radius: 4px; background: var(--color-bg-alt); }
        .cart-item-qty { display: flex; align-items: center; gap: 4px; margin-top: 4px; }
        .cart-item-qty button { width: 20px; height: 20px; border: 1px solid var(--color-border); border-radius: 4px; background: var(--color-bg-alt); cursor: pointer; font-size: 12px; display: flex; align-items: center; justify-content: center; }
        .cart-item-qty button:hover { background: var(--color-bg-hover); }
        .cart-item-qty span { font-size: 12px; font-weight: 600; min-width: 18px; text-align: center; }
        .cart-item-price { font-weight: 600; font-size: 13px; text-align: right; white-space: nowrap; }
        .cart-item-actions { margin-left: 6px; }
        .cart-item-btn { background: none; border: none; color: var(--color-error); cursor: pointer; padding: 2px; font-size: 14px; }
        .cart-footer { border-top: 1px solid var(--color-border); padding: 12px 16px; }
        .cart-summary { margin-bottom: 8px; }
        .cart-row { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 13px; }
        .cart-row.total { font-size: 16px; font-weight: 700; margin-top: 6px; padding-top: 6px; border-top: 1px solid var(--color-border); }
        .cart-discount-row { display: flex; gap: 6px; margin-bottom: 4px; }
        .discount-input { flex: 1; padding: 4px 8px; font-size: 12px; border: 1px solid var(--color-border); border-radius: var(--radius-md); }
        .discount-select { padding: 4px 8px; font-size: 12px; border: 1px solid var(--color-border); border-radius: var(--radius-md); }
        .payment-section { background: var(--color-bg-alt); padding: 10px; border-radius: var(--radius-md); margin-bottom: 8px; }
        .quick-pay-buttons { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; margin-top: 6px; }
        .quick-pay-btn { padding: 6px; border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-bg); cursor: pointer; font-size: 11px; font-weight: 500; transition: var(--transition); }
        .quick-pay-btn:hover { background: var(--color-primary); color: white; border-color: var(--color-primary); }
        .cart-buttons { display: grid; grid-template-columns: 1fr 2fr 1fr; gap: 6px; }
        .cart-buttons .btn { padding: 10px; font-size: 13px; }
        .btn-hold { font-size: 12px !important; }
        .btn-cancel { font-size: 12px !important; }
        .text-muted { color: var(--color-text-secondary); }
        .text-center { text-align: center; }
        @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(0.95); } 100% { transform: scale(1); } }
        .menu-card.added { animation: pulse 0.2s ease; background: var(--color-primary-10); }
        .toast-container { position: fixed; top: 20px; right: 20px; z-index: 9999; display: flex; flex-direction: column; gap: 8px; }
        .toast { padding: 12px 20px; border-radius: var(--radius-md); color: white; font-size: 14px; font-weight: 500; display: flex; align-items: center; gap: 8px; box-shadow: var(--shadow-lg); animation: slideIn 0.3s ease; min-width: 250px; }
        .toast-success { background: var(--color-success); }
        .toast-warning { background: var(--color-warning); }
        .toast-error { background: var(--color-error); }
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .held-order-item { display: flex; justify-content: space-between; align-items: center; padding: 12px; border: 1px solid var(--color-border); border-radius: var(--radius-md); margin-bottom: 8px; cursor: pointer; transition: var(--transition); }
        .held-order-item:hover { background: var(--color-bg-alt); }
        .held-order-info { flex: 1; }
        .held-order-table { font-weight: 600; }
        .held-order-time { font-size: 12px; color: var(--color-text-secondary); }
        .held-order-items { font-size: 12px; color: var(--color-text-secondary); }
        .receipt-line { border-bottom: 1px dashed var(--color-border); margin: 8px 0; }
        .receipt-row { display: flex; justify-content: space-between; margin: 4px 0; }
        .receipt-center { text-align: center; margin: 8px 0; }
      </style>
      <script>
        let currentOrderId = null;
        let currentUserId = ${user.userId};
        let selectedTableId = null;
        let currentTableNumber = null;
        let isServerOrder = false;
        let orderType = 'dine-in';
        let guestCount = 1;
        let lastReceipt = null;

        function showToast(message, type = 'success') {
          const container = document.getElementById('toast-container');
          const toast = document.createElement('div');
          const icons = { success: '✅', warning: '⚠️', error: '❌' };
          toast.className = 'toast toast-' + type;
          toast.innerHTML = '<span>' + (icons[type] || '') + ' ' + message + '</span><button onclick="this.parentElement.remove()" style="background:none;border:none;color:white;cursor:pointer;font-size:16px;">&times;</button>';
          container.appendChild(toast);
          setTimeout(() => toast.remove(), 3000);
        }

        function filterMenu(category, btn) {
          document.querySelectorAll('.category-tab').forEach(tab => tab.classList.remove('active'));
          btn.classList.add('active');
          document.querySelectorAll('.menu-card').forEach(item => {
            const matchesCategory = category === 'all' || item.dataset.category === category;
            const matchesSearch = !document.getElementById('menu-search')?.value || item.dataset.name.includes(document.getElementById('menu-search').value.toLowerCase());
            item.style.display = (matchesCategory && matchesSearch) ? '' : 'none';
          });
        }

        function searchMenu(query) {
          query = query.toLowerCase();
          document.querySelectorAll('.menu-card').forEach(item => {
            const activeTab = document.querySelector('.category-tab.active');
            const category = activeTab?.textContent?.includes('Makanan') ? 'makanan' : activeTab?.textContent?.includes('Minuman') ? 'minuman' : 'all';
            const matchesCategory = category === 'all' || item.dataset.category === category;
            item.style.display = (!query || item.dataset.name.includes(query)) && matchesCategory ? '' : 'none';
          });
        }

        function saveCart(cart) { localStorage.setItem('pos-cart', JSON.stringify(cart)); }
        function loadCart() { try { return JSON.parse(localStorage.getItem('pos-cart') || 'null'); } catch { return null; } }
        function clearCart() { localStorage.removeItem('pos-cart'); }

        function getLocalCart() {
          const cart = loadCart();
          if (cart && cart.tableId === selectedTableId) return cart;
          return null;
        }

        function addToCartLocal(menuId, name, price) {
          let cart = getLocalCart();
          if (!cart) {
            cart = { tableId: selectedTableId, tableNumber: currentTableNumber, items: [], orderType: orderType, guestCount: guestCount };
          }
          const existing = cart.items.find(i => i.menuId === menuId);
          if (existing) { existing.quantity += 1; }
          else { cart.items.push({ menuId, name, price, quantity: 1, notes: '' }); }
          saveCart(cart);
          renderCartFromLocal();
        }

        function removeFromCartLocal(menuId) {
          let cart = getLocalCart();
          if (!cart) return;
          cart.items = cart.items.filter(i => i.menuId !== menuId);
          if (cart.items.length === 0) clearCart();
          else saveCart(cart);
          renderCartFromLocal();
        }

        function updateQuantityLocal(menuId, delta) {
          let cart = getLocalCart();
          if (!cart) return;
          const item = cart.items.find(i => i.menuId === menuId);
          if (!item) return;
          item.quantity += delta;
          if (item.quantity <= 0) { removeFromCartLocal(menuId); return; }
          saveCart(cart);
          renderCartFromLocal();
        }

        function updateItemNotes(menuId, notes) {
          let cart = getLocalCart();
          if (!cart) return;
          const item = cart.items.find(i => i.menuId === menuId);
          if (item) { item.notes = notes; saveCart(cart); }
        }

        function updateGuestCount(val) { guestCount = parseInt(val) || 1; }
        function updateOrderType(val) {
          orderType = val;
          document.getElementById('cart-order-type').textContent = val === 'dine-in' ? 'Dine-in' : 'Takeaway';
        }

        function renderCartFromLocal() {
          const cart = getLocalCart();
          const cartZone = document.getElementById('cart-zone');
          const cartCount = document.getElementById('cart-count');
          const cartFooter = document.getElementById('cart-footer');
          const cartMeta = document.getElementById('cart-meta');

          if (!cart || cart.items.length === 0) {
            cartZone.innerHTML = '<div class="cart-empty"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--color-text-secondary); margin-bottom: 12px;"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg><p>Cart kosong</p></div>';
            cartFooter.style.display = 'none';
            cartMeta.style.display = 'none';
            return;
          }

          cartFooter.style.display = 'block';
          cartMeta.style.display = 'flex';
          document.getElementById('guest-count').value = cart.guestCount || 1;
          document.getElementById('order-type').value = cart.orderType || 'dine-in';

          let html = '';
          cart.items.forEach(item => {
            html += '<div class="cart-item">' +
              '<div class="cart-item-info">' +
                '<div class="cart-item-name">' + item.name + '</div>' +
                '<div class="cart-item-notes"><input type="text" placeholder="Catatan..." value="' + (item.notes || '') + '" onchange="updateItemNotes(' + item.menuId + ', this.value)"></div>' +
                '<div class="cart-item-qty">' +
                  '<button onclick="updateQuantityLocal(' + item.menuId + ', -1)">-</button>' +
                  '<span>x' + item.quantity + '</span>' +
                  '<button onclick="updateQuantityLocal(' + item.menuId + ', 1)">+</button>' +
                '</div>' +
              '</div>' +
              '<div class="cart-item-price">' + (item.price * item.quantity).toLocaleString('id-ID') + '</div>' +
              '<div class="cart-item-actions"><button class="cart-item-btn" onclick="removeFromCartLocal(' + item.menuId + ')">&times;</button></div>' +
            '</div>';
          });
          cartZone.innerHTML = html;

          const subtotal = cart.items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
          const tax = Math.round(subtotal * 0.1);
          const discount = parseInt(document.getElementById('discount-amount')?.value || '0') || 0;
          const discountType = document.getElementById('discount-type')?.value || 'fixed';
          const discountAmount = discountType === 'percentage' ? Math.round(subtotal * discount / 100) : discount;
          const total = subtotal + tax - discountAmount;

          document.getElementById('summary-subtotal').textContent = subtotal.toLocaleString('id-ID');
          document.getElementById('summary-tax').textContent = tax.toLocaleString('id-ID');
          document.getElementById('summary-total').textContent = total.toLocaleString('id-ID');
          document.getElementById('payment-section').style.display = 'none';
        }

        async function selectTable(tableId, tableNumber, status) {
          if (selectedTableId === tableId) {
            selectedTableId = null;
            currentTableNumber = null;
            currentOrderId = null;
            isServerOrder = false;
            document.querySelectorAll('.table-btn').forEach(btn => btn.classList.remove('selected'));
            document.getElementById('cart-table-info').textContent = 'Pilih Meja';
            document.getElementById('cart-order-type').style.display = 'none';
            document.getElementById('btn-transfer').style.display = 'none';
            document.getElementById('cart-zone').innerHTML = '<div class="cart-empty"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--color-text-secondary); margin-bottom: 12px;"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg><p>Pilih meja terlebih dahulu</p></div>';
            document.getElementById('cart-footer').style.display = 'none';
            document.getElementById('cart-meta').style.display = 'none';
            return;
          }

          document.querySelectorAll('.table-btn').forEach(btn => btn.classList.remove('selected'));
          document.querySelector('[data-table-id="' + tableId + '"]').classList.add('selected');
          selectedTableId = tableId;
          currentTableNumber = tableNumber;
          currentOrderId = null;
          isServerOrder = false;

          const tableBtn = document.querySelector('[data-table-id="' + tableId + '"]');
          const currentStatus = tableBtn?.dataset.status || status;

          if (currentStatus === 'occupied') {
            const orderRes = await fetch('/api/orders/table/' + tableId);
            const orderData = await orderRes.json();
            if (orderData.order) {
              currentOrderId = orderData.order.id;
              isServerOrder = true;
              document.getElementById('cart-table-info').textContent = 'Meja ' + tableNumber;
              document.getElementById('cart-order-type').style.display = 'inline';
              document.getElementById('btn-transfer').style.display = 'inline';
              renderServerCart(orderData.order, orderData.items);
            }
            return;
          }

          const localCart = loadCart();
          if (localCart && localCart.tableId === tableId) {
            document.getElementById('cart-table-info').textContent = 'Meja ' + tableNumber;
            document.getElementById('cart-order-type').style.display = 'inline';
            renderCartFromLocal();
            return;
          }

          clearCart();
          orderType = 'dine-in';
          guestCount = 1;
          renderEmptyCartForTable(tableNumber);
        }

        function renderEmptyCartForTable(tableNumber) {
          document.getElementById('cart-table-info').textContent = 'Meja ' + tableNumber;
          document.getElementById('cart-order-type').style.display = 'inline';
          document.getElementById('cart-order-type').textContent = 'Dine-in';
          document.getElementById('cart-zone').innerHTML = '<div class="cart-empty"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--color-text-secondary); margin-bottom: 12px;"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg><p>Meja ' + tableNumber + ' — Tambahkan menu</p></div>';
          document.getElementById('cart-footer').style.display = 'none';
          document.getElementById('cart-meta').style.display = 'none';
        }

        function addToCart(menuId, name, price) {
          if (!selectedTableId) { showToast('Pilih meja terlebih dahulu!', 'warning'); return; }
          const btn = event.target.closest('.menu-card');
          if (btn) { btn.classList.add('added'); setTimeout(() => btn.classList.remove('added'), 200); }
          if (isServerOrder && currentOrderId) { addToCartServer(menuId); }
          else { addToCartLocal(menuId, name, price); showToast(name + ' ditambahkan'); }
        }

        async function addToCartServer(menuId) {
          const response = await fetch('/api/orders/' + currentOrderId + '/items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ menuId, quantity: 1 })
          });
          if (response.ok) {
            const data = await response.json();
            renderServerCart(data.order, data.items);
            showToast('Item ditambahkan');
          }
        }

        function renderServerCart(order, items) {
          const cartZone = document.getElementById('cart-zone');
          const cartFooter = document.getElementById('cart-footer');
          const cartMeta = document.getElementById('cart-meta');
          cartFooter.style.display = 'block';
          cartMeta.style.display = 'flex';

          let html = '';
          items.forEach(item => {
            html += '<div class="cart-item">' +
              '<div class="cart-item-info">' +
                '<div class="cart-item-name">' + (item.menuName || 'Item') + '</div>' +
                '<div class="cart-item-qty">' +
                  '<button onclick="updateServerQty(' + item.id + ', -1)">-</button>' +
                  '<span>x' + item.quantity + '</span>' +
                  '<button onclick="updateServerQty(' + item.id + ', 1)">+</button>' +
                '</div>' +
              '</div>' +
              '<div class="cart-item-price">' + (item.priceAtOrder * item.quantity).toLocaleString('id-ID') + '</div>' +
              '<div class="cart-item-actions"><button class="cart-item-btn" onclick="removeServerItem(' + item.id + ')">&times;</button></div>' +
            '</div>';
          });
          cartZone.innerHTML = html;

          const subtotal = order.subtotal || 0, tax = order.tax || 0, total = order.total || 0;
          document.getElementById('summary-subtotal').textContent = subtotal.toLocaleString('id-ID');
          document.getElementById('summary-tax').textContent = tax.toLocaleString('id-ID');
          document.getElementById('summary-total').textContent = total.toLocaleString('id-ID');
          document.getElementById('payment-section').style.display = 'none';
        }

        async function updateServerQty(itemId, delta) {
          const qtySpan = document.querySelector('[onclick*="updateServerQty(' + itemId + '"]')?.parentElement?.querySelector('span');
          const currentQty = parseInt(qtySpan?.textContent?.replace('x', '') || '1');
          const newQty = currentQty + delta;
          if (newQty <= 0) { removeServerItem(itemId); return; }
          await fetch('/api/orders/' + currentOrderId + '/items/' + itemId, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quantity: newQty })
          });
          const response = await fetch('/api/orders/' + currentOrderId);
          const data = await response.json();
          if (data.order) renderServerCart(data.order, data.items);
        }

        async function removeServerItem(itemId) {
          await fetch('/api/orders/' + currentOrderId + '/items/' + itemId, { method: 'DELETE' });
          const response = await fetch('/api/orders/' + currentOrderId);
          const data = await response.json();
          if (data.order) renderServerCart(data.order, data.items);
        }

        function holdOrder() {
          const cart = getLocalCart();
          if (!cart || cart.items.length === 0) { showToast('Cart kosong!', 'warning'); return; }
          const heldOrders = JSON.parse(localStorage.getItem('pos-held-orders') || '[]');
          heldOrders.push({ ...cart, heldAt: new Date().toISOString() });
          localStorage.setItem('pos-held-orders', JSON.stringify(heldOrders));
          clearCart();
          updateHeldCount();
          showToast('Pesanan disimpan (hold)');
        }

        function showHeldOrdersModal() {
          const heldOrders = JSON.parse(localStorage.getItem('pos-held-orders') || '[]');
          const list = document.getElementById('held-orders-list');
          if (heldOrders.length === 0) {
            list.innerHTML = '<p class="text-muted text-center" style="padding: 24px;">Tidak ada pesanan ditahan</p>';
          } else {
            list.innerHTML = heldOrders.map((o, i) => {
              const time = new Date(o.heldAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
              return '<div class="held-order-item" onclick="recallOrder(' + i + ')">' +
                '<div class="held-order-info">' +
                  '<div class="held-order-table">Meja ' + o.tableNumber + '</div>' +
                  '<div class="held-order-items">' + o.items.map(it => it.name + ' x' + it.quantity).join(', ') + '</div>' +
                '</div>' +
                '<div class="held-order-time">' + time + '</div>' +
              '</div>';
            }).join('');
          }
          document.getElementById('held-orders-modal').classList.add('show');
        }
        function closeHeldOrdersModal() { document.getElementById('held-orders-modal').classList.remove('show'); }

        function recallOrder(index) {
          const heldOrders = JSON.parse(localStorage.getItem('pos-held-orders') || '[]');
          const order = heldOrders.splice(index, 1)[0];
          localStorage.setItem('pos-held-orders', JSON.stringify(heldOrders));
          selectedTableId = order.tableId;
          currentTableNumber = order.tableNumber;
          orderType = order.orderType || 'dine-in';
          guestCount = order.guestCount || 1;
          saveCart(order);
          document.querySelectorAll('.table-btn').forEach(btn => btn.classList.remove('selected'));
          const btn = document.querySelector('[data-table-id="' + order.tableId + '"]');
          if (btn) btn.classList.add('selected');
          document.getElementById('cart-table-info').textContent = 'Meja ' + order.tableNumber;
          document.getElementById('cart-order-type').style.display = 'inline';
          renderCartFromLocal();
          updateHeldCount();
          closeHeldOrdersModal();
          showToast('Pesanan dipanggil kembali');
        }

        function updateHeldCount() {
          const heldOrders = JSON.parse(localStorage.getItem('pos-held-orders') || '[]');
          const badge = document.getElementById('held-count');
          if (heldOrders.length > 0) { badge.style.display = 'inline'; badge.textContent = heldOrders.length; }
          else { badge.style.display = 'none'; }
        }

        function showPayment() {
          const cart = getLocalCart();
          if ((!cart || cart.items.length === 0) && !isServerOrder) { showToast('Cart kosong!', 'warning'); return; }
          const section = document.getElementById('payment-section');
          section.style.display = 'block';
          const total = parseInt(document.getElementById('summary-total').textContent.replace(/\./g, '')) || 0;
          document.getElementById('amount-paid-input').value = '';
          document.getElementById('summary-paid').textContent = '0';
          document.getElementById('summary-change').textContent = '0';
          setTimeout(() => document.getElementById('amount-paid-input').focus(), 100);
        }

        async function processPaymentManual() {
          const amount = parseInt(document.getElementById('amount-paid-input').value) || 0;
          if (!amount || amount <= 0) { showToast('Masukkan jumlah uang!', 'warning'); return; }
          const total = parseInt(document.getElementById('summary-total').textContent.replace(/\./g, '')) || 0;
          if (amount < total) { showToast('Uang kurang!', 'error'); return; }
          if (!isServerOrder && currentOrderId === null) {
            const result = await submitOrder();
            if (!result) return;
          }
          const response = await fetch('/api/orders/' + currentOrderId + '/pay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amountPaid: amount })
          });
          const data = await response.json();
          if (data.error) { showToast(data.error, 'error'); }
          else {
            showReceipt(data.order, data.items, amount, amount - total);
            showToast('Pembayaran berhasil!');
          }
        }

        function setQuickPayment(amount) {
          const total = parseInt(document.getElementById('summary-total').textContent.replace(/\./g, '')) || 0;
          let paidAmount = amount === 'exact' ? total : amount;
          document.getElementById('amount-paid-input').value = paidAmount;
          updatePaidAmount(paidAmount);
          processPaymentWithAmount(paidAmount);
        }

        function updatePaidAmount(value) {
          const total = parseInt(document.getElementById('summary-total').textContent.replace(/\./g, '')) || 0;
          const paid = parseInt(value) || 0;
          document.getElementById('summary-paid').textContent = paid.toLocaleString('id-ID');
          const change = paid - total;
          document.getElementById('summary-change').textContent = change >= 0 ? change.toLocaleString('id-ID') : 'Kurang ' + Math.abs(change).toLocaleString('id-ID');
          document.getElementById('summary-change').style.color = change >= 0 ? 'var(--color-success)' : 'var(--color-error)';
        }

        async function processPaymentWithAmount(amountPaid) {
          const total = parseInt(document.getElementById('summary-total').textContent.replace(/\./g, '')) || 0;
          if (amountPaid < total) { showToast('Uang kurang!', 'error'); return; }
          if (!isServerOrder && currentOrderId === null) {
            await submitOrder();
          }
          const response = await fetch('/api/orders/' + currentOrderId + '/pay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amountPaid })
          });
          const data = await response.json();
          if (data.error) { showToast(data.error, 'error'); }
          else {
            showReceipt(data.order, data.items, amountPaid, amountPaid - total);
            showToast('Pembayaran berhasil!');
          }
        }

        async function submitOrder() {
          const cart = getLocalCart();
          if (!cart || cart.items.length === 0) { showToast('Cart kosong!', 'warning'); return; }
          const response = await fetch('/api/orders/with-items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tableId: cart.tableId,
              userId: currentUserId,
              items: cart.items.map(item => ({ menuId: item.menuId, quantity: item.quantity, notes: item.notes || '' }))
            })
          });
          const data = await response.json();
          if (data.error) { showToast(data.error, 'error'); return; }
          currentOrderId = data.order.id;
          isServerOrder = true;
          clearCart();
          const tableBtn = document.querySelector('[data-table-id="' + cart.tableId + '"]');
          if (tableBtn) tableBtn.dataset.status = 'occupied';
          document.getElementById('btn-transfer').style.display = 'inline';
          return data;
        }

        async function processPayment() {
          const amountInput = document.getElementById('amount-paid');
          const amount = amountInput ? parseInt(amountInput.value) : 0;
          if (!amount || amount <= 0) { showToast('Masukkan jumlah uang!', 'warning'); return; }
          const total = parseInt(document.getElementById('summary-total').textContent.replace(/\./g, '')) || 0;
          if (amount < total) { showToast('Uang kurang!', 'error'); return; }
          if (!isServerOrder && currentOrderId === null) { await submitOrder(); }
          const response = await fetch('/api/orders/' + currentOrderId + '/pay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amountPaid: amount })
          });
          const data = await response.json();
          if (data.error) { showToast(data.error, 'error'); }
          else {
            showReceipt(data.order, data.items, amount, amount - total);
            showToast('Pembayaran berhasil!');
          }
        }

        function showReceipt(order, items, paid, change) {
          lastReceipt = { order, items, paid, change, tableNumber: currentTableNumber, cashier: '${user.name}', date: new Date() };
          let html = '<div class="receipt-center"><strong>POS APP</strong></div>';
          html += '<div class="receipt-center" style="font-size: 11px;">Jl. Contoh No. 123</div>';
          html += '<div class="receipt-line"></div>';
          html += '<div class="receipt-row"><span>Meja: ' + currentTableNumber + '</span><span>Kasir: ${user.name}</span></div>';
          html += '<div class="receipt-row"><span>Tgl: ' + new Date().toLocaleString('id-ID') + '</span></div>';
          html += '<div class="receipt-line"></div>';
          items.forEach(item => {
            html += '<div class="receipt-row"><span>' + (item.menuName || 'Item') + ' x' + item.quantity + '</span><span>' + (item.priceAtOrder * item.quantity).toLocaleString('id-ID') + '</span></div>';
          });
          html += '<div class="receipt-line"></div>';
          html += '<div class="receipt-row"><span>Subtotal</span><span>' + (order.subtotal || 0).toLocaleString('id-ID') + '</span></div>';
          html += '<div class="receipt-row"><span>Pajak</span><span>' + (order.tax || 0).toLocaleString('id-ID') + '</span></div>';
          html += '<div class="receipt-row" style="font-weight: bold;"><span>TOTAL</span><span>' + (order.total || 0).toLocaleString('id-ID') + '</span></div>';
          html += '<div class="receipt-row"><span>Bayar</span><span>' + paid.toLocaleString('id-ID') + '</span></div>';
          html += '<div class="receipt-row"><span>Kembali</span><span>' + change.toLocaleString('id-ID') + '</span></div>';
          html += '<div class="receipt-line"></div>';
          html += '<div class="receipt-center"><strong>TERIMA KASIH!</strong></div>';
          document.getElementById('receipt-content').innerHTML = html;
          document.getElementById('receipt-modal').classList.add('show');
        }
        function closeReceiptModal() { document.getElementById('receipt-modal').classList.remove('show'); }
        function printReceipt() {
          const content = document.getElementById('receipt-content').innerText;
          const win = window.open('', '_blank');
          win.document.write('<pre style="font-family: monospace; font-size: 13px;">' + content + '</pre>');
          win.document.close();
          win.print();
        }

        async function cancelOrder() {
          if (!currentOrderId && !getLocalCart()) { showToast('Tidak ada pesanan', 'warning'); return; }
          if (isServerOrder && currentOrderId) {
            if (!confirm('Batalkan pesanan?')) return;
            await fetch('/api/orders/' + currentOrderId + '/cancel', { method: 'POST' });
            showToast('Pesanan dibatalkan');
          } else {
            clearCart();
            showToast('Cart dikosongkan');
          }
          currentOrderId = null;
          isServerOrder = false;
          selectedTableId = null;
          currentTableNumber = null;
          document.querySelectorAll('.table-btn').forEach(btn => btn.classList.remove('selected'));
          document.getElementById('cart-table-info').textContent = 'Pilih Meja';
          document.getElementById('cart-order-type').style.display = 'none';
          document.getElementById('btn-transfer').style.display = 'none';
          document.getElementById('cart-zone').innerHTML = '<div class="cart-empty"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--color-text-secondary); margin-bottom: 12px;"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg><p>Pilih meja terlebih dahulu</p></div>';
          document.getElementById('cart-footer').style.display = 'none';
          document.getElementById('cart-meta').style.display = 'none';
        }

        function showTransferModal() {
          if (!currentOrderId) return;
          document.getElementById('transfer-from').textContent = currentTableNumber;
          const tablesDiv = document.getElementById('transfer-tables');
          tablesDiv.innerHTML = '';
          document.querySelectorAll('.table-btn.available').forEach(btn => {
            const id = btn.dataset.tableId;
            const num = btn.textContent;
            const el = document.createElement('button');
            el.className = 'table-btn available';
            el.style.cssText = 'aspect-ratio:1;border-radius:8px;border:2px solid transparent;cursor:pointer;font-weight:700;font-size:14px;background:var(--color-success);color:white;';
            el.textContent = num;
            el.onclick = () => transferTable(parseInt(id), parseInt(num));
            tablesDiv.appendChild(el);
          });
          document.getElementById('transfer-modal').classList.add('show');
        }
        function closeTransferModal() { document.getElementById('transfer-modal').classList.remove('show'); }

        async function transferTable(newTableId, newTableNumber) {
          const res = await fetch('/api/orders/' + currentOrderId + '/transfer', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ newTableId })
          });
          const data = await res.json();
          if (data.error) { showToast(data.error, 'error'); return; }
          showToast('Pesanan dipindah ke Meja ' + newTableNumber);
          currentTableNumber = newTableNumber;
          selectedTableId = newTableId;
          document.getElementById('cart-table-info').textContent = 'Meja ' + newTableNumber;
          document.querySelectorAll('.table-btn').forEach(btn => btn.classList.remove('selected'));
          document.querySelector('[data-table-id="' + newTableId + '"]')?.classList.add('selected');
          closeTransferModal();
        }

        async function addTable() {
          const num = parseInt(prompt('Nomor Meja:'));
          if (!num) return;
          await fetch('/api/tables', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tableNumber: num }) });
          location.reload();
        }

        document.addEventListener('keydown', function(e) {
          if (e.ctrlKey && e.key === 'f') { e.preventDefault(); document.getElementById('menu-search')?.focus(); }
          if (e.ctrlKey && e.key === 'h') { e.preventDefault(); holdOrder(); }
          if (e.key === 'Escape') {
            selectedTableId = null; currentTableNumber = null; currentOrderId = null; isServerOrder = false;
            document.querySelectorAll('.table-btn').forEach(btn => btn.classList.remove('selected'));
            document.getElementById('cart-table-info').textContent = 'Pilih Meja';
            document.getElementById('cart-order-type').style.display = 'none';
            document.getElementById('btn-transfer').style.display = 'none';
            document.getElementById('cart-zone').innerHTML = '<div class="cart-empty"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--color-text-secondary); margin-bottom: 12px;"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg><p>Pilih meja terlebih dahulu</p></div>';
            document.getElementById('cart-footer').style.display = 'none';
            document.getElementById('cart-meta').style.display = 'none';
            document.querySelectorAll('.modal.show').forEach(m => m.classList.remove('show'));
          }
        });

        document.addEventListener('DOMContentLoaded', function() {
          updateHeldCount();
          const savedCart = loadCart();
          if (savedCart && savedCart.tableId) {
            const tableBtn = document.querySelector('[data-table-id="' + savedCart.tableId + '"]');
            if (tableBtn) {
              selectedTableId = savedCart.tableId;
              currentTableNumber = savedCart.tableNumber;
              tableBtn.classList.add('selected');
              document.getElementById('cart-table-info').textContent = 'Meja ' + savedCart.tableNumber;
              document.getElementById('cart-order-type').style.display = 'inline';
              renderCartFromLocal();
            }
          }
        });
      </script>
      ${getCommonScripts()}
    `);
  });
