import { Elysia } from 'elysia';
import { htmlResponse } from '../templates/html';
import { getSidebarHtml } from '../templates/sidebar';
import { getNavbarHtml } from '../templates/navbar';
import { getFooterHtml } from '../templates/footer';
import { getCommonScripts } from '../templates/common-scripts';
import { getTokenFromCookies, verifyToken, redirectToLogin } from '../utils/auth';

export const menuPage = new Elysia()
  .get('/menu', async ({ cookie, headers }) => {
    const token = getTokenFromCookies(cookie, headers);
    if (!token) return redirectToLogin();

    let user = null;
    try {
      user = verifyToken(token);
    } catch {
      return redirectToLogin();
    }

    const menuRoles = ['super_admin', 'admin_restoran'];
    if (!menuRoles.includes(user.role)) {
      return new Response('Akses ditolak: halaman ini hanya untuk Super Admin dan Admin Restoran', { status: 403 });
    }

    const { getAllMenus } = await import('../repositories/menu');
    const menus = await getAllMenus();

    return htmlResponse(`
      <div class="app-layout">
        ${getSidebarHtml('menu', user)}
        <div class="app-content">
          ${getNavbarHtml('Kelola Menu', 'menu', user)}
          <main class="app-main">
            <div class="card">
              <div class="card-header">
                <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                  <div style="display: flex; gap: 8px;">
                    <button class="btn btn-primary" onclick="filterMenus('all')">Semua</button>
                    <button class="btn btn-secondary" onclick="filterMenus('makanan')">Makanan</button>
                    <button class="btn btn-secondary" onclick="filterMenus('minuman')">Minuman</button>
                  </div>
                  <button class="btn btn-primary" onclick="showAddMenuModal()">+ Tambah Menu</button>
                </div>
              </div>
              <div class="table-container">
                <table class="table">
                  <thead>
                    <tr><th>Nama</th><th>Harga</th><th>Kategori</th><th>Status</th><th>Aksi</th></tr>
                  </thead>
                  <tbody>
                    ${menus.map(m => `
                      <tr class="menu-row" data-category="${m.category}">
                        <td><strong>${m.name}</strong></td>
                        <td>Rp ${m.price.toLocaleString('id-ID')}</td>
                        <td><span class="badge ${m.category === 'makanan' ? 'badge-warning' : 'badge-primary'}">${m.category}</span></td>
                        <td><button onclick="toggleMenu(${m.id})" class="badge ${m.isAvailable ? 'badge-success' : 'badge-error'}">${m.isAvailable ? 'Tersedia' : 'Tidak Tersedia'}</button></td>
                        <td>
                          <button onclick="editMenu(${m.id}, '${m.name.replace(/'/g, "\\'")}', ${m.price})" class="btn btn-secondary" style="padding: 6px 12px; font-size: 12px;">Edit</button>
                          <button onclick="deleteMenu(${m.id})" class="btn btn-danger" style="padding: 6px 12px; font-size: 12px;">Hapus</button>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          </main>
          ${getFooterHtml()}
        </div>
      </div>
      <div class="modal" id="add-menu-modal">
        <div class="modal-backdrop" onclick="closeAddMenuModal()"></div>
        <div class="modal-content">
          <div class="modal-header">
            <h3>Tambah Menu</h3>
            <button class="modal-close" onclick="closeAddMenuModal()">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Nama Menu</label>
              <input type="text" id="menu-name" class="input" placeholder="Masukkan nama menu">
            </div>
            <div class="form-group">
              <label>Harga</label>
              <input type="number" id="menu-price" class="input" placeholder="0">
            </div>
            <div class="form-group">
              <label>Kategori</label>
              <select id="menu-category" class="input">
                <option value="makanan">Makanan</option>
                <option value="minuman">Minuman</option>
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="closeAddMenuModal()">Batal</button>
            <button class="btn btn-primary" onclick="saveMenu()">Simpan</button>
          </div>
        </div>
      </div>
      <script>
        function filterMenus(cat) {
          document.querySelectorAll('.menu-row').forEach(row => { row.style.display = (cat === 'all' || row.dataset.category === cat) ? '' : 'none'; });
        }
        async function toggleMenu(id) { await fetch('/api/menus/' + id + '/toggle', { method: 'PATCH' }); location.reload(); }
        async function deleteMenu(id) { if (!confirm('Hapus menu?')) return; await fetch('/api/menus/' + id, { method: 'DELETE' }); location.reload(); }
        function showAddMenuModal() {
          document.getElementById('add-menu-modal').classList.add('show');
        }
        function closeAddMenuModal() {
          document.getElementById('add-menu-modal').classList.remove('show');
          document.getElementById('menu-name').value = '';
          document.getElementById('menu-price').value = '';
          document.getElementById('menu-category').value = 'makanan';
        }
        async function saveMenu() {
          const name = document.getElementById('menu-name').value.trim();
          const price = parseInt(document.getElementById('menu-price').value);
          const category = document.getElementById('menu-category').value;
          if (!name || !price || price <= 0) {
            alert('Nama dan harga wajib diisi dengan benar');
            return;
          }
          const response = await fetch('/api/menus', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, price, category })
          });
          if (response.ok) {
            closeAddMenuModal();
            location.reload();
          } else {
            alert('Gagal menambahkan menu');
          }
        }
        function editMenu(id, name, price) {
          const newName = prompt('Nama Menu:', name);
          if (!newName) return;
          const newPrice = parseInt(prompt('Harga:', price) || '0');
          if (newPrice <= 0) { alert('Harga tidak valid'); return; }
          fetch('/api/menus/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newName, price: newPrice }) }).then(() => location.reload());
        }
      </script>
      ${getCommonScripts()}
    `);
  });
