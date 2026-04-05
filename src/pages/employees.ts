import { Elysia } from 'elysia';
import { htmlResponse } from '../templates/html';
import { getSidebarHtml } from '../templates/sidebar';
import { getNavbarHtml } from '../templates/navbar';
import { getFooterHtml } from '../templates/footer';
import { getCommonScripts } from '../templates/common-scripts';
import { getTokenFromCookies, verifyToken, redirectToLogin } from '../utils/auth';

export const employeesPage = new Elysia()
  .get('/employees', async ({ cookie, headers }) => {
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
        ${getSidebarHtml('employees', user)}
        <div class="app-content">
          ${getNavbarHtml('Karyawan', 'employees', user)}
          <main class="app-main">
            <div class="tab-nav">
              <button class="tab-btn active" data-tab="list">Daftar Karyawan</button>
              <button class="tab-btn" data-tab="performance">Performa Kasir</button>
            </div>
            <div class="tab-content active" id="tab-list">
              <div class="page-header">
                <h2>Karyawan</h2>
                <button class="btn btn-primary" onclick="openEmpModal()">+ Tambah Karyawan</button>
              </div>
              <div class="card"><div class="table-container">
                <table class="table">
                  <thead><tr><th>Nama</th><th>Jabatan</th><th>Telepon</th><th>Gaji</th><th>Masuk</th><th>Status</th><th>Aksi</th></tr></thead>
                  <tbody id="emp-tbody"><tr><td colspan="7" class="text-center text-secondary" style="padding:40px;">Loading...</td></tr></tbody>
                </table>
              </div></div>
            </div>
            <div class="tab-content" id="tab-performance">
              <div class="page-header">
                <h2>Performa Kasir</h2>
                <div style="display:flex;gap:8px;align-items:center;">
                  <input type="date" id="perf-start" class="input">
                  <span>s/d</span>
                  <input type="date" id="perf-end" class="input">
                  <button class="btn btn-primary" onclick="loadPerformance()">Tampilkan</button>
                </div>
              </div>
              <div class="card"><div class="table-container">
                <table class="table">
                  <thead><tr><th>Kasir</th><th>Transaksi</th><th>Rata-rata/Order</th><th>Total Penjualan</th><th>% Selesai</th></tr></thead>
                  <tbody id="perf-tbody"><tr><td colspan="5" class="text-center text-secondary" style="padding:40px;">Pilih tanggal dan klik Tampilkan</td></tr></tbody>
                </table>
              </div></div>
            </div>
          </main>
          ${getFooterHtml()}
        </div>
      </div>
      <div class="modal-backdrop" id="emp-modal" style="display:none;">
        <div class="modal show"><div class="modal-content" style="max-width:600px;">
          <div class="modal-header"><h3 id="emp-modal-title">Tambah Karyawan</h3><button onclick="closeEmpModal()" class="modal-close">&times;</button></div>
          <div class="modal-body">
            <form id="emp-form">
              <input type="hidden" id="emp-id">
              <div class="form-grid">
                <div class="form-group"><label class="form-label">User ID *</label><input type="number" id="emp-userid" class="input" required></div>
                <div class="form-group"><label class="form-label">Jabatan *</label><select id="emp-position" class="input" required>
                  <option value="Kasir">Kasir</option><option value="Waiter">Waiter</option><option value="Chef">Chef</option><option value="Manager">Manager</option>
                </select></div>
                <div class="form-group"><label class="form-label">Telepon</label><input type="text" id="emp-phone" class="input"></div>
                <div class="form-group"><label class="form-label">Gaji</label><input type="number" id="emp-salary" class="input"></div>
                <div class="form-group"><label class="form-label">Tanggal Masuk</label><input type="date" id="emp-hiredate" class="input"></div>
                <div class="form-group"><label class="form-label">Kontak Darurat</label><input type="text" id="emp-emergency" class="input"></div>
                <div class="form-group" style="grid-column:span 2;"><label class="form-label">Catatan</label><textarea id="emp-notes" class="input" rows="2"></textarea></div>
              </div>
            </form>
          </div>
          <div class="modal-footer"><button type="submit" form="emp-form" class="btn btn-primary">Simpan</button></div>
        </div></div>
      </div>
      <style>
        .page-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; flex-wrap:wrap; gap:12px; }
        .form-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
        .form-group { display:flex; flex-direction:column; gap:4px; }
        .form-label { font-size:14px; font-weight:500; color:var(--color-text-secondary); }
      </style>
      ${getCommonScripts()}
      <script>
        document.querySelectorAll('.tab-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
          });
        });

        async function loadEmployees() {
          try {
            const res = await fetch('/api/employees');
            const data = await res.json();
            const tbody = document.getElementById('emp-tbody');
            if (!data || !data.length) { tbody.innerHTML = '<tr><td colspan="7" class="text-center text-secondary">Tidak ada data</td></tr>'; return; }
            tbody.innerHTML = data.map(e => '<tr><td><strong>' + (e.name || '-') + '</strong></td><td>' + (e.position || '-') + '</td><td>' + (e.phone || '-') + '</td><td>Rp ' + (e.salary || 0).toLocaleString('id-ID') + '</td><td>' + (e.hireDate ? new Date(e.hireDate).toLocaleDateString('id-ID') : '-') + '</td><td><span class="badge ' + (e.isActive ? 'badge-success' : 'badge-error') + '">' + (e.isActive ? 'Aktif' : 'Nonaktif') + '</span></td><td><button class="btn btn-secondary btn-sm" onclick="editEmp(' + e.id + ')">Edit</button></td></tr>').join('');
          } catch (e) { document.getElementById('emp-tbody').innerHTML = '<tr><td colspan="7" class="text-center text-secondary">Error: ' + e.message + '</td></tr>'; }
        }

        function openEmpModal() { document.getElementById('emp-modal').style.display = 'flex'; document.getElementById('emp-modal-title').textContent = 'Tambah Karyawan'; document.getElementById('emp-id').value = ''; document.getElementById('emp-form').reset(); }
        function closeEmpModal() { document.getElementById('emp-modal').style.display = 'none'; }

        async function editEmp(id) {
          const res = await fetch('/api/employees/' + id);
          const e = await res.json();
          document.getElementById('emp-id').value = e.id;
          document.getElementById('emp-userid').value = e.userId;
          document.getElementById('emp-position').value = e.position;
          document.getElementById('emp-phone').value = e.phone || '';
          document.getElementById('emp-salary').value = e.salary || 0;
          document.getElementById('emp-hiredate').value = e.hireDate ? new Date(e.hireDate).toISOString().split('T')[0] : '';
          document.getElementById('emp-emergency').value = e.emergencyContact || '';
          document.getElementById('emp-notes').value = e.notes || '';
          openEmpModal();
        }

        document.getElementById('emp-form').addEventListener('submit', async (e) => {
          e.preventDefault();
          const id = document.getElementById('emp-id').value;
          const data = { userId: parseInt(document.getElementById('emp-userid').value), position: document.getElementById('emp-position').value, phone: document.getElementById('emp-phone').value, salary: parseInt(document.getElementById('emp-salary').value) || 0, hireDate: document.getElementById('emp-hiredate').value ? new Date(document.getElementById('emp-hiredate').value) : new Date(), emergencyContact: document.getElementById('emp-emergency').value, notes: document.getElementById('emp-notes').value };
          if (id) { await fetch('/api/employees/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); }
          else { await fetch('/api/employees', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); }
          closeEmpModal(); loadEmployees();
        });

        async function loadPerformance() {
          const start = document.getElementById('perf-start').value;
          const end = document.getElementById('perf-end').value;
          if (!start || !end) { alert('Pilih tanggal'); return; }
          const res = await fetch('/api/employees/performance?startDate=' + start + '&endDate=' + end);
          const data = await res.json();
          const tbody = document.getElementById('perf-tbody');
          if (!data || !data.length) { tbody.innerHTML = '<tr><td colspan="5" class="text-center text-secondary">Tidak ada data</td></tr>'; return; }
          tbody.innerHTML = data.map(d => '<tr><td><strong>' + (d.userName || 'Unknown') + '</strong></td><td>' + d.totalTransactions + '</td><td>Rp ' + Math.round(d.avgOrderValue || 0).toLocaleString('id-ID') + '</td><td>Rp ' + (d.totalSales || 0).toLocaleString('id-ID') + '</td><td>' + (d.totalTransactions > 0 ? Math.round((d.completedOrders / d.totalTransactions) * 100) : 0) + '%</td></tr>').join('');
        }

        const today = new Date().toISOString().split('T')[0];
        const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
        document.getElementById('perf-start').value = monthAgo;
        document.getElementById('perf-end').value = today;

        loadEmployees();
      </script>
    `);
  });
