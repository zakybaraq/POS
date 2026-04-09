import { Elysia } from 'elysia';
import { htmlResponse } from '../templates/html';
import { getSidebarHtml } from '../templates/sidebar';
import { getNavbarHtml } from '../templates/navbar';
import { getFooterHtml } from '../templates/footer';
import { getCommonScripts } from '../templates/common-scripts';
import { getTokenFromCookies, verifyToken, redirectToLogin } from '../utils/auth';

export const categoriesPage = new Elysia()
  .get('/categories', async ({ cookie, headers }) => {
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
        ${getSidebarHtml('categories', user)}
        <div class="app-content">
          ${getNavbarHtml('Kelola Kategori', 'categories', user)}
          <main class="app-main">
            <div class="categories-toolbar">
              <input type="text" id="category-search" class="menu-search-input" placeholder="Cari kategori..." oninput="filterCategories()">
              <button class="btn btn-primary" onclick="showAddCategoryModal()">+ Tambah Kategori</button>
            </div>
            <div class="table-container">
              <table class="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Nama Kategori</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody id="categories-table-body">
                  <tr><td colspan="3">Memuat...</td></tr>
                </tbody>
              </table>
            </div>
          </main>
          ${getFooterHtml()}
        </div>
      </div>

      <div class="modal" id="add-category-modal">
        <div class="modal-backdrop" onclick="closeAddCategoryModal()"></div>
        <div class="modal-content">
          <div class="modal-header">
            <h3>Tambah Kategori</h3>
            <button class="modal-close" onclick="closeAddCategoryModal()">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Nama Kategori</label>
              <input type="text" id="category-name" class="input" placeholder="cth: makanan, jalanan, premium">
            </div>
          </div>
          <div class="modal-footer">
            <button onclick="closeAddCategoryModal()" class="btn btn-secondary">Batal</button>
            <button onclick="saveCategory()" class="btn btn-primary">Simpan</button>
          </div>
        </div>
      </div>

      <div class="modal" id="edit-category-modal">
        <div class="modal-backdrop" onclick="closeEditCategoryModal()"></div>
        <div class="modal-content">
          <div class="modal-header">
            <h3>Edit Kategori</h3>
            <button class="modal-close" onclick="closeEditCategoryModal()">&times;</button>
          </div>
          <div class="modal-body">
            <input type="hidden" id="edit-category-id">
            <div class="form-group">
              <label>Nama Kategori</label>
              <input type="text" id="edit-category-name" class="input">
            </div>
          </div>
          <div class="modal-footer">
            <button onclick="closeEditCategoryModal()" class="btn btn-secondary">Batal</button>
            <button onclick="saveEditCategory()" class="btn btn-primary">Simpan</button>
          </div>
        </div>
      </div>

      <style>
        .categories-toolbar { display: flex; justify-content: space-between; margin-bottom: 16px; }
        .menu-search-input { padding: 8px 12px; border: 1px solid var(--color-border); border-radius: var(--radius-md); width: 250px; }
      </style>
      <script>
        async function loadCategories() {
          try {
            const res = await fetch('/categories');
            const categories = await res.json();
            renderCategories(categories);
          } catch (e) {
            document.getElementById('categories-table-body').innerHTML = '<tr><td colspan="3">Gagal memuat kategori</td></tr>';
          }
        }

        function renderCategories(categories) {
          const tbody = document.getElementById('categories-table-body');
          if (categories.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3">Belum ada kategori</td></tr>';
            return;
          }
          let html = '';
          for (let i = 0; i < categories.length; i++) {
            const c = categories[i];
            html += '<tr data-name="' + c.name + '">' +
              '<td>' + (i + 1) + '</td>' +
              '<td><strong>' + c.name + '</strong></td>' +
              '<td>' +
                '<button class="btn btn-sm" onclick="editCategory(' + c.id + ', \'' + c.name + '\')">Edit</button> ' +
                '<button class="btn btn-sm btn-danger" onclick="deleteCategory(' + c.id + ')">Hapus</button>' +
              '</td>' +
            '</tr>';
          }
          tbody.innerHTML = html;
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
          document.getElementById('add-category-modal').classList.add('show');
          document.getElementById('category-name').value = '';
          document.getElementById('category-name').focus();
        }

        function closeAddCategoryModal() {
          document.getElementById('add-category-modal').classList.remove('show');
        }

        function showEditCategoryModal() {
          document.getElementById('edit-category-modal').classList.add('show');
        }

        function closeEditCategoryModal() {
          document.getElementById('edit-category-modal').classList.remove('show');
        }

        async function saveCategory() {
          const name = document.getElementById('category-name').value.trim();
          if (!name) return alert('Nama kategori wajib diisi');
          
          try {
            const res = await fetch('/categories', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name })
            });
            const data = await res.json();
            if (data.error) return alert(data.error);
            
            closeAddCategoryModal();
            loadCategories();
          } catch (e) {
            alert('Gagal menyimpan kategori');
          }
        }

        async function editCategory(id, name) {
          document.getElementById('edit-category-id').value = id;
          document.getElementById('edit-category-name').value = name;
          showEditCategoryModal();
        }

        async function saveEditCategory() {
          const id = document.getElementById('edit-category-id').value;
          const name = document.getElementById('edit-category-name').value.trim();
          if (!name) return alert('Nama kategori wajib diisi');
          
          try {
            const res = await fetch('/categories/' + id, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name })
            });
            const data = await res.json();
            if (data.error) return alert(data.error);
            
            closeEditCategoryModal();
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