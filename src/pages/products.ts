import { Elysia } from 'elysia';
import { htmlResponse } from '../templates/html';
import { getSidebarHtml } from '../templates/sidebar';
import { getNavbarHtml } from '../templates/navbar';
import { getFooterHtml } from '../templates/footer';
import { getCommonScripts } from '../templates/common-scripts';
import { getTokenFromCookies, verifyToken, redirectToLogin } from '../utils/auth';

export const productsPage = new Elysia()
  .get('/products', async ({ cookie, headers }) => {
    const token = getTokenFromCookies(cookie, headers);
    if (!token) return redirectToLogin();

    let user = null;
    try {
      user = verifyToken(token);
    } catch {
      return redirectToLogin();
    }

    const { getAllMenus } = await import('../repositories/menu');
    const menus = await getAllMenus();

    return htmlResponse(`
      <div class="app-layout">
        <aside class="sidebar">
          <div class="sidebar-header">
            <div class="sidebar-logo">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l4.59-4.58L18 11l-6 6z"/>
              </svg>
              POS App
            </div>
          </div>
          <nav class="sidebar-nav">
            <ul class="sidebar-menu">
              <li class="sidebar-menu-item">
                <a href="/" class="sidebar-menu-link">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                  Dashboard
                </a>
              </li>
              <li class="sidebar-menu-item">
                <a href="/pos" class="sidebar-menu-link">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>
                  POS
                </a>
              </li>
              <li class="sidebar-menu-item">
                <a href="/menu" class="sidebar-menu-link">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                  Menu
                </a>
              </li>
              <li class="sidebar-menu-item">
                <a href="/products" class="sidebar-menu-link active">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
                  Produk
                </a>
              </li>
              <li class="sidebar-menu-item">
                <a href="/tables" class="sidebar-menu-link">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                  Meja
                </a>
              </li>
              <li class="sidebar-menu-item">
                <a href="/orders" class="sidebar-menu-link">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
                  Pesanan
                </a>
              </li>
            </ul>
          </nav>
          <div class="sidebar-footer">
            <div class="navbar-user" onclick="logout()" style="cursor: pointer;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
              <span>Logout</span>
            </div>
          </div>
        </aside>
        <div class="app-content">
          <header class="navbar">
            <h1 class="navbar-title">Kelola Produk</h1>
            <div class="navbar-right">
              <button class="btn btn-primary" onclick="showAddProductModal()">+ Tambah Produk</button>
            </div>
          </header>
          <main class="app-main">
            <div class="card" style="margin-bottom: 24px;">
              <div style="display: flex; gap: 16px;">
                <input type="text" id="search-product" class="input input-search" placeholder="Cari produk..." style="flex: 1;">
                <select id="filter-category" class="input" style="width: 200px;">
                  <option value="all">Semua Kategori</option>
                  <option value="makanan">Makanan</option>
                  <option value="minuman">Minuman</option>
                </select>
              </div>
            </div>
            <div class="card">
              <div class="table-container">
                <table class="table">
                  <thead>
                    <tr><th>Gambar</th><th>Nama Produk</th><th>Kategori</th><th>Harga</th><th>Stok</th><th>Status</th><th>Aksi</th></tr>
                  </thead>
                  <tbody id="products-table-body">
                    ${menus.map(m => `
                      <tr class="product-row" data-category="${m.category}">
                        <td>
                          <div style="width: 50px; height: 50px; background: var(--color-bg-alt); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center;">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" stroke-width="2">
                              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                              <circle cx="8.5" cy="8.5" r="1.5"></circle>
                              <polyline points="21 15 16 10 5 21"></polyline>
                            </svg>
                          </div>
                        </td>
                        <td><strong>${m.name}</strong></td>
                        <td><span class="badge ${m.category === 'makanan' ? 'badge-warning' : 'badge-primary'}">${m.category}</span></td>
                        <td>Rp ${m.price.toLocaleString('id-ID')}</td>
                        <td><span class="badge ${m.isAvailable ? 'badge-success' : 'badge-error'}">${m.isAvailable ? 'Tersedia' : 'Kosong'}</span></td>
                        <td><button onclick="toggleProduct(${m.id})" class="badge ${m.isAvailable ? 'badge-success' : 'badge-error'}">${m.isAvailable ? 'Aktif' : 'Nonaktif'}</button></td>
                        <td>
                          <button onclick="editProduct(${m.id}, '${m.name.replace(/'/g, "\\'")}', ${m.price}, '${m.category}')" class="btn btn-secondary" style="padding: 6px 12px; font-size: 12px;">Edit</button>
                          <button onclick="deleteProduct(${m.id})" class="btn btn-danger" style="padding: 6px 12px; font-size: 12px;">Hapus</button>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          </main>
        </div>
      </div>
      <div id="add-product-modal" class="modal-overlay">
        <div class="modal-content">
          <div class="modal-header">
            <h3 class="modal-title">Tambah Produk</h3>
            <button class="modal-close" onclick="document.getElementById('add-product-modal').style.display='none'">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
          <div class="modal-body">
            <form id="add-product-form">
              <div class="input-group" style="margin-bottom: 16px;">
                <label class="input-label">Nama Produk</label>
                <input type="text" name="name" class="input" placeholder="Nama produk" required>
              </div>
              <div class="input-group" style="margin-bottom: 16px;">
                <label class="input-label">Harga</label>
                <input type="number" name="price" class="input" placeholder="0" required>
              </div>
              <div class="input-group" style="margin-bottom: 16px;">
                <label class="input-label">Kategori</label>
                <select name="category" class="input" required>
                  <option value="makanan">Makanan</option>
                  <option value="minuman">Minuman</option>
                </select>
              </div>
              <button type="submit" class="btn btn-primary" style="width: 100%;">Simpan</button>
            </form>
          </div>
        </div>
      </div>
      <script>
        document.getElementById('search-product').addEventListener('input', function(e) {
          const search = e.target.value.toLowerCase();
          document.querySelectorAll('.product-row').forEach(row => {
            const name = row.querySelector('td:nth-child(2)').textContent.toLowerCase();
            row.style.display = name.includes(search) ? '' : 'none';
          });
        });
        document.getElementById('filter-category').addEventListener('change', function(e) {
          const category = e.target.value;
          document.querySelectorAll('.product-row').forEach(row => {
            row.style.display = (category === 'all' || row.dataset.category === category) ? '' : 'none';
          });
        });
        function showAddProductModal() {
          document.getElementById('add-product-modal').style.display = 'flex';
        }
        document.getElementById('add-product-form').addEventListener('submit', async (e) => {
          e.preventDefault();
          const formData = new FormData(e.target);
          const response = await fetch('/api/menus', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: formData.get('name'),
              price: parseInt(formData.get('price')),
              category: formData.get('category')
            })
          });
          const data = await response.json();
          if (data.error) { alert(data.error); return; }
          document.getElementById('add-product-modal').style.display = 'none';
          location.reload();
        });
        async function toggleProduct(id) {
          await fetch('/api/menus/' + id + '/toggle', { method: 'PATCH' });
          location.reload();
        }
        function editProduct(id, name, price, category) {
          const newName = prompt('Nama Produk:', name);
          if (!newName) return;
          const newPrice = parseInt(prompt('Harga:', price));
          if (isNaN(newPrice) || newPrice <= 0) { alert('Harga tidak valid'); return; }
          const newCategory = prompt('Kategori (makanan/minuman):', category);
          if (newCategory !== 'makanan' && newCategory !== 'minuman') { alert('Kategori tidak valid'); return; }
          fetch('/api/menus/' + id, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newName, price: newPrice, category: newCategory })
          }).then(() => location.reload());
        }
        async function deleteProduct(id) {
          if (!confirm('Hapus produk?')) return;
          await fetch('/api/menus/' + id, { method: 'DELETE' });
          location.reload();
        }
        function logout() {
          fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
            .then(() => window.location.href = '/login');
        }
      </script>
    `);
  });
