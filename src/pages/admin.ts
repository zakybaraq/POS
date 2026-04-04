import { Elysia } from 'elysia';
import { htmlResponse } from '../templates/html';
import { getSidebarHtml } from '../templates/sidebar';
import { getNavbarHtml } from '../templates/navbar';
import { getFooterHtml } from '../templates/footer';
import { getCommonScripts } from '../templates/common-scripts';
import { getTokenFromCookies, verifyToken, redirectToLogin } from '../utils/auth';

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

    const { getAllUsers } = await import('../repositories/user');
    const allUsers = await getAllUsers();
    const usersData = allUsers.map((u: any) => {
      const { password, ...rest } = u;
      return rest;
    });

    const total = usersData.length;
    const active = usersData.filter((u: any) => u.isActive).length;
    const inactive = total - active;
    const roleCounts: Record<string, number> = {};
    for (const u of usersData) {
      roleCounts[u.role] = (roleCounts[u.role] || 0) + 1;
    }

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

    return htmlResponse(`
      <div class="app-layout">
        ${getSidebarHtml('admin', user)}
        <div class="app-content">
          ${getNavbarHtml('Admin Panel', 'admin', user)}
          <main class="app-main">
            <div class="stats-grid">
              <div class="stats-card">
                <div class="stats-label">Total Users</div>
                <div class="stats-value">${total}</div>
                <div class="stats-change">Terdaftar</div>
              </div>
              <div class="stats-card">
                <div class="stats-label">Active Users</div>
                <div class="stats-value" style="color: var(--color-success);">${active}</div>
                <div class="stats-change">Sedang aktif</div>
              </div>
              <div class="stats-card">
                <div class="stats-label">Inactive Users</div>
                <div class="stats-value" style="color: var(--color-error);">${inactive}</div>
                <div class="stats-change">Nonaktif</div>
              </div>
              <div class="stats-card">
                <div class="stats-label">Roles</div>
                <div class="stats-value" style="font-size: 14px;">${Object.entries(roleCounts).map(([r, c]) => `<span style="display:inline-block;margin:2px 4px;"><span class="badge ${roleBadgeClass(r)}">${roleLabel(r)}: ${c}</span></span>`).join('')}</div>
                <div class="stats-change">Distribusi</div>
              </div>
            </div>
            <div class="card">
              <div class="card-header">
                <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                  <h3 class="card-title">Daftar Pengguna</h3>
                  <button class="btn btn-primary" onclick="showAddUserModal()">+ Tambah User</button>
                </div>
              </div>
              <div class="table-container">
                <table class="table">
                  <thead>
                    <tr>
                      <th>Nama</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Created At</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody id="users-table-body">
                    ${usersData.map((u: any) => `
                      <tr data-user-id="${u.id}">
                        <td><strong>${u.name}</strong></td>
                        <td>${u.email}</td>
                        <td><span class="badge ${roleBadgeClass(u.role)}">${roleLabel(u.role)}</span></td>
                        <td><span class="badge ${u.isActive ? 'badge-success' : 'badge-error'}">${u.isActive ? 'Active' : 'Inactive'}</span></td>
                        <td>${new Date(u.createdAt).toLocaleDateString('id-ID')}</td>
                        <td>
                          <button onclick="showEditUserModal(${u.id}, '${u.name.replace(/'/g, "\\'")}', '${u.email}', '${u.role}', ${u.isActive})" class="btn btn-secondary" style="padding: 4px 8px; font-size: 11px;">Edit</button>
                          <button onclick="showResetPasswordModal(${u.id}, '${u.name.replace(/'/g, "\\'")}')" class="btn btn-warning" style="padding: 4px 8px; font-size: 11px;">Reset PW</button>
                          ${u.role !== 'super_admin' ? `<button onclick="toggleUserStatus(${u.id}, ${u.isActive})" class="btn btn-secondary" style="padding: 4px 8px; font-size: 11px;">${u.isActive ? 'Nonaktif' : 'Aktif'}</button>` : ''}
                          ${u.role !== 'super_admin' ? `<button onclick="deleteUser(${u.id}, '${u.name.replace(/'/g, "\\'")}')" class="btn btn-danger" style="padding: 4px 8px; font-size: 11px;">Hapus</button>` : ''}
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
      </style>

      <script>
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

        async function deleteUser(id, name) {
          if (!confirm('Hapus user "' + name + '"? Tindakan ini tidak dapat dibatalkan.')) return;
          const res = await fetch('/api/users/' + id, { method: 'DELETE' });
          const data = await res.json();
          if (data.error) { alert(data.error); }
          else { location.reload(); }
        }
      </script>
      ${getCommonScripts()}
    `);
  });
