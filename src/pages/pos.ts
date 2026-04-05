import { Elysia } from 'elysia';
import { htmlResponse } from '../templates/html';
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
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Point of Sale</title>
        <link rel="stylesheet" href="/styles/global.css">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { height: 100%; overflow: hidden; }
          body { 
            background: #f8f9fa; 
            color: var(--color-text); 
            font-family: system-ui, -apple-system, sans-serif;
          }
          
          .pos-container {
            display: grid;
            grid-template-columns: 1fr 350px;
            grid-template-rows: auto 1fr;
            height: 100vh;
            gap: 12px;
            padding: 12px;
            overflow: hidden;
          }
          
          .pos-header { 
            grid-column: 1 / -1;
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            padding: 12px 20px; 
            background: #ffffff; 
            border-radius: var(--radius-lg); 
            border: 1px solid var(--color-border);
            box-shadow: 0 1px 3px rgba(0,0,0,0.08);
          }
          .pos-header-left { display: flex; align-items: center; gap: 12px; }
          .pos-header h1 { font-size: 18px; font-weight: 700; }
          .pos-header-right { display: flex; gap: 8px; }
          
          .pos-btn { 
            padding: 8px 16px; 
            background: var(--color-primary); 
            border: 1px solid var(--color-primary); 
            border-radius: var(--radius-md); 
            color: white; 
            font-size: 12px; 
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            text-decoration: none;
            display: inline-block;
          }
          .pos-btn:hover { opacity: 0.9; transform: translateY(-1px); color: white; }
          .pos-btn-primary { background: var(--color-primary); color: white; border-color: var(--color-primary); }
          .pos-btn-success { background: var(--color-success); color: white; border-color: var(--color-success); }
          .pos-btn-danger { background: var(--color-error); color: white; border-color: var(--color-error); }
          .pos-btn-warning { background: var(--color-warning); color: white; border-color: var(--color-warning); }
          
          .pos-left {
            display: flex;
            flex-direction: column;
            gap: 12px;
            overflow: hidden;
          }
          
.pos-tables {
            background: #ffffff;
            border: 1px solid var(--color-border);
            border-radius: var(--radius-lg);
            padding: 12px;
            flex-shrink: 0;
            box-shadow: 0 1px 3px rgba(0,0,0,0.08);
          }
          .pos-table {
            min-width: 45px;
            height: 45px;
            border-radius: var(--radius-md);
            border: 2px solid var(--color-border);
            background: var(--color-bg-secondary);
            color: var(--color-text);
            font-size: 14px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s;
          }
          .pos-table.available { background: var(--color-success); color: white; border-color: var(--color-success); }
          .pos-table.occupied { background: var(--color-error); color: white; border-color: var(--color-error); }
          .pos-table.selected { box-shadow: 0 0 0 3px var(--color-primary); }
          .pos-tables-legend { display: flex; gap: 12px; margin-top: 8px; font-size: 11px; color: var(--color-text-secondary); }
          .pos-legend-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin-right: 4px; }
          
          .pos-menu {
            background: #ffffff;
            border: 1px solid var(--color-border);
            border-radius: var(--radius-lg);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            flex: 1;
            box-shadow: 0 1px 3px rgba(0,0,0,0.08);
          }
          .pos-tables-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
          .pos-tables-header h2 { font-size: 14px; font-weight: 600; }
          .pos-tables-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
          }
          .pos-table {
            min-width: 45px;
            height: 45px;
            border-radius: var(--radius-md);
            border: 2px solid var(--color-border);
            background: var(--color-bg-secondary);
            color: var(--color-text);
            font-size: 14px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s;
          }
          .pos-table.available { background: var(--color-success); color: white; border-color: var(--color-success); }
          .pos-table.occupied { background: var(--color-error); color: white; border-color: var(--color-error); }
          .pos-table.selected { box-shadow: 0 0 0 3px var(--color-primary); }
          .pos-tables-legend { display: flex; gap: 12px; margin-top: 8px; font-size: 11px; color: var(--color-text-secondary); }
          .pos-legend-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin-right: 4px; }
          
          .pos-menu {
            background: var(--color-card);
            border: 1px solid var(--color-border);
            border-radius: var(--radius-lg);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            flex: 1;
          }
          .pos-menu-header { 
            display: flex; 
            gap: 8px; 
            padding: 12px 16px; 
            border-bottom: 1px solid var(--color-border);
            flex-wrap: wrap; 
            align-items: center; 
            flex-shrink: 0;
            background: #f8f9fa;
            border-radius: var(--radius-lg) var(--radius-lg) 0 0;
          }
          .pos-category {
            padding: 6px 12px;
            border: 2px solid var(--color-border);
            background: #ffffff;
            color: var(--color-text);
            border-radius: var(--radius-md);
            cursor: pointer;
            font-size: 12px;
            font-weight: 600;
          }
          .pos-category:hover { border-color: var(--color-primary); background: var(--color-primary); color: white; }
          .pos-category.active { background: var(--color-primary); border-color: var(--color-primary); color: white; }
          .pos-search {
            flex: 1;
            min-width: 120px;
            padding: 6px 10px;
            border: 1px solid var(--color-border);
            border-radius: var(--radius-md);
            background: var(--color-bg);
            color: var(--color-text);
            font-size: 12px;
          }
          .pos-search:focus { outline: none; border-color: var(--color-primary); }
          
          .pos-menu-table-wrap {
            overflow-y: auto;
            flex: 1;
            min-height: 0;
          }
          .pos-menu-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
          }
          .pos-menu-table th {
            position: sticky;
            top: 0;
            background: #f1f3f5;
            padding: 10px 12px;
            text-align: left;
            font-weight: 600;
            border-bottom: 2px solid var(--color-border);
            z-index: 10;
            color: var(--color-text);
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .pos-menu-table td {
            padding: 10px 12px;
            border-bottom: 1px solid var(--color-border);
            vertical-align: middle;
            background: #ffffff;
          }
          .pos-menu-table tbody tr {
            cursor: pointer;
            transition: background 0.15s;
          }
          .pos-menu-table tbody tr:hover { background: var(--color-bg-hover); }
          .pos-menu-table tbody tr.added { background: var(--color-success); color: white; }
          .pos-menu-table tbody tr.added .col-price { color: white; }
          .pos-menu-table tbody tr.added .badge { background: rgba(255,255,255,0.3); color: white; }
          .pos-menu-table .col-emoji { width: 40px; text-align: center; font-size: 20px; }
          .pos-menu-table .col-name { font-weight: 600; }
          .pos-menu-table .col-price { text-align: right; font-weight: 600; color: var(--color-primary); }
          .pos-menu-table .col-category { 
            width: 80px; 
          }
          .pos-menu-table .badge {
            padding: 2px 8px;
            border-radius: var(--radius-sm);
            font-size: 10px;
            font-weight: 600;
          }
          .pos-menu-table .badge-makanan { background: #fff3cd; color: #856404; }
          .pos-menu-table .badge-minuman { background: #cce5ff; color: #004085; }
          
          .pos-cart {
            background: #ffffff;
            border: 1px solid var(--color-border);
            border-radius: var(--radius-lg);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.08);
          }
          .pos-cart-header {
            padding: 12px 16px;
            border-bottom: 1px solid var(--color-border);
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .pos-cart-title { font-size: 14px; font-weight: 700; }
          
          .pos-cart-meta {
            display: flex;
            gap: 8px;
            padding: 10px 12px;
            border-bottom: 1px solid var(--color-border);
            font-size: 11px;
          }
          .pos-cart-meta input, .pos-cart-meta select {
            flex: 1;
            padding: 4px 8px;
            border: 1px solid var(--color-border);
            border-radius: var(--radius-sm);
            background: var(--color-bg);
            color: var(--color-text);
            font-size: 11px;
          }
          
          .pos-cart-items {
            flex: 1;
            overflow-y: auto;
            padding: 10px;
          }
          .pos-cart-empty { text-align: center; padding: 20px; color: var(--color-text-secondary); font-size: 12px; }
          
          .pos-cart-item {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px;
            background: var(--color-bg);
            border-radius: var(--radius-md);
            margin-bottom: 6px;
          }
          .pos-cart-item-info { flex: 1; min-width: 0; }
          .pos-cart-item-name { font-size: 12px; font-weight: 600; }
          .pos-cart-item-notes { font-size: 10px; color: var(--color-warning); font-style: italic; margin-top: 2px; }
          .pos-cart-item-qty { display: flex; align-items: center; gap: 4px; margin-top: 2px; }
          .pos-cart-item-qty button {
            width: 20px;
            height: 20px;
            border: 1px solid var(--color-border);
            background: var(--color-bg-secondary);
            border-radius: var(--radius-sm);
            cursor: pointer;
            font-weight: 700;
            font-size: 12px;
          }
          .pos-cart-item-qty span { font-size: 11px; font-weight: 600; min-width: 20px; text-align: center; }
          .pos-cart-item-price { font-size: 12px; font-weight: 700; }
          .pos-cart-item-notes-btn { background: none; border: none; font-size: 14px; cursor: pointer; opacity: 0.5; transition: opacity 0.2s; padding: 0 4px; }
          .pos-cart-item-notes-btn:hover { opacity: 1; }
          .pos-cart-item-remove { background: none; border: none; color: var(--color-error); font-size: 16px; cursor: pointer; }
          
          .pos-cart-footer {
            padding: 12px;
            border-top: 1px solid var(--color-border);
          }
          .pos-cart-summary { margin-bottom: 8px; }
          .pos-cart-row { display: flex; justify-content: space-between; font-size: 11px; padding: 2px 0; }
          .pos-cart-total { font-size: 14px; font-weight: 700; border-top: 2px solid var(--color-border); padding-top: 6px; margin-top: 4px; }
          
          .pos-cart-discount { display: flex; gap: 6px; margin: 6px 0; }
          .pos-cart-discount input { flex: 1; padding: 4px 8px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); font-size: 11px; }
          .pos-cart-discount select { padding: 4px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); font-size: 11px; }
          
          .pos-payment { display: none; margin-bottom: 8px; padding: 10px; background: var(--color-bg-secondary); border-radius: var(--radius-md); }
          .pos-payment.show { display: block; }
          .pos-payment input { width: 100%; padding: 8px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: 14px; font-weight: 600; margin-bottom: 6px; }
          .pos-payment-row { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px; }
          .pos-payment-change { color: var(--color-success); }
          .pos-quick-pay { display: flex; gap: 4px; margin-bottom: 6px; }
          .pos-quick-pay button { flex: 1; padding: 6px; background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-sm); font-size: 10px; cursor: pointer; }
          
          .pos-cart-actions { display: flex; gap: 6px; flex-wrap: wrap; }
          .pos-cart-actions button { flex: 1 1 calc(25% - 4px); padding: 10px; border: none; border-radius: var(--radius-md); font-size: 11px; font-weight: 600; cursor: pointer; min-width: 60px; }
          
          .pos-toast {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 10px 14px;
            border-radius: var(--radius-md);
            color: white;
            font-size: 12px;
            z-index: 9999;
            animation: slideIn 0.3s;
          }
          .pos-toast-success { background: var(--color-success); }
          .pos-toast-error { background: var(--color-error); }
          .pos-toast-warning { background: var(--color-warning); }
          @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
          
          .pos-modal { display: none; }
          .pos-modal.show { display: block; }
          .pos-modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 100; }
          .pos-modal-content { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #ffffff; border: 1px solid var(--color-border); border-radius: var(--radius-lg); width: 90%; max-width: 400px; z-index: 101; box-shadow: 0 4px 20px rgba(0,0,0,0.15); overflow: hidden; }
          .pos-modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px; border-bottom: 1px solid var(--color-border); background: #f8f9fa; border-radius: var(--radius-lg) var(--radius-lg) 0 0; }
          .pos-modal-header h3 { font-size: 16px; font-weight: 700; }
          .pos-modal-close { background: none; border: none; font-size: 24px; cursor: pointer; color: var(--color-text-secondary); padding: 0; line-height: 1; }
          .pos-modal-close:hover { color: var(--color-error); }
          .pos-modal-body { padding: 16px; max-height: 300px; overflow-y: auto; background: #ffffff; }
          .pos-modal-footer { display: flex; gap: 8px; padding: 16px; border-top: 1px solid var(--color-border); justify-content: flex-end; background: #f8f9fa; border-radius: 0 0 var(--radius-lg) var(--radius-lg); }

          .pos-held-item { display: flex; justify-content: space-between; padding: 14px; background: #f8f9fa; border: 1px solid var(--color-border); border-radius: var(--radius-md); margin-bottom: 8px; cursor: pointer; transition: all 0.2s; }
          .pos-held-item:hover { border-color: var(--color-primary); background: #ffffff; transform: translateY(-1px); }
          
          ::-webkit-scrollbar { width: 4px; }
          ::-webkit-scrollbar-track { background: var(--color-bg-secondary); }
          ::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 2px; }
        </style>
      </head>
      <body>
        <div class="pos-container">
          <div class="pos-header">
            <div class="pos-header-left">
              <a href="/" class="pos-btn">Dashboard</a>
              <h1>Point of Sale</h1>
            </div>
            <div class="pos-header-right">
              <button class="pos-btn" onclick="showHeldOrders()">Hold (<span id="held-count">0</span>)</button>
              <button class="pos-btn" id="btn-transfer" style="display:none;" onclick="showTransfer()">Transfer</button>
            </div>
          </div>
          
          <div class="pos-left">
            <div class="pos-tables">
              <div class="pos-tables-header">
                <h2>Meja</h2>
                ${['super_admin', 'admin_restoran'].includes(user.role) ? `<button class="pos-btn" onclick="addTable()">+ Tambah</button>` : ''}
              </div>
              <div class="pos-tables-grid">
                ${tables.map(t => `<button class="pos-table ${t.status}" data-id="${t.id}" data-status="${t.status}" onclick="selectTable(${t.id},${t.tableNumber},'${t.status}')">${t.tableNumber}</button>`).join('')}
              </div>
              <div class="pos-tables-legend">
                <span><span class="pos-legend-dot" style="background:var(--color-success)"></span>Tersedia</span>
                <span><span class="pos-legend-dot" style="background:var(--color-error)"></span>Terisi</span>
                <span><span class="pos-legend-dot" style="background:var(--color-primary)"></span>Dipilih</span>
              </div>
            </div>
            
            <div class="pos-menu">
              <div class="pos-menu-header">
                <button class="pos-category active" onclick="filterCategory('all',this)">Semua</button>
                <button class="pos-category" onclick="filterCategory('makanan',this)">Makanan</button>
                <button class="pos-category" onclick="filterCategory('minuman',this)">Minuman</button>
                <input type="text" class="pos-search" placeholder="Cari menu..." oninput="searchMenu(this.value)">
              </div>
              <div class="pos-menu-table-wrap">
                <table class="pos-menu-table">
                  <thead>
                    <tr>
                      <th class="col-emoji"></th>
                      <th>Nama Menu</th>
                      <th class="col-price">Harga</th>
                      <th class="col-category">Kategori</th>
                    </tr>
                  </thead>
                  <tbody id="menu-table-body" style="background: #fafafa;">
                    ${menus.map((m,i) => `<tr data-category="${m.category}" data-name="${m.name.toLowerCase()}" onclick="addToCart(${m.id},'${m.name.replace(/'/g,"\\'")}',${m.price})">
                      <td class="col-emoji">${getMenuEmoji(m.category,i)}</td>
                      <td class="col-name">${m.name}</td>
                      <td class="col-price">Rp ${m.price.toLocaleString('id-ID')}</td>
                      <td class="col-category"><span class="badge badge-${m.category}">${m.category === 'makanan' ? 'Makanan' : 'Minuman'}</span></td>
                    </tr>`).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          
          <div class="pos-cart">
            <div class="pos-cart-header">
              <span class="pos-cart-title" id="cart-title">Pilih Meja</span>
            </div>
            <div class="pos-cart-meta" id="cart-meta" style="display:none;">
              <input type="number" id="guest-count" value="1" min="1" max="20" onchange="updateGuest(this.value)" placeholder="Tamu">
              <select id="order-type" onchange="updateType(this.value)">
                <option value="dine-in">Dine-in</option>
                <option value="takeaway">Takeaway</option>
              </select>
            </div>
            <div class="pos-cart-items" id="cart-items">
              <div class="pos-cart-empty">Pilih meja terlebih dahulu</div>
            </div>
            <div class="pos-cart-footer" id="cart-footer" style="display:none;">
              <div class="pos-cart-discount">
                <input type="number" id="discount-input" value="0" onchange="updateDiscount()" placeholder="Diskon">
                <select id="discount-type" onchange="updateDiscount()">
                  <option value="fixed">Rp</option>
                  <option value="percentage">%</option>
                </select>
              </div>
              <div class="pos-cart-summary">
                <div class="pos-cart-row"><span>Subtotal</span><span id="summary-subtotal">0</span></div>
                <div class="pos-cart-row"><span>Pajak (10%)</span><span id="summary-tax">0</span></div>
                <div class="pos-cart-row pos-cart-total"><span>TOTAL</span><span id="summary-total">0</span></div>
              </div>
              <div class="pos-payment" id="payment-section">
                <input type="number" id="paid-input" placeholder="Nominal pembayaran..." oninput="updatePaid(this.value)">
                <div class="pos-quick-pay">
                  <button onclick="setPaid('exact')">Uang Pas</button>
                  <button onclick="setPaid(50000)">50K</button>
                  <button onclick="setPaid(100000)">100K</button>
                  <button onclick="setPaid(200000)">200K</button>
                </div>
                <div class="pos-payment-row"><span>Bayar</span><span id="paid-amount">0</span></div>
                <div class="pos-payment-row"><span>Kembali</span><span id="paid-change" class="pos-payment-change">0</span></div>
                <button class="pos-btn pos-btn-success" style="width:100%;margin-top:8px;" onclick="processPayment()">BAYAR</button>
              </div>
              <div class="pos-cart-actions">
                <button class="pos-btn" onclick="holdOrder()">Hold</button>
                <button class="pos-btn pos-btn-primary" onclick="togglePayment()">Bayar</button>
                <button class="pos-btn pos-btn-danger" onclick="cancelOrder()">Batal</button>
                <button class="pos-btn" style="background:var(--color-text);color:#fff" onclick="printReceipt()">Cetak</button>
              </div>
            </div>
          </div>
        </div>
        
        <div class="pos-toast" id="toast" style="display:none;"></div>
        
        <div class="pos-modal" id="held-modal">
          <div class="pos-modal-backdrop" onclick="closeHeld()"></div>
          <div class="pos-modal-content">
            <div class="pos-modal-header"><h3>Pesanan Hold</h3><button class="pos-modal-close" onclick="closeHeld()">&times;</button></div>
            <div class="pos-modal-body" id="held-list"></div>
          </div>
        </div>
        
        <div class="pos-modal" id="transfer-modal">
          <div class="pos-modal-backdrop" onclick="closeTransfer()"></div>
          <div class="pos-modal-content">
            <div class="pos-modal-header"><h3>Transfer Meja</h3><button class="pos-modal-close" onclick="closeTransfer()">&times;</button></div>
            <div class="pos-modal-body">
              <p style="margin-bottom:12px;font-size:12px;color:var(--color-text-secondary)">Dari Meja <strong id="transfer-from"></strong> ke:</p>
              <div id="transfer-targets" style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;"></div>
            </div>
          </div>
        </div>
        
        <script>
        let currentOrderId = null;
        let currentUserId = ${user.userId};
        let selectedTableId = null;
        let currentTableNumber = null;
        let isServerOrder = false;
        let orderType = 'dine-in';
        let guestCount = 1;

        function toast(msg, type = 'success') {
          const t = document.getElementById('toast');
          t.textContent = msg;
          t.className = 'pos-toast pos-toast-' + type;
          t.style.display = 'block';
          setTimeout(() => t.style.display = 'none', 3000);
        }

        function filterCategory(cat, btn) {
          document.querySelectorAll('.pos-category').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const search = document.querySelector('.pos-search').value.toLowerCase();
          document.querySelectorAll('#menu-table-body tr').forEach(row => {
            const matchCat = cat === 'all' || row.dataset.category === cat;
            const matchSearch = !search || row.dataset.name.includes(search);
            row.style.display = (matchCat && matchSearch) ? '' : 'none';
          });
        }

        function searchMenu(query) {
          const active = document.querySelector('.pos-category.active');
          const cat = active?.textContent?.includes('Makanan') ? 'makanan' : active?.textContent?.includes('Minuman') ? 'minuman' : 'all';
          document.querySelectorAll('#menu-table-body tr').forEach(row => {
            const matchCat = cat === 'all' || row.dataset.category === cat;
            const matchSearch = !query || row.dataset.name.includes(query.toLowerCase());
            row.style.display = (matchCat && matchSearch) ? '' : 'none';
          });
        }

        function saveCart(cart) { localStorage.setItem('pos-cart', JSON.stringify(cart)); }
        function loadCart() { try { return JSON.parse(localStorage.getItem('pos-cart')); } catch { return null; } }
        function clearCart() { localStorage.removeItem('pos-cart'); }

        function getCart() {
          const c = loadCart();
          return c && c.tableId === selectedTableId ? c : null;
        }

        function addToCartLocal(id, name, price) {
          let c = getCart();
          if (!c) c = { tableId: selectedTableId, tableNumber: currentTableNumber, items: [], orderType, guestCount };
          const exist = c.items.find(i => i.menuId === id);
          if (exist) exist.quantity += 1;
          else c.items.push({ menuId: id, name, price, quantity: 1, notes: '' });
          saveCart(c);
          renderCart();
          const row = event.target.closest('tr');
          if (row) { row.classList.add('added'); setTimeout(() => row.classList.remove('added'), 200); }
          toast(name + ' ditambahkan');
        }

        function removeItem(id) {
          let c = getCart();
          if (!c) return;
          c.items = c.items.filter(i => i.menuId !== id);
          if (c.items.length === 0) clearCart();
          else saveCart(c);
          renderCart();
        }

        function qtyChange(id, delta) {
          let c = getCart();
          if (!c) return;
          const item = c.items.find(i => i.menuId === id);
          if (!item) return;
          item.quantity += delta;
          if (item.quantity <= 0) { removeItem(id); return; }
          saveCart(c);
          renderCart();
        }

        function editItemNotes(id) {
          let c = getCart();
          if (!c) return;
          const item = c.items.find(i => i.menuId === id);
          if (!item) return;
          const notes = prompt('Catatan untuk ' + item.name + ':', item.notes || '');
          if (notes !== null) {
            item.notes = notes;
            saveCart(c);
            renderCart();
          }
        }

        function renderCart() {
          const c = getCart();
          const itemsEl = document.getElementById('cart-items');
          const footer = document.getElementById('cart-footer');
          const meta = document.getElementById('cart-meta');

          if (!c || c.items.length === 0) {
            itemsEl.innerHTML = '<div class="pos-cart-empty">Pilih meja terlebih dahulu</div>';
            footer.style.display = 'none';
            meta.style.display = 'none';
            return;
          }

          footer.style.display = 'block';
          meta.style.display = 'flex';
          document.getElementById('guest-count').value = c.guestCount || 1;
          document.getElementById('order-type').value = c.orderType || 'dine-in';

          let html = '';
          c.items.forEach(item => {
            const notesHtml = item.notes ? '<div class="pos-cart-item-notes">' + item.notes + '</div>' : '';
            html += '<div class="pos-cart-item">' +
              '<div class="pos-cart-item-info"><div class="pos-cart-item-name">' + item.name + '</div>' +
              notesHtml +
              '<div class="pos-cart-item-qty"><button onclick="qtyChange(' + item.menuId + ',-1)">-</button><span>x' + item.quantity + '</span><button onclick="qtyChange(' + item.menuId + ',1)">+</button></div></div>' +
              '<div class="pos-cart-item-price">' + (item.price * item.quantity).toLocaleString('id-ID') + '</div>' +
              '<button class="pos-cart-item-notes-btn" onclick="editItemNotes(' + item.menuId + ')" title="Tambah catatan">📝</button>' +
              '<button class="pos-cart-item-remove" onclick="removeItem(' + item.menuId + ')">&times;</button></div>';
          });
          itemsEl.innerHTML = html;

          const subtotal = c.items.reduce((s, i) => s + i.price * i.quantity, 0);
          const tax = Math.round(subtotal * 0.1);
          const disc = parseInt(document.getElementById('discount-input').value) || 0;
          const discType = document.getElementById('discount-type').value;
          let discAmt = discType === 'percentage' ? Math.round(subtotal * disc / 100) : disc;
          if (discAmt > subtotal) discAmt = subtotal; // Validasi: diskon tidak boleh lebih dari subtotal
          const total = subtotal + tax - discAmt;

          document.getElementById('summary-subtotal').textContent = subtotal.toLocaleString('id-ID');
          document.getElementById('summary-tax').textContent = tax.toLocaleString('id-ID');
          document.getElementById('summary-total').textContent = total.toLocaleString('id-ID');
          document.getElementById('payment-section').classList.remove('show');
        }

        async function selectTable(id, num, status) {
          if (selectedTableId === id) {
            selectedTableId = null;
            currentTableNumber = null;
            currentOrderId = null;
            isServerOrder = false;
            document.querySelectorAll('.pos-table').forEach(b => b.classList.remove('selected'));
            document.getElementById('cart-title').textContent = 'Pilih Meja';
            document.getElementById('btn-transfer').style.display = 'none';
            document.getElementById('cart-items').innerHTML = '<div class="pos-cart-empty">Pilih meja terlebih dahulu</div>';
            document.getElementById('cart-footer').style.display = 'none';
            document.getElementById('cart-meta').style.display = 'none';
            return;
          }

          document.querySelectorAll('.pos-table').forEach(b => b.classList.remove('selected'));
          document.querySelector('[data-id="' + id + '"]').classList.add('selected');
          selectedTableId = id;
          currentTableNumber = num;
          currentOrderId = null;
          isServerOrder = false;

          if (status === 'occupied') {
            const res = await fetch('/api/orders/table/' + id);
            const data = await res.json();
            if (data.order) {
              currentOrderId = data.order.id;
              isServerOrder = true;
              document.getElementById('cart-title').textContent = 'Meja ' + num;
              document.getElementById('btn-transfer').style.display = 'inline';
              renderServerCart(data.order, data.items);
            }
            return;
          }

          const local = loadCart();
          if (local && local.tableId === id) {
            document.getElementById('cart-title').textContent = 'Meja ' + num;
            renderCart();
            return;
          }

          clearCart();
          orderType = 'dine-in';
          guestCount = 1;
          document.getElementById('cart-title').textContent = 'Meja ' + num;
          document.getElementById('cart-items').innerHTML = '<div class="pos-cart-empty">Meja ' + num + ' - Tambahkan menu</div>';
          document.getElementById('cart-footer').style.display = 'none';
          document.getElementById('cart-meta').style.display = 'none';
        }

        function renderServerCart(order, items) {
          document.getElementById('cart-meta').style.display = 'flex';
          document.getElementById('cart-footer').style.display = 'block';
          
          let html = '';
          items.forEach(item => {
            html += '<div class="pos-cart-item">' +
              '<div class="pos-cart-item-info"><div class="pos-cart-item-name">' + (item.menuName || 'Item') + '</div>' +
              '<div class="pos-cart-item-qty"><button onclick="updateServerQty(' + item.id + ',-1)">-</button><span>x' + item.quantity + '</span><button onclick="updateServerQty(' + item.id + ',1)">+</button></div></div>' +
              '<div class="pos-cart-item-price">' + (item.priceAtOrder * item.quantity).toLocaleString('id-ID') + '</div>' +
              '<button class="pos-cart-item-remove" onclick="removeServerItem(' + item.id + ')">&times;</button></div>';
          });
          document.getElementById('cart-items').innerHTML = html;

          document.getElementById('summary-subtotal').textContent = (order.subtotal || 0).toLocaleString('id-ID');
          document.getElementById('summary-tax').textContent = (order.tax || 0).toLocaleString('id-ID');
          document.getElementById('summary-total').textContent = (order.total || 0).toLocaleString('id-ID');
          document.getElementById('payment-section').classList.remove('show');
        }

        function addToCart(id, name, price) {
          if (!selectedTableId) { toast('Pilih meja terlebih dahulu!', 'warning'); return; }
          if (isServerOrder && currentOrderId) { addToCartServer(id); }
          else { addToCartLocal(id, name, price); }
        }

        async function addToCartServer(menuId) {
          const res = await fetch('/api/orders/' + currentOrderId + '/items', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ menuId, quantity: 1 }) });
          if (res.ok) {
            const data = await res.json();
            renderServerCart(data.order, data.items);
            toast('Item ditambahkan');
          }
        }

        async function updateServerQty(itemId, delta) {
          const span = document.querySelector('[onclick*="updateServerQty(' + itemId + '"]')?.parentElement?.querySelector('span');
          const qty = parseInt(span?.textContent?.replace('x','') || '1') + delta;
          if (qty <= 0) { removeServerItem(itemId); return; }
          await fetch('/api/orders/' + currentOrderId + '/items/' + itemId, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ quantity: qty }) });
          const res = await fetch('/api/orders/' + currentOrderId);
          const data = await res.json();
          if (data.order) renderServerCart(data.order, data.items);
        }

        async function removeServerItem(itemId) {
          await fetch('/api/orders/' + currentOrderId + '/items/' + itemId, { method: 'DELETE' });
          const res = await fetch('/api/orders/' + currentOrderId);
          const data = await res.json();
          if (data.order) renderServerCart(data.order, data.items);
        }

        function updateGuest(val) { guestCount = parseInt(val) || 1; }
        function updateType(val) { orderType = val; }
        function updateDiscount() { if (getCart()) renderCart(); }

        function togglePayment() {
          const section = document.getElementById('payment-section');
          if (section.classList.contains('show')) {
            section.classList.remove('show');
          } else {
            if (!getCart() && !isServerOrder) { toast('Cart kosong!', 'warning'); return; }
            section.classList.add('show');
            document.getElementById('paid-input').value = '';
            document.getElementById('paid-amount').textContent = '0';
            document.getElementById('paid-change').textContent = '0';
            setTimeout(() => document.getElementById('paid-input').focus(), 100);
          }
        }

        function updatePaid(val) {
          const total = parseInt(document.getElementById('summary-total').textContent.replace(/\./g,'')) || 0;
          const paid = parseInt(val) || 0;
          document.getElementById('paid-amount').textContent = paid.toLocaleString('id-ID');
          const change = paid - total;
          document.getElementById('paid-change').textContent = change >= 0 ? change.toLocaleString('id-ID') : 'Kurang ' + Math.abs(change).toLocaleString('id-ID');
          document.getElementById('paid-change').style.color = change >= 0 ? 'var(--color-success)' : 'var(--color-error)';
        }

        function setPaid(amount) {
          const total = parseInt(document.getElementById('summary-total').textContent.replace(/\./g,'')) || 0;
          const paid = amount === 'exact' ? total : amount;
          document.getElementById('paid-input').value = paid;
          updatePaid(paid);
        }

        async function processPayment() {
          const total = parseInt(document.getElementById('summary-total').textContent.replace(/\./g,'')) || 0;
          const paid = parseInt(document.getElementById('paid-input').value) || 0;
          if (paid < total) { toast('Uang kurang!', 'error'); return; }
          
          if (!isServerOrder && !currentOrderId) {
            const cart = getCart();
            const res = await fetch('/api/orders/with-items', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tableId: cart.tableId, userId: currentUserId, items: cart.items.map(i => ({ menuId: i.menuId, quantity: i.quantity, notes: i.notes || '' })) }) });
            const data = await res.json();
            if (data.error) { toast(data.error, 'error'); return; }
            currentOrderId = data.order.id;
            isServerOrder = true;
            clearCart();
          }

          const res = await fetch('/api/orders/' + currentOrderId + '/pay', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amountPaid: paid }) });
          const data = await res.json();
          if (data.error) { toast(data.error, 'error'); }
          else { toast('Pembayaran berhasil!'); printReceipt(); resetAfterPayment(); }
        }

        function resetAfterPayment() {
          currentOrderId = null;
          isServerOrder = false;
          selectedTableId = null;
          currentTableNumber = null;
          document.querySelectorAll('.pos-table').forEach(b => b.classList.remove('selected'));
          document.getElementById('cart-title').textContent = 'Pilih Meja';
          document.getElementById('btn-transfer').style.display = 'none';
          document.getElementById('cart-items').innerHTML = '<div class="pos-cart-empty">Pilih meja terlebih dahulu</div>';
          document.getElementById('cart-footer').style.display = 'none';
          document.getElementById('cart-meta').style.display = 'none';
          document.getElementById('payment-section').classList.remove('show');
        }

        function printReceipt() {
          const cart = getCart();
          if (!cart || cart.items.length === 0) { toast('Tidak ada item di cart!', 'warning'); return; }
          const subtotal = cart.items.reduce((s, i) => s + i.price * i.quantity, 0);
          const tax = Math.round(subtotal * 0.1);
          const disc = parseInt(document.getElementById('discount-input').value) || 0;
          const discType = document.getElementById('discount-type').value;
          const discAmt = discType === 'percentage' ? Math.round(subtotal * disc / 100) : disc;
          const total = subtotal + tax - discAmt;
          
          const receiptHtml = '<div style="font-family:monospace;font-size:12px;padding:10px;max-width:300px;">' +
            '<div style="text-align:center;border-bottom:1px dashed #000;padding-bottom:8px;margin-bottom:8px;">' +
            '<strong>RESTORAN</strong><br>Jl. Contoh No.123<br>Telp: 012-3456789</div>' +
            '<div style="margin-bottom:8px;">Meja: ' + (cart.tableNumber || '-') + ' | Tamu: ' + (cart.guestCount || 1) + '</div>' +
            '<div style="margin-bottom:8px;">' + new Date().toLocaleString('id-ID') + '</div>' +
            '<div style="border-bottom:1px dashed #000;padding-bottom:4px;margin-bottom:8px;">' +
            cart.items.map(i => '<div style="display:flex;justify-content:space-between;"><span>' + i.quantity + 'x ' + i.name + '</span><span>' + (i.price * i.quantity).toLocaleString('id-ID') + '</span></div>' + (i.notes ? '<div style="font-size:10px;color:#666;margin-left:10px;">* ' + i.notes + '</div>' : '')).join('') +
            '</div>' +
            '<div style="display:flex;justify-content:space-between;"><span>Subtotal</span><span>' + subtotal.toLocaleString('id-ID') + '</span></div>' +
            '<div style="display:flex;justify-content:space-between;"><span>Pajak (10%)</span><span>' + tax.toLocaleString('id-ID') + '</span></div>' +
            (discAmt > 0 ? '<div style="display:flex;justify-content:space-between;"><span>Diskon</span><span>-' + discAmt.toLocaleString('id-ID') + '</span></div>' : '') +
            '<div style="display:flex;justify-content:space-between;font-weight:bold;border-top:1px dashed #000;padding-top:4px;margin-top:4px;"><span>TOTAL</span><span>' + total.toLocaleString('id-ID') + '</span></div>' +
            '<div style="text-align:center;margin-top:12px;font-size:10px;">Terima kasih atas kunjungan Anda!</div>' +
            '</div>';
          
          const printWindow = window.open('', '', 'width=300,height=500');
          printWindow.document.write('<html><head><title>Struk</title></head><body>' + receiptHtml + '</body></html>');
          printWindow.document.close();
          printWindow.print();
        }

        function holdOrder() {
          const cart = getCart();
          if (!cart || cart.items.length === 0) { toast('Cart kosong!', 'warning'); return; }
          const held = JSON.parse(localStorage.getItem('pos-held') || '[]');
          held.push({ ...cart, heldAt: new Date().toISOString() });
          localStorage.setItem('pos-held', JSON.stringify(held));
          clearCart();
          renderCart();
          updateHeldCount();
          toast('Pesanan dihold');
        }

        function showHeldOrders() {
          const held = JSON.parse(localStorage.getItem('pos-held') || '[]');
          const list = document.getElementById('held-list');
          if (held.length === 0) { list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--color-text-secondary)">Tidak ada pesanan hold</div>'; }
          else { list.innerHTML = held.map((h, i) => '<div class="pos-held-item" onclick="recallOrder(' + i + ')"><div><strong>Meja ' + h.tableNumber + '</strong><div style="font-size:11px;color:var(--color-text-secondary)">' + h.items.map(i => i.name + ' x' + i.quantity).join(', ') + '</div></div><div style="font-size:11px">' + new Date(h.heldAt).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}) + '</div></div>').join(''); }
          document.getElementById('held-modal').classList.add('show');
        }

        function closeHeld() { document.getElementById('held-modal').classList.remove('show'); }

        function recallOrder(index) {
          const held = JSON.parse(localStorage.getItem('pos-held') || '[]');
          const order = held.splice(index, 1)[0];
          localStorage.setItem('pos-held', JSON.stringify(held));
          selectedTableId = order.tableId;
          currentTableNumber = order.tableNumber;
          orderType = order.orderType || 'dine-in';
          guestCount = order.guestCount || 1;
          saveCart(order);
          document.querySelectorAll('.pos-table').forEach(b => b.classList.remove('selected'));
          const btn = document.querySelector('[data-id="' + order.tableId + '"]');
          if (btn) btn.classList.add('selected');
          document.getElementById('cart-title').textContent = 'Meja ' + order.tableNumber;
          renderCart();
          updateHeldCount();
          closeHeld();
          toast('Pesanan dipanggil');
        }

        function updateHeldCount() {
          const held = JSON.parse(localStorage.getItem('pos-held') || '[]');
          document.getElementById('held-count').textContent = held.length;
        }

        function showTransfer() {
          if (!currentOrderId) return;
          document.getElementById('transfer-from').textContent = currentTableNumber;
          const targets = document.getElementById('transfer-targets');
          targets.innerHTML = '';
          document.querySelectorAll('.pos-table.available').forEach(btn => {
            const id = parseInt(btn.dataset.id);
            const num = parseInt(btn.textContent);
            const el = document.createElement('button');
            el.className = 'pos-table available';
            el.style.cssText = 'aspect-ratio:1;cursor:pointer;';
            el.textContent = num;
            el.onclick = () => transferTable(id, num);
            targets.appendChild(el);
          });
          document.getElementById('transfer-modal').classList.add('show');
        }

        function closeTransfer() { document.getElementById('transfer-modal').classList.remove('show'); }

        async function transferTable(newId, newNum) {
          const res = await fetch('/api/orders/' + currentOrderId + '/transfer', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ newTableId: newId }) });
          const data = await res.json();
          if (data.error) { toast(data.error, 'error'); return; }
          toast('Dipindah ke Meja ' + newNum);
          currentTableNumber = newNum;
          selectedTableId = newId;
          document.getElementById('cart-title').textContent = 'Meja ' + newNum;
          document.querySelectorAll('.pos-table').forEach(b => b.classList.remove('selected'));
          document.querySelector('[data-id="' + newId + '"]')?.classList.add('selected');
          closeTransfer();
        }

        function cancelOrder() {
          if (!currentOrderId && !getCart()) { toast('Tidak ada pesanan', 'warning'); return; }
          if (isServerOrder && currentOrderId) {
            if (!confirm('Batalkan pesanan?')) return;
            fetch('/api/orders/' + currentOrderId + '/cancel', { method: 'POST' });
            toast('Pesanan dibatalkan');
          } else {
            clearCart();
            toast('Cart dikosongkan');
          }
          resetAfterPayment();
        }

        async function addTable() {
          const num = prompt('Nomor Meja:');
          if (!num) return;
          await fetch('/api/tables', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tableNumber: parseInt(num) }) });
          location.reload();
        }

        document.addEventListener('keydown', e => {
          if (e.ctrlKey && e.key === 'f') { e.preventDefault(); document.querySelector('.pos-search').focus(); }
          if (e.ctrlKey && e.key === 'h') { e.preventDefault(); holdOrder(); }
          if (e.key === 'Escape') {
            selectedTableId = null; currentTableNumber = null; currentOrderId = null; isServerOrder = false;
            document.querySelectorAll('.pos-table').forEach(b => b.classList.remove('selected'));
            document.getElementById('cart-title').textContent = 'Pilih Meja';
            document.getElementById('btn-transfer').style.display = 'none';
            document.getElementById('cart-items').innerHTML = '<div class="pos-cart-empty">Pilih meja terlebih dahulu</div>';
            document.getElementById('cart-footer').style.display = 'none';
            document.getElementById('cart-meta').style.display = 'none';
            document.querySelectorAll('.pos-modal.show').forEach(m => m.classList.remove('show'));
          }
        });

        document.addEventListener('DOMContentLoaded', () => {
          updateHeldCount();
          const saved = loadCart();
          if (saved && saved.tableId) {
            const btn = document.querySelector('[data-id="' + saved.tableId + '"]');
            if (btn) {
              selectedTableId = saved.tableId;
              currentTableNumber = saved.tableNumber;
              btn.classList.add('selected');
              document.getElementById('cart-title').textContent = 'Meja ' + saved.tableNumber;
              document.getElementById('cart-meta').style.display = 'flex';
              renderCart();
            }
          }
        });
      </script>
      ${getCommonScripts()}
    `);
  });
