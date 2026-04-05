import { Elysia } from 'elysia';
import { htmlResponse } from '../templates/html';
import { getSidebarHtml } from '../templates/sidebar';
import { getNavbarHtml } from '../templates/navbar';
import { getFooterHtml } from '../templates/footer';
import { getCommonScripts } from '../templates/common-scripts';
import { getTokenFromCookies, verifyToken, redirectToLogin } from '../utils/auth';

export const suppliersPage = new Elysia()
  .get('/suppliers', async ({ cookie, headers }) => {
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
        ${getSidebarHtml('suppliers', user)}
        <div class="app-content">
          ${getNavbarHtml('Supplier', 'suppliers', user)}
          <main class="app-main">
            <div class="page-header">
              <h2>Daftar Supplier</h2>
              <button class="btn btn-primary" onclick="openSupplierModal()">+ Tambah Supplier</button>
            </div>
            <div class="card">
              <div class="table-container">
                <table class="table">
                  <thead><tr><th>Nama</th><th>Kontak</th><th>Telepon</th><th>Kategori</th><th>Status</th><th>Aksi</th></tr></thead>
                  <tbody id="suppliers-tbody"><tr><td colspan="6" class="text-center text-secondary" style="padding:40px;">Loading...</td></tr></tbody>
                </table>
              </div>
            </div>
          </main>
          ${getFooterHtml()}
        </div>
      </div>
      <div class="modal-backdrop" id="supplier-modal" style="display:none;">
        <div class="modal">
          <div class="modal-header"><h3 id="supplier-modal-title">Tambah Supplier</h3><button onclick="closeSupplierModal()" class="btn btn-icon">&times;</button></div>
          <form id="supplier-form" style="padding:24px;">
            <input type="hidden" id="supplier-id">
            <div class="form-grid">
              <div class="form-group"><label class="form-label">Nama Supplier *</label><input type="text" id="s-name" class="input" required></div>
              <div class="form-group"><label class="form-label">Contact Person</label><input type="text" id="s-contact" class="input"></div>
              <div class="form-group"><label class="form-label">Telepon *</label><input type="text" id="s-phone" class="input" required></div>
              <div class="form-group"><label class="form-label">Email</label><input type="email" id="s-email" class="input"></div>
              <div class="form-group" style="grid-column:span 2;"><label class="form-label">Alamat</label><textarea id="s-address" class="input" rows="2"></textarea></div>
              <div class="form-group"><label class="form-label">Kategori</label><input type="text" id="s-category" class="input" placeholder="Bahan Makanan, Minuman, dll"></div>
              <div class="form-group"><label class="form-label">Catatan</label><input type="text" id="s-notes" class="input"></div>
              <div class="form-group" style="grid-column:span 2;"><button type="submit" class="btn btn-primary">Simpan</button></div>
            </div>
          </form>
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
        async function loadSuppliers() {
          try {
            const res = await fetch('/api/suppliers');
            const data = await res.json();
            const tbody = document.getElementById('suppliers-tbody');
            if (!data || !data.length) { tbody.innerHTML = '<tr><td colspan="6" class="text-center text-secondary">Tidak ada data</td></tr>'; return; }
            tbody.innerHTML = data.map(s => '<tr><td><strong>' + s.name + '</strong></td><td>' + (s.contactPerson || '-') + '</td><td>' + (s.phone || '-') + '</td><td>' + (s.category || '-') + '</td><td><span class="badge ' + (s.isActive ? 'badge-success' : 'badge-error') + '">' + (s.isActive ? 'Aktif' : 'Nonaktif') + '</span></td><td><button class="btn btn-secondary btn-sm" onclick="editSupplier(' + s.id + ')">Edit</button></td></tr>').join('');
          } catch (e) {
            document.getElementById('suppliers-tbody').innerHTML = '<tr><td colspan="6" class="text-center text-secondary">Gagal memuat data: ' + e.message + '</td></tr>';
          }
        }
        function openSupplierModal(id) {
          document.getElementById('supplier-modal').style.display = 'flex';
          document.getElementById('supplier-modal-title').textContent = id ? 'Edit Supplier' : 'Tambah Supplier';
          document.getElementById('supplier-id').value = id || '';
        }
        function closeSupplierModal() { document.getElementById('supplier-modal').style.display = 'none'; document.getElementById('supplier-form').reset(); }
        async function editSupplier(id) {
          const res = await fetch('/api/suppliers/' + id);
          const s = await res.json();
          document.getElementById('supplier-id').value = s.id;
          document.getElementById('s-name').value = s.name;
          document.getElementById('s-contact').value = s.contactPerson || '';
          document.getElementById('s-phone').value = s.phone || '';
          document.getElementById('s-email').value = s.email || '';
          document.getElementById('s-address').value = s.address || '';
          document.getElementById('s-category').value = s.category || '';
          document.getElementById('s-notes').value = s.notes || '';
          openSupplierModal(s.id);
        }
        document.getElementById('supplier-form').addEventListener('submit', async (e) => {
          e.preventDefault();
          const id = document.getElementById('supplier-id').value;
          const data = { name: document.getElementById('s-name').value, contactPerson: document.getElementById('s-contact').value, phone: document.getElementById('s-phone').value, email: document.getElementById('s-email').value, address: document.getElementById('s-address').value, category: document.getElementById('s-category').value, notes: document.getElementById('s-notes').value };
          if (id) { await fetch('/api/suppliers/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); }
          else { await fetch('/api/suppliers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); }
          closeSupplierModal(); loadSuppliers();
        });
        loadSuppliers();
      </script>
    `);
  });
