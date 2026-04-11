import { Elysia } from 'elysia';
import { htmlResponse } from '../templates/html';
import { getSidebarHtml } from '../templates/sidebar';
import { getNavbarHtml } from '../templates/navbar';
import { getFooterHtml } from '../templates/footer';
import { getCommonScripts } from '../templates/common-scripts';
import { getTokenFromCookies, verifyToken, redirectToLogin } from '../utils/auth';
import * as custRepo from '../repositories/customer';

const TIER_BADGE: Record<string, string> = { regular: 'badge-primary', silver: 'badge-warning', gold: 'badge-error' };
const TIER_LABEL: Record<string, string> = { regular: '🥉 Regular', silver: '🥈 Silver', gold: '🥇 Gold' };

export const customersPage = new Elysia()
  .get('/customers', async ({ cookie, headers }) => {
    const token = getTokenFromCookies(cookie, headers);
    if (!token) return redirectToLogin();
    let user = null;
    try { user = verifyToken(token); } catch { return redirectToLogin(); }

    const menuRoles = ['super_admin', 'admin_restoran'];
    if (!menuRoles.includes(user.role)) {
      return new Response('Akses ditolak', { status: 403 });
    }

    const customers = await custRepo.getAllCustomers();
    const stats = await custRepo.getCustomerStats();

    return htmlResponse(`
      <div class="app-layout">
        ${getSidebarHtml('customers', user)}
        <div class="app-content">
          ${getNavbarHtml('Pelanggan', 'customers', user)}
          <main class="app-main">
            <div class="stats-grid">
              <div class="stats-card"><div class="stats-label">Total Pelanggan</div><div class="stats-value">${stats.total}</div><div class="stats-change">Terdaftar</div></div>
              <div class="stats-card"><div class="stats-label">Aktif</div><div class="stats-value" style="color: var(--color-success);">${stats.active}</div><div class="stats-change">Masih aktif</div></div>
              <div class="stats-card"><div class="stats-label">Gold Member</div><div class="stats-value" style="color: var(--color-error);">${stats.byTier.gold || 0}</div><div class="stats-change">Top tier</div></div>
              <div class="stats-card"><div class="stats-label">Total Poin</div><div class="stats-value">${stats.totalPoints.toLocaleString('id-ID')}</div><div class="stats-change">Poin beredar</div></div>
            </div>

            <div class="card">
              <div class="card-header">
                <div class="menu-toolbar">
                  <div class="menu-toolbar-left">
                    <input type="text" id="cust-search" class="menu-search-input" placeholder="🔍 Cari pelanggan..." oninput="filterCustomers()">
                    <select id="cust-filter-tier" class="menu-filter-select" onchange="filterCustomers()">
                      <option value="all">Semua Tier</option>
                      <option value="gold">🥇 Gold</option>
                      <option value="silver">🥈 Silver</option>
                      <option value="regular">🥉 Regular</option>
                    </select>
                  </div>
                  <div class="menu-toolbar-right">
                    <button class="btn btn-primary" onclick="showAddCustomerModal()">+ Tambah Pelanggan</button>
                  </div>
                </div>
              </div>
              <div class="table-container">
                <table class="table">
                  <thead><tr><th>Nama</th><th>Telepon</th><th>Email</th><th>Tier</th><th>Poin</th><th>Total Belanja</th><th>Kunjungan</th><th>Aksi</th></tr></thead>
                  <tbody id="customers-body">
                    ${customers.map((c: any) => `
                      <tr data-name="${c.name.toLowerCase()}" data-phone="${c.phone}" data-tier="${c.tier}">
                        <td><strong>${c.name}</strong></td>
                        <td>${c.phone}</td>
                        <td style="color: var(--color-text-secondary); font-size: 13px;">${c.email || '-'}</td>
                        <td><span class="badge ${TIER_BADGE[c.tier] || ''}">${TIER_LABEL[c.tier] || c.tier}</span></td>
                        <td>${c.loyaltyPoints || 0}</td>
                        <td>Rp ${(c.totalSpent || 0).toLocaleString('id-ID')}</td>
                        <td>${c.totalVisits || 0}x</td>
                        <td>
                          <button onclick="showCustomerDetail(${c.id})" class="btn btn-secondary btn-sm">Detail</button>
                          <button onclick="showEditCustomerModal(${c.id}, '${c.name.replace(/'/g, "\\'")}', '${c.phone}', '${c.email || ''}', '${(c.address || '').replace(/'/g, "\\'")}', '${c.birthDate || ''}', ${c.isActive})" class="btn btn-secondary btn-sm">Edit</button>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
              ${customers.length === 0 ? '<p class="text-muted text-center" style="padding: 40px;">Belum ada pelanggan</p>' : ''}
            </div>
          </main>
          ${getFooterHtml()}
        </div>
      </div>

      <div class="modal" id="add-customer-modal">
        <div class="modal-backdrop" onclick="closeAddCustomerModal()"></div>
        <div class="modal-content">
          <div class="modal-header"><h3>Tambah Pelanggan</h3><button class="modal-close" onclick="closeAddCustomerModal()">&times;</button></div>
          <div class="modal-body">
            <div class="form-group"><label>Nama</label><input type="text" id="cust-name" class="input" placeholder="Nama lengkap"></div>
            <div class="form-group"><label>Telepon</label><input type="text" id="cust-phone" class="input" placeholder="08xxxxxxxxxx"></div>
            <div class="form-group"><label>Email</label><input type="email" id="cust-email" class="input" placeholder="email@example.com"></div>
            <div class="form-group"><label>Alamat</label><input type="text" id="cust-address" class="input" placeholder="Alamat"></div>
            <div class="form-group"><label>Tanggal Lahir</label><input type="date" id="cust-birth" class="input"></div>
          </div>
          <div class="modal-footer"><button onclick="closeAddCustomerModal()" class="btn btn-secondary">Batal</button><button onclick="saveCustomer()" class="btn btn-primary">Simpan</button></div>
        </div>
      </div>

      <div class="modal" id="edit-customer-modal">
        <div class="modal-backdrop" onclick="closeEditCustomerModal()"></div>
        <div class="modal-content">
          <div class="modal-header"><h3>Edit Pelanggan</h3><button class="modal-close" onclick="closeEditCustomerModal()">&times;</button></div>
          <div class="modal-body">
            <input type="hidden" id="edit-cust-id">
            <div class="form-group"><label>Nama</label><input type="text" id="edit-cust-name" class="input"></div>
            <div class="form-group"><label>Telepon</label><input type="text" id="edit-cust-phone" class="input"></div>
            <div class="form-group"><label>Email</label><input type="email" id="edit-cust-email" class="input"></div>
            <div class="form-group"><label>Alamat</label><input type="text" id="edit-cust-address" class="input"></div>
            <div class="form-group"><label>Tanggal Lahir</label><input type="date" id="edit-cust-birth" class="input"></div>
            <div class="form-group"><label>Status</label><select id="edit-cust-active" class="input"><option value="true">Aktif</option><option value="false">Nonaktif</option></select></div>
          </div>
          <div class="modal-footer"><button onclick="closeEditCustomerModal()" class="btn btn-secondary">Batal</button><button onclick="saveEditCustomer()" class="btn btn-primary">Simpan</button></div>
        </div>
      </div>

      <div class="modal" id="customer-detail-modal">
        <div class="modal-backdrop" onclick="closeCustomerDetail()"></div>
        <div class="modal-content" style="max-width: 600px;">
          <div class="modal-header"><h3>Detail Pelanggan</h3><button class="modal-close" onclick="closeCustomerDetail()">&times;</button></div>
          <div class="modal-body" id="customer-detail-body"></div>
          <div class="modal-footer"><button onclick="closeCustomerDetail()" class="btn btn-primary">Tutup</button></div>
        </div>
      </div>

<style>
.menu-toolbar { display: flex; justify-content: space-between; align-items: center; width: 100%; flex-wrap: wrap; gap: 8px; }
.menu-toolbar-left { display: flex; gap: 8px; flex: 1; flex-wrap: wrap; }
.menu-toolbar-right { display: flex; gap: 8px; }
.menu-search-input { padding: 6px 12px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: 13px; min-width: 200px; }
.menu-filter-select { padding: 6px 12px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: 13px; background: var(--color-bg); }
.btn-sm { padding: 4px 8px; font-size: 11px; }
.text-muted { color: var(--color-text-secondary); }
.text-center { text-align: center; }
.detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px; }
.detail-label { font-size: 12px; color: var(--color-text-secondary); }
.detail-value { font-weight: 600; }
</style>
<script>
const TIER_LABEL = { regular: '🥉 Regular', silver: '🥈 Silver', gold: '🥇 Gold' };
        function filterCustomers() {
          const search = document.getElementById('cust-search').value.toLowerCase();
          const tierFilter = document.getElementById('cust-filter-tier').value;
          document.querySelectorAll('#customers-body tr').forEach(row => {
            const name = row.dataset.name || '';
            const phone = row.dataset.phone || '';
            const tier = row.dataset.tier || '';
            const matchesSearch = !search || name.includes(search) || phone.includes(search);
            const matchesTier = tierFilter === 'all' || tier === tierFilter;
            row.style.display = (matchesSearch && matchesTier) ? '' : 'none';
          });
        }

        function showAddCustomerModal() {
          document.getElementById('cust-name').value = '';
          document.getElementById('cust-phone').value = '';
          document.getElementById('cust-email').value = '';
          document.getElementById('cust-address').value = '';
          document.getElementById('cust-birth').value = '';
          document.getElementById('add-customer-modal').classList.add('show');
        }
        function closeAddCustomerModal() { document.getElementById('add-customer-modal').classList.remove('show'); }

        async function saveCustomer() {
          const name = document.getElementById('cust-name').value.trim();
          const phone = document.getElementById('cust-phone').value.trim();
          const email = document.getElementById('cust-email').value.trim();
          const address = document.getElementById('cust-address').value.trim();
          const birthDate = document.getElementById('cust-birth').value;
          if (!name || !phone) { showToast('Nama dan telepon wajib diisi', 'warning'); return; }
          const res = await fetch('/api/customers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, phone, email, address, birthDate }) });
          const data = await res.json();
          if (data.error) { showToast(data.error, 'error'); return; }
          closeAddCustomerModal(); showToast('Pelanggan berhasil ditambahkan'); location.reload();
        }

        function showEditCustomerModal(id, name, phone, email, address, birthDate, isActive) {
          document.getElementById('edit-cust-id').value = id;
          document.getElementById('edit-cust-name').value = name;
          document.getElementById('edit-cust-phone').value = phone;
          document.getElementById('edit-cust-email').value = email;
          document.getElementById('edit-cust-address').value = address;
          document.getElementById('edit-cust-birth').value = birthDate;
          document.getElementById('edit-cust-active').value = String(isActive);
          document.getElementById('edit-customer-modal').classList.add('show');
        }
        function closeEditCustomerModal() { document.getElementById('edit-customer-modal').classList.remove('show'); }

        async function saveEditCustomer() {
          const id = document.getElementById('edit-cust-id').value;
          const name = document.getElementById('edit-cust-name').value.trim();
          const phone = document.getElementById('edit-cust-phone').value.trim();
          const email = document.getElementById('edit-cust-email').value;
          const address = document.getElementById('edit-cust-address').value;
          const birthDate = document.getElementById('edit-cust-birth').value;
          const isActive = document.getElementById('edit-cust-active').value === 'true';
          if (!name || !phone) { showToast('Nama dan telepon wajib diisi', 'warning'); return; }
          const res = await fetch('/api/customers/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, phone, email, address, birthDate, isActive }) });
          const data = await res.json();
          if (data.error) { showToast(data.error, 'error'); return; }
          closeEditCustomerModal(); showToast('Pelanggan berhasil diupdate'); location.reload();
        }

let customerHistoryPage = 1;
let customerLoyaltyPage = 1;
let currentCustomerId = null;
let customerHistoryData = [];
let customerLoyaltyData = [];
const customerItemsPerPage = 5;

function renderCustomerHistory(history) {
  customerHistoryData = history;
  const totalPages = Math.ceil(history.length / customerItemsPerPage) || 1;
  if (customerHistoryPage > totalPages) customerHistoryPage = totalPages;
  const start = (customerHistoryPage - 1) * customerItemsPerPage;
  const end = start + customerItemsPerPage;
  const pageData = history.slice(start, end);
  
  let html = '<h4 style="margin: 16px 0 8px;">Riwayat Belanja (' + history.length + ')</h4>';
  html += '<table class="table"><thead><tr><th>Tanggal</th><th>Order</th><th>Total</th><th>Status</th></tr></thead><tbody>';
  if (pageData.length === 0) {
    html += '<tr><td colspan="4" style="text-align: center; color: var(--color-text-secondary);">Tidak ada riwayat</td></tr>';
  } else {
    pageData.forEach(o => {
      html += '<tr><td>' + new Date(o.createdAt).toLocaleDateString('id-ID') + '</td><td>#' + o.id + '</td><td>Rp ' + (o.total || 0).toLocaleString('id-ID') + '</td><td>' + (o.status === 'completed' ? 'Selesai' : o.status === 'active' ? 'Aktif' : 'Dibatal') + '</td></tr>';
    });
  }
  html += '</tbody></table>';
  if (history.length > customerItemsPerPage) {
    html += '<div class="pagination" style="margin-top: 8px;">';
    html += '<button onclick="goToCustomerHistoryPage(' + (customerHistoryPage - 1) + ')" ' + (customerHistoryPage <= 1 ? 'disabled' : '') + ' class="btn btn-secondary btn-sm">← Prev</button>';
    html += '<span style="margin: 0 12px;">Halaman ' + customerHistoryPage + ' dari ' + totalPages + '</span>';
    html += '<button onclick="goToCustomerHistoryPage(' + (customerHistoryPage + 1) + ')" ' + (customerHistoryPage >= totalPages ? 'disabled' : '') + ' class="btn btn-secondary btn-sm">Next →</button>';
    html += '</div>';
  }
  return html;
}

function renderCustomerLoyalty(loyalty) {
  customerLoyaltyData = loyalty;
  const totalPages = Math.ceil(loyalty.length / customerItemsPerPage) || 1;
  if (customerLoyaltyPage > totalPages) customerLoyaltyPage = totalPages;
  const start = (customerLoyaltyPage - 1) * customerItemsPerPage;
  const end = start + customerItemsPerPage;
  const pageData = loyalty.slice(start, end);
  
  let html = '<h4 style="margin: 16px 0 8px;">Riwayat Poin (' + loyalty.length + ')</h4>';
  html += '<table class="table"><thead><tr><th>Tanggal</th><th>Tipe</th><th>Poin</th><th>Keterangan</th></tr></thead><tbody>';
  if (pageData.length === 0) {
    html += '<tr><td colspan="4" style="text-align: center; color: var(--color-text-secondary);">Tidak ada riwayat</td></tr>';
  } else {
    pageData.forEach(l => {
      html += '<tr><td>' + new Date(l.createdAt).toLocaleDateString('id-ID') + '</td><td>' + (l.type === 'earn' ? '📥 Earn' : '📤 Redeem') + '</td><td style="color: ' + (l.type === 'earn' ? 'var(--color-success)' : 'var(--color-error)') + ';">' + (l.type === 'earn' ? '+' : '-') + l.points + '</td><td>' + (l.reason || '-') + '</td></tr>';
    });
  }
  html += '</tbody></table>';
  if (loyalty.length > customerItemsPerPage) {
    html += '<div class="pagination" style="margin-top: 8px;">';
    html += '<button onclick="goToCustomerLoyaltyPage(' + (customerLoyaltyPage - 1) + ')" ' + (customerLoyaltyPage <= 1 ? 'disabled' : '') + ' class="btn btn-secondary btn-sm">← Prev</button>';
    html += '<span style="margin: 0 12px;">Halaman ' + customerLoyaltyPage + ' dari ' + totalPages + '</span>';
    html += '<button onclick="goToCustomerLoyaltyPage(' + (customerLoyaltyPage + 1) + ')" ' + (customerLoyaltyPage >= totalPages ? 'disabled' : '') + ' class="btn btn-secondary btn-sm">Next →</button>';
    html += '</div>';
  }
  return html;
}

function goToCustomerHistoryPage(page) {
  customerHistoryPage = page;
  const historyHtml = renderCustomerHistory(customerHistoryData);
  const container = document.getElementById('customer-history-container');
  if (container) container.innerHTML = historyHtml;
}

function goToCustomerLoyaltyPage(page) {
  customerLoyaltyPage = page;
  const loyaltyHtml = renderCustomerLoyalty(customerLoyaltyData);
  const container = document.getElementById('customer-loyalty-container');
  if (container) container.innerHTML = loyaltyHtml;
}

async function showCustomerDetail(id) {
  currentCustomerId = id;
  customerHistoryPage = 1;
  customerLoyaltyPage = 1;
  const res = await fetch('/api/customers/' + id);
  const c = await res.json();
  if (c.error) { showToast(c.error, 'error'); return; }
  const histRes = await fetch('/api/customers/' + id + '/history');
  const history = await histRes.json();
  const loyaltyRes = await fetch('/api/customers/' + id + '/loyalty');
  const loyalty = await loyaltyRes.json();

  let html = '<div class="detail-grid">';
  html += '<div><div class="detail-label">Nama</div><div class="detail-value">' + c.name + '</div></div>';
  html += '<div><div class="detail-label">Telepon</div><div class="detail-value">' + c.phone + '</div></div>';
  html += '<div><div class="detail-label">Email</div><div class="detail-value">' + (c.email || '-') + '</div></div>';
  html += '<div><div class="detail-label">Tier</div><div class="detail-value">' + (TIER_LABEL[c.tier] || c.tier) + '</div></div>';
  html += '<div><div class="detail-label">Total Belanja</div><div class="detail-value">Rp ' + (c.totalSpent || 0).toLocaleString('id-ID') + '</div></div>';
  html += '<div><div class="detail-label">Kunjungan</div><div class="detail-value">' + (c.totalVisits || 0) + 'x</div></div>';
  html += '<div><div class="detail-label">Poin Loyalty</div><div class="detail-value">' + (c.loyaltyPoints || 0) + ' poin (= Rp ' + ((c.loyaltyPoints || 0) * 100).toLocaleString('id-ID') + ')</div></div>';
  html += '<div><div class="detail-label">Status</div><div class="detail-value">' + (c.isActive ? '✅ Aktif' : '❌ Nonaktif') + '</div></div>';
  html += '</div>';

  html += '<div id="customer-history-container">' + renderCustomerHistory(history) + '</div>';
  html += '<div id="customer-loyalty-container">' + renderCustomerLoyalty(loyalty) + '</div>';

  document.getElementById('customer-detail-body').innerHTML = html;
  document.getElementById('customer-detail-modal').classList.add('show');
}
        function closeCustomerDetail() { document.getElementById('customer-detail-modal').classList.remove('show'); }
      </script>
      ${getCommonScripts()}
    `);
  });
