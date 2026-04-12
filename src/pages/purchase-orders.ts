import { Elysia } from 'elysia';
import { htmlResponse } from '../templates/html';
import { getSidebarHtml } from '../templates/sidebar';
import { getNavbarHtml } from '../templates/navbar';
import { getFooterHtml } from '../templates/footer';
import { getCommonScripts } from '../templates/common-scripts';
import { getTokenFromCookies, verifyToken, redirectToLogin } from '../utils/auth';

function statusBadge(s) {
  if (s === 'received') return 'badge-success';
  if (s === 'cancelled') return 'badge-error';
  if (s === 'ordered') return 'badge-warning';
  return 'badge-info';
}
function statusLabel(s) {
  return { draft: 'Draft', ordered: 'Ordered', received: 'Diterima', cancelled: 'Dibatalkan' }[s] || s;
}

export const purchaseOrdersPage = new Elysia()
  .get('/purchase-orders', async ({ cookie, headers }) => {
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
    if (!['super_admin', 'admin_restoran'].includes(user.role)) return new Response('Akses ditolak', { status: 403 });

    return htmlResponse(`
      <div class="app-layout">
        ${getSidebarHtml('purchase-orders', user)}
        <div class="app-content">
          ${getNavbarHtml('Purchase Order', 'purchase-orders', user)}
          <main class="app-main">
            <div class="page-header">
              <h2>Purchase Orders</h2>
              <button class="btn btn-primary" onclick="openPOModal()">+ Buat PO Baru</button>
            </div>
            <div class="card">
              <div class="table-container">
                <table class="table">
                  <thead><tr><th>No. PO</th><th>Supplier</th><th>Tanggal</th><th>Total</th><th>Status</th><th>Aksi</th></tr></thead>
                  <tbody id="po-tbody"><tr><td colspan="6" class="text-center text-secondary" style="padding:40px;">Loading...</td></tr></tbody>
                </table>
              </div>
            </div>
          </main>
          ${getFooterHtml()}
        </div>
      </div>

      <div class="modal-backdrop" id="po-modal" style="display:none;">
        <div class="modal show">
          <div class="modal-content" style="max-width:800px;">
            <div class="modal-header"><h3 id="po-modal-title">Buat PO Baru</h3><button onclick="closePOModal()" class="modal-close">&times;</button></div>
            <div class="modal-body">
              <form id="po-form">
                <input type="hidden" id="po-id">
                <div class="form-grid">
                  <div class="form-group"><label class="form-label">Supplier *</label><select id="po-supplier" class="input" required></select></div>
                  <div class="form-group"><label class="form-label">Estimasi Tiba</label><input type="date" id="po-delivery" class="input"></div>
                  <div class="form-group" style="grid-column:span 2;"><label class="form-label">Catatan</label><textarea id="po-notes" class="input" rows="2"></textarea></div>
                </div>
                <h4 style="margin:16px 0 8px;">Item Pesanan</h4>
                <div class="table-container">
                  <table class="table">
                    <thead><tr><th>Bahan Baku</th><th>Qty</th><th>Unit</th><th>Harga/Unit</th><th>Total</th><th></th></tr></thead>
                    <tbody id="po-items-tbody"></tbody>
                  </table>
                </div>
                <button type="button" class="btn btn-secondary" style="margin:12px 0;" onclick="addPOItem()">+ Tambah Item</button>
                <div style="text-align:right;font-size:18px;font-weight:700;margin:12px 0;">Subtotal: <span id="po-subtotal">Rp 0</span></div>
              </form>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" onclick="closePOModal()">Batal</button>
              <button type="submit" form="po-form" class="btn btn-primary">Simpan</button>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-backdrop" id="po-detail-modal" style="display:none;">
        <div class="modal show">
          <div class="modal-content" style="max-width:800px;">
            <div class="modal-header"><h3 id="po-detail-title">Detail PO</h3><button onclick="closePODetail()" class="modal-close">&times;</button></div>
            <div class="modal-body" id="po-detail-content"></div>
          </div>
        </div>
      </div>

      <style>
        .page-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; }
        .form-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
        .form-group { display:flex; flex-direction:column; gap:4px; }
        .form-label { font-size:14px; font-weight:500; color:var(--color-text-secondary); }
      </style>
      ${getCommonScripts()}
      <script>
        let suppliers = [];
        let ingredients = [];
        let poItems = [];

        async function loadPOs() {
          try {
            const [poRes, supRes, ingRes] = await Promise.all([
              fetch('/api/purchase-orders'),
              fetch('/api/suppliers/active'),
              fetch('/api/inventory/ingredients')
            ]);
            const pos = await poRes.json();
            suppliers = await supRes.json();
            ingredients = await ingRes.json();

            const supMap = {};
            suppliers.forEach(s => supMap[s.id] = s.name);
            const tbody = document.getElementById('po-tbody');
            if (!pos.length) { tbody.innerHTML = '<tr><td colspan="6" class="text-center text-secondary">Tidak ada data</td></tr>'; return; }
            tbody.innerHTML = pos.map(po => '<tr><td><strong>' + po.poNumber + '</strong></td><td>' + (supMap[po.supplierId] || '-') + '</td><td>' + new Date(po.orderDate).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' }) + '</td><td>Rp ' + (po.subtotal || 0).toLocaleString('id-ID') + '</td><td><span class="badge ' + statusBadge(po.status) + '">' + statusLabel(po.status) + '</span></td><td><button class="btn btn-secondary btn-sm" onclick="viewPO(' + po.id + ')">Detail</button></td></tr>').join('');

            const sel = document.getElementById('po-supplier');
            sel.innerHTML = '<option value="">-- Pilih Supplier --</option>' + suppliers.map(s => '<option value="' + s.id + '">' + s.name + '</option>').join('');
          } catch (e) {
            document.getElementById('po-tbody').innerHTML = '<tr><td colspan="6" class="text-center text-secondary">Gagal memuat data: ' + e.message + '</td></tr>';
          }
        }

        function statusBadge(s) { return {received:'badge-success',cancelled:'badge-error',ordered:'badge-warning',draft:'badge-info'}[s]||''; }
        function statusLabel(s) { return {draft:'Draft',ordered:'Ordered',received:'Diterima',cancelled:'Dibatalkan'}[s]||s; }

        function openPOModal() {
          document.getElementById('po-modal').style.display = 'flex';
          document.getElementById('po-modal-title').textContent = 'Buat PO Baru';
          document.getElementById('po-id').value = '';
          document.getElementById('po-form').reset();
          poItems = [];
          renderPOItems();
        }
        function closePOModal() { document.getElementById('po-modal').style.display = 'none'; }

        function addPOItem() {
          poItems.push({ ingredientId: '', quantity: '', unit: 'kg', unitPrice: 0 });
          renderPOItems();
        }
        function removePOItem(idx) { poItems.splice(idx, 1); renderPOItems(); }

        function renderPOItems() {
          const tbody = document.getElementById('po-items-tbody');
          const ingOpts = '<option value="">-- Pilih --</option>' + ingredients.map(i => '<option value="' + i.id + '">' + i.name + '</option>').join('');
          tbody.innerHTML = poItems.map((item, idx) => '<tr><td><select class="input" onchange="poItems[' + idx + '].ingredientId=this.value">' + ingOpts + '</select></td><td><input type="number" class="input" style="width:80px;" value="' + item.quantity + '" onchange="poItems[' + idx + '].quantity=this.value"></td><td><select class="input" style="width:80px;" onchange="poItems[' + idx + '].unit=this.value"><option value="kg" ' + (item.unit==='kg'?'selected':'') + '>kg</option><option value="liter" ' + (item.unit==='liter'?'selected':'') + '>liter</option><option value="pcs" ' + (item.unit==='pcs'?'selected':'') + '>pcs</option></select></td><td><input type="number" class="input" style="width:120px;" value="' + item.unitPrice + '" onchange="poItems[' + idx + '].unitPrice=parseInt(this.value)"></td><td>Rp ' + ((parseFloat(item.quantity)||0) * (item.unitPrice||0)).toLocaleString('id-ID') + '</td><td><button type="button" class="btn btn-icon" onclick="removePOItem(' + idx + ')">&times;</button></td></tr>').join('');
          poItems.forEach((item, idx) => {
            const sel = tbody.querySelectorAll('select')[idx * 2];
            if (sel && item.ingredientId) sel.value = item.ingredientId;
          });
          const subtotal = poItems.reduce((s, i) => s + (parseFloat(i.quantity)||0) * (i.unitPrice||0), 0);
          document.getElementById('po-subtotal').textContent = 'Rp ' + Math.round(subtotal).toLocaleString('id-ID');
        }

        document.getElementById('po-form').addEventListener('submit', async (e) => {
          e.preventDefault();
          const id = document.getElementById('po-id').value;
          const items = poItems.filter(i => i.ingredientId && i.quantity && i.unitPrice);
          if (!items.length) { alert('Tambahkan minimal 1 item'); return; }
          const data = { supplierId: parseInt(document.getElementById('po-supplier').value), items, notes: document.getElementById('po-notes').value, expectedDeliveryDate: document.getElementById('po-delivery').value || null, createdBy: ${user.userId} };
          if (id) { await fetch('/api/purchase-orders/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); }
          else { await fetch('/api/purchase-orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); }
          closePOModal(); loadPOs();
        });

        async function viewPO(id) {
          const res = await fetch('/api/purchase-orders/' + id);
          const data = await res.json();
          if (!data.po) return;
          const po = data.po;
          const items = data.items || [];
          document.getElementById('po-detail-title').textContent = po.poNumber;
          let html = '<p><strong>Supplier:</strong> ' + (suppliers.find(s=>s.id===po.supplierId)?.name || '-') + '</p>';
          html += '<p><strong>Tanggal:</strong> ' + new Date(po.orderDate).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' }) + ' | <strong>Status:</strong> <span class="badge ' + statusBadge(po.status) + '">' + statusLabel(po.status) + '</span></p>';
          html += '<table class="table"><thead><tr><th>Bahan</th><th>Qty</th><th>Unit</th><th>Harga</th><th>Total</th></tr></thead><tbody>';
          for (const item of items) {
            const ing = ingredients.find(i => i.id === item.ingredientId);
            html += '<tr><td>' + (ing?.name || '-') + '</td><td>' + item.quantity + '</td><td>' + item.unit + '</td><td>Rp ' + (item.unitPrice||0).toLocaleString('id-ID') + '</td><td>Rp ' + (item.totalPrice||0).toLocaleString('id-ID') + '</td></tr>';
          }
          html += '</tbody></table>';
          html += '<p style="text-align:right;font-size:18px;font-weight:700;margin-top:16px;">Subtotal: Rp ' + (po.subtotal||0).toLocaleString('id-ID') + '</p>';
          html += '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px;">';
          if (po.status === 'draft') {
            html += '<button class="btn btn-warning" onclick="sendPO(' + po.id + ')">Kirim PO</button>';
            html += '<button class="btn btn-error" onclick="cancelPO(' + po.id + ')">Batalkan</button>';
          }
          if (po.status === 'ordered') {
            html += '<button class="btn btn-success" onclick="receivePO(' + po.id + ')">Terima Barang</button>';
          }
          html += '</div>';
          document.getElementById('po-detail-content').innerHTML = html;
          document.getElementById('po-detail-modal').style.display = 'flex';
        }
        function closePODetail() { document.getElementById('po-detail-modal').style.display = 'none'; }

        async function sendPO(id) { await fetch('/api/purchase-orders/' + id + '/status', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'ordered' }) }); closePODetail(); loadPOs(); }
        async function cancelPO(id) { await fetch('/api/purchase-orders/' + id + '/status', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'cancelled' }) }); closePODetail(); loadPOs(); }
        async function receivePO(id) { await fetch('/api/purchase-orders/' + id + '/receive', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ receivedBy: ${user.userId} }) }); closePODetail(); loadPOs(); }

        loadPOs();
      </script>
    `);
  });
