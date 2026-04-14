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
          <button class="tab-btn" data-tab="cashiers">Performa Kasir</button>
          <button class="tab-btn" data-tab="financial">Laporan Keuangan</button>
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


      <div class="tab-content" id="tab-financial">
        <div class="report-header">
          <div class="report-controls">
            <select id="financial-period" class="input" style="width: 160px;">
              <option value="today">Hari Ini</option>
              <option value="week">Minggu Ini</option>
              <option value="month" selected>Bulan Ini</option>
              <option value="custom">Custom</option>
            </select>
            <div id="financial-custom-dates" style="display: none; gap: 8px; align-items: center;">
              <input type="date" id="financial-start" class="input" value="${monthStartStr}">
              <span>s/d</span>
              <input type="date" id="financial-end" class="input" value="${today}">
            </div>
            <button class="btn btn-primary" onclick="loadFinancialReport()">Terapkan</button>
          </div>
          <button class="btn btn-secondary" onclick="exportFinancialCSV()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Export CSV
          </button>
        </div>

        <div class="stats-grid" id="financial-summary">
          <div class="stats-card">
            <div class="stats-label">Total Pendapatan</div>
            <div class="stats-value" id="financial-revenue">-</div>
            <div class="stats-subtitle" id="financial-revenue-change"></div>
          </div>
          <div class="stats-card" style="border-left: 4px solid #e74c3c;">
            <div class="stats-label">Total Pengeluaran</div>
            <div class="stats-value" id="financial-expenses">-</div>
            <div class="stats-subtitle" id="financial-expense-detail"></div>
          </div>
          <div class="stats-card" style="border-left: 4px solid #27ae60;">
            <div class="stats-label">Laba Bersih</div>
            <div class="stats-value" id="financial-profit">-</div>
            <div class="stats-subtitle" id="financial-margin"></div>
          </div>
          <div class="stats-card">
            <div class="stats-label">Laba Kotor</div>
            <div class="stats-value" id="financial-gross">-</div>
          </div>
        </div>

        <div class="card" style="margin-top: 24px;">
          <div class="card-header">
            <h3 class="card-title">Rincian Keuangan</h3>
          </div>
          <div class="table-container">
            <table class="table">
              <thead>
                <tr>
                  <th>Komponen</th>
                  <th class="text-right">Jumlah</th>
                  <th class="text-right">Persentase</th>
                </tr>
              </thead>
              <tbody id="financial-detail-table">
                <tr><td colspan="3" class="text-center text-secondary" style="padding: 40px;">Pilih periode dan klik Terapkan</td></tr>
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
        .stats-subtitle { font-size: 12px; color: var(--color-text-secondary); margin-top: 4px; }
        .profit-positive { color: #27ae60 !important; }
        .profit-negative { color: #e74c3c !important; }
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
['sales', 'cashier', 'financial'].forEach(prefix => {
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


        function exportSalesCSV() {
          const rows = [['Tanggal', 'Pesanan', 'Selesai', 'Dibatalkan', 'Total Penjualan']];
          document.querySelectorAll('#sales-table-body tr').forEach(tr => {
            const cells = tr.querySelectorAll('td');
            if (cells.length === 5) rows.push(Array.from(cells).map(c => c.textContent.trim()));
          });
          downloadCSV(rows, 'sales-report.csv');
        }


        function exportCashierCSV() {
          const rows = [['Kasir', 'Transaksi', 'Rata-rata/Order', 'Total Penjualan', '% Selesai']];
          document.querySelectorAll('#cashier-table-body tr').forEach(tr => {
            const cells = tr.querySelectorAll('td');
            if (cells.length === 5) rows.push(Array.from(cells).map(c => c.textContent.trim()));
          });
          downloadCSV(rows, 'cashier-report.csv');
        }


async function loadFinancialReport() {
  const { startDate, endDate } = getDateRange('financial');
  try {
    const res = await fetch('/api/reports/financial/profit-loss?startDate=' + startDate + '&endDate=' + endDate);
    const data = await res.json();

    if (data.error) {
      alert(data.error);
      return;
    }

    const isProfit = data.netProfit >= 0;

    document.getElementById('financial-revenue').textContent = formatRp(data.revenue?.totalRevenue);
    document.getElementById('financial-revenue-change').textContent = data.revenue?.completedOrders + ' order selesai';

    document.getElementById('financial-expenses').textContent = formatRp(data.expenses?.totalExpenses);
    document.getElementById('financial-expense-detail').textContent = 'Bahan: ' + formatRp(data.expenses?.purchases) + ' | Gaji: ' + formatRp(data.expenses?.salaries);

    document.getElementById('financial-profit').textContent = (isProfit ? '+' : '') + formatRp(data.netProfit);
    document.getElementById('financial-profit').className = 'stats-value ' + (isProfit ? 'profit-positive' : 'profit-negative');
    document.getElementById('financial-margin').textContent = 'Margin: ' + data.profitMargin + '%';

    document.getElementById('financial-gross').textContent = formatRp(data.grossProfit);

    const tbody = document.getElementById('financial-detail-table');
    tbody.innerHTML = \`
      <tr>
        <td><strong>Pendapatan</strong></td>
        <td class="text-right">\${formatRp(data.revenue?.totalRevenue)}</td>
        <td class="text-right">100%</td>
      </tr>
      <tr>
        <td style="padding-left: 24px;">- Pajak</td>
        <td class="text-right">\${formatRp(data.revenue?.totalTax)}</td>
        <td class="text-right">\${((data.revenue?.totalTax / data.revenue?.totalRevenue) * 100).toFixed(1)}%</td>
      </tr>
      <tr>
        <td style="padding-left: 24px;">- HPP (COGS)</td>
        <td class="text-right">\${formatRp(data.costOfGoodsSold?.totalCOGS)}</td>
        <td class="text-right">\${((data.costOfGoodsSold?.totalCOGS / data.revenue?.totalRevenue) * 100).toFixed(1)}%</td>
      </tr>
      <tr style="background: var(--color-bg-secondary);">
        <td><strong>Laba Kotor</strong></td>
        <td class="text-right"><strong>\${formatRp(data.grossProfit)}</strong></td>
        <td class="text-right"><strong>\${((data.grossProfit / data.revenue?.totalRevenue) * 100).toFixed(1)}%</strong></td>
      </tr>
      <tr>
        <td style="padding-left: 24px;">- Bahan Baku</td>
        <td class="text-right">\${formatRp(data.expenses?.purchases)}</td>
        <td class="text-right">\${((data.expenses?.purchases / data.revenue?.totalRevenue) * 100).toFixed(1)}%</td>
      </tr>
      <tr>
        <td style="padding-left: 24px;">- Gaji Karyawan</td>
        <td class="text-right">\${formatRp(data.expenses?.salaries)}</td>
        <td class="text-right">\${((data.expenses?.salaries / data.revenue?.totalRevenue) * 100).toFixed(1)}%</td>
      </tr>
      <tr style="background: \${isProfit ? '#e8f5e9' : '#ffebee'};">
        <td><strong>\${isProfit ? 'Laba Bersih' : 'Rugi'}</strong></td>
        <td class="text-right"><strong class="\${isProfit ? 'profit-positive' : 'profit-negative'}">\${(isProfit ? '+' : '') + formatRp(data.netProfit)}</strong></td>
        <td class="text-right"><strong>\${data.profitMargin}%</strong></td>
      </tr>
    \`;
  } catch (error) {
    console.error('Error loading financial report:', error);
    alert('Gagal memuat laporan keuangan');
  }
}

function exportFinancialCSV() {
  const rows = [['Komponen', 'Jumlah', 'Persentase']];
  document.querySelectorAll('#financial-detail-table tr').forEach(tr => {
    const cells = tr.querySelectorAll('td');
    if (cells.length === 3) rows.push(Array.from(cells).map(c => c.textContent.trim()));
  });
  downloadCSV(rows, 'financial-report.csv');
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