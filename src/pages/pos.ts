import { Elysia } from 'elysia';
import { htmlResponse } from '../templates/html';
import { getCommonScripts } from '../templates/common-scripts';
import { getTokenFromCookies, verifyToken, redirectToLogin } from '../utils/auth';
import { readFileSync } from 'fs';
import { join } from 'path';

const posClientContent = readFileSync(join(__dirname, 'pos-client.ts'), 'utf-8');

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

    const getMenuEmoji = (category: string, index: number) => {
      const MENU_EMOJI: Record<string, string[]> = {
        makanan: ['🍛', '🍜', '🍗', '🍚', '🥘', '🍲', '🥩', '🍖', '🌮', '🍔'],
        minuman: ['🥤', '🧃', '☕', '🍵', '🥛', '🧊', '🍹', '🥝', '🍋', '🫖'],
      };
      const list = MENU_EMOJI[category] ?? ['🍽️'];
      return list[index % list.length];
    };

    return htmlResponse(`
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Point of Sale</title>
        <link rel="stylesheet" href="/styles/global.css">
        <link rel="stylesheet" href="/styles/pos.css">
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
            <div class="pos-order-type-selection" id="order-type-selection">
              <button class="pos-btn pos-btn-order-type" onclick="startDineIn()">
                <span style="font-size: 24px;">🍽️</span>
                <span style="font-weight: 600;">Dine-in</span>
                <span style="font-size: 11px; opacity: 0.8;">Makan di tempat</span>
              </button>
              <button class="pos-btn pos-btn-order-type" onclick="startTakeaway()">
                <span style="font-size: 24px;">🥡</span>
                <span style="font-weight: 600;">Takeaway</span>
                <span style="font-size: 11px; opacity: 0.8;">Bawa pulang</span>
              </button>
            </div>
            <div class="pos-tables" id="pos-tables" style="display: none;">
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
                    ${menus.map((m,i) => `<tr data-category="${m.category}" data-name="${m.name.toLowerCase()}" onclick="addToCart(${m.id},'${m.name.replace(/'/g,"\\'")}',${m.price}, event)">
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
              <span class="pos-cart-title" id="cart-title">Pilih Jenis Pesanan</span>
            </div>
            <div class="pos-cart-meta" id="cart-meta" style="display:none;">
              <input type="number" id="guest-count" value="1" min="1" max="20" onchange="state.guestCount = parseInt(this.value) || 1" placeholder="Tamu">
              <select id="order-type" onchange="state.orderType = this.value">
                <option value="dine-in">Dine-in</option>
                <option value="takeaway">Takeaway</option>
              </select>
            </div>
            <div class="pos-cart-items" id="cart-items">
              <div class="pos-cart-empty">Pilih meja terlebih dahulu</div>
            </div>
            <div class="pos-cart-footer" id="cart-footer" style="display:none;">
              <div class="pos-cart-discount">
                <label style="font-size:10px;font-weight:600;display:block;margin-bottom:4px;">Diskon</label>
                <input type="number" id="discount-input" value="0" onchange="renderCart()" placeholder="0">
                <select id="discount-type" onchange="renderCart()">
                  <option value="fixed">Rp</option>
                  <option value="percentage">%</option>
                </select>
              </div>
              <div class="pos-cart-summary">
                <div class="pos-cart-row"><span>Subtotal</span><span id="summary-subtotal">0</span></div>
                <div class="pos-cart-row"><span>Pajak (10%)</span><span id="summary-tax">0</span></div>
                <div class="pos-cart-row pos-cart-total"><span>TOTAL</span><span id="summary-total">0</span></div>
              </div>
              <div class="pos-payment show" id="payment-section">
                <input type="number" id="paid-input" placeholder="Nominal pembayaran..." oninput="updatePaid(this.value)">
                <div class="pos-quick-pay">
                  <button onclick="setPaid('exact')">Uang Pas</button>
                  <button onclick="setPaid(50000)">50K</button>
                  <button onclick="setPaid(100000)">100K</button>
                  <button onclick="setPaid(200000)">200K</button>
                </div>
                <div class="pos-payment-row"><span>Bayar</span><span id="paid-amount">0</span></div>
                <div class="pos-payment-row"><span>Kembali</span><span id="paid-change" class="pos-payment-change">0</span></div>
                <button class="pos-btn pos-btn-success" style="width:100%;margin-top:8px;" onclick="showPaymentConfirmation()">BAYAR</button>
              </div>
              <div class="pos-cart-actions">
                <button class="pos-btn" onclick="holdOrder()">Hold</button>
                <button class="pos-btn" id="btn-kosongkan" style="display:none;" onclick="kosongkanMeja()">Kosongkan</button>
                <button class="pos-btn pos-btn-danger" onclick="cancelOrder()">Batal</button>
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
        
        <div class="pos-modal" id="payment-confirm-modal">
          <div class="pos-modal-backdrop" onclick="closePaymentConfirm()"></div>
          <div class="pos-modal-content" style="max-width:360px;">
            <div class="pos-modal-header"><h3>Konfirmasi Pembayaran</h3><button class="pos-modal-close" onclick="closePaymentConfirm()">&times;</button></div>
            <div class="pos-modal-body">
              <div style="background:var(--color-bg-secondary);padding:16px;border-radius:8px;margin-bottom:16px;">
                <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                  <span style="color:var(--color-text-secondary);font-size:12px;">Jenis Pesanan</span>
                  <span style="font-weight:600;" id="confirm-order-type">-</span>
                </div>
                <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                  <span style="color:var(--color-text-secondary);font-size:12px;">Meja</span>
                  <span style="font-weight:600;" id="confirm-table-info">-</span>
                </div>
                <div style="display:flex;justify-content:space-between;padding-top:8px;border-top:1px dashed var(--color-border);">
                  <span style="font-weight:600;">Total Bayar</span>
                  <span style="font-weight:600;font-size:18px;color:var(--color-success);" id="confirm-total">0</span>
                </div>
                <div style="display:flex;justify-content:space-between;margin-top:8px;">
                  <span style="color:var(--color-text-secondary);font-size:12px;">Uang Diterima</span>
                  <span style="font-weight:600;" id="confirm-paid">0</span>
                </div>
                <div style="display:flex;justify-content:space-between;">
                  <span style="color:var(--color-text-secondary);font-size:12px;">Kembali</span>
                  <span style="font-weight:600;color:var(--color-primary);" id="confirm-change">0</span>
                </div>
              </div>
              <p style="font-size:11px;color:var(--color-text-secondary);text-align:center;margin-bottom:16px;">
                ⚠️ Pembayaran tidak dapat dibatalkan setelah konfirmasi!
              </p>
              <div style="display:flex;gap:8px;">
                <button class="pos-btn" style="flex:1;" onclick="closePaymentConfirm()">Batal</button>
                <button class="pos-btn pos-btn-success" style="flex:1;" onclick="confirmPayment()">Konfirmasi Bayar</button>
              </div>
            </div>
          </div>
        </div>
        
        <div class="pos-modal" id="kosongkan-meja-modal">
          <div class="pos-modal-backdrop" onclick="closeKosongkanModal()"></div>
          <div class="pos-modal-content" style="max-width:360px;">
            <div class="pos-modal-header"><h3>Kosongkan Meja</h3><button class="pos-modal-close" onclick="closeKosongkanModal()">&times;</button></div>
            <div class="pos-modal-body">
              <div style="background:var(--color-bg-secondary);padding:16px;border-radius:8px;margin-bottom:16px;">
                <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                  <span style="color:var(--color-text-secondary);font-size:12px;">Meja</span>
                  <span style="font-weight:600;" id="kosongkan-table-num">-</span>
                </div>
                <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                  <span style="color:var(--color-text-secondary);font-size:12px;">Status Pesanan</span>
                  <span style="font-weight:600;" id="kosongkan-order-status">-</span>
                </div>
              </div>
              <p style="font-size:11px;color:var(--color-text-secondary);text-align:center;margin-bottom:16px;">
                ⚠️ Meja akan dikosongkan dan pesanan akan diselesaikan.
              </p>
              <div style="display:flex;gap:8px;">
                <button class="pos-btn" style="flex:1;" onclick="closeKosongkanModal()">Batal</button>
                <button class="pos-btn pos-btn-success" style="flex:1;" onclick="confirmKosongkanMeja()">Konfirmasi</button>
              </div>
            </div>
          </div>
        </div>
        
        <script>
          var currentUserId = ${user.userId};
        </script>
        <script src="/pages/pos-client.ts"></script>
        ${getCommonScripts()}
      `);
  });