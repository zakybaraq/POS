import { Elysia } from 'elysia';
import { htmlResponse } from '../templates/html';
import { getSidebarHtml } from '../templates/sidebar';
import { getNavbarHtml } from '../templates/navbar';
import { getFooterHtml } from '../templates/footer';
import { getCommonScripts } from '../templates/common-scripts';
import { getTokenFromCookies, verifyToken, redirectToLogin } from '../utils/auth';

export const shiftsPage = new Elysia()
  .get('/shifts', async ({ cookie, headers }) => {
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
    if (!['super_admin', 'admin_restoran', 'kasir'].includes(user.role)) return new Response('Akses ditolak', { status: 403 });

    return htmlResponse(`
      <div class="app-layout">
        ${getSidebarHtml('shifts', user)}
        <div class="app-content">
          ${getNavbarHtml('Shift', 'shifts', user)}
          <main class="app-main">
            <div class="tab-nav">
              <button class="tab-btn active" data-tab="myshift">Shift Saya</button>
              <button class="tab-btn" data-tab="allshifts">Riwayat Shift</button>
            </div>
            <div class="tab-content active" id="tab-myshift">
              <div class="card" id="my-shift-card" style="padding:24px;">
                <p class="text-center text-secondary">Loading...</p>
              </div>
            </div>
            <div class="tab-content" id="tab-allshifts">
              <div class="page-header">
                <h2>Riwayat Shift</h2>
                <div style="display:flex;gap:8px;align-items:center;">
                  <input type="date" id="shift-start" class="input">
                  <span>s/d</span>
                  <input type="date" id="shift-end" class="input">
                  <button class="btn btn-primary" onclick="loadAllShifts()">Tampilkan</button>
                </div>
              </div>
              <div class="card"><div class="table-container">
                <table class="table">
                  <thead><tr><th>Kasir</th><th>Buka</th><th>Tutup</th><th>Modal</th><th>Seharusnya</th><th>Fisik</th><th>Selisih</th><th>Status</th></tr></thead>
                  <tbody id="all-shifts-tbody"><tr><td colspan="9" class="text-center text-secondary" style="padding:40px;">Pilih tanggal dan klik Tampilkan</td></tr></tbody>
                </table>
              </div></div>
            </div>
          </main>
          ${getFooterHtml()}
        </div>
      </div>

      <div class="modal-backdrop" id="open-shift-modal" style="display:none;">
        <div class="modal show"><div class="modal-content">
          <div class="modal-header"><h3>Buka Shift Baru</h3><button onclick="closeOpenShift()" class="modal-close">&times;</button></div>
          <div class="modal-body">
            <form id="open-shift-form">
              <div class="form-group"><label class="form-label">Modal Awal (Rp) *</label><input type="number" id="os-cash" class="input" required value="500000"></div>
              <div class="form-group"><label class="form-label">Catatan</label><input type="text" id="os-notes" class="input"></div>
            </form>
          </div>
          <div class="modal-footer"><button type="submit" form="open-shift-form" class="btn btn-primary">Buka Shift</button></div>
        </div></div>
      </div>

      <div class="modal-backdrop" id="close-shift-modal" style="display:none;">
        <div class="modal show"><div class="modal-content">
          <div class="modal-header"><h3>Tutup Shift</h3><button onclick="closeCloseShift()" class="modal-close">&times;</button></div>
          <div class="modal-body" id="close-shift-body"></div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="closeCloseShift()">Batal</button>
            <button class="btn btn-primary" onclick="confirmCloseShift()">Konfirmasi Tutup Shift</button>
          </div>
        </div></div>
      </div>

      <style>
        .page-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; flex-wrap:wrap; gap:12px; }
        .form-group { display:flex; flex-direction:column; gap:4px; margin-bottom:12px; }
        .form-label { font-size:14px; font-weight:500; color:var(--color-text-secondary); }
        .shift-info { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px; }
        .shift-stat { background:var(--color-bg-alt); padding:16px; border-radius:var(--radius-md); }
        .shift-stat-label { font-size:13px; color:var(--color-text-secondary); }
        .shift-stat-value { font-size:20px; font-weight:700; margin-top:4px; }
      </style>
      ${getCommonScripts()}
      <script>
        var CURRENT_USER_ID = ${user.userId};
        let currentShiftId = null;

        document.querySelectorAll('.tab-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
          });
        });

        async function loadMyShift() {
          const card = document.getElementById('my-shift-card');
          try {
            const res = await fetch('/api/shifts/open?userId=' + CURRENT_USER_ID);
            const shift = await res.json();
            if (shift && shift.id) {
              currentShiftId = shift.id;
              const opened = new Date(shift.openedAt).toLocaleString('id-ID');
              card.innerHTML = '<div style="margin-bottom:16px;"><h3 style="margin:0 0 8px;">🟢 Shift Terbuka</h3><p style="color:var(--color-text-secondary);margin:0;">Dibuka: ' + opened + '</p></div>' +
                '<div class="shift-info">' +
                '<div class="shift-stat"><div class="shift-stat-label">Modal Awal</div><div class="shift-stat-value">Rp ' + (shift.startingCash || 0).toLocaleString('id-ID') + '</div></div>' +
                '<div class="shift-stat"><div class="shift-stat-label">Catatan</div><div class="shift-stat-value" style="font-size:14px;">' + (shift.notes || '-') + '</div></div>' +
                '</div>' +
                '<button class="btn btn-error" onclick="openCloseShift(' + shift.id + ', ' + shift.startingCash + ')">Tutup Shift</button>';
            } else {
              card.innerHTML = '<div style="text-align:center;padding:40px;"><h3 style="margin:0 0 16px;">Belum Ada Shift Terbuka</h3><p style="color:var(--color-text-secondary);margin:0 0 24px;">Buka shift baru untuk mulai bekerja</p><button class="btn btn-primary" onclick="showOpenShiftModal()">Buka Shift</button></div>';
            }
          } catch (e) { card.innerHTML = '<p class="text-center text-secondary">Error: ' + e.message + '</p>'; }
        }

        function closeOpenShift() { document.getElementById('open-shift-modal').style.display = 'none'; }
        function closeCloseShift() { document.getElementById('close-shift-modal').style.display = 'none'; }
        function showOpenShiftModal() { document.getElementById('open-shift-modal').style.display = 'flex'; }

        document.getElementById('open-shift-form').addEventListener('submit', async (e) => {
          e.preventDefault();
          const data = { userId: CURRENT_USER_ID, startingCash: parseInt(document.getElementById('os-cash').value), notes: document.getElementById('os-notes').value };
          await fetch('/api/shifts/open', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
          closeOpenShift(); loadMyShift();
        });

        function openCloseShift(id, startingCash) {
          currentShiftId = id;
          document.getElementById('close-shift-body').innerHTML =
            '<div class="shift-info">' +
            '<div class="shift-stat"><div class="shift-stat-label">Modal Awal</div><div class="shift-stat-value">Rp ' + startingCash.toLocaleString('id-ID') + '</div></div>' +
            '<div class="shift-stat"><div class="shift-stat-label">Hitung Fisik (Rp)</div><input type="number" id="cs-actual" class="input" value="' + startingCash + '" oninput="calcDiff(' + startingCash + ')"></div>' +
            '</div>' +
            '<div id="cs-diff" style="padding:12px;background:var(--color-bg-alt);border-radius:var(--radius-md);margin-bottom:12px;">Selisih: Rp 0</div>' +
            '<div class="form-group"><label class="form-label">Catatan</label><input type="text" id="cs-notes" class="input"></div>';
          document.getElementById('close-shift-modal').style.display = 'flex';
        }

        function calcDiff(startingCash) {
          const actual = parseInt(document.getElementById('cs-actual').value) || 0;
          const diff = actual - startingCash;
          const el = document.getElementById('cs-diff');
          el.textContent = 'Selisih: ' + (diff >= 0 ? '+' : '') + 'Rp ' + diff.toLocaleString('id-ID') + (diff < 0 ? ' (Kurang)' : diff > 0 ? ' (Lebih)' : ' (Sesuai)');
          el.style.color = diff < 0 ? 'var(--color-error)' : diff > 0 ? 'var(--color-warning)' : 'var(--color-success)';
        }

        async function confirmCloseShift() {
          const actual = parseInt(document.getElementById('cs-actual').value) || 0;
          const notes = document.getElementById('cs-notes').value;
          await fetch('/api/shifts/' + currentShiftId + '/close', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ actualCash: actual, closedBy: CURRENT_USER_ID, notes }) });
          closeCloseShift(); loadMyShift();
        }

        async function loadAllShifts() {
          const start = document.getElementById('shift-start').value;
          const end = document.getElementById('shift-end').value;
          if (!start || !end) { alert('Pilih tanggal'); return; }
          const res = await fetch('/api/shifts?startDate=' + start + '&endDate=' + end);
          const data = await res.json();
          const tbody = document.getElementById('all-shifts-tbody');
          if (!data || !data.length) { tbody.innerHTML = '<tr><td colspan="9" class="text-center text-secondary">Tidak ada data</td></tr>'; return; }
          tbody.innerHTML = data.map(s => '<tr><td>' + (s.userName || '-') + '</td><td>' + new Date(s.openedAt).toLocaleString('id-ID') + '</td><td>' + (s.closedAt ? new Date(s.closedAt).toLocaleString('id-ID') : '-') + '</td><td>Rp ' + (s.startingCash || 0).toLocaleString('id-ID') + '</td><td>' + (s.expectedCash ? 'Rp ' + s.expectedCash.toLocaleString('id-ID') : '-') + '</td><td>' + (s.actualCash ? 'Rp ' + s.actualCash.toLocaleString('id-ID') : '-') + '</td><td>' + (s.cashDifference !== null && s.cashDifference !== undefined ? (s.cashDifference >= 0 ? '+' : '') + 'Rp ' + s.cashDifference.toLocaleString('id-ID') : '-') + '</td><td><span class="badge ' + (s.status === 'open' ? 'badge-warning' : 'badge-success') + '">' + (s.status === 'open' ? 'Terbuka' : 'Tertutup') + '</span></td></tr>').join('');
        }

        const today = new Date().toISOString().split('T')[0];
        const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
        document.getElementById('shift-start').value = weekAgo;
        document.getElementById('shift-end').value = today;

        loadMyShift();
      </script>
    `);
  });
