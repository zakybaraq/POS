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
            <div class="card">
              <div class="card-header">
                <div class="menu-toolbar">
                  <div class="menu-toolbar-left">
                    <input type="text" id="category-search" class="menu-search-input" placeholder="Cari kategori..." oninput="filterCategories()">
                  </div>
                  <div class="menu-toolbar-right">
                    <button class="btn btn-primary" onclick="showAddCategoryModal()">+ Tambah Kategori</button>
                  </div>
                </div>
              </div>
              <div class="table-container">
                <table class="table">
                  <thead>
                    <tr>
                      <th onclick="sortCategories('id')" style="cursor: pointer;"># <span id="sort-id"></span></th>
                      <th onclick="sortCategories('name')" style="cursor: pointer;">Nama Kategori <span id="sort-name"></span></th>
                      <th style="width: 120px;">Aksi</th>
                    </tr>
                  </thead>
                  <tbody id="categories-table-body">
                    <tr><td colspan="3" class="text-center text-secondary" style="padding: 40px;">Memuat...</td></tr>
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
        <div class="modal-backdrop" onclick="closeCategoryModal()"></div>
        <div class="modal-content" style="max-width: 400px;">
          <div class="modal-header">
            <h3 id="category-modal-title">Tambah Kategori</h3>
            <button class="modal-close" onclick="closeCategoryModal()">&times;</button>
          </div>
          <div class="modal-body">
            <form id="category-form">
              <input type="hidden" id="category-id">
              <div class="form-group">
                <label class="form-label">Nama Kategori *</label>
                <input type="text" id="category-name" class="input" required>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="submit" form="category-form" class="btn btn-primary" onclick="saveCategory()">Simpan</button>
          </div>
        </div>
      </div>

      <style>
        .menu-search-input { padding: 6px 12px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: 13px; min-width: 200px; }
        .menu-filter-select { padding: 6px 12px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: 13px; background: var(--color-bg); color: var(--color-text); }
        .menu-toolbar { display: flex; justify-content: space-between; align-items: center; width: 100%; flex-wrap: wrap; gap: 8px; }
        .menu-toolbar-left { display: flex; gap: 8px; flex: 1; flex-wrap: wrap; }
        .menu-toolbar-right { display: flex; gap: 8px; }
      </style>
      <script>
        let currentCategories = [];
        let sortField = 'id';
        let sortDir = 'asc';

        async function loadCategories() {
          try {
            const res = await fetch('/categories');
            currentCategories = await res.json();
            sortCategories(sortField);
          } catch (e) {
            document.getElementById('categories-table-body').innerHTML = '<tr><td colspan="3" class="text-center text-secondary" style="padding: 40px;">Gagal memuat kategori</td></tr>';
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
          
          if (currentCategories.length === 0) {
            tbody.innerHTML = '';
            emptyState.style.display = 'block';
            return;
          }
          
          emptyState.style.display = 'none';
          let html = '';
          for (let i = 0; i < currentCategories.length; i++) {
            const c = currentCategories[i];
            html += '<tr data-category-id="' + c.id + '" data-name="' + c.name + '">' +
              '<td><strong>#' + c.id + '</strong></td>' +
              '<td>' + c.name + '</td>' +
              '<td>' +
                '<button class="btn btn-sm" data-action="edit" data-id="' + c.id + '" data-name="' + c.name + '">Edit</button> ' +
                '<button class="btn btn-sm btn-danger" data-action="delete" data-id="' + c.id + '">Hapus</button>' +
              '</td>' +
            '</tr>';
          }
          tbody.innerHTML = html;
          
          tbody.querySelectorAll('button[data-action]').forEach(btn => {
            btn.addEventListener('click', function() {
              const action = this.dataset.action;
              const id = parseInt(this.dataset.id);
              if (action === 'edit') editCategory(id, this.dataset.name);
              else if (action === 'delete') deleteCategory(id);
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

        function showAddCategoryModal() {
          document.getElementById('category-modal-title').textContent = 'Tambah Kategori';
          document.getElementById('category-id').value = '';
          document.getElementById('category-name').value = '';
          document.getElementById('category-modal').classList.add('show');
          document.getElementById('category-name').focus();
        }

        function editCategory(id, name) {
          document.getElementById('category-modal-title').textContent = 'Edit Kategori';
          document.getElementById('category-id').value = id;
          document.getElementById('category-name').value = name;
          document.getElementById('category-modal').classList.add('show');
          document.getElementById('category-name').focus();
        }

        function closeCategoryModal() {
          document.getElementById('category-modal').classList.remove('show');
        }

        async function saveCategory() {
          const id = document.getElementById('category-id').value;
          const name = document.getElementById('category-name').value.trim();
          if (!name) return alert('Nama kategori wajib diisi');
          
          try {
            let res;
            if (id) {
              res = await fetch('/categories/' + id, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
              });
            } else {
              res = await fetch('/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
              });
            }
            const data = await res.json();
            if (data.error) return alert(data.error);
            
            closeCategoryModal();
            loadCategories();
          } catch (e) {
            alert('Gagal menyimpan kategori');
          }
        }

        async function deleteCategory(id) {
          if (!confirm('Yakin hapus kategori ini?')) return;
          
          try {
            await fetch('/categories/' + id, { method: 'DELETE' });
            loadCategories();
          } catch (e) {
            alert('Gagal menghapus kategori');
          }
        }

        loadCategories();
      </script>
      ${getCommonScripts()}
    `);
  });
