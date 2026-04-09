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

    const total = menus.length;
    const available = menus.filter((m: any) => m.isAvailable).length;
    const unavailable = total - available;
    const categories = [...new Set(menus.map((m: any) => m.category))].length;

    return htmlResponse(`
      <div class="app-layout">
        ${getSidebarHtml('menu', user)}
        <div class="app-content">
          ${getNavbarHtml('Kelola Menu', 'menu', user)}
          <main class="app-main">
            <div class="stats-grid">
              <div class="stats-card">
                <div class="stats-label">Total Menu</div>
                <div class="stats-value">${total}</div>
                <div class="stats-change">Semua menu</div>
              </div>
              <div class="stats-card">
                <div class="stats-label">Tersedia</div>
                <div class="stats-value" style="color: var(--color-success);">${available}</div>
                <div class="stats-change">Bisa dipesan</div>
              </div>
              <div class="stats-card">
                <div class="stats-label">Tidak Tersedia</div>
                <div class="stats-value" style="color: var(--color-error);">${unavailable}</div>
                <div class="stats-change">Stok habis</div>
              </div>
              <div class="stats-card">
                <div class="stats-label">Kategori</div>
                <div class="stats-value">${categories}</div>
                <div class="stats-change">Jenis menu</div>
              </div>
            </div>

            <div class="card">
              <div class="card-header">
                <div class="menu-toolbar">
                  <div class="menu-toolbar-left">
                    <input type="text" id="menu-search" class="menu-search-input" placeholder="🔍 Cari menu..." oninput="filterMenus()">
                    <select id="menu-filter-category" class="menu-filter-select" onchange="filterMenus()">
                      <option value="all">Semua Kategori</option>
                      <option value="makanan">Makanan</option>
                      <option value="minuman">Minuman</option>
                    </select>
                    <select id="menu-filter-status" class="menu-filter-select" onchange="filterMenus()">
                      <option value="all">Semua Status</option>
                      <option value="available">Tersedia</option>
                      <option value="unavailable">Tidak Tersedia</option>
                    </select>
                  </div>
                  <div class="menu-toolbar-right">
                    <button class="btn btn-secondary btn-bulk-delete" onclick="bulkDeleteSelected()" id="btn-bulk-delete" style="display: none;">🗑️ Hapus Terpilih</button>
                    <button class="btn btn-secondary btn-bulk-toggle" onclick="bulkToggleSelected()" id="btn-bulk-toggle" style="display: none;">🔄 Toggle Status</button>
                    <button class="btn btn-secondary" onclick="showCategoryModal()">🏷️ Kelola Kategori</button>
                    <button class="btn btn-primary" onclick="showAddMenuModal()">+ Tambah Menu</button>
                  </div>
                </div>
              </div>
              <div class="table-container">
                <table class="table">
                  <thead>
                    <tr>
                      <th style="width: 40px;"><input type="checkbox" id="select-all-menus" onchange="toggleSelectAll(this.checked)"></th>
                      <th></th>
                      <th onclick="sortMenus('name')" style="cursor: pointer;">Nama <span id="sort-name"></span></th>
                      <th onclick="sortMenus('price')" style="cursor: pointer;">Harga <span id="sort-price"></span></th>
                      <th>Deskripsi</th>
                      <th>Kategori</th>
                      <th>Status</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody id="menus-table-body">
                    ${menus.map((m: any, i: number) => `
                      <tr data-menu-id="${m.id}" data-category="${m.category}" data-available="${m.isAvailable}" data-name="${m.name.toLowerCase()}" data-price="${m.price}" data-created="${m.createdAt}">
                        <td><input type="checkbox" class="menu-checkbox" value="${m.id}" onchange="updateBulkButtons()"></td>
                        <td style="font-size: 24px; text-align: center;">${getMenuEmoji(m.category, i)}</td>
                        <td><strong>${m.name}</strong></td>
                        <td>Rp ${m.price.toLocaleString('id-ID')}</td>
                        <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--color-text-secondary); font-size: 13px;">${m.description || '-'}</td>
                        <td><span class="badge ${m.category === 'makanan' ? 'badge-warning' : 'badge-primary'}">${m.category}</span></td>
                        <td>
                          <label class="toggle-switch" onclick="toggleMenu(${m.id})">
                            <input type="checkbox" ${m.isAvailable ? 'checked' : ''}>
                            <span class="toggle-slider"></span>
                          </label>
                        </td>
                        <td>
                          <button onclick="showEditMenuModal(${m.id}, '${m.name.replace(/'/g, "\\'")}', ${m.price}, '${m.category}', '${(m.description || '').replace(/'/g, "\\'")}', ${m.isAvailable})" class="btn btn-secondary" style="padding: 4px 8px; font-size: 11px;">Edit</button>
                          <button onclick="showDeleteConfirmModal(${m.id}, '${m.name.replace(/'/g, "\\'")}')" class="btn btn-danger" style="padding: 4px 8px; font-size: 11px;">Hapus</button>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
              <div class="pagination" id="menu-pagination"></div>
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
              <label>Deskripsi</label>
              <textarea id="menu-description" class="input" placeholder="Deskripsi menu (opsional)" rows="2"></textarea>
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
            <button onclick="closeAddMenuModal()" class="btn btn-secondary">Batal</button>
            <button onclick="saveMenu()" class="btn btn-primary">Simpan</button>
          </div>
        </div>
      </div>

      <div class="modal" id="category-modal">
        <div class="modal-backdrop" onclick="closeCategoryModal()"></div>
        <div class="modal-content">
          <div class="modal-header">
            <h3>Kelola Kategori</h3>
            <button class="modal-close" onclick="closeCategoryModal()">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Nama Kategori</label>
              <input type="text" id="category-name" class="input" placeholder="cth: makanan, jalanan, premium">
            </div>
            <div class="form-group">
              <label>Emoji (opsional)</label>
              <input type="text" id="category-emoji" class="input" placeholder="cth: 🍕" maxlength="10">
            </div>
            <div class="form-group">
              <label>Warna (opsional)</label>
              <input type="text" id="category-color" class="input" placeholder="#fff3cd">
            </div>
            <button onclick="saveCategory()" class="btn btn-primary" style="margin-bottom: 12px;">+ Tambah Kategori</button>
            <div id="categories-list"></div>
          </div>
          <div class="modal-footer">
            <button onclick="closeCategoryModal()" class="btn btn-secondary">Tutup</button>
          </div>
        </div>
      </div>

      <div class="modal" id="edit-menu-modal">
        <div class="modal-backdrop" onclick="closeEditMenuModal()"></div>
        <div class="modal-content">
          <div class="modal-header">
            <h3>Edit Menu</h3>
            <button class="modal-close" onclick="closeEditMenuModal()">&times;</button>
          </div>
          <div class="modal-body">
            <input type="hidden" id="edit-menu-id">
            <div class="form-group">
              <label>Nama Menu</label>
              <input type="text" id="edit-menu-name" class="input">
            </div>
            <div class="form-group">
              <label>Harga</label>
              <input type="number" id="edit-menu-price" class="input">
            </div>
            <div class="form-group">
              <label>Deskripsi</label>
              <textarea id="edit-menu-description" class="input" rows="2"></textarea>
            </div>
            <div class="form-group">
              <label>Kategori</label>
              <select id="edit-menu-category" class="input">
                <option value="makanan">Makanan</option>
                <option value="minuman">Minuman</option>
              </select>
            </div>
            <div class="form-group">
              <label>Status</label>
              <select id="edit-menu-available" class="input">
                <option value="true">Tersedia</option>
                <option value="false">Tidak Tersedia</option>
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button onclick="closeEditMenuModal()" class="btn btn-secondary">Batal</button>
            <button onclick="saveEditMenu()" class="btn btn-primary">Simpan</button>
          </div>
        </div>
      </div>

      <div class="modal" id="delete-confirm-modal">
        <div class="modal-backdrop" onclick="closeDeleteConfirmModal()"></div>
        <div class="modal-content" style="max-width: 400px;">
          <div class="modal-header">
            <h3>Konfirmasi Hapus</h3>
            <button class="modal-close" onclick="closeDeleteConfirmModal()">&times;</button>
          </div>
          <div class="modal-body">
            <p style="color: var(--color-text-secondary);">Apakah Anda yakin ingin menghapus menu <strong id="delete-menu-name"></strong>? Tindakan ini tidak dapat dibatalkan.</p>
          </div>
          <div class="modal-footer">
            <button onclick="closeDeleteConfirmModal()" class="btn btn-secondary">Batal</button>
            <button onclick="confirmDeleteMenu()" class="btn btn-danger">Hapus</button>
          </div>
        </div>
      </div>

      <style>
        .menu-toolbar { display: flex; justify-content: space-between; align-items: center; width: 100%; flex-wrap: wrap; gap: 8px; }
        .menu-toolbar-left { display: flex; gap: 8px; flex: 1; flex-wrap: wrap; }
        .menu-toolbar-right { display: flex; gap: 8px; }
        .menu-search-input { padding: 6px 12px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: 13px; min-width: 200px; }
        .menu-filter-select { padding: 6px 12px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: 13px; background: var(--color-bg); }
        .toggle-switch { display: inline-flex; align-items: center; cursor: pointer; position: relative; }
        .toggle-switch input { opacity: 0; width: 0; height: 0; }
        .toggle-slider { width: 40px; height: 22px; background: var(--color-border); border-radius: 11px; position: relative; transition: var(--transition); }
        .toggle-slider::before { content: ''; position: absolute; width: 18px; height: 18px; background: white; border-radius: 50%; top: 2px; left: 2px; transition: var(--transition); }
        .toggle-switch input:checked + .toggle-slider { background: var(--color-success); }
        .toggle-switch input:checked + .toggle-slider::before { transform: translateX(18px); }
        .pagination { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-top: 1px solid var(--color-border); }
        .pagination-info { font-size: 13px; color: var(--color-text-secondary); }
        .pagination-buttons { display: flex; gap: 4px; }
        .pagination-btn { padding: 4px 10px; border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-bg); cursor: pointer; font-size: 12px; }
        .pagination-btn:hover { background: var(--color-bg-hover); }
        .pagination-btn.active { background: var(--color-primary); color: white; border-color: var(--color-primary); }
        .pagination-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        textarea.input { resize: vertical; min-height: 60px; }
        .category-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #f8f9fa; border-radius: 6px; margin-bottom: 6px; }
        .category-item .btn-delete { background: none; border: none; cursor: pointer; font-size: 14px; }
      </style>
      <script>
        let currentPage = 1;
        const itemsPerPage = 15;
        let sortField = 'name';
        let sortDir = 'asc';
        let pendingDeleteId = null;
        let cachedCategories = [];

        async function loadCategories() {
          try {
            const res = await fetch('/categories');
            cachedCategories = await res.json();
            renderCategoryOptions();
          } catch (e) {
            console.error('Failed to load categories:', e);
          }
        }

        function renderCategoryOptions() {
          const selects = ['menu-filter-category', 'menu-category', 'edit-menu-category'];
          selects.forEach(id => {
            const sel = document.getElementById(id);
            if (!sel) return;
            const origVal = sel.value;
            const isFilter = id === 'menu-filter-category';
            sel.innerHTML = isFilter ? '<option value="all">Semua Kategori</option>' : '';
            cachedCategories.forEach(cat => {
              const opt = document.createElement('option');
              opt.value = cat.name;
              opt.textContent = cat.name.charAt(0).toUpperCase() + cat.name.slice(1);
              sel.appendChild(opt);
            });
            if (origVal) sel.value = origVal;
          });
        }

        loadCategories();

        function showCategoryModal() {
          document.getElementById('category-modal').classList.add('show');
          renderCategoriesList();
        }

        function closeCategoryModal() {
          document.getElementById('category-modal').classList.remove('show');
        }

        async function saveCategory() {
          const name = document.getElementById('category-name').value.trim();
          const emoji = document.getElementById('category-emoji').value.trim();
          const color = document.getElementById('category-color').value.trim();
          
          if (!name) return alert('Nama kategori wajib diisi');
          
          try {
            const res = await fetch('/categories', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name, emoji, color })
            });
            const data = await res.json();
            if (data.error) return alert(data.error);
            
            document.getElementById('category-name').value = '';
            document.getElementById('category-emoji').value = '';
            document.getElementById('category-color').value = '';
            
            renderCategoriesList();
            loadCategories();
            renderCategoryOptions();
          } catch (e) {
            alert('Gagalsimpan kategori');
          }
        }

        async function renderCategoriesList() {
          const list = document.getElementById('categories-list');
          try {
            const res = await fetch('/categories');
            const cats = await res.json();
            let html = '';
            for (let i = 0; i < cats.length; i++) {
              const c = cats[i];
              html += '<div class="category-item">' +
                '<span>' + (c.emoji || '') + ' ' + c.name + '</span>' +
                '<button onclick="deleteCategory(' + c.id + ')" class="btn-delete">🗑️</button>' +
              '</div>';
            }
            list.innerHTML = html;
          } catch (e) {
            list.innerHTML = '<p>Gagal memuat kategori</p>';
          }
        }

        async function deleteCategory(id) {
          if (!confirm('Hapus kategori ini?')) return;
          try {
            await fetch('/categories/' + id, { method: 'DELETE' });
            renderCategoriesList();
            loadCategories();
            renderCategoryOptions();
          } catch (e) {
            alert('Gagal hapus kategori');
          }
        }

        function filterMenus() {
          const search = document.getElementById('menu-search').value.toLowerCase();
          const catFilter = document.getElementById('menu-filter-category').value;
          const statusFilter = document.getElementById('menu-filter-status').value;
          const rows = Array.from(document.querySelectorAll('#menus-table-body tr'));
          rows.forEach(row => {
            const name = row.dataset.name || '';
            const cat = row.dataset.category || '';
            const avail = row.dataset.available === 'true';
            const matchesSearch = !search || name.includes(search);
            const matchesCat = catFilter === 'all' || cat === catFilter;
            const matchesStatus = statusFilter === 'all' || (statusFilter === 'available' && avail) || (statusFilter === 'unavailable' && !avail);
            row.style.display = (matchesSearch && matchesCat && matchesStatus) ? '' : 'none';
          });
          currentPage = 1;
          renderPagination();
        }

        function sortMenus(field) {
          if (sortField === field) { sortDir = sortDir === 'asc' ? 'desc' : 'asc'; }
          else { sortField = field; sortDir = 'asc'; }
          document.querySelectorAll('[id^="sort-"]').forEach(el => el.textContent = '');
          const el = document.getElementById('sort-' + field);
          if (el) el.textContent = sortDir === 'asc' ? '↑' : '↓';
          const tbody = document.getElementById('menus-table-body');
          const rows = Array.from(tbody.querySelectorAll('tr'));
          rows.sort((a, b) => {
            let aVal, bVal;
            if (field === 'name') { aVal = a.dataset.name; bVal = b.dataset.name; }
            else if (field === 'price') { aVal = parseInt(a.dataset.price); bVal = parseInt(b.dataset.price); }
            else return 0;
            if (typeof aVal === 'string') return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
            return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
          });
          rows.forEach(r => tbody.appendChild(r));
          currentPage = 1;
          renderPagination();
        }

        function renderPagination() {
          const rows = Array.from(document.querySelectorAll('#menus-table-body tr'));
          const visibleRows = rows.filter(r => r.style.display !== 'none');
          const totalPages = Math.ceil(visibleRows.length / itemsPerPage) || 1;
          if (currentPage > totalPages) currentPage = totalPages;
          rows.forEach((r, i) => {
            const page = Math.floor(visibleRows.indexOf(r) / itemsPerPage) + 1;
            r.style.display = (r.style.display !== 'none' && page === currentPage) ? '' : 'none';
          });
          const pagDiv = document.getElementById('menu-pagination');
          if (totalPages <= 1) { pagDiv.innerHTML = ''; return; }
          const start = (currentPage - 1) * itemsPerPage + 1;
          const end = Math.min(currentPage * itemsPerPage, visibleRows.length);
          let html = '<div class="pagination-info">Menampilkan ' + start + '-' + end + ' dari ' + visibleRows.length + '</div>';
          html += '<div class="pagination-buttons">';
          html += '<button class="pagination-btn" onclick="goToPage(' + (currentPage - 1) + ')" ' + (currentPage <= 1 ? 'disabled' : '') + '>← Prev</button>';
          for (let p = 1; p <= totalPages; p++) {
            html += '<button class="pagination-btn ' + (p === currentPage ? 'active' : '') + '" onclick="goToPage(' + p + ')">' + p + '</button>';
          }
          html += '<button class="pagination-btn" onclick="goToPage(' + (currentPage + 1) + ')" ' + (currentPage >= totalPages ? 'disabled' : '') + '>Next →</button>';
          html += '</div>';
          pagDiv.innerHTML = html;
        }

        function goToPage(page) { currentPage = page; renderPagination(); }

        function toggleSelectAll(checked) {
          document.querySelectorAll('.menu-checkbox').forEach(cb => { if (cb.closest('tr').style.display !== 'none') cb.checked = checked; });
          updateBulkButtons();
        }

        function updateBulkButtons() {
          const checked = document.querySelectorAll('.menu-checkbox:checked');
          const delBtn = document.getElementById('btn-bulk-delete');
          const togBtn = document.getElementById('btn-bulk-toggle');
          if (checked.length > 0) { delBtn.style.display = 'inline'; togBtn.style.display = 'inline'; }
          else { delBtn.style.display = 'none'; togBtn.style.display = 'none'; }
        }

        async function bulkDeleteSelected() {
          const checked = document.querySelectorAll('.menu-checkbox:checked');
          if (checked.length === 0) return;
          if (!confirm('Hapus ' + checked.length + ' menu terpilih?')) return;
          for (const cb of checked) {
            await fetch('/api/menus/' + cb.value, { method: 'DELETE' });
          }
          showToast(checked.length + ' menu dihapus');
          location.reload();
        }

        async function bulkToggleSelected() {
          const checked = document.querySelectorAll('.menu-checkbox:checked');
          if (checked.length === 0) return;
          for (const cb of checked) {
            await fetch('/api/menus/' + cb.value + '/toggle', { method: 'PATCH' });
          }
          showToast(checked.length + ' menu di-toggle statusnya');
          location.reload();
        }

        function showAddMenuModal() {
          document.getElementById('menu-name').value = '';
          document.getElementById('menu-price').value = '';
          document.getElementById('menu-description').value = '';
          document.getElementById('menu-category').value = 'makanan';
          document.getElementById('add-menu-modal').classList.add('show');
        }
        function closeAddMenuModal() { document.getElementById('add-menu-modal').classList.remove('show'); }

        async function saveMenu() {
          const name = document.getElementById('menu-name').value.trim();
          const price = parseInt(document.getElementById('menu-price').value);
          const description = document.getElementById('menu-description').value.trim();
          const category = document.getElementById('menu-category').value;
          if (!name || !price || price <= 0) { showToast('Nama dan harga wajib diisi dengan benar', 'warning'); return; }
          const response = await fetch('/api/menus', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, price, category, description })
          });
          if (response.ok) { closeAddMenuModal(); showToast('Menu berhasil ditambahkan'); location.reload(); }
          else { const data = await response.json(); showToast(data.error || 'Gagal menambahkan menu', 'error'); }
        }

        function showEditMenuModal(id, name, price, category, description, isAvailable) {
          document.getElementById('edit-menu-id').value = id;
          document.getElementById('edit-menu-name').value = name;
          document.getElementById('edit-menu-price').value = price;
          document.getElementById('edit-menu-description').value = description;
          document.getElementById('edit-menu-category').value = category;
          document.getElementById('edit-menu-available').value = String(isAvailable);
          document.getElementById('edit-menu-modal').classList.add('show');
        }
        function closeEditMenuModal() { document.getElementById('edit-menu-modal').classList.remove('show'); }

        async function saveEditMenu() {
          const id = document.getElementById('edit-menu-id').value;
          const name = document.getElementById('edit-menu-name').value.trim();
          const price = parseInt(document.getElementById('edit-menu-price').value);
          const description = document.getElementById('edit-menu-description').value.trim();
          const category = document.getElementById('edit-menu-category').value;
          const isAvailable = document.getElementById('edit-menu-available').value === 'true';
          if (!name || !price || price <= 0) { showToast('Nama dan harga wajib diisi', 'warning'); return; }
          const response = await fetch('/api/menus/' + id, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, price, description, category, isAvailable })
          });
          if (response.ok) { closeEditMenuModal(); showToast('Menu berhasil diupdate'); location.reload(); }
          else { showToast('Gagal mengupdate menu', 'error'); }
        }

        async function toggleMenu(id) { await fetch('/api/menus/' + id + '/toggle', { method: 'PATCH' }); showToast('Status menu diubah'); location.reload(); }

        function showDeleteConfirmModal(id, name) {
          pendingDeleteId = id;
          document.getElementById('delete-menu-name').textContent = name;
          document.getElementById('delete-confirm-modal').classList.add('show');
        }
        function closeDeleteConfirmModal() { document.getElementById('delete-confirm-modal').classList.remove('show'); pendingDeleteId = null; }
        async function confirmDeleteMenu() {
          if (!pendingDeleteId) return;
          await fetch('/api/menus/' + pendingDeleteId, { method: 'DELETE' });
          showToast('Menu berhasil dihapus');
          location.reload();
        }

        document.addEventListener('DOMContentLoaded', function() { renderPagination(); });
      </script>
      ${getCommonScripts()}
    `);
  });
