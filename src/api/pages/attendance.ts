import { Elysia } from 'elysia';
import { htmlResponse } from '../templates/html';
import { getSidebarHtml } from '../templates/sidebar';
import { getNavbarHtml } from '../templates/navbar';
import { getFooterHtml } from '../templates/footer';
import { getCommonScripts } from '../templates/common-scripts';
import { getTokenFromCookies, verifyToken, redirectToLogin } from '../utils/auth';

export const attendancePage = new Elysia()
  .get('/attendance', async ({ cookie, headers }) => {
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
    const isAdmin = ['super_admin', 'admin_restoran'].includes(user.role);
    if (!isAdmin && !['kasir', 'waitress', 'chef'].includes(user.role)) return new Response('Akses ditolak', { status: 403 });

    return htmlResponse(`
      <div class="app-layout">
        ${getSidebarHtml('attendance', user)}
        <div class="app-content">
          ${getNavbarHtml('Kehadiran', 'attendance', user)}
          <main class="app-main">
            <div class="tab-nav">
              <button class="tab-btn active" data-tab="myattendance">Kehadiran Saya</button>
              ${isAdmin ? '<button class="tab-btn" data-tab="allattendance">Riwayat Kehadiran</button>' : ''}
            </div>
            <div class="tab-content active" id="tab-myattendance">
              <div class="card" id="my-attendance-card" style="padding:24px;">
                <p class="text-center text-secondary">Loading...</p>
              </div>
            </div>
            ${isAdmin ? '<div class="tab-content" id="tab-allattendance"><div class="page-header"><h2>Riwayat Kehadiran</h2><div style="display:flex;gap:8px;align-items:center;"><input type="date" id="att-start" class="input"><span>s/d</span><input type="date" id="att-end" class="input"><button class="btn btn-primary" onclick="loadAllAttendance()">Tampilkan</button></div></div><div class="card"><div class="table-container"><table class="table"><thead><tr><th>Karyawan</th><th>Tanggal</th><th>Clock In</th><th>Clock Out</th><th>Total Jam</th><th>Status</th></tr></thead><tbody id="all-att-tbody"><tr><td colspan="6" class="text-center text-secondary" style="padding:40px;">Pilih tanggal dan klik Tampilkan</td></tr></tbody></table></div></div></div>' : ''}
          </main>
          ${getFooterHtml()}
        </div>
      </div>
      <style>
        .page-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; flex-wrap:wrap; gap:12px; }
        .att-stat { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px; }
        .att-stat-box { background:var(--color-bg-alt); padding:16px; border-radius:var(--radius-md); }
        .att-stat-label { font-size:13px; color:var(--color-text-secondary); }
        .att-stat-value { font-size:20px; font-weight:700; margin-top:4px; }
      </style>
      ${getCommonScripts()}
      <script>
        var CURRENT_USER_ID = ${user.userId};
        document.querySelectorAll('.tab-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
          });
        });

        async function loadMyAttendance() {
          const card = document.getElementById('my-attendance-card');
          try {
            const res = await fetch('/api/attendance/today?userId=' + CURRENT_USER_ID);
            const att = await res.json();
            if (att && att.id) {
              const clockIn = new Date(att.clockIn).toLocaleTimeString('id-ID');
              const clockedOut = att.clockOut ? new Date(att.clockOut).toLocaleTimeString('id-ID') : null;
              const statusBadge = {present:'badge-success',late:'badge-warning',absent:'badge-error',leave:'badge-info',sick:'badge-info'}[att.status]||'badge-info';
              const statusLabel = {present:'Present',late:'Terlambat',absent:'Absen',leave:'Cuti',sick:'Sakit'}[att.status]||att.status;
              let html = '<div style="margin-bottom:16px;"><h3 style="margin:0 0 8px;">Kehadiran Hari Ini</h3></div>';
              html += '<div class="att-stat">';
              html += '<div class="att-stat-box"><div class="att-stat-label">Status</div><div class="att-stat-value"><span class="badge ' + statusBadge + '">' + statusLabel + '</span></div></div>';
              html += '<div class="att-stat-box"><div class="att-stat-label">Clock In</div><div class="att-stat-value">' + clockIn + '</div></div>';
              if (clockedOut) {
                html += '<div class="att-stat-box"><div class="att-stat-label">Clock Out</div><div class="att-stat-value">' + clockedOut + '</div></div>';
                html += '<div class="att-stat-box"><div class="att-stat-label">Total Jam</div><div class="att-stat-value">' + (att.totalHours || 0) + ' jam</div></div>';
              } else {
                html += '<div class="att-stat-box"><div class="att-stat-label">Clock Out</div><div class="att-stat-value">-</div></div>';
                html += '<div class="att-stat-box"><div class="att-stat-label">Status</div><div class="att-stat-value">🟢 Sedang Bekerja</div></div>';
              }
              html += '</div>';
              if (!clockedOut) {
                html += '<button class="btn btn-error" onclick="clockOut()">Clock Out</button>';
              }
              card.innerHTML = html;
            } else {
              card.innerHTML = '<div style="text-align:center;padding:40px;"><h3 style="margin:0 0 16px;">Belum Clock In Hari Ini</h3><p style="color:var(--color-text-secondary);margin:0 0 24px;">Mulai kehadiran Anda sekarang</p><button class="btn btn-primary" onclick="clockIn()">Clock In</button></div>';
            }
          } catch (e) { card.innerHTML = '<p class="text-center text-secondary">Error: ' + e.message + '</p>'; }
        }

        async function clockIn() {
          await fetch('/api/attendance/clock-in', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: CURRENT_USER_ID }) });
          loadMyAttendance();
        }

        async function clockOut() {
          await fetch('/api/attendance/clock-out', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: CURRENT_USER_ID }) });
          loadMyAttendance();
        }

        async function loadAllAttendance() {
          const start = document.getElementById('att-start').value;
          const end = document.getElementById('att-end').value;
          if (!start || !end) { alert('Pilih tanggal'); return; }
          const res = await fetch('/api/attendance?startDate=' + start + '&endDate=' + end);
          const data = await res.json();
          const tbody = document.getElementById('all-att-tbody');
          if (!data || !data.length) { tbody.innerHTML = '<tr><td colspan="6" class="text-center text-secondary">Tidak ada data</td></tr>'; return; }
          const statusBadge = {present:'badge-success',late:'badge-warning',absent:'badge-error',leave:'badge-info',sick:'badge-info'};
          const statusLabel = {present:'Present',late:'Terlambat',absent:'Absen',leave:'Cuti',sick:'Sakit'};
          tbody.innerHTML = data.map(a => '<tr><td>' + (a.userName || '-') + '</td><td>' + new Date(a.clockIn).toLocaleDateString('id-ID') + '</td><td>' + new Date(a.clockIn).toLocaleTimeString('id-ID') + '</td><td>' + (a.clockOut ? new Date(a.clockOut).toLocaleTimeString('id-ID') : '-') + '</td><td>' + (a.totalHours || '-') + '</td><td><span class="badge ' + (statusBadge[a.status]||'') + '">' + (statusLabel[a.status]||a.status) + '</span></td></tr>').join('');
        }

        const today = new Date().toISOString().split('T')[0];
        const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
        const attStart = document.getElementById('att-start');
        const attEnd = document.getElementById('att-end');
        if (attStart) attStart.value = weekAgo;
        if (attEnd) attEnd.value = today;

        loadMyAttendance();
      </script>
    `);
  });
