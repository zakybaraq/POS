import { Elysia } from 'elysia';
import { htmlResponse } from '../templates/html';
import { getSidebarHtml } from '../templates/sidebar';
import { getNavbarHtml } from '../templates/navbar';
import { getFooterHtml } from '../templates/footer';
import { getCommonScripts } from '../templates/common-scripts';
import { getTokenFromCookies, verifyToken, redirectToLogin } from '../utils/auth';
import * as userRepo from '../repositories/user';
import * as auditRepo from '../repositories/audit-log';

export const adminPage = new Elysia()
  .get('/admin', async ({ cookie, headers }) => {
    const token = getTokenFromCookies(cookie, headers);
    if (!token) return redirectToLogin();

    let user = null;
    try {
      user = verifyToken(token);
    } catch {
      return redirectToLogin();
    }

    if (user.role !== 'super_admin') {
      return new Response('Akses ditolak: halaman ini hanya untuk Super Admin', { status: 403 });
    }

    const userStats = await userRepo.getUsersWithStats();
    const auditLogs = await auditRepo.getRecentAuditLogs(20);

    const roleBadgeClass = (role: string) => {
      const map: Record<string, string> = {
        super_admin: 'badge-error',
        admin_restoran: 'badge-warning',
        kasir: 'badge-primary',
        waitress: 'badge-success',
        chef: 'badge-info'
      };
      return map[role] || 'badge-secondary';
    };

    const roleLabel = (role: string) => {
      return role.charAt(0).toUpperCase() + role.slice(1).replace('_', ' ');
    };

    const formatLastLogin = (d: any) => {
      if (!d) return '<span class="text-secondary">Belum pernah</span>';
      const date = new Date(d);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffH = Math.floor(diffMs / 3600000);
      if (diffH < 1) return 'Baru saja';
      if (diffH < 24) return `${diffH} jam lalu`;
      return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    };

    const actionLabel = (action: string) => {
      const map: Record<string, string> = {
        login: '🔑 Login',
        user_created: '👤 User Dibuat',
        user_updated: '✏️ User Diubah',
        user_deleted: '🗑️ User Dihapus',
        password_reset: '🔒 Reset Password',
      };
      return map[action] || action;
    };

    return htmlResponse(`
      <div class="app-layout">
        ${getSidebarHtml('admin', user)}
        <div class="app-content">
          ${getNavbarHtml('Admin Panel', 'admin', user)}
          <main class="app-main">
            <div class="stats-grid">
              <div class="stats-card">
                <div class="stats-label">Total Users</div>
                <div class="stats-value">${userStats.total}</div>
                <div class="stats-change">Terdaftar</div>
              </div>
              <div class="stats-card">
                <div class="stats-label">Active Users</div>
                <div class="stats-value" style="color: var(--color-success);">${userStats.active}</div>
                <div class="stats-change">Sedang aktif</div>
              </div>
              <div class="stats-card">
                <div class="stats-label">Inactive Users</div>
                <div class="stats-value" style="color: var(--color-error);">${userStats.inactive}</div>
                <div class="stats-change">Nonaktif</div>
              </div>
              <div class="stats-card">
                <div class="stats-label">Roles</div>
                <div class="stats-value" style="font-size: 14px;">${Object.entries(userStats.roleCounts).map(([r, c]) => `<span style="display:inline-block;margin:2px 4px;"><span class="badge ${roleBadgeClass(r)}">${roleLabel(r)}: ${c}</span></span>`).join('')}</div>
                <div class="stats-change">Distribusi</div>
              </div>
            </div>

            <div class="card">
              <div class="card-header">
                <h3 class="card-title">Daftar Pengguna</h3>
                <div style="display: flex; gap: 8px;">
                  <button class="btn btn-secondary" onclick="exportUsers()">📥 Export</button>
                  <button class="btn btn-primary" onclick="showAddUserModal()">+ Tambah User</button>
                </div>
              </div>
              <div style="padding: 16px; border-bottom: 1px solid var(--color-border); display: flex; gap: 12px; flex-wrap: wrap;">
                <input type="text" id="admin-search" class="input" placeholder="🔍 Cari nama atau email..." style="flex: 1; min-width: 200px;" oninput="filterAdminTable()">
                <select id="admin-filter-role" class="input" style="width: 180px;" onchange="filterAdminTable()">
                  <option value="">Semua Role</option>
                  <option value="super_admin">Super Admin</option>
                  <option value="admin_restoran">Admin Restoran</option>
                  <option value="kasir">Kasir</option>
                  <option value="waitress">Waitress/Waiter</option>
                  <option value="chef">Chef</option>
                </select>
                <select id="admin-filter-status" class="input" style="width: 140px;" onchange="filterAdminTable()">
                  <option value="">Semua Status</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
              <div class="table-container">
                <table class="table">
                  <thead>
                    <tr>
                      <th onclick="sortAdminTable(0)" style="cursor:pointer;">Nama ↕</th>
                      <th onclick="sortAdminTable(1)" style="cursor:pointer;">Email ↕</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Last Login</th>
                      <th onclick="sortAdminTable(5)" style="cursor:pointer;">Created ↕</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody id="users-table-body">
                    ${userStats.users.map((u: any) => `
                      <tr data-user-id="${u.id}" data-role="${u.role}" data-status="${u.isActive}">
                        <td><strong>${u.name}</strong></td>
                        <td>${u.email}</td>
                        <td><span class="badge ${roleBadgeClass(u.role)}">${roleLabel(u.role)}</span></td>
                        <td>
                          <label class="toggle-switch" onclick="toggleUserStatus(${u.id}, ${u.isActive})">
                            <input type="checkbox" ${u.isActive ? 'checked' : ''} ${u.role === 'super_admin' ? 'disabled' : ''}>
                            <span class="toggle-slider"></span>
                          </label>
                        </td>
                        <td>${formatLastLogin(u.lastLogin)}</td>
                        <td>${new Date(u.createdAt).toLocaleDateString('id-ID')}</td>
                        <td>
                          <button onclick="showEditUserModal(${u.id}, '${u.name.replace(/'/g, "\\'")}', '${u.email}', '${u.role}', ${u.isActive})" class="btn btn-secondary" style="padding: 4px 8px; font-size: 11px;">Edit</button>
                          <button onclick="showResetPasswordModal(${u.id}, '${u.name.replace(/'/g, "\\'")}')" class="btn btn-warning" style="padding: 4px 8px; font-size: 11px;">Reset PW</button>
                          ${u.role !== 'super_admin' ? `<button onclick="deleteUser(${u.id}, '${u.name.replace(/'/g, "\\'")}')" class="btn btn-danger" style="padding: 4px 8px; font-size: 11px;">Hapus</button>` : ''}
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>

            <div class="card" style="margin-top: 24px;">
              <div class="card-header">
                <h3 class="card-title">📋 Activity Log</h3>
              </div>
              <div class="table-container">
                <table class="table">
                  <thead>
                    <tr><th>Waktu</th><th>User</th><th>Aksi</th><th>Detail</th></tr>
                  </thead>
                  <tbody>
                    ${auditLogs.length === 0 ? '<tr><td colspan="4" class="text-center text-secondary" style="padding: 24px;">Belum ada aktivitas</td></tr>' :
                      auditLogs.map((log: any) => `
                        <tr>
                          <td>${new Date(log.createdAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                          <td><strong>${log.userName}</strong></td>
                          <td>${actionLabel(log.action)}</td>
                          <td style="color: var(--color-text-secondary); font-size: 13px;">${log.details || '-'}</td>
                        </tr>
                      `).join('')
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </main>
          ${getFooterHtml()}
        </div>
      </div>

      <div class="modal" id="add-user-modal">
        <div class="modal-backdrop" onclick="closeAddUserModal()"></div>
        <div class="modal-content">
          <div class="modal-header">
            <h3>Tambah User</h3>
            <button class="modal-close" onclick="closeAddUserModal()">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Nama</label>
              <input type="text" id="add-user-name" class="input" placeholder="Nama lengkap">
            </div>
            <div class="form-group">
              <label>Email</label>
              <input type="email" id="add-user-email" class="input" placeholder="email@example.com">
            </div>
            <div class="form-group">
              <label>Password</label>
              <input type="password" id="add-user-password" class="input" placeholder="Min 6 karakter">
            </div>
            <div class="form-group">
              <label>Role</label>
              <select id="add-user-role" class="input">
                <option value="kasir">Kasir</option>
                <option value="admin_restoran">Admin Restoran</option>
                <option value="waitress">Waitress/Waiter</option>
                <option value="chef">Chef</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button onclick="closeAddUserModal()" class="btn btn-secondary">Batal</button>
            <button onclick="addUser()" class="btn btn-primary">Simpan</button>
          </div>
        </div>
      </div>

      <div class="modal" id="edit-user-modal">
        <div class="modal-backdrop" onclick="closeEditUserModal()"></div>
        <div class="modal-content">
          <div class="modal-header">
            <h3>Edit User</h3>
            <button class="modal-close" onclick="closeEditUserModal()">&times;</button>
          </div>
          <div class="modal-body">
            <input type="hidden" id="edit-user-id">
            <div class="form-group">
              <label>Nama</label>
              <input type="text" id="edit-user-name" class="input">
            </div>
            <div class="form-group">
              <label>Email</label>
              <input type="email" id="edit-user-email" class="input">
            </div>
            <div class="form-group">
              <label>Role</label>
              <select id="edit-user-role" class="input">
                <option value="kasir">Kasir</option>
                <option value="admin_restoran">Admin Restoran</option>
                <option value="waitress">Waitress/Waiter</option>
                <option value="chef">Chef</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>
            <div class="form-group">
              <label>Status</label>
              <select id="edit-user-active" class="input">
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button onclick="closeEditUserModal()" class="btn btn-secondary">Batal</button>
            <button onclick="saveEditUser()" class="btn btn-primary">Simpan</button>
          </div>
        </div>
      </div>

      <div class="modal" id="reset-password-modal">
        <div class="modal-backdrop" onclick="closeResetPasswordModal()"></div>
        <div class="modal-content">
          <div class="modal-header">
            <h3>Reset Password</h3>
            <button class="modal-close" onclick="closeResetPasswordModal()">&times;</button>
          </div>
          <div class="modal-body">
            <input type="hidden" id="reset-user-id">
            <p style="margin-bottom: 16px; color: var(--color-text-secondary);">Reset password untuk: <strong id="reset-user-name"></strong></p>
            <div class="form-group">
              <label>Password Baru</label>
              <input type="password" id="reset-password-new" class="input" placeholder="Min 6 karakter">
            </div>
            <div class="form-group">
              <label>Konfirmasi Password</label>
              <input type="password" id="reset-password-confirm" class="input" placeholder="Ulangi password">
            </div>
          </div>
          <div class="modal-footer">
            <button onclick="closeResetPasswordModal()" class="btn btn-secondary">Batal</button>
            <button onclick="resetUserPassword()" class="btn btn-primary">Reset</button>
          </div>
        </div>
      </div>

      <div class="modal" id="confirm-delete-modal">
        <div class="modal-backdrop" onclick="closeConfirmDeleteModal()"></div>
        <div class="modal-content" style="max-width: 400px;">
          <div class="modal-header">
            <h3>Konfirmasi Hapus</h3>
            <button class="modal-close" onclick="closeConfirmDeleteModal()">&times;</button>
          </div>
          <div class="modal-body">
            <p style="color: var(--color-text-secondary);">Apakah Anda yakin ingin menghapus user <strong id="confirm-delete-name"></strong>? Tindakan ini tidak dapat dibatalkan.</p>
          </div>
          <div class="modal-footer">
            <button onclick="closeConfirmDeleteModal()" class="btn btn-secondary">Batal</button>
            <button onclick="confirmDeleteUser()" class="btn btn-danger">Hapus</button>
          </div>
        </div>
      </div>

      <style>
        .btn-warning {
          background: var(--color-warning);
          color: white;
          border: none;
          border-radius: var(--radius-md);
          cursor: pointer;
          font-weight: 500;
          transition: var(--transition);
        }
        .btn-warning:hover {
          background: var(--color-warning-dark, #d97706);
        }
        .badge-info {
          background: rgba(99, 102, 241, 0.1);
          color: #6366f1;
        }
        .toggle-switch {
          display: inline-flex;
          align-items: center;
          cursor: pointer;
          position: relative;
        }
        .toggle-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        .toggle-slider {
          width: 40px;
          height: 22px;
          background: var(--color-border);
          border-radius: 11px;
          position: relative;
          transition: var(--transition);
        }
        .toggle-slider::before {
          content: '';
          position: absolute;
          width: 18px;
          height: 18px;
          background: white;
          border-radius: 50%;
          top: 2px;
          left: 2px;
          transition: var(--transition);
        }
        .toggle-switch input:checked + .toggle-slider {
          background: var(--color-success);
        }
        .toggle-switch input:checked + .toggle-slider::before {
          transform: translateX(18px);
        }
        .toggle-switch input:disabled + .toggle-slider {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .text-secondary { color: var(--color-text-secondary); }
      </style>

      <script>
        let pendingDeleteId = null;

        function filterAdminTable() {
          const search = document.getElementById('admin-search').value.toLowerCase();
          const roleFilter = document.getElementById('admin-filter-role').value;
          const statusFilter = document.getElementById('admin-filter-status').value;
          document.querySelectorAll('#users-table-body tr').forEach(row => {
            const name = row.cells[0]?.textContent.toLowerCase() || '';
            const email = row.cells[1]?.textContent.toLowerCase() || '';
            const role = row.dataset.role || '';
            const status = row.dataset.status || '';
            const matchesSearch = !search || name.includes(search) || email.includes(search);
            const matchesRole = !roleFilter || role === roleFilter;
            const matchesStatus = !statusFilter || status === statusFilter;
            row.style.display = (matchesSearch && matchesRole && matchesStatus) ? '' : 'none';
          });
        }

        let sortDir = {};
        function sortAdminTable(colIdx) {
          const tbody = document.getElementById('users-table-body');
          const rows = Array.from(tbody.querySelectorAll('tr'));
          sortDir[colIdx] = !sortDir[colIdx];
          rows.sort((a, b) => {
            const aText = a.cells[colIdx]?.textContent.trim() || '';
            const bText = b.cells[colIdx]?.textContent.trim() || '';
            return sortDir[colIdx] ? aText.localeCompare(bText) : bText.localeCompare(aText);
          });
          rows.forEach(r => tbody.appendChild(r));
        }

        function exportUsers() {
          const rows = [['Nama', 'Email', 'Role', 'Status', 'Last Login', 'Created At']];
          document.querySelectorAll('#users-table-body tr').forEach(tr => {
            if (tr.style.display === 'none') return;
            const cells = tr.querySelectorAll('td');
            rows.push([
              cells[0]?.textContent.trim(),
              cells[1]?.textContent.trim(),
              cells[2]?.textContent.trim(),
              cells[3]?.textContent.includes('checked') ? 'Active' : 'Inactive',
              cells[4]?.textContent.trim(),
              cells[5]?.textContent.trim()
            ]);
          });
          const csv = rows.map(r => r.join(',')).join('\\n');
          const blob = new Blob([csv], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'users-' + new Date().toISOString().slice(0,10) + '.csv';
          a.click();
        }

        function showAddUserModal() {
          document.getElementById('add-user-name').value = '';
          document.getElementById('add-user-email').value = '';
          document.getElementById('add-user-password').value = '';
          document.getElementById('add-user-role').value = 'kasir';
          document.getElementById('add-user-modal').classList.add('show');
        }
        function closeAddUserModal() {
          document.getElementById('add-user-modal').classList.remove('show');
        }
        async function addUser() {
          const name = document.getElementById('add-user-name').value.trim();
          const email = document.getElementById('add-user-email').value.trim();
          const password = document.getElementById('add-user-password').value;
          const role = document.getElementById('add-user-role').value;
          if (!name || !email || !password) { alert('Semua field harus diisi!'); return; }
          if (password.length < 6) { alert('Password minimal 6 karakter!'); return; }
          const res = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, role })
          });
          const data = await res.json();
          if (data.error) { alert(data.error); }
          else { alert('User berhasil ditambahkan!'); location.reload(); }
        }

        function showEditUserModal(id, name, email, role, isActive) {
          document.getElementById('edit-user-id').value = id;
          document.getElementById('edit-user-name').value = name;
          document.getElementById('edit-user-email').value = email;
          document.getElementById('edit-user-role').value = role;
          document.getElementById('edit-user-active').value = String(isActive);
          document.getElementById('edit-user-modal').classList.add('show');
        }
        function closeEditUserModal() {
          document.getElementById('edit-user-modal').classList.remove('show');
        }
        async function saveEditUser() {
          const id = document.getElementById('edit-user-id').value;
          const name = document.getElementById('edit-user-name').value.trim();
          const email = document.getElementById('edit-user-email').value.trim();
          const role = document.getElementById('edit-user-role').value;
          const isActive = document.getElementById('edit-user-active').value === 'true';
          if (!name || !email) { alert('Nama dan email harus diisi!'); return; }
          const res = await fetch('/api/users/' + id, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, role, isActive })
          });
          const data = await res.json();
          if (data.error) { alert(data.error); }
          else { alert('User berhasil diupdate!'); location.reload(); }
        }

        function showResetPasswordModal(id, name) {
          document.getElementById('reset-user-id').value = id;
          document.getElementById('reset-user-name').textContent = name;
          document.getElementById('reset-password-new').value = '';
          document.getElementById('reset-password-confirm').value = '';
          document.getElementById('reset-password-modal').classList.add('show');
        }
        function closeResetPasswordModal() {
          document.getElementById('reset-password-modal').classList.remove('show');
        }
        async function resetUserPassword() {
          const id = document.getElementById('reset-user-id').value;
          const newPw = document.getElementById('reset-password-new').value;
          const confirmPw = document.getElementById('reset-password-confirm').value;
          if (!newPw || !confirmPw) { alert('Semua field harus diisi!'); return; }
          if (newPw.length < 6) { alert('Password minimal 6 karakter!'); return; }
          if (newPw !== confirmPw) { alert('Password tidak cocok!'); return; }
          const res = await fetch('/api/users/' + id + '/password', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ newPassword: newPw })
          });
          const data = await res.json();
          if (data.error) { alert(data.error); }
          else { alert('Password berhasil direset!'); closeResetPasswordModal(); }
        }

        async function toggleUserStatus(id, currentStatus) {
          const res = await fetch('/api/users/' + id, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isActive: !currentStatus })
          });
          const data = await res.json();
          if (data.error) { alert(data.error); }
          else { location.reload(); }
        }

        function deleteUser(id, name) {
          pendingDeleteId = id;
          document.getElementById('confirm-delete-name').textContent = name;
          document.getElementById('confirm-delete-modal').classList.add('show');
        }
        function closeConfirmDeleteModal() {
          document.getElementById('confirm-delete-modal').classList.remove('show');
          pendingDeleteId = null;
        }
        async function confirmDeleteUser() {
          if (!pendingDeleteId) return;
          const res = await fetch('/api/users/' + pendingDeleteId, { method: 'DELETE' });
          const data = await res.json();
          if (data.error) { alert(data.error); }
          else { alert('User berhasil dihapus!'); location.reload(); }
        }
      </script>
      ${getCommonScripts()}
    `);
  });
