import { Elysia } from 'elysia';
import { htmlResponse } from '../templates/html';
import { getSidebarHtml } from '../templates/sidebar';
import { getNavbarHtml } from '../templates/navbar';
import { getFooterHtml } from '../templates/footer';
import { getCommonScripts } from '../templates/common-scripts';
import { getTokenFromCookies, verifyToken, redirectToLogin } from '../utils/auth';
import * as orderRepo from '../repositories/order';
import * as userRepo from '../repositories/user';

export const ordersPage = new Elysia()
  .get('/orders', async ({ cookie, headers }) => {
    const token = getTokenFromCookies(cookie, headers);
    if (!token) return redirectToLogin();
    let user = null;
    try { user = verifyToken(token); } catch { return redirectToLogin(); }

    const orders = await orderRepo.getOrdersTodayWithTables();
    const ordersWithData = await Promise.all(orders.map(async (o: any) => {
      const cashier = o.orders?.userId ? await userRepo.getUserById(o.orders.userId) : null;
      return { ...o, cashierName: cashier?.name || '-' };
    }));

    const total = ordersWithData.length;
    const active = ordersWithData.filter((o: any) => o.orders?.status === 'active').length;
    const completed = ordersWithData.filter((o: any) => o.orders?.status === 'completed').length;
    const cancelled = ordersWithData.filter((o: any) => o.orders?.status === 'cancelled').length;
    const todaySales = ordersWithData.filter((o: any) => o.orders?.status === 'completed').reduce((s: number, o: any) => s + (o.orders?.total || 0), 0);

    return htmlResponse(`
      <div class="app-layout">
        ${getSidebarHtml('orders', user)}
        <div class="app-content">
          ${getNavbarHtml('Pesanan Hari Ini', 'orders', user)}
          <main class="app-main">
            <div class="stats-grid">
              <div class="stats-card"><div class="stats-label">Total Pesanan</div><div class="stats-value">${total}</div><div class="stats-change">Hari ini</div></div>
              <div class="stats-card"><div class="stats-label">Aktif</div><div class="stats-value" style="color: var(--color-warning);">${active}</div><div class="stats-change">Sedang berjalan</div></div>
              <div class="stats-card"><div class="stats-label">Selesai</div><div class="stats-value" style="color: var(--color-success);">${completed}</div><div class="stats-change">Sudah dibayar</div></div>
              <div class="stats-card"><div class="stats-label">Dibatalkan</div><div class="stats-value" style="color: var(--color-error);">${cancelled}</div><div class="stats-change">Dibatalkan</div></div>
              <div class="stats-card"><div class="stats-label">Penjualan</div><div class="stats-value" style="font-size: 18px;">Rp ${todaySales.toLocaleString('id-ID')}</div><div class="stats-change">Hari ini</div></div>
            </div>

            <div class="card">
              <div class="card-header">
                <div class="orders-toolbar">
                  <div class="orders-toolbar-left">
                    <input type="text" id="order-search" class="order-search-input" placeholder="🔍 Cari pesanan..." oninput="filterOrders()">
                    <select id="order-filter-status" class="order-filter-select" onchange="filterOrders()">
                      <option value="all">Semua Status</option>
                      <option value="active">Aktif</option>
                      <option value="completed">Selesai</option>
                      <option value="cancelled">Dibatalkan</option>
                    </select>
                  </div>
                  <div class="orders-toolbar-right">
                    <button class="btn btn-secondary" onclick="exportOrders()">📥 Export CSV</button>
                    <button class="btn btn-secondary" onclick="location.reload()">🔄 Refresh</button>
                  </div>
                </div>
              </div>
              <div class="table-container">
                <table class="table">
                  <thead>
                    <tr>
                      <th onclick="sortOrders('id')" style="cursor:pointer;"># <span id="sort-id"></span></th>
                      <th onclick="sortOrders('table')" style="cursor:pointer;">Meja <span id="sort-table"></span></th>
                      <th onclick="sortOrders('cashier')" style="cursor:pointer;">Kasir <span id="sort-cashier"></span></th>
                      <th onclick="sortOrders('total')" style="cursor:pointer;">Total <span id="sort-total"></span></th>
                      <th>Status</th>
                      <th onclick="sortOrders('time')" style="cursor:pointer;">Waktu <span id="sort-time"></span></th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody id="orders-table-body">
                    ${ordersWithData.map((o: any) => {
                      const statusClass = o.orders?.status === 'completed' ? 'badge-success' : o.orders?.status === 'cancelled' ? 'badge-error' : 'badge-warning';
                      const statusLabel = o.orders?.status === 'active' ? 'Aktif' : o.orders?.status === 'completed' ? 'Selesai' : 'Dibatal';
                      return `<tr data-order-id="${o.orders?.id}" data-table="${o.tables?.tableNumber || 0}" data-cashier="${o.cashierName}" data-total="${o.orders?.total || 0}" data-time="${o.orders?.createdAt}" data-status="${o.orders?.status}">
                        <td><strong>#${o.orders?.id}</strong></td>
                        <td>Meja ${o.tables?.tableNumber || '-'}</td>
                        <td>${o.cashierName}</td>
                        <td>Rp ${(o.orders?.total || 0).toLocaleString('id-ID')}</td>
                        <td><span class="badge ${statusClass}">${statusLabel}</span></td>
                        <td>${o.orders?.createdAt ? new Date(o.orders.createdAt).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                        <td><button onclick="showOrderDetail(${o.orders?.id})" class="btn btn-secondary btn-sm">👁️ Detail</button></td>
                      </tr>`;
                    }).join('')}
                  </tbody>
                </table>
                ${ordersWithData.length === 0 ? '<p class="text-center text-secondary" style="padding: 40px;">Belum ada pesanan hari ini</p>' : ''}
              </div>
              <div class="pagination" id="orders-pagination"></div>
            </div>
          </main>
          ${getFooterHtml()}
        </div>
      </div>

      <div class="modal" id="order-detail-modal">
        <div class="modal-backdrop" onclick="closeOrderDetail()"></div>
        <div class="modal-content" style="max-width: 500px;">
          <div class="modal-header"><h3>Detail Pesanan #<span id="detail-order-id"></span></h3><button class="modal-close" onclick="closeOrderDetail()">&times;</button></div>
          <div class="modal-body" id="order-detail-body"></div>
          <div class="modal-footer">
            <button onclick="printOrderReceipt()" class="btn btn-secondary" id="btn-print-receipt" style="display: none;">🖨️ Cetak Struk</button>
            <button onclick="closeOrderDetail()" class="btn btn-primary">Tutup</button>
          </div>
        </div>
      </div>

      <style>
        .orders-toolbar { display: flex; justify-content: space-between; align-items: center; width: 100%; flex-wrap: wrap; gap: 8px; }
        .orders-toolbar-left { display: flex; gap: 8px; flex: 1; flex-wrap: wrap; }
        .orders-toolbar-right { display: flex; gap: 8px; }
        .order-search-input { padding: 6px 12px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: 13px; min-width: 200px; }
        .order-filter-select { padding: 6px 12px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: 13px; background: var(--color-bg); }
        .btn-sm { padding: 4px 8px; font-size: 11px; }
        .pagination { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-top: 1px solid var(--color-border); }
        .pagination-info { font-size: 13px; color: var(--color-text-secondary); }
        .pagination-buttons { display: flex; gap: 4px; }
        .pagination-btn { padding: 4px 10px; border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-bg); cursor: pointer; font-size: 12px; }
        .pagination-btn:hover { background: var(--color-bg-hover); }
        .pagination-btn.active { background: var(--color-primary); color: white; border-color: var(--color-primary); }
        .pagination-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .receipt-line { border-bottom: 1px dashed var(--color-border); margin: 8px 0; }
        .receipt-row { display: flex; justify-content: space-between; margin: 4px 0; font-size: 13px; }
        .receipt-center { text-align: center; margin: 8px 0; }
        .detail-items-table { width: 100%; border-collapse: collapse; margin: 12px 0; }
        .detail-items-table th, .detail-items-table td { padding: 6px 8px; text-align: left; border-bottom: 1px solid var(--color-border); font-size: 13px; }
        .detail-items-table th { font-weight: 600; background: var(--color-bg-alt); }
      </style>
      <script>
        let currentPage = 1;
        const itemsPerPage = 15;
        let sortField = 'time';
        let sortDir = 'desc';
        let lastOrderDetail = null;

        function filterOrders() {
          const search = document.getElementById('order-search').value.toLowerCase();
          const statusFilter = document.getElementById('order-filter-status').value;
          document.querySelectorAll('#orders-table-body tr').forEach(row => {
            const table = row.dataset.table || '';
            const cashier = row.dataset.cashier || '';
            const status = row.dataset.status || '';
            const matchesSearch = !search || table.includes(search) || cashier.toLowerCase().includes(search);
            const matchesStatus = statusFilter === 'all' || status === statusFilter;
            row.style.display = (matchesSearch && matchesStatus) ? '' : 'none';
          });
          currentPage = 1;
          renderPagination();
        }

        function sortOrders(field) {
          if (sortField === field) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
          else { sortField = field; sortDir = field === 'time' ? 'desc' : 'asc'; }
          document.querySelectorAll('[id^="sort-"]').forEach(el => el.textContent = '');
          const el = document.getElementById('sort-' + field);
          if (el) el.textContent = sortDir === 'asc' ? '↑' : '↓';
          const tbody = document.getElementById('orders-table-body');
          const rows = Array.from(tbody.querySelectorAll('tr'));
          rows.sort((a, b) => {
            let aVal, bVal;
            if (field === 'id') { aVal = parseInt(a.dataset.orderId); bVal = parseInt(b.dataset.orderId); }
            else if (field === 'table') { aVal = parseInt(a.dataset.table); bVal = parseInt(b.dataset.table); }
            else if (field === 'cashier') { aVal = a.dataset.cashier; bVal = b.dataset.cashier; }
            else if (field === 'total') { aVal = parseInt(a.dataset.total); bVal = parseInt(b.dataset.total); }
            else if (field === 'time') { aVal = new Date(a.dataset.time).getTime(); bVal = new Date(b.dataset.time).getTime(); }
            else return 0;
            if (typeof aVal === 'string') return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
            return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
          });
          rows.forEach(r => tbody.appendChild(r));
          currentPage = 1;
          renderPagination();
        }

        function renderPagination() {
          const rows = Array.from(document.querySelectorAll('#orders-table-body tr'));
          const visibleRows = rows.filter(r => r.style.display !== 'none');
          const totalPages = Math.ceil(visibleRows.length / itemsPerPage) || 1;
          if (currentPage > totalPages) currentPage = totalPages;
          rows.forEach(r => {
            const idx = visibleRows.indexOf(r);
            const page = Math.floor(idx / itemsPerPage) + 1;
            r.style.display = (r.style.display !== 'none' && page === currentPage) ? '' : 'none';
          });
          const pagDiv = document.getElementById('orders-pagination');
          if (!pagDiv || totalPages <= 1) { if (pagDiv) pagDiv.innerHTML = ''; return; }
          const start = (currentPage - 1) * itemsPerPage + 1;
          const end = Math.min(currentPage * itemsPerPage, visibleRows.length);
          let html = '<div class="pagination-info">Menampilkan ' + start + '-' + end + ' dari ' + visibleRows.length + '</div>';
          html += '<div class="pagination-buttons">';
          html += '<button class="pagination-btn" onclick="goToPage(' + (currentPage - 1) + ')" ' + (currentPage <= 1 ? 'disabled' : '') + '>← Prev</button>';
          for (let p = 1; p <= totalPages; p++) html += '<button class="pagination-btn ' + (p === currentPage ? 'active' : '') + '" onclick="goToPage(' + p + ')">' + p + '</button>';
          html += '<button class="pagination-btn" onclick="goToPage(' + (currentPage + 1) + ')" ' + (currentPage >= totalPages ? 'disabled' : '') + '>Next →</button>';
          html += '</div>';
          pagDiv.innerHTML = html;
        }

        function goToPage(page) { currentPage = page; renderPagination(); }

        async function showOrderDetail(orderId) {
          const res = await fetch('/api/orders/' + orderId);
          const data = await res.json();
          if (data.error) { showToast('Gagal memuat detail pesanan', 'error'); return; }
          const order = data.order;
          const items = data.items || [];
          lastOrderDetail = { order, items };
          document.getElementById('detail-order-id').textContent = order.id;
          let html = '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px;">';
          html += '<div><strong>Meja:</strong> ' + (data.table?.tableNumber || '-') + '</div>';
          html += '<div><strong>Kasir:</strong> ${user.name}</div>';
          html += '<div><strong>Tanggal:</strong> ' + new Date(order.createdAt).toLocaleString('id-ID') + '</div>';
          html += '<div><strong>Status:</strong> ' + (order.status === 'active' ? 'Aktif' : order.status === 'completed' ? 'Selesai' : 'Dibatal') + '</div>';
          html += '</div>';
          if (items.length > 0) {
            html += '<table class="detail-items-table"><thead><tr><th>Item</th><th>Qty</th><th>Harga</th><th>Total</th></tr></thead><tbody>';
            items.forEach(item => {
              html += '<tr><td>' + (item.menuName || 'Item') + '</td><td>' + item.quantity + '</td><td>' + (item.priceAtOrder || 0).toLocaleString('id-ID') + '</td><td>' + ((item.priceAtOrder || 0) * item.quantity).toLocaleString('id-ID') + '</td></tr>';
            });
            html += '</tbody></table>';
          }
          html += '<div class="receipt-line"></div>';
          html += '<div class="receipt-row"><span>Subtotal</span><span>' + (order.subtotal || 0).toLocaleString('id-ID') + '</span></div>';
          html += '<div class="receipt-row"><span>Pajak (10%)</span><span>' + (order.tax || 0).toLocaleString('id-ID') + '</span></div>';
          html += '<div class="receipt-row" style="font-weight: bold; font-size: 15px;"><span>TOTAL</span><span>' + (order.total || 0).toLocaleString('id-ID') + '</span></div>';
          if (order.status === 'completed') {
            html += '<div class="receipt-row"><span>Bayar</span><span>' + (order.amountPaid || 0).toLocaleString('id-ID') + '</span></div>';
            html += '<div class="receipt-row"><span>Kembali</span><span>' + (order.changeDue || 0).toLocaleString('id-ID') + '</span></div>';
            document.getElementById('btn-print-receipt').style.display = 'inline';
          } else {
            document.getElementById('btn-print-receipt').style.display = 'none';
          }
          document.getElementById('order-detail-body').innerHTML = html;
          document.getElementById('order-detail-modal').classList.add('show');
        }

        function closeOrderDetail() { document.getElementById('order-detail-modal').classList.remove('show'); }

        function printOrderReceipt() {
          if (!lastOrderDetail) return;
          const { order, items } = lastOrderDetail;
          let html = '<div class="receipt-center"><strong>POS APP</strong></div>';
          html += '<div class="receipt-center" style="font-size: 11px;">Jl. Contoh No. 123</div>';
          html += '<div class="receipt-line"></div>';
          html += '<div class="receipt-row"><span>Order #</span><span>' + order.id + '</span></div>';
          html += '<div class="receipt-row"><span>Tgl</span><span>' + new Date(order.createdAt).toLocaleString('id-ID') + '</span></div>';
          html += '<div class="receipt-line"></div>';
          items.forEach(item => {
            html += '<div class="receipt-row"><span>' + (item.menuName || 'Item') + ' x' + item.quantity + '</span><span>' + ((item.priceAtOrder || 0) * item.quantity).toLocaleString('id-ID') + '</span></div>';
          });
          html += '<div class="receipt-line"></div>';
          html += '<div class="receipt-row"><span>Subtotal</span><span>' + (order.subtotal || 0).toLocaleString('id-ID') + '</span></div>';
          html += '<div class="receipt-row"><span>Pajak</span><span>' + (order.tax || 0).toLocaleString('id-ID') + '</span></div>';
          html += '<div class="receipt-row" style="font-weight: bold;"><span>TOTAL</span><span>' + (order.total || 0).toLocaleString('id-ID') + '</span></div>';
          html += '<div class="receipt-row"><span>Bayar</span><span>' + (order.amountPaid || 0).toLocaleString('id-ID') + '</span></div>';
          html += '<div class="receipt-row"><span>Kembali</span><span>' + (order.changeDue || 0).toLocaleString('id-ID') + '</span></div>';
          html += '<div class="receipt-line"></div>';
          html += '<div class="receipt-center"><strong>TERIMA KASIH!</strong></div>';
          const win = window.open('', '_blank');
          win.document.write('<html><head><title>Struk</title></head><body><pre style="font-family: monospace; font-size: 13px; max-width: 300px;">' + html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ') + '</pre></body></html>');
          win.document.close();
          win.print();
        }

        function exportOrders() {
          const rows = [['No Order', 'Meja', 'Kasir', 'Subtotal', 'Pajak', 'Total', 'Status', 'Waktu']];
          document.querySelectorAll('#orders-table-body tr').forEach(tr => {
            if (tr.style.display === 'none') return;
            const cells = tr.querySelectorAll('td');
            rows.push([
              cells[0]?.textContent.trim(),
              cells[1]?.textContent.trim(),
              cells[2]?.textContent.trim(),
              cells[3]?.textContent.replace('Rp ', '').replace(/\./g, ''),
              '',
              cells[3]?.textContent.replace('Rp ', '').replace(/\./g, ''),
              cells[4]?.textContent.trim(),
              cells[5]?.textContent.trim()
            ]);
          });
          const csv = rows.map(r => r.join(',')).join('\\n');
          const blob = new Blob([csv], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'orders-' + new Date().toISOString().slice(0, 10) + '.csv';
          a.click();
          showToast('Export berhasil');
        }

        // Auto-refresh for active orders
        setInterval(async () => {
          try {
            const res = await fetch('/api/orders/today');
            const data = await res.json();
            if (data && data.length > 0) location.reload();
          } catch (e) {}
        }, 30000);

        document.addEventListener('DOMContentLoaded', function() { renderPagination(); sortOrders('time'); });
      </script>
      ${getCommonScripts()}
    `);
  });
