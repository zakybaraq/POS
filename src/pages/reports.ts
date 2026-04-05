import { Elysia } from 'elysia';
import { htmlResponse } from '../templates/html';
import { getSidebarHtml } from '../templates/sidebar';
import { getNavbarHtml } from '../templates/navbar';
import { getFooterHtml } from '../templates/footer';
import { getCommonScripts } from '../templates/common-scripts';
import { getTokenFromCookies, verifyToken, redirectToLogin } from '../utils/auth';

function formatDate(d: Date) {
  return d.toISOString().split('T')[0];
}

function formatRp(n: number) {
  return 'Rp ' + (n || 0).toLocaleString('id-ID');
}

export const reportsPage = new Elysia()
  .get('/reports', async ({ cookie, headers }) => {
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
    } catch {
      return redirectToLogin();
    }

    if (!['super_admin', 'admin_restoran'].includes(user.role)) {
      return new Response('Akses ditolak', { status: 403 });
    }

    const today = formatDate(new Date());
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    const weekAgo = formatDate(weekStart);
    const monthStart = new Date();
    monthStart.setDate(1);
    const monthStartStr = formatDate(monthStart);

    return htmlResponse(`
      <div class="app-layout">
        ${getSidebarHtml('reports', user)}
        <div class="app-content">
          ${getNavbarHtml('Laporan & Analitik', 'reports', user)}
          <main class="app-main">
            <div class="reports-container">
              <div class="tab-nav">
                <button class="tab-btn active" data-tab="sales">Penjualan</button>
                <button class="tab-btn" data-tab="menus">Menu Terlaris</button>
                <button class="tab-btn" data-tab="cashiers">Performa Kasir</button>
                <button class="tab-btn" data-tab="occupancy">Okupansi Meja</button>
              </div>

              <div class="tab-content active" id="tab-sales">
                <div class="report-header">
                  <div class="report-controls">
                    <select id="sales-period" class="input" style="width: 160px;">
                      <option value="today">Hari Ini</option>
                      <option value="week">Minggu Ini</option>
                      <option value="month" selected>Bulan Ini</option>
                      <option value="custom">Custom</option>
                    </select>
                    <div id="sales-custom-dates" style="display: none; gap: 8px; align-items: center;">
                      <input type="date" id="sales-start" class="input" value="${monthStartStr}">
                      <span>s/d</span>
                      <input type="date" id="sales-end" class="input" value="${today}">
                    </div>
                    <button class="btn btn-primary" id="sales-apply" onclick="loadSalesReport()">Terapkan</button>
                  </div>
                  <button class="btn btn-secondary" onclick="exportSalesCSV()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    Export CSV
                  </button>
                </div>

                <div class="stats-grid" id="sales-summary">
                  <div class="stats-card">
                    <div class="stats-label">Total Penjualan</div>
                    <div class="stats-value" id="sales-total">-</div>
                  </div>
                  <div class="stats-card">
                    <div class="stats-label">Total Pesanan</div>
                    <div class="stats-value" id="sales-orders">-</div>
                  </div>
                  <div class="stats-card">
                    <div class="stats-label">Rata-rata/Order</div>
                    <div class="stats-value" id="sales-avg">-</div>
                  </div>
                  <div class="stats-card">
                    <div class="stats-label">Selesai / Dibatalkan</div>
                    <div class="stats-value" id="sales-status">-</div>
                  </div>
                </div>

                <div class="card">
                  <div class="card-header">
                    <h3 class="card-title">Grafik Penjualan Harian</h3>
                  </div>
                  <div class="bar-chart-container" id="sales-chart"></div>
                </div>

                <div class="card" style="margin-top: 24px;">
                  <div class="card-header">
                    <h3 class="card-title">Detail Penjualan</h3>
                  </div>
                  <div class="table-container">
                    <table class="table">
                      <thead>
                        <tr><th>Tanggal</th><th>Pesanan</th><th>Selesai</th><th>Dibatalkan</th><th>Total Penjualan</th></tr>
                      </thead>
                      <tbody id="sales-table-body">
                        <tr><td colspan="5" class="text-center text-secondary" style="padding: 40px;">Pilih periode dan klik Terapkan</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div class="tab-content" id="tab-menus">
                <div class="report-header">
                  <div class="report-controls">
                    <select id="menu-period" class="input" style="width: 160px;">
                      <option value="today">Hari Ini</option>
                      <option value="week">Minggu Ini</option>
                      <option value="month" selected>Bulan Ini</option>
                      <option value="custom">Custom</option>
                    </select>
                    <div id="menu-custom-dates" style="display: none; gap: 8px; align-items: center;">
                      <input type="date" id="menu-start" class="input" value="${monthStartStr}">
                      <span>s/d</span>
                      <input type="date" id="menu-end" class="input" value="${today}">
                    </div>
                    <button class="btn btn-primary" onclick="loadMenuReport()">Terapkan</button>
                  </div>
                  <button class="btn btn-secondary" onclick="exportMenuCSV()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    Export CSV
                  </button>
                </div>

                <div class="card">
                  <div class="card-header">
                    <h3 class="card-title">Menu Terlaris Berdasarkan Quantity</h3>
                  </div>
                  <div class="table-container">
                    <table class="table">
                      <thead>
                        <tr><th>#</th><th>Menu</th><th>Kategori</th><th>Qty Terjual</th><th>Revenue</th><th>% dari Total</th></tr>
                      </thead>
                      <tbody id="menu-qty-table-body">
                        <tr><td colspan="6" class="text-center text-secondary" style="padding: 40px;">Pilih periode dan klik Terapkan</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div class="card" style="margin-top: 24px;">
                  <div class="card-header">
                    <h3 class="card-title">Menu Terlaris Berdasarkan Revenue</h3>
                  </div>
                  <div class="table-container">
                    <table class="table">
                      <thead>
                        <tr><th>#</th><th>Menu</th><th>Kategori</th><th>Qty Terjual</th><th>Revenue</th><th>% dari Total</th></tr>
                      </thead>
                      <tbody id="menu-rev-table-body">
                        <tr><td colspan="6" class="text-center text-secondary" style="padding: 40px;">Pilih periode dan klik Terapkan</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div class="tab-content" id="tab-cashiers">
                <div class="report-header">
                  <div class="report-controls">
                    <select id="cashier-period" class="input" style="width: 160px;">
                      <option value="today">Hari Ini</option>
                      <option value="week">Minggu Ini</option>
                      <option value="month" selected>Bulan Ini</option>
                      <option value="custom">Custom</option>
                    </select>
                    <div id="cashier-custom-dates" style="display: none; gap: 8px; align-items: center;">
                      <input type="date" id="cashier-start" class="input" value="${monthStartStr}">
                      <span>s/d</span>
                      <input type="date" id="cashier-end" class="input" value="${today}">
                    </div>
                    <button class="btn btn-primary" onclick="loadCashierReport()">Terapkan</button>
                  </div>
                  <button class="btn btn-secondary" onclick="exportCashierCSV()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    Export CSV
                  </button>
                </div>

                <div class="card">
                  <div class="card-header">
                    <h3 class="card-title">Performa Kasir</h3>
                  </div>
                  <div class="table-container">
                    <table class="table">
                      <thead>
                        <tr><th>Kasir</th><th>Transaksi</th><th>Rata-rata/Order</th><th>Total Penjualan</th><th>% Selesai</th></tr>
                      </thead>
                      <tbody id="cashier-table-body">
                        <tr><td colspan="5" class="text-center text-secondary" style="padding: 40px;">Pilih periode dan klik Terapkan</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div class="tab-content" id="tab-occupancy">
                <div class="report-header">
                  <div class="report-controls">
                    <select id="occupancy-period" class="input" style="width: 160px;">
                      <option value="today">Hari Ini</option>
                      <option value="week" selected>Minggu Ini</option>
                      <option value="month">Bulan Ini</option>
                      <option value="custom">Custom</option>
                    </select>
                    <div id="occupancy-custom-dates" style="display: none; gap: 8px; align-items: center;">
                      <input type="date" id="occupancy-start" class="input" value="${weekAgo}">
                      <span>s/d</span>
                      <input type="date" id="occupancy-end" class="input" value="${today}">
                    </div>
                    <button class="btn btn-primary" onclick="loadOccupancyReport()">Terapkan</button>
                  </div>
                  <button class="btn btn-secondary" onclick="exportOccupancyCSV()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    Export CSV
                  </button>
                </div>

                <div class="stats-grid" id="occupancy-summary">
                  <div class="stats-card">
                    <div class="stats-label">Rata-rata Okupansi</div>
                    <div class="stats-value" id="occupancy-avg">-</div>
                  </div>
                  <div class="stats-card">
                    <div class="stats-label">Peak Okupansi</div>
                    <div class="stats-value" id="occupancy-peak">-</div>
                  </div>
                  <div class="stats-card">
                    <div class="stats-label">Total Meja</div>
                    <div class="stats-value" id="occupancy-total">-</div>
                  </div>
                  <div class="stats-card">
                    <div class="stats-label">Total Orders</div>
                    <div class="stats-value" id="occupancy-orders">-</div>
                  </div>
                </div>

                <div class="card" style="margin-top: 24px;">
                  <div class="card-header">
                    <h3 class="card-title">Detail Okupansi Harian</h3>
                  </div>
                  <div class="table-container">
                    <table class="table">
                      <thead>
                        <tr><th>Tanggal</th><th>Meja Terpakai</th><th>Total Meja</th><th>% Okupansi</th><th>Total Orders</th></tr>
                      </thead>
                      <tbody id="occupancy-table-body">
                        <tr><td colspan="5" class="text-center text-secondary" style="padding: 40px;">Pilih periode dan klik Terapkan</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </main>
          ${getFooterHtml()}
        </div>
      </div>
      <style>
        .reports-container { max-width: 1400px; }
        .tab-nav { display: flex; gap: 4px; margin-bottom: 24px; background: var(--color-bg); border-radius: var(--radius-md); padding: 4px; border: 1px solid var(--color-border); }
        .tab-btn { flex: 1; padding: 12px 24px; border: none; background: transparent; cursor: pointer; border-radius: var(--radius-sm); font-size: 14px; font-weight: 500; color: var(--color-text-secondary); transition: var(--transition); }
        .tab-btn:hover { background: var(--color-bg-alt); color: var(--color-text); }
        .tab-btn.active { background: var(--color-primary); color: white; }
        .tab-content { display: none; }
        .tab-content.active { display: block; }
        .report-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
        .report-controls { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .bar-chart-container { padding: 24px; min-height: 200px; }
        .bar-chart { display: flex; align-items: flex-end; gap: 8px; height: 200px; padding: 0 8px; }
        .bar-chart .bar-wrapper { flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; }
        .bar-chart .bar { width: 100%; max-width: 60px; background: linear-gradient(180deg, var(--color-primary) 0%, var(--color-primary-dark) 100%); border-radius: 4px 4px 0 0; min-height: 4px; transition: height 0.3s ease; position: relative; margin-top: auto; }
        .bar-chart .bar:hover { opacity: 0.8; }
        .bar-chart .bar-tooltip { position: absolute; top: -28px; left: 50%; transform: translateX(-50%); background: var(--color-text); color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; white-space: nowrap; opacity: 0; transition: opacity 0.2s; }
        .bar-chart .bar:hover .bar-tooltip { opacity: 1; }
        .bar-chart .bar-label { margin-top: 8px; font-size: 11px; color: var(--color-text-secondary); text-align: center; }
        .bar-chart-axis { display: flex; justify-content: space-between; margin-top: 8px; padding: 0 8px; font-size: 11px; color: var(--color-text-secondary); }
        .no-data { text-align: center; padding: 40px; color: var(--color-text-secondary); }
      </style>
      <script>
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
          });
        });

        // Period change handlers
        ['sales', 'menu', 'cashier', 'occupancy'].forEach(prefix => {
          const sel = document.getElementById(prefix + '-period');
          const customDiv = document.getElementById(prefix + '-custom-dates');
          if (sel && customDiv) {
            sel.addEventListener('change', () => {
              customDiv.style.display = sel.value === 'custom' ? 'flex' : 'none';
            });
          }
        });

        function getDateRange(prefix) {
          const period = document.getElementById(prefix + '-period').value;
          const today = new Date().toISOString().split('T')[0];
          let startDate = today, endDate = today;
          if (period === 'today') {
            startDate = today; endDate = today;
          } else if (period === 'week') {
            const d = new Date(); d.setDate(d.getDate() - 7);
            startDate = d.toISOString().split('T')[0]; endDate = today;
          } else if (period === 'month') {
            const d = new Date(); d.setDate(1);
            startDate = d.toISOString().split('T')[0]; endDate = today;
          } else if (period === 'custom') {
            startDate = document.getElementById(prefix + '-start').value || today;
            endDate = document.getElementById(prefix + '-end').value || today;
          }
          return { startDate, endDate };
        }

        async function loadSalesReport() {
          const { startDate, endDate } = getDateRange('sales');
          const res = await fetch('/api/reports/sales/custom?startDate=' + startDate + '&endDate=' + endDate);
          const data = await res.json();
          const summaryRes = await fetch('/api/reports/summary?startDate=' + startDate + '&endDate=' + endDate);
          const summary = await summaryRes.json();

          document.getElementById('sales-total').textContent = formatRp(summary.totalSales);
          document.getElementById('sales-orders').textContent = summary.totalOrders || 0;
          document.getElementById('sales-avg').textContent = formatRp(Math.round(summary.avgOrderValue || 0));
          document.getElementById('sales-status').textContent = (summary.completedOrders || 0) + ' / ' + (summary.cancelledOrders || 0);

          const tbody = document.getElementById('sales-table-body');
          if (!data.length) {
            tbody.innerHTML = '<tr><td colspan="5" class="no-data">Tidak ada data untuk periode ini</td></tr>';
            document.getElementById('sales-chart').innerHTML = '<div class="no-data">Tidak ada data untuk ditampilkan</div>';
            return;
          }

          tbody.innerHTML = data.map(d => '<tr><td>' + d.date + '</td><td>' + d.totalOrders + '</td><td>' + d.completedOrders + '</td><td>' + d.cancelledOrders + '</td><td>' + formatRp(d.totalSales) + '</td></tr>').join('');

          const maxSales = Math.max(...data.map(d => d.totalSales));
          const chartHtml = '<div class="bar-chart">' + data.map(d => {
            const h = maxSales > 0 ? Math.max((d.totalSales / maxSales) * 100, 4) : 4;
            return '<div class="bar-wrapper"><div class="bar" style="height: ' + h + '%;"><div class="bar-tooltip">' + formatRp(d.totalSales) + '</div></div><div class="bar-label">' + d.date.slice(5) + '</div></div>';
          }).join('') + '</div>';
          document.getElementById('sales-chart').innerHTML = chartHtml;
        }

        async function loadMenuReport() {
          const { startDate, endDate } = getDateRange('menu');
          const [qtyRes, revRes] = await Promise.all([
            fetch('/api/reports/menus/top-quantity?startDate=' + startDate + '&endDate=' + endDate),
            fetch('/api/reports/menus/top-revenue?startDate=' + startDate + '&endDate=' + endDate)
          ]);
          const qtyData = await qtyRes.json();
          const revData = await revRes.json();
          const totalQty = qtyData.reduce((s, d) => s + (d.totalQty || 0), 0);
          const totalRev = revData.reduce((s, d) => s + (d.revenue || 0), 0);

          const renderMenuTable = (data, total) => {
            if (!data.length) return '<tr><td colspan="6" class="no-data">Tidak ada data untuk periode ini</td></tr>';
            return data.map((d, i) => '<tr><td>' + (i+1) + '</td><td>' + (d.menuName || 'Unknown') + '</td><td><span class="badge ' + (d.category === 'makanan' ? 'badge-warning' : 'badge-primary') + '">' + (d.category || '-') + '</span></td><td>' + (d.totalQty || 0) + '</td><td>' + formatRp(d.revenue) + '</td><td>' + (total > 0 ? Math.round((d.totalQty / total) * 100) : 0) + '%</td></tr>').join('');
          };

          document.getElementById('menu-qty-table-body').innerHTML = renderMenuTable(qtyData, totalQty);
          document.getElementById('menu-rev-table-body').innerHTML = renderMenuTable(revData, totalRev > 0 ? revData.reduce((s, d) => s + (d.revenue || 0), 0) : 0);
        }

        async function loadCashierReport() {
          const { startDate, endDate } = getDateRange('cashier');
          const res = await fetch('/api/reports/cashiers?startDate=' + startDate + '&endDate=' + endDate);
          const data = await res.json();
          const tbody = document.getElementById('cashier-table-body');
          if (!data.length) {
            tbody.innerHTML = '<tr><td colspan="5" class="no-data">Tidak ada data untuk periode ini</td></tr>';
            return;
          }
          tbody.innerHTML = data.map(d => '<tr><td><strong>' + (d.userName || 'Unknown') + '</strong></td><td>' + d.totalTransactions + '</td><td>' + formatRp(Math.round(d.avgOrderValue || 0)) + '</td><td>' + formatRp(d.totalSales) + '</td><td>' + (d.totalTransactions > 0 ? Math.round((d.completedOrders / d.totalTransactions) * 100) : 0) + '%</td></tr>').join('');
        }

        async function loadOccupancyReport() {
          const { startDate, endDate } = getDateRange('occupancy');
          const res = await fetch('/api/reports/tables/occupancy?startDate=' + startDate + '&endDate=' + endDate);
          const data = await res.json();
          const tbody = document.getElementById('occupancy-table-body');
          if (!data.length) {
            tbody.innerHTML = '<tr><td colspan="5" class="no-data">Tidak ada data untuk periode ini</td></tr>';
            document.getElementById('occupancy-avg').textContent = '-';
            document.getElementById('occupancy-peak').textContent = '-';
            document.getElementById('occupancy-total').textContent = '-';
            document.getElementById('occupancy-orders').textContent = '-';
            return;
          }
          const avgOcc = Math.round(data.reduce((s, d) => s + d.occupancyRate, 0) / data.length);
          const peak = data.reduce((m, d) => d.occupancyRate > m.occupancyRate ? d : m, data[0]);
          const totalOrders = data.reduce((s, d) => s + d.totalOrders, 0);

          document.getElementById('occupancy-avg').textContent = avgOcc + '%';
          document.getElementById('occupancy-peak').textContent = peak.occupancyRate + '% (' + peak.date + ')';
          document.getElementById('occupancy-total').textContent = data[0]?.totalTables || 0;
          document.getElementById('occupancy-orders').textContent = totalOrders;

          tbody.innerHTML = data.map(d => '<tr><td>' + d.date + '</td><td>' + d.uniqueTables + '</td><td>' + d.totalTables + '</td><td><span class="badge ' + (d.occupancyRate > 70 ? 'badge-error' : d.occupancyRate > 40 ? 'badge-warning' : 'badge-success') + '">' + d.occupancyRate + '%</span></td><td>' + d.totalOrders + '</td></tr>').join('');
        }

        function exportSalesCSV() {
          const rows = [['Tanggal', 'Pesanan', 'Selesai', 'Dibatalkan', 'Total Penjualan']];
          document.querySelectorAll('#sales-table-body tr').forEach(tr => {
            const cells = tr.querySelectorAll('td');
            if (cells.length === 5) rows.push(Array.from(cells).map(c => c.textContent.trim()));
          });
          downloadCSV(rows, 'sales-report.csv');
        }

        function exportMenuCSV() {
          const rows = [['#', 'Menu', 'Kategori', 'Qty Terjual', 'Revenue', '% dari Total']];
          document.querySelectorAll('#menu-qty-table-body tr').forEach(tr => {
            const cells = tr.querySelectorAll('td');
            if (cells.length === 6) rows.push(Array.from(cells).map(c => c.textContent.trim()));
          });
          downloadCSV(rows, 'menu-report.csv');
        }

        function exportCashierCSV() {
          const rows = [['Kasir', 'Transaksi', 'Rata-rata/Order', 'Total Penjualan', '% Selesai']];
          document.querySelectorAll('#cashier-table-body tr').forEach(tr => {
            const cells = tr.querySelectorAll('td');
            if (cells.length === 5) rows.push(Array.from(cells).map(c => c.textContent.trim()));
          });
          downloadCSV(rows, 'cashier-report.csv');
        }

        function exportOccupancyCSV() {
          const rows = [['Tanggal', 'Meja Terpakai', 'Total Meja', '% Okupansi', 'Total Orders']];
          document.querySelectorAll('#occupancy-table-body tr').forEach(tr => {
            const cells = tr.querySelectorAll('td');
            if (cells.length === 5) rows.push(Array.from(cells).map(c => c.textContent.trim()));
          });
          downloadCSV(rows, 'occupancy-report.csv');
        }

        function downloadCSV(rows, filename) {
          const csv = rows.map(r => r.map(c => '"' + (c || '').replace(/"/g, '""') + '"').join(',')).join('\\n');
          const blob = new Blob([csv], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = filename; a.click();
          URL.revokeObjectURL(url);
        }

        function formatRp(n) {
          return 'Rp ' + (n || 0).toLocaleString('id-ID');
        }

        // Auto-load sales report on page load
        loadSalesReport();
      </script>
    `);
  });