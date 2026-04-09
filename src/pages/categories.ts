import { Elysia } from 'elysia';
import { htmlResponse } from '../templates/html';
import { getSidebarHtml } from '../templates/sidebar';
import { getNavbarHtml } from '../templates/navbar';
import { getFooterHtml } from '../templates/footer';
import { getCommonScripts } from '../templates/common-scripts';
import { getTokenFromCookies, verifyToken, redirectToLogin } from '../utils/auth';

export const categoriesPage = new Elysia()
  .get('/kategori', async ({ cookie, headers }) => {
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

    return htmlResponse(`
      <div class="app-layout">
        ${getSidebarHtml('kategori', user)}
        <div class="app-content">
          ${getNavbarHtml('Kelola Kategori', 'kategori', user)}
          <main class="app-main">
            <div class="stats-grid" id="stats-grid">
              <div class="stats-card">
                <div class="stats-label">Total Kategori</div>
                <div class="stats-value" id="stat-total">0</div>
                <div class="stats-change">Semua kategori</div>
              </div>
              <div class="stats-card">
                <div class="stats-label">Total Menu</div>
                <div class="stats-value" style="color: var(--color-info);" id="stat-menus">0</div>
                <div class="stats-change">Menu tersedia</div>
              </div>
              <div class="stats-card">
                <div class="stats-label">Aktif</div>
                <div class="stats-value" style="color: var(--color-success);" id="stat-active">0</div>
                <div class="stats-change">Bisa digunakan</div>
              </div>
              <div class="stats-card">
                <div class="stats-label">Tidak Aktif</div>
                <div class="stats-value" style="color: var(--color-error);" id="stat-inactive">0</div>
                <div class="stats-change">Tidak bisa digunakan</div>
              </div>
            </div>

            <div class="card">
              <div class="card-header">
                <div class="menu-toolbar">
                  <div class="menu-toolbar-left">
                    <input type="text" id="category-search" class="menu-search-input" placeholder="Cari kategori..." oninput="filterCategories()">
                  </div>
                  <div class="menu-toolbar-right">
                    <button class="btn btn-primary" id="btn-add-category">+ Tambah Kategori</button>
                  </div>
                </div>
              </div>
              <div class="table-container">
                <table class="table">
                  <thead>
                    <tr>
                      <th onclick="sortCategories('name')" style="cursor: pointer;">Nama Kategori <span id="sort-name"></span></th>
                      <th style="width: 100px;">Menu</th>
                      <th style="width: 100px;">Status</th>
                      <th style="width: 120px;">Aksi</th>
                    </tr>
                  </thead>
                  <tbody id="categories-table-body">
                    <tr><td colspan="4" class="text-center text-secondary" style="padding: 40px;">Memuat...</td></tr>
                  </tbody>
                </table>
              </div>
              <p class="text-center text-secondary" style="padding: 40px; display: none;" id="empty-state">Belum ada kategori</p>
            </div>
          </main>
          ${getFooterHtml()}
        </div>
      </div>

      <div class="modal" id="category-modal">
        <div class="modal-backdrop" id="category-modal-backdrop"></div>
        <div class="modal-content" style="max-width: 400px;">
          <div class="modal-header">
            <h3 id="category-modal-title">Tambah Kategori</h3>
            <button class="modal-close" id="category-modal-close">&times;</button>
          </div>
          <div class="modal-body">
            <form id="category-form">
              <input type="hidden" id="category-id">
              <div class="form-group">
                <label class="form-label">Nama Kategori *</label>
                <input type="text" id="category-name" class="input" required>
              </div>
              <div class="form-group">
                <label class="form-label">Status</label>
                <select id="category-available" class="input">
                  <option value="true">Aktif</option>
                  <option value="false">Tidak Aktif</option>
                </select>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="submit" form="category-form" class="btn btn-primary" id="btn-save-category">Simpan</button>
          </div>
        </div>
      </div>

<style>
.menu-search-input { padding: 6px 12px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: 13px; min-width: 200px; }
.menu-filter-select { padding: 6px 12px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: 13px; background: var(--color-bg); color: var(--color-text); }
.menu-toolbar { display: flex; justify-content: space-between; align-items: center; width: 100%; flex-wrap: wrap; gap: 8px; }
.menu-toolbar-left { display: flex; gap: 8px; flex: 1; flex-wrap: wrap; }
.menu-toolbar-right { display: flex; gap: 8px; }
.toggle-switch { display: inline-flex; align-items: center; cursor: pointer; position: relative; }
.toggle-switch input { opacity: 0; width: 0; height: 0; }
.toggle-slider { width: 40px; height: 22px; background: var(--color-border); border-radius: 11px; position: relative; transition: var(--transition); }
.toggle-slider::before { content: ''; position: absolute; width: 18px; height: 18px; background: white; border-radius: 50%; top: 2px; left: 2px; transition: var(--transition); }
.toggle-switch input:checked + .toggle-slider { background: var(--color-success); }
.toggle-switch input:checked + .toggle-slider::before { transform: translateX(18px); }
.menu-count-link { color: var(--color-primary); cursor: pointer; text-decoration: underline; }
.menu-count-link:hover { color: var(--color-primary-hover); }
</style>
      <script>
        let currentCategories = [];
        let currentMenus = [];
        let sortField = 'name';
        let sortDir = 'asc';

        async function loadData() {
          try {
            const [catsRes, menusRes] = await Promise.all([
              fetch('/categories'),
              fetch('/api/menus')
            ]);
            currentCategories = await catsRes.json();
            const menus = await menusRes.json();
            currentMenus = menus.reduce((acc, m) => {
              acc[m.category] = (acc[m.category] || 0) + 1;
              return acc;
            }, {});
            sortCategories(sortField);
          } catch (e) {
            document.getElementById('categories-table-body').innerHTML = '<tr><td colspan="4" class="text-center text-secondary" style="padding: 40px;">Gagal memuat data</td></tr>';
          }
        }

        function sortCategories(field) {
          if (sortField === field) {
            sortDir = sortDir === 'asc' ? 'desc' : 'asc';
          } else {
            sortField = field;
            sortDir = 'asc';
          }
          document.querySelectorAll('[id^="sort-"]').forEach(el => el.textContent = '');
          const el = document.getElementById('sort-' + field);
          if (el) el.textContent = sortDir === 'asc' ? '↑' : '↓';
          
          currentCategories.sort((a, b) => {
            let aVal = a[field];
            let bVal = b[field];
            if (typeof aVal === 'string') aVal = aVal.toLowerCase();
            if (typeof bVal === 'string') bVal = bVal.toLowerCase();
            if (sortDir === 'asc') return aVal > bVal ? 1 : -1;
            return aVal < bVal ? 1 : -1;
          });
          renderCategories();
        }

        function renderCategories() {
          const tbody = document.getElementById('categories-table-body');
          const emptyState = document.getElementById('empty-state');
          
          const activeCount = currentCategories.filter(c => c.isAvailable).length;
          const inactiveCount = currentCategories.length - activeCount;
          const totalMenus = Object.values(currentMenus).reduce((sum, count) => sum + count, 0);
          document.getElementById('stat-total').textContent = currentCategories.length;
          document.getElementById('stat-menus').textContent = totalMenus;
          document.getElementById('stat-active').textContent = activeCount;
          document.getElementById('stat-inactive').textContent = inactiveCount;
          
          if (currentCategories.length === 0) {
            tbody.innerHTML = '';
            emptyState.style.display = 'block';
            return;
          }
          
          emptyState.style.display = 'none';
          let html = '';
          for (let i = 0; i < currentCategories.length; i++) {
            const c = currentCategories[i];
            const menuCount = currentMenus[c.name] || 0;
            const statusClass = c.isAvailable ? 'badge-success' : 'badge-error';
            const statusLabel = c.isAvailable ? 'Aktif' : 'Tidak Aktif';
            
html += '<tr data-category-id="' + c.id + '" data-name="' + c.name + '" data-available="' + c.isAvailable + '">' +
'<td><strong>' + c.name + '</strong></td>' +
'<td><a href="/menu?category=' + encodeURIComponent(c.name) + '" class="menu-count-link">' + menuCount + ' menu</a></td>' +
'<td><label class="toggle-switch" onclick="event.stopPropagation(); toggleCategory(' + c.id + ', ' + c.isAvailable + ')">' +
'<input type="checkbox" ' + (c.isAvailable ? 'checked' : '') + '>' +
'<span class="toggle-slider"></span>' +
'</label></td>' +
'<td style="white-space: nowrap;">' +
'<button class="btn btn-secondary" data-action="edit" data-id="' + c.id + '" data-name="' + c.name + '" data-available="' + c.isAvailable + '" style="padding: 4px 8px; font-size: 11px; margin-right: 4px;">Edit</button>' +
'<button class="btn btn-danger" data-action="delete" data-id="' + c.id + '" style="padding: 4px 8px; font-size: 11px;">Hapus</button>' +
'</td>' +
'</tr>';
          }
          tbody.innerHTML = html;
          
          tbody.querySelectorAll('button[data-action]').forEach(btn => {
            btn.addEventListener('click', function() {
              const action = this.dataset.action;
              const id = parseInt(this.dataset.id);
              if (action === 'edit') {
                editCategory(id, this.dataset.name, this.dataset.available === 'true');
              } else if (action === 'delete') {
                deleteCategory(id);
              }
            });
          });
        }

function filterCategories() {
const search = document.getElementById('category-search').value.toLowerCase();
const rows = document.querySelectorAll('#categories-table-body tr');
rows.forEach(row => {
const name = row.dataset.name || '';
row.style.display = !search || name.toLowerCase().includes(search) ? '' : 'none';
});
}

// Apply category filter from URL query parameter
function applyCategoryFilterFromURL() {
const params = new URLSearchParams(window.location.search);
const filterParam = params.get('filter');
if (filterParam) {
const searchInput = document.getElementById('category-search');
if (searchInput) {
searchInput.value = filterParam;
filterCategories();
console.log('Applied category filter from URL:', filterParam);
}
}
}

        document.getElementById('btn-add-category').addEventListener('click', function() {
          showAddCategoryModal();
        });

        document.getElementById('category-modal-backdrop').addEventListener('click', closeCategoryModal);
        document.getElementById('category-modal-close').addEventListener('click', closeCategoryModal);
        document.getElementById('btn-save-category').addEventListener('click', saveCategory);

        function showAddCategoryModal() {
          document.getElementById('category-modal-title').textContent = 'Tambah Kategori';
          document.getElementById('category-id').value = '';
          document.getElementById('category-name').value = '';
          document.getElementById('category-available').value = 'true';
          document.getElementById('category-modal').classList.add('show');
          document.getElementById('category-name').focus();
        }

        function editCategory(id, name, isAvailable) {
          document.getElementById('category-modal-title').textContent = 'Edit Kategori';
          document.getElementById('category-id').value = id;
          document.getElementById('category-name').value = name;
          document.getElementById('category-available').value = isAvailable ? 'true' : 'false';
          document.getElementById('category-modal').classList.add('show');
          document.getElementById('category-name').focus();
        }

        function closeCategoryModal() {
          document.getElementById('category-modal').classList.remove('show');
        }

        async function saveCategory() {
          const id = document.getElementById('category-id').value;
          const name = document.getElementById('category-name').value.trim();
          const isAvailable = document.getElementById('category-available').value === 'true';
          
          if (!name) return alert('Nama kategori wajib diisi');
          
          try {
            let res;
            if (id) {
              res = await fetch('/categories/' + id, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, isAvailable })
              });
            } else {
              res = await fetch('/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, isAvailable })
              });
            }
            const data = await res.json();
            if (data.error) return alert(data.error);
            
            closeCategoryModal();
            loadData();
          } catch (e) {
            alert('Gagal menyimpan kategori');
          }
        }

        async function toggleCategory(id, currentAvailable) {
          try {
            await fetch('/categories/' + id + '/toggle', { method: 'PATCH' });
            loadData();
          } catch (e) {
            alert('Gagal mengubah status');
          }
        }

async function deleteCategory(id) {
if (!confirm('Yakin hapus kategori ini?')) return;
try {
await fetch('/categories/' + id, { method: 'DELETE' });
loadData();
} catch (e) {
alert('Gagal menghapus kategori');
}
}

// Apply category filter from URL if present
// Apply category filter from URL if present
function applyCategoryFilterFromURL() {
const params = new URLSearchParams(window.location.search);
const filterParam = params.get('filter');
if (filterParam) {
const searchInput = document.getElementById('category-search');
if (searchInput) {
searchInput.value = filterParam;
filterCategories();
console.log('Applied category filter from URL:', filterParam);
}
}
}

// Call after loadData completes
loadData().then(() => applyCategoryFilterFromURL());
      </script>
      ${getCommonScripts()}
    `);
  });