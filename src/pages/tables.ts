import { Elysia } from 'elysia';
import { htmlResponse } from '../templates/html';
import { getSidebarHtml } from '../templates/sidebar';
import { getNavbarHtml } from '../templates/navbar';
import { getFooterHtml } from '../templates/footer';
import { getCommonScripts } from '../templates/common-scripts';
import { getTokenFromCookies, verifyToken, redirectToLogin } from '../utils/auth';

export const tablesPage = new Elysia()
  .get('/tables', async ({ cookie, headers }) => {
    const token = getTokenFromCookies(cookie, headers);
    if (!token) return redirectToLogin();

    let user = null;
    try {
      user = verifyToken(token);
    } catch {
      return redirectToLogin();
    }

    const tableRoles = ['super_admin', 'admin_restoran'];
    if (!tableRoles.includes(user.role)) {
      return new Response('Akses ditolak: halaman ini hanya untuk Super Admin dan Admin Restoran', { status: 403 });
    }

    const { getAllTables } = await import('../repositories/table');
    const tables = await getAllTables();

    return htmlResponse(`
      <div class="app-layout">
        ${getSidebarHtml('tables', user)}
        <div class="app-content">
          ${getNavbarHtml('Kelola Meja', 'tables', user)}
          <main class="app-main">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
              <h2 style="margin: 0;">Daftar Meja</h2>
              <button class="btn btn-primary" onclick="showAddTableModal()">+ Tambah Meja</button>
            </div>
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;">
              ${tables.map(t => `
                <div class="card" style="text-align: center;">
                  <div style="font-size: 32px; font-weight: 700; margin-bottom: 8px; color: var(--color-text);">Meja ${t.tableNumber}</div>
                  <div style="margin-bottom: 16px;">
                    <span class="badge ${t.status === 'available' ? 'badge-success' : 'badge-error'}">${t.status === 'available' ? 'Tersedia' : 'Terisi'}</span>
                  </div>
                  <button onclick="deleteTable(${t.id})" class="btn btn-danger" style="padding: 8px 16px; font-size: 13px;">Hapus</button>
                </div>
              `).join('')}
            </div>
          </main>
          ${getFooterHtml()}
        </div>
      </div>
      <div class="modal" id="add-table-modal">
        <div class="modal-backdrop" onclick="closeAddTableModal()"></div>
        <div class="modal-content">
          <div class="modal-header">
            <h3>Tambah Meja</h3>
            <button class="modal-close" onclick="closeAddTableModal()">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Nomor Meja</label>
              <input type="number" id="table-number" class="input" placeholder="Masukkan nomor meja">
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="closeAddTableModal()">Batal</button>
            <button class="btn btn-primary" onclick="saveTable()">Simpan</button>
          </div>
        </div>
      </div>
      <script>
        function showAddTableModal() {
          document.getElementById('add-table-modal').classList.add('show');
        }
        function closeAddTableModal() {
          document.getElementById('add-table-modal').classList.remove('show');
          document.getElementById('table-number').value = '';
        }
        async function saveTable() {
          const tableNumber = parseInt(document.getElementById('table-number').value);
          if (!tableNumber || tableNumber <= 0) {
            alert('Nomor meja wajib diisi');
            return;
          }
          const response = await fetch('/api/tables', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tableNumber })
          });
          if (response.ok) {
            closeAddTableModal();
            location.reload();
          } else {
            const data = await response.json();
            alert(data.error || 'Gagal menambahkan meja');
          }
        }
        async function deleteTable(id) {
          if (!confirm('Hapus meja?')) return;
          await fetch('/api/tables/' + id, { method: 'DELETE' });
          location.reload();
        }
      </script>
      ${getCommonScripts()}
    `);
  });
