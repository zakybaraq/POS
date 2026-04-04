import { Elysia } from 'elysia';
import { htmlResponse } from '../templates/html';
import { getSidebarHtml } from '../templates/sidebar';
import { getNavbarHtml } from '../templates/navbar';
import { getFooterHtml } from '../templates/footer';
import { getCommonScripts } from '../templates/common-scripts';
import { getTokenFromCookies, verifyToken, redirectToLogin } from '../utils/auth';

const AREA_EMOJI: Record<string, string> = { indoor: '🏠', outdoor: '🌿', vip: '👑' };

export const tablesPage = new Elysia()
  .get('/tables', async ({ cookie, headers }) => {
    const token = getTokenFromCookies(cookie, headers);
    if (!token) return redirectToLogin();

    let user = null;
    try { user = verifyToken(token); } catch { return redirectToLogin(); }

    const tableRoles = ['super_admin', 'admin_restoran'];
    if (!tableRoles.includes(user.role)) {
      return new Response('Akses ditolak: halaman ini hanya untuk Super Admin dan Admin Restoran', { status: 403 });
    }

    const { getAllTables } = await import('../repositories/table');
    const { getOrdersTodayWithTables } = await import('../repositories/order');
    const tables = await getAllTables();
    const orders = await getOrdersTodayWithTables();

    const activeOrders: Record<number, any> = {};
    for (const o of orders) {
      if (o.orders?.status === 'active' && o.orders?.tableId) {
        activeOrders[o.orders.tableId] = o.orders;
      }
    }

    const total = tables.length;
    const available = tables.filter((t: any) => t.status === 'available').length;
    const occupied = total - available;
    const occupancy = total > 0 ? Math.round((occupied / total) * 100) : 0;

    return htmlResponse(`
      <div class="app-layout">
        ${getSidebarHtml('tables', user)}
        <div class="app-content">
          ${getNavbarHtml('Kelola Meja', 'tables', user)}
          <main class="app-main">
            <div class="stats-grid">
              <div class="stats-card">
                <div class="stats-label">Total Meja</div>
                <div class="stats-value">${total}</div>
                <div class="stats-change">Semua meja</div>
              </div>
              <div class="stats-card">
                <div class="stats-label">Tersedia</div>
                <div class="stats-value" style="color: var(--color-success);">${available}</div>
                <div class="stats-change">Siap dipakai</div>
              </div>
              <div class="stats-card">
                <div class="stats-label">Terisi</div>
                <div class="stats-value" style="color: var(--color-error);">${occupied}</div>
                <div class="stats-change">Sedang dipakai</div>
              </div>
              <div class="stats-card">
                <div class="stats-label">Okupansi</div>
                <div class="stats-value">${occupancy}%</div>
                <div class="stats-change">Tingkat hunian</div>
              </div>
            </div>

            <div class="card">
              <div class="card-header">
                <div class="tables-toolbar">
                  <div class="tables-toolbar-left">
                    <input type="text" id="table-search" class="table-search-input" placeholder="🔍 Cari meja..." oninput="filterTables()">
                    <select id="table-filter-status" class="table-filter-select" onchange="filterTables()">
                      <option value="all">Semua Status</option>
                      <option value="available">Tersedia</option>
                      <option value="occupied">Terisi</option>
                    </select>
                    <select id="table-filter-area" class="table-filter-select" onchange="filterTables()">
                      <option value="all">Semua Area</option>
                      <option value="indoor">🏠 Indoor</option>
                      <option value="outdoor">🌿 Outdoor</option>
                      <option value="vip">👑 VIP</option>
                    </select>
                  </div>
                  <div class="tables-toolbar-right">
                    <button class="btn btn-secondary btn-bulk-delete" onclick="bulkDeleteTables()" id="btn-bulk-delete" style="display: none;">🗑️ Hapus Terpilih</button>
                    <button class="btn btn-primary" onclick="showAddTableModal()">+ Tambah Meja</button>
                  </div>
                </div>
              </div>
              <div class="tables-grid" id="tables-grid">
                ${tables.map((t: any) => {
                  const order = activeOrders[t.id];
                  const areaEmoji = AREA_EMOJI[t.area || 'indoor'] || '🏠';
                  const areaLabel = (t.area || 'indoor').charAt(0).toUpperCase() + (t.area || 'indoor').slice(1);
                  return `
                  <div class="table-card" data-table-id="${t.id}" data-table-number="${t.tableNumber}" data-status="${t.status}" data-area="${t.area || 'indoor'}">
                    <div class="table-card-header">
                      <input type="checkbox" class="table-checkbox" value="${t.id}" onchange="updateBulkButtons()" ${t.status === 'occupied' ? 'disabled' : ''}>
                      <span class="table-card-number">${areaEmoji} Meja ${t.tableNumber}</span>
                    </div>
                    <div class="table-card-status">
                      <span class="badge ${t.status === 'available' ? 'badge-success' : 'badge-error'}">${t.status === 'available' ? '🟢 Tersedia' : '🔴 Terisi'}</span>
                    </div>
                    <div class="table-card-info">
                      <span>👥 ${t.capacity || 4} orang</span>
                      <span>📍 ${areaLabel}</span>
                    </div>
                    ${order ? `
                    <div class="table-card-order">
                      <div>📋 Order #${order.id}</div>
                      <div>Rp ${(order.total || 0).toLocaleString('id-ID')}</div>
                    </div>` : ''}
                    <div class="table-card-actions">
                      <button onclick="showEditTableModal(${t.id}, ${t.tableNumber}, ${t.capacity || 4}, '${t.area || 'indoor'}', '${t.status}')" class="btn btn-secondary btn-sm">✏️ Edit</button>
                      ${t.status === 'available' ? `<button onclick="showDeleteConfirmModal(${t.id}, ${t.tableNumber})" class="btn btn-danger btn-sm">🗑️ Hapus</button>` : ''}
                    </div>
                  </div>`;
                }).join('')}
              </div>
              ${tables.length === 0 ? '<p class="text-muted text-center" style="padding: 40px;">Belum ada meja</p>' : ''}
            </div>
          </main>
          ${getFooterHtml()}
        </div>
      </div>

      <div class="modal" id="add-table-modal">
        <div class="modal-backdrop" onclick="closeAddTableModal()"></div>
        <div class="modal-content">
          <div class="modal-header"><h3>Tambah Meja</h3><button class="modal-close" onclick="closeAddTableModal()">&times;</button></div>
          <div class="modal-body">
            <div class="form-group"><label>Nomor Meja</label><input type="number" id="table-number" class="input" placeholder="1"></div>
            <div class="form-group"><label>Kapasitas (orang)</label><input type="number" id="table-capacity" class="input" placeholder="4" value="4"></div>
            <div class="form-group"><label>Area</label><select id="table-area" class="input"><option value="indoor">🏠 Indoor</option><option value="outdoor">🌿 Outdoor</option><option value="vip">👑 VIP</option></select></div>
          </div>
          <div class="modal-footer"><button onclick="closeAddTableModal()" class="btn btn-secondary">Batal</button><button onclick="saveTable()" class="btn btn-primary">Simpan</button></div>
        </div>
      </div>

      <div class="modal" id="edit-table-modal">
        <div class="modal-backdrop" onclick="closeEditTableModal()"></div>
        <div class="modal-content">
          <div class="modal-header"><h3>Edit Meja</h3><button class="modal-close" onclick="closeEditTableModal()">&times;</button></div>
          <div class="modal-body">
            <input type="hidden" id="edit-table-id">
            <div class="form-group"><label>Nomor Meja</label><input type="number" id="edit-table-number" class="input"></div>
            <div class="form-group"><label>Kapasitas (orang)</label><input type="number" id="edit-table-capacity" class="input"></div>
            <div class="form-group"><label>Area</label><select id="edit-table-area" class="input"><option value="indoor">🏠 Indoor</option><option value="outdoor">🌿 Outdoor</option><option value="vip">👑 VIP</option></select></div>
            <div class="form-group"><label>Status</label><select id="edit-table-status" class="input"><option value="available">Tersedia</option><option value="occupied">Terisi</option></select></div>
          </div>
          <div class="modal-footer"><button onclick="closeEditTableModal()" class="btn btn-secondary">Batal</button><button onclick="saveEditTable()" class="btn btn-primary">Simpan</button></div>
        </div>
      </div>

      <div class="modal" id="delete-confirm-modal">
        <div class="modal-backdrop" onclick="closeDeleteConfirmModal()"></div>
        <div class="modal-content" style="max-width: 400px;">
          <div class="modal-header"><h3>Konfirmasi Hapus</h3><button class="modal-close" onclick="closeDeleteConfirmModal()">&times;</button></div>
          <div class="modal-body"><p style="color: var(--color-text-secondary);">Apakah Anda yakin ingin menghapus <strong id="delete-table-name"></strong>? Tindakan ini tidak dapat dibatalkan.</p></div>
          <div class="modal-footer"><button onclick="closeDeleteConfirmModal()" class="btn btn-secondary">Batal</button><button onclick="confirmDeleteTable()" class="btn btn-danger">Hapus</button></div>
        </div>
      </div>

      <style>
        .tables-toolbar { display: flex; justify-content: space-between; align-items: center; width: 100%; flex-wrap: wrap; gap: 8px; }
        .tables-toolbar-left { display: flex; gap: 8px; flex: 1; flex-wrap: wrap; }
        .tables-toolbar-right { display: flex; gap: 8px; }
        .table-search-input { padding: 6px 12px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: 13px; min-width: 180px; }
        .table-filter-select { padding: 6px 12px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: 13px; background: var(--color-bg); }
        .tables-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; padding: 16px; }
        .table-card { background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 16px; transition: var(--transition); }
        .table-card:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); }
        .table-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .table-card-number { font-weight: 700; font-size: 16px; }
        .table-card-status { margin-bottom: 8px; }
        .table-card-info { display: flex; gap: 12px; font-size: 13px; color: var(--color-text-secondary); margin-bottom: 8px; }
        .table-card-order { background: var(--color-bg-alt); padding: 8px; border-radius: var(--radius-md); margin-bottom: 8px; font-size: 12px; }
        .table-card-order div:first-child { font-weight: 600; margin-bottom: 2px; }
        .table-card-actions { display: flex; gap: 6px; }
        .btn-sm { padding: 4px 8px; font-size: 11px; }
      </style>
      <script>
        let pendingDeleteId = null;

        function showToastLocal(msg, type) {
          const container = document.getElementById('toast-container');
          if (!container) { alert(msg); return; }
          const colors = { success: 'var(--color-success)', warning: 'var(--color-warning)', error: 'var(--color-error)' };
          const toast = document.createElement('div');
          toast.style.cssText = 'padding:12px 20px;border-radius:var(--radius-md);color:white;font-size:14px;font-weight:500;display:flex;align-items:center;gap:8px;box-shadow:var(--shadow-lg);min-width:250px;background:' + (colors[type] || colors.success);
          toast.innerHTML = '<span>' + msg + '</span><button onclick="this.parentElement.remove()" style="background:none;border:none;color:white;cursor:pointer;font-size:16px;">&times;</button>';
          container.appendChild(toast);
          setTimeout(() => toast.remove(), 3000);
        }

        function filterTables() {
          const search = document.getElementById('table-search').value.toLowerCase();
          const statusFilter = document.getElementById('table-filter-status').value;
          const areaFilter = document.getElementById('table-filter-area').value;
          document.querySelectorAll('.table-card').forEach(card => {
            const num = card.dataset.tableNumber || '';
            const status = card.dataset.status || '';
            const area = card.dataset.area || '';
            const matchesSearch = !search || num.includes(search);
            const matchesStatus = statusFilter === 'all' || status === statusFilter;
            const matchesArea = areaFilter === 'all' || area === areaFilter;
            card.style.display = (matchesSearch && matchesStatus && matchesArea) ? '' : 'none';
          });
        }

        function updateBulkButtons() {
          const checked = document.querySelectorAll('.table-checkbox:checked');
          const btn = document.getElementById('btn-bulk-delete');
          btn.style.display = checked.length > 0 ? 'inline' : 'none';
        }

        async function bulkDeleteTables() {
          const checked = document.querySelectorAll('.table-checkbox:checked');
          if (checked.length === 0) return;
          if (!confirm('Hapus ' + checked.length + ' meja terpilih?')) return;
          for (const cb of checked) {
            await fetch('/api/tables/' + cb.value, { method: 'DELETE' });
          }
          showToastLocal(checked.length + ' meja dihapus');
          location.reload();
        }

        function showAddTableModal() {
          document.getElementById('table-number').value = '';
          document.getElementById('table-capacity').value = '4';
          document.getElementById('table-area').value = 'indoor';
          document.getElementById('add-table-modal').classList.add('show');
        }
        function closeAddTableModal() { document.getElementById('add-table-modal').classList.remove('show'); }

        async function saveTable() {
          const tableNumber = parseInt(document.getElementById('table-number').value);
          const capacity = parseInt(document.getElementById('table-capacity').value) || 4;
          const area = document.getElementById('table-area').value;
          if (!tableNumber || tableNumber <= 0) { showToastLocal('Nomor meja wajib diisi', 'warning'); return; }
          try {
            const response = await fetch('/api/tables', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tableNumber, capacity, area }) });
            const data = await response.json();
            if (data.error) { showToastLocal(data.error, 'error'); return; }
            closeAddTableModal();
            showToastLocal('Meja berhasil ditambahkan');
            location.reload();
          } catch (e) { showToastLocal('Gagal menambahkan meja', 'error'); }
        }

        function showEditTableModal(id, number, capacity, area, status) {
          document.getElementById('edit-table-id').value = id;
          document.getElementById('edit-table-number').value = number;
          document.getElementById('edit-table-capacity').value = capacity;
          document.getElementById('edit-table-area').value = area;
          document.getElementById('edit-table-status').value = status;
          document.getElementById('edit-table-modal').classList.add('show');
        }
        function closeEditTableModal() { document.getElementById('edit-table-modal').classList.remove('show'); }

        async function saveEditTable() {
          const id = document.getElementById('edit-table-id').value;
          const tableNumber = parseInt(document.getElementById('edit-table-number').value);
          const capacity = parseInt(document.getElementById('edit-table-capacity').value) || 4;
          const area = document.getElementById('edit-table-area').value;
          const status = document.getElementById('edit-table-status').value;
          if (!tableNumber || tableNumber <= 0) { showToastLocal('Nomor meja wajib diisi', 'warning'); return; }
          const response = await fetch('/api/tables/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tableNumber, capacity, area, status }) });
          if (response.ok) { closeEditTableModal(); showToastLocal('Meja berhasil diupdate'); location.reload(); }
          else { showToastLocal('Gagal mengupdate meja', 'error'); }
        }

        function showDeleteConfirmModal(id, number) {
          pendingDeleteId = id;
          document.getElementById('delete-table-name').textContent = 'Meja ' + number;
          document.getElementById('delete-confirm-modal').classList.add('show');
        }
        function closeDeleteConfirmModal() { document.getElementById('delete-confirm-modal').classList.remove('show'); pendingDeleteId = null; }
        async function confirmDeleteTable() {
          if (!pendingDeleteId) return;
          try {
            const response = await fetch('/api/tables/' + pendingDeleteId, { method: 'DELETE' });
            const data = await response.json();
            if (data.error) { showToastLocal(data.error, 'error'); return; }
            showToastLocal('Meja berhasil dihapus');
            closeDeleteConfirmModal();
            location.reload();
          } catch (e) { showToastLocal('Gagal menghapus meja', 'error'); }
        }
      </script>
    `);
  });
