import { Elysia } from 'elysia';
import { htmlResponse } from '../templates/html';
import { getSidebarHtml } from '../templates/sidebar';
import { getNavbarHtml } from '../templates/navbar';
import { getFooterHtml } from '../templates/footer';
import { getCommonScripts } from '../templates/common-scripts';
import { getTokenFromCookies, verifyToken, redirectToLogin } from '../utils/auth';
import * as inv from '../repositories/inventory';
import * as menuRepo from '../repositories/menu';

const UNIT_OPTIONS = ['kg', 'gram', 'liter', 'ml', 'pcs', 'bungkus', 'botol', 'kaleng'];

export const inventoryPage = new Elysia()
  .get('/inventory', async ({ cookie, headers }) => {
    const token = getTokenFromCookies(cookie, headers);
    if (!token) return redirectToLogin();
    let user = null;
    try { user = verifyToken(token); } catch { return redirectToLogin(); }

    const menuRoles = ['super_admin', 'admin_restoran'];
    if (!menuRoles.includes(user.role)) {
      return new Response('Akses ditolak', { status: 403 });
    }

     const ingredients = await inv.getAllIngredients();
     const menus = await menuRepo.getAllMenus();
     const movements = await inv.getStockMovements(undefined, 50);

     const total = ingredients.length;
     const lowStockCount = ingredients.filter((i: any) => {
         const stock = Number(i.currentStock);
         const min = Number(i.minStock);
         return stock > 0 && stock < min;
     }).length;
     const outOfStock = ingredients.filter((i: any) => Number(i.currentStock) <= 0).length;
     const inStock = ingredients.filter((i: any) => Number(i.currentStock) >= Number(i.minStock)).length;

    return htmlResponse(`
      <div class="app-layout">
        ${getSidebarHtml('inventory', user)}
        <div class="app-content">
          ${getNavbarHtml('Inventory', 'inventory', user)}
          <main class="app-main">
            <div class="inv-container">
              <div class="tab-nav">
                <button class="tab-btn active" data-tab="ingredients" onclick="showInvTab('ingredients', this)">Bahan Baku${lowStockCount + outOfStock > 0 ? ' <span class="badge badge-error" style="font-size:10px;">' + (lowStockCount + outOfStock) + '</span>' : ''}</button>
                <button class="tab-btn" data-tab="recipes" onclick="showInvTab('recipes', this)">Resep</button>
                <button class="tab-btn" data-tab="movements" onclick="showInvTab('movements', this)">Riwayat Stok</button>
              </div>

              <div class="tab-content active" id="tab-ingredients">
                <div class="stats-grid">
                  <div class="stats-card"><div class="stats-label">Total Bahan</div><div class="stats-value">${total}</div><div class="stats-change">Semua bahan baku</div></div>
                  <div class="stats-card"><div class="stats-label">Stok Aman</div><div class="stats-value" style="color: var(--color-success);">${inStock}</div><div class="stats-change">Stok cukup</div></div>
                  <div class="stats-card"><div class="stats-label">Stok Rendah</div><div class="stats-value" style="color: var(--color-warning);">${lowStockCount}</div><div class="stats-change">Perlu restock</div></div>
                  <div class="stats-card"><div class="stats-label">Stok Habis</div><div class="stats-value" style="color: var(--color-error);">${outOfStock}</div><div class="stats-change">Tidak tersedia</div></div>
                </div>

                <div class="card">
                  <div class="menu-toolbar">
                    <div class="menu-toolbar-left">
                      <input type="text" id="inv-search" class="menu-search-input" placeholder="Cari bahan..." oninput="filterIngredients()">
                      <select id="inv-filter-stock" class="menu-filter-select" onchange="filterIngredients()">
                        <option value="all">Semua</option>
                        <option value="low">Stok Rendah</option>
                        <option value="out">Stok Habis</option>
                      </select>
                    </div>
                    <div class="menu-toolbar-right">
                      <button class="btn btn-primary" onclick="showAddIngredientModal()">+ Tambah Bahan</button>
                    </div>
                  </div>
                   <div class="table-container">
                     <table class="table">
                       <thead><tr><th onclick="sortIngredients('name')" style="cursor:pointer;">Nama <span id="sort-name"></span></th><th>Satuan</th><th onclick="sortIngredients('stock')" style="cursor:pointer;">Stok <span id="sort-stock"></span></th><th onclick="sortIngredients('min')" style="cursor:pointer;">Min Stok <span id="sort-min"></span></th><th onclick="sortIngredients('cost')" style="cursor:pointer;">Harga/Satuan <span id="sort-cost"></span></th><th>Status</th><th>Aksi</th></tr></thead>
                      <tbody id="ingredients-body">
                        ${ingredients.map((i: any) => {
                         const stock = Number(i.currentStock);
                         const min = Number(i.minStock);
                         let statusClass, statusLabel;
                         if (stock <= 0) {
                           statusClass = 'badge-error';
                           statusLabel = 'Habis';
                         } else if (stock < min) {
                           statusClass = 'badge-warning';
                           statusLabel = 'Rendah';
                         } else {
                           statusClass = 'badge-success';
                           statusLabel = 'OK';
                         }
                           return `<tr data-name="${i.name.toLowerCase()}" data-stock="${stock}" data-min="${min}" data-cost="${i.costPerUnit || 0}">
                            <td><strong>${i.name}</strong></td>
                            <td>${i.unit}</td>
                            <td>${stock.toFixed(2)}</td>
                            <td>${min.toFixed(2)}</td>
                            <td>Rp ${(i.costPerUnit || 0).toLocaleString('id-ID')}</td>
                            <td><span class="badge ${statusClass}">${statusLabel}</span></td>
                            <td>
                              <button onclick="showEditIngredientModal(${i.id}, '${i.name.replace(/'/g, "\\'")}', '${i.unit}', ${stock}, ${min}, ${i.costPerUnit || 0})" class="btn btn-secondary btn-sm">Edit</button>
                              <button onclick="showStockAdjustModal(${i.id}, '${i.name.replace(/'/g, "\\'")}', ${stock})" class="btn btn-warning btn-sm">Stok</button>
                            </td>
                          </tr>`;
                        }).join('')}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div class="tab-content" id="tab-recipes">
                <div class="card">
                  <div class="menu-toolbar">
                    <div class="menu-toolbar-left">
                      <select id="recipe-menu-select" class="menu-filter-select" onchange="loadRecipe()">
                        <option value="">— Pilih Menu —</option>
                        ${menus.map((m: any) => `<option value="${m.id}">${m.name}</option>`).join('')}
                      </select>
                    </div>
                    <div class="menu-toolbar-right">
                      <button class="btn btn-primary" onclick="showAddRecipeModal()" id="btn-add-recipe" style="display: none;">+ Tambah Bahan</button>
                    </div>
                  </div>
                  <div id="recipe-content">
                    <p class="text-muted text-center" style="padding: 40px;">Pilih menu untuk melihat resep</p>
                  </div>
                </div>
              </div>

              <div class="tab-content" id="tab-movements">
                <div class="card">
                  <div class="menu-toolbar">
                    <div class="menu-toolbar-left">
                      <input type="text" id="mov-search" class="menu-search-input" placeholder="Cari..." oninput="filterMovements()">
                      <select id="mov-filter-type" class="menu-filter-select" onchange="filterMovements()">
                        <option value="all">Semua Tipe</option>
                        <option value="in">📥 Masuk</option>
                        <option value="out">📤 Keluar</option>
                        <option value="adjustment">🔄 Adjustment</option>
                        <option value="waste">🗑️ Waste</option>
                      </select>
                    </div>
                    <div class="menu-toolbar-right"></div>
                  </div>
                   <div class="table-container">
                     <table class="table">
                        <thead><tr><th onclick="sortMovements('date')" style="cursor:pointer;">Tanggal <span id="sort-date"></span></th><th>Bahan</th><th onclick="sortMovements('type')" style="cursor:pointer;">Tipe <span id="sort-type"></span></th><th onclick="sortMovements('quantity')" style="cursor:pointer;">Jumlah <span id="sort-quantity"></span></th><th onclick="sortMovements('reference_id')" style="cursor:pointer;">ID Pesanan <span id="sort-reference_id"></span></th></tr></thead>
                       <tbody id="movements-body">
                        ${movements.map((m: any) => {
                          const typeIcons: Record<string, string> = { in: '📥', out: '📤', adjustment: '🔄', waste: '🗑️' };
                          const typeColors: Record<string, string> = { in: 'badge-success', out: 'badge-primary', adjustment: 'badge-warning', waste: 'badge-error' };
                          const orderId = m.referenceId ? `#${m.referenceId}` : '-';
                           return `<tr data-type="${m.type}" data-reason="${(m.reason || '').toLowerCase()}" data-reference-id="${m.referenceId || ''}" data-date="${m.createdAt || ''}" data-quantity="${Number(m.quantity)}">
                               <td>${m.createdAt ? (m.createdAt instanceof Date ? m.createdAt : new Date(m.createdAt)).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                            <td>${m.ingredientName || '-'}</td>
                            <td><span class="badge ${typeColors[m.type] || ''}">${typeIcons[m.type] || ''} ${m.type}</span></td>
                            <td style="color: ${m.type === 'in' ? 'var(--color-success)' : 'var(--color-error)'};">${m.type === 'in' ? '+' : '-'}${Number(m.quantity).toFixed(2)} ${m.ingredientUnit || ''}</td>
                            <td>${m.referenceId ? `<button onclick="showOrderDetail(${m.referenceId})" class="btn btn-secondary btn-sm" style="cursor:pointer;">${orderId}</button>` : '<span style="color: var(--color-text-secondary);">-</span>'}</td>
                          </tr>`;
                        }).join('')}
                    </tbody>
                   </table>
                 </div>
                 ${movements.length === 0 ? '<p class="text-muted text-center" style="padding: 40px;">Belum ada riwayat stok</p>' : ''}
                 <div class="pagination" id="movements-pagination"></div>
               </div>
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
             <button onclick="closeOrderDetail()" class="btn btn-primary">Tutup</button>
           </div>
         </div>
       </div>

       <div class="modal" id="add-ingredient-modal">
        <div class="modal-backdrop" onclick="closeAddIngredientModal()"></div>
        <div class="modal-content">
          <div class="modal-header"><h3>Tambah Bahan Baku</h3><button class="modal-close" onclick="closeAddIngredientModal()">&times;</button></div>
          <div class="modal-body">
            <div class="form-group"><label>Nama</label><input type="text" id="ing-name" class="input" placeholder="Beras"></div>
            <div class="form-group"><label>Satuan</label><select id="ing-unit" class="input">${UNIT_OPTIONS.map(u => `<option value="${u}">${u}</option>`).join('')}</select></div>
            <div class="form-group"><label>Stok Awal</label><input type="number" id="ing-stock" class="input" value="0" step="0.01"></div>
            <div class="form-group"><label>Minimum Stok</label><input type="number" id="ing-min-stock" class="input" value="0" step="0.01"></div>
            <div class="form-group"><label>Harga Beli per Satuan</label><input type="number" id="ing-cost" class="input" value="0"></div>
          </div>
          <div class="modal-footer"><button onclick="closeAddIngredientModal()" class="btn btn-secondary">Batal</button><button onclick="saveIngredient()" class="btn btn-primary">Simpan</button></div>
        </div>
      </div>

      <div class="modal" id="edit-ingredient-modal">
        <div class="modal-backdrop" onclick="closeEditIngredientModal()"></div>
        <div class="modal-content">
          <div class="modal-header"><h3>Edit Bahan Baku</h3><button class="modal-close" onclick="closeEditIngredientModal()">&times;</button></div>
          <div class="modal-body">
            <input type="hidden" id="edit-ing-id">
            <div class="form-group"><label>Nama</label><input type="text" id="edit-ing-name" class="input"></div>
            <div class="form-group"><label>Satuan</label><select id="edit-ing-unit" class="input">${UNIT_OPTIONS.map(u => `<option value="${u}">${u}</option>`).join('')}</select></div>
            <div class="form-group"><label>Stok</label><input type="number" id="edit-ing-stock" class="input" step="0.01"></div>
            <div class="form-group"><label>Minimum Stok</label><input type="number" id="edit-ing-min-stock" class="input" step="0.01"></div>
            <div class="form-group"><label>Harga Beli per Satuan</label><input type="number" id="edit-ing-cost" class="input"></div>
          </div>
          <div class="modal-footer"><button onclick="closeEditIngredientModal()" class="btn btn-secondary">Batal</button><button onclick="saveEditIngredient()" class="btn btn-primary">Simpan</button></div>
        </div>
      </div>

      <div class="modal" id="stock-adjust-modal">
        <div class="modal-backdrop" onclick="closeStockAdjustModal()"></div>
        <div class="modal-content" style="max-width: 400px;">
          <div class="modal-header"><h3>Adjust Stok</h3><button class="modal-close" onclick="closeStockAdjustModal()">&times;</button></div>
          <div class="modal-body">
            <input type="hidden" id="adj-ing-id">
            <p style="margin-bottom: 16px;">Stok <strong id="adj-ing-name"></strong> saat ini: <strong id="adj-ing-stock"></strong></p>
            <div class="form-group"><label>Tipe</label><select id="adj-type" class="input"><option value="in">📥 Stok Masuk</option><option value="out">📤 Stok Keluar</option><option value="adjustment">🔄 Adjustment</option><option value="waste">🗑️ Waste</option></select></div>
            <div class="form-group"><label>Jumlah</label><input type="number" id="adj-quantity" class="input" step="0.01" min="0"></div>
            <div class="form-group"><label>Keterangan</label><input type="text" id="adj-reason" class="input" placeholder="Alasan..."></div>
          </div>
          <div class="modal-footer"><button onclick="closeStockAdjustModal()" class="btn btn-secondary">Batal</button><button onclick="submitStockAdjust()" class="btn btn-primary">Simpan</button></div>
        </div>
      </div>

      <div class="modal" id="add-recipe-modal">
        <div class="modal-backdrop" onclick="closeAddRecipeModal()"></div>
        <div class="modal-content">
          <div class="modal-header"><h3>Tambah Bahan ke Resep</h3><button class="modal-close" onclick="closeAddRecipeModal()">&times;</button></div>
          <div class="modal-body">
            <input type="hidden" id="recipe-menu-id">
            <div class="form-group"><label>Bahan Baku</label><select id="recipe-ingredient" class="input"></select></div>
            <div class="form-group"><label>Jumlah</label><input type="number" id="recipe-quantity" class="input" step="0.01" min="0"></div>
          </div>
          <div class="modal-footer"><button onclick="closeAddRecipeModal()" class="btn btn-secondary">Batal</button><button onclick="saveRecipeItem()" class="btn btn-primary">Simpan</button></div>
        </div>
      </div>

      <style>
        .tab-content { padding: 0; }
        .tab-content .menu-toolbar { margin-bottom: 16px; padding: 0 16px; }
        .tab-content .table-container { padding: 0 16px 16px; }
        .tab-nav { display: flex; gap: 4px; margin-bottom: 24px; background: var(--color-bg); border-radius: var(--radius-md); padding: 4px; border: 1px solid var(--color-border); }
        .tab-btn { flex: 1; padding: 12px 24px; border: none; background: transparent; cursor: pointer; border-radius: var(--radius-sm); font-size: 14px; font-weight: 500; color: var(--color-text-secondary); transition: var(--transition); }
        .tab-btn:hover { background: var(--color-bg-alt); color: var(--color-text); }
        .tab-btn.active { background: var(--color-primary); color: white; }
        .tab-content { display: none; }
        .tab-content.active { display: block; }
        .inv-container { max-width: 1400px; }
        .reports-container { max-width: 1400px; }
        .menu-toolbar { display: flex; justify-content: space-between; align-items: center; width: 100%; flex-wrap: wrap; gap: 8px; }
        .menu-toolbar-left { display: flex; gap: 8px; flex: 1; flex-wrap: wrap; }
        .menu-toolbar-right { display: flex; gap: 8px; }
        .menu-search-input { padding: 6px 12px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: 13px; min-width: 200px; }
         .menu-filter-select { padding: 6px 12px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: 13px; background: var(--color-bg); }
         .btn-sm { padding: 4px 8px; font-size: 11px; }
         .btn-warning { background: var(--color-warning); color: white; border: none; border-radius: var(--radius-md); cursor: pointer; font-weight: 500; }
         .text-muted { color: var(--color-text-secondary); }
         .text-center { text-align: center; }
         .pagination { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-top: 1px solid var(--color-border); }
         .pagination-info { font-size: 13px; color: var(--color-text-secondary); }
         .pagination-buttons { display: flex; gap: 4px; }
         .pagination-btn { padding: 4px 10px; border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-bg); cursor: pointer; font-size: 12px; }
         .pagination-btn:hover { background: var(--color-bg-hover); }
         .pagination-btn.active { background: var(--color-primary); color: white; border-color: var(--color-primary); }
         .pagination-btn:disabled { opacity: 0.5; cursor: not-allowed; }
         .detail-items-table { width: 100%; border-collapse: collapse; margin: 12px 0; }
         .detail-items-table th, .detail-items-table td { padding: 6px 8px; text-align: left; border-bottom: 1px solid var(--color-border); font-size: 13px; }
         .detail-items-table th { font-weight: 600; background: var(--color-bg-alt); }
      </style>
       <script>
         let sortField = 'name';
         let sortDir = 'asc';

         let movementCurrentPage = 1;
         const movementItemsPerPage = 15;

         function showInvTab(tab, btn) {
           document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
           document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
           document.getElementById('tab-' + tab).classList.add('active');
           btn.classList.add('active');
         }

          function sortIngredients(field) {
            if (sortField === field) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
            else { sortField = field; sortDir = 'asc'; }
            document.querySelectorAll('[id^="sort-"]').forEach(el => el.textContent = '');
            const el = document.getElementById('sort-' + field);
            if (el) el.textContent = sortDir === 'asc' ? '↑' : '↓';
            const tbody = document.getElementById('ingredients-body');
            const rows = Array.from(tbody.querySelectorAll('tr'));
            rows.sort((a, b) => {
              let aVal, bVal;
              if (field === 'name') { aVal = a.dataset.name; bVal = b.dataset.name; }
              else if (field === 'stock') { aVal = parseFloat(a.dataset.stock); bVal = parseFloat(b.dataset.stock); }
              else if (field === 'min') { aVal = parseFloat(a.dataset.min); bVal = parseFloat(b.dataset.min); }
              else if (field === 'cost') { aVal = parseFloat(a.dataset.cost); bVal = parseFloat(b.dataset.cost); }
              else return 0;
              if (typeof aVal === 'string') return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
              return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
            });
            rows.forEach(r => tbody.appendChild(r));
          }

          let movementSortField = 'date';
          let movementSortDir = 'desc';

           function sortMovements(field) {
             if (movementSortField === field) movementSortDir = movementSortDir === 'asc' ? 'desc' : 'asc';
             else { movementSortField = field; movementSortDir = field === 'date' ? 'desc' : 'asc'; }
             document.querySelectorAll('[id^="sort-"]').forEach(el => el.textContent = '');
             const el = document.getElementById('sort-' + field);
             if (el) el.textContent = movementSortDir === 'asc' ? '↑' : '↓';
             const tbody = document.getElementById('movements-body');
             const rows = Array.from(tbody.querySelectorAll('tr'));
             rows.sort((a, b) => {
               let aVal, bVal;
               if (field === 'date') { aVal = new Date(a.dataset.date).getTime(); bVal = new Date(b.dataset.date).getTime(); }
               else if (field === 'type') { aVal = a.dataset.type; bVal = b.dataset.type; }
               else if (field === 'quantity') { aVal = parseFloat(a.dataset.quantity); bVal = parseFloat(b.dataset.quantity); }
               else if (field === 'reference_id') { aVal = parseInt(a.dataset.referenceId) || 0; bVal = parseInt(b.dataset.referenceId) || 0; }
               else return 0;
               if (typeof aVal === 'string') return movementSortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
               return movementSortDir === 'asc' ? aVal - bVal : bVal - aVal;
             });
             rows.forEach(r => tbody.appendChild(r));
             movementCurrentPage = 1;
             renderMovementPagination();
           }

         function filterIngredients() {
          const search = document.getElementById('inv-search').value.toLowerCase();
          const stockFilter = document.getElementById('inv-filter-stock').value;
          document.querySelectorAll('#ingredients-body tr').forEach(row => {
            const name = row.dataset.name || '';
            const stock = parseFloat(row.dataset.stock) || 0;
            const min = parseFloat(row.dataset.min) || 0;
            const matchesSearch = !search || name.includes(search);
            let matchesStock = true;
            if (stockFilter === 'low') matchesStock = stock > 0 && stock < min;
            else if (stockFilter === 'out') matchesStock = stock === 0;
            row.style.display = (matchesSearch && matchesStock) ? '' : 'none';
          });
        }

         function filterMovements() {
           const search = document.getElementById('mov-search').value.toLowerCase();
           const typeFilter = document.getElementById('mov-filter-type').value;
           document.querySelectorAll('#movements-body tr').forEach(row => {
             const type = row.dataset.type || '';
             const reason = row.dataset.reason || '';
             const matchesSearch = !search || reason.includes(search);
             const matchesType = typeFilter === 'all' || type === typeFilter;
             row.style.display = (matchesSearch && matchesType) ? '' : 'none';
           });
           movementCurrentPage = 1;
           renderMovementPagination();
         }

        function showAddIngredientModal() {
          document.getElementById('ing-name').value = '';
          document.getElementById('ing-stock').value = '0';
          document.getElementById('ing-min-stock').value = '0';
          document.getElementById('ing-cost').value = '0';
          document.getElementById('add-ingredient-modal').classList.add('show');
        }
        function closeAddIngredientModal() { document.getElementById('add-ingredient-modal').classList.remove('show'); }

        async function saveIngredient() {
          const name = document.getElementById('ing-name').value.trim();
          const unit = document.getElementById('ing-unit').value;
          const currentStock = parseFloat(document.getElementById('ing-stock').value) || 0;
          const minStock = parseFloat(document.getElementById('ing-min-stock').value) || 0;
          const costPerUnit = parseInt(document.getElementById('ing-cost').value) || 0;
          if (!name) { showToast('Nama bahan wajib diisi', 'warning'); return; }
          const res = await fetch('/api/inventory/ingredients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, unit, currentStock, minStock, costPerUnit }) });
          const data = await res.json();
          if (data.error) { showToast(data.error, 'error'); return; }
          closeAddIngredientModal(); showToast('Bahan berhasil ditambahkan'); location.reload();
        }

        function showEditIngredientModal(id, name, unit, stock, minStock, cost) {
          document.getElementById('edit-ing-id').value = id;
          document.getElementById('edit-ing-name').value = name;
          document.getElementById('edit-ing-unit').value = unit;
          document.getElementById('edit-ing-stock').value = stock;
          document.getElementById('edit-ing-min-stock').value = minStock;
          document.getElementById('edit-ing-cost').value = cost;
          document.getElementById('edit-ingredient-modal').classList.add('show');
        }
        function closeEditIngredientModal() { document.getElementById('edit-ingredient-modal').classList.remove('show'); }

        async function saveEditIngredient() {
          const id = document.getElementById('edit-ing-id').value;
          const name = document.getElementById('edit-ing-name').value.trim();
          const unit = document.getElementById('edit-ing-unit').value;
          const currentStock = parseFloat(document.getElementById('edit-ing-stock').value) || 0;
          const minStock = parseFloat(document.getElementById('edit-ing-min-stock').value) || 0;
          const costPerUnit = parseInt(document.getElementById('edit-ing-cost').value) || 0;
          if (!name) { showToast('Nama bahan wajib diisi', 'warning'); return; }
          const res = await fetch('/api/inventory/ingredients/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, unit, currentStock, minStock, costPerUnit }) });
          const data = await res.json();
          if (data.error) { showToast(data.error, 'error'); return; }
          closeEditIngredientModal(); showToast('Bahan berhasil diupdate'); location.reload();
        }

        function showStockAdjustModal(id, name, stock) {
          document.getElementById('adj-ing-id').value = id;
          document.getElementById('adj-ing-name').textContent = name;
          document.getElementById('adj-ing-stock').textContent = stock.toFixed(2);
          document.getElementById('adj-quantity').value = '';
          document.getElementById('adj-reason').value = '';
          document.getElementById('stock-adjust-modal').classList.add('show');
        }
        function closeStockAdjustModal() { document.getElementById('stock-adjust-modal').classList.remove('show'); }

async function submitStockAdjust() {
  const ingredientId = parseInt(document.getElementById('adj-ing-id').value);
  const type = document.getElementById('adj-type').value;
  const quantity = parseFloat(document.getElementById('adj-quantity').value) || 0;
  const reason = document.getElementById('adj-reason').value.trim();
  if (quantity <= 0) { showToast('Jumlah harus lebih dari 0', 'warning'); return; }
  if (!ingredientId) { showToast('Bahan tidak valid', 'error'); return; }
  const res = await fetch('/api/inventory/stock-movements', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ingredientId, type, quantity, reason }) });
  const data = await res.json();
  if (data.error) { showToast(data.error, 'error'); return; }
  closeStockAdjustModal();
  showToast('Stok berhasil diadjust');
  setTimeout(function() { location.reload(); }, 2000);
}

        async function loadRecipe() {
          const menuId = document.getElementById('recipe-menu-select').value;
          document.getElementById('btn-add-recipe').style.display = menuId ? 'inline' : 'none';
          document.getElementById('recipe-menu-id').value = menuId;
          if (!menuId) { document.getElementById('recipe-content').innerHTML = '<p class="text-muted text-center" style="padding: 40px;">Pilih menu untuk melihat resep</p>'; return; }
          const res = await fetch('/api/inventory/recipes/menu/' + menuId);
          const items = await res.json();
          if (items.length === 0) { document.getElementById('recipe-content').innerHTML = '<p class="text-muted text-center" style="padding: 40px;">Belum ada resep untuk menu ini</p>'; return; }
          let totalCost = 0;
          let html = '<div class="table-container"><table class="table"><thead><tr><th>Bahan</th><th>Jumlah</th><th>Satuan</th><th>Stok Tersisa</th><th>Cost</th><th>Aksi</th></tr></thead><tbody>';
          items.forEach(item => {
            const cost = Number(item.quantity) * Number(item.costPerUnit || 0);
            totalCost += cost;
            html += '<tr><td>' + (item.ingredientName || '-') + '</td><td>' + Number(item.quantity).toFixed(2) + '</td><td>' + (item.ingredientUnit || '-') + '</td><td>' + Number(item.currentStock || 0).toFixed(2) + '</td><td>Rp ' + Math.round(cost).toLocaleString('id-ID') + '</td><td><button onclick="deleteRecipeItem(' + item.id + ')" class="btn btn-danger btn-sm">Hapus</button></td></tr>';
          });
          html += '</tbody></table></div>';
          html += '<div style="padding: 16px; font-weight: 600;">Total Cost per porsi: Rp ' + Math.round(totalCost).toLocaleString('id-ID') + '</div>';
          document.getElementById('recipe-content').innerHTML = html;
        }

        function showAddRecipeModal() {
          const menuId = document.getElementById('recipe-menu-id').value;
          document.getElementById('recipe-menu-id').value = menuId;
          fetch('/api/inventory/ingredients').then(r => r.json()).then(items => {
            document.getElementById('recipe-ingredient').innerHTML = items.map(i => '<option value="' + i.id + '">' + i.name + ' (' + i.unit + ')</option>').join('');
          });
          document.getElementById('recipe-quantity').value = '';
          document.getElementById('add-recipe-modal').classList.add('show');
        }
        function closeAddRecipeModal() { document.getElementById('add-recipe-modal').classList.remove('show'); }

        async function saveRecipeItem() {
          const menuId = parseInt(document.getElementById('recipe-menu-id').value);
          const ingredientId = parseInt(document.getElementById('recipe-ingredient').value);
          const quantity = parseFloat(document.getElementById('recipe-quantity').value) || 0;
          if (!menuId || !ingredientId || quantity <= 0) { showToast('Semua field wajib diisi', 'warning'); return; }
          const res = await fetch('/api/inventory/recipes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ menuId, ingredientId, quantity }) });
          const data = await res.json();
          if (data.error) { showToast(data.error, 'error'); return; }
          closeAddRecipeModal(); showToast('Bahan berhasil ditambahkan ke resep'); loadRecipe();
        }

         async function deleteRecipeItem(id) {
           if (!confirm('Hapus bahan dari resep?')) return;
           await fetch('/api/inventory/recipes/' + id, { method: 'DELETE' });
           showToast('Bahan dihapus dari resep'); loadRecipe();
         }

         async function showOrderDetail(orderId) {
           const res = await fetch('/api/orders/' + orderId);
           const data = await res.json();
           if (data.error) { showToast('Gagal memuat detail pesanan', 'error'); return; }
           const order = data.order;
           const items = data.items || [];
           document.getElementById('detail-order-id').textContent = order.id;
           let html = '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px;">';
           html += '<div><strong>Meja:</strong> ' + (data.table?.tableNumber || '-') + '</div>';
           html += '<div><strong>Tanggal:</strong> ' + new Date(order.createdAt).toLocaleString('id-ID') + '</div>';
           html += '<div><strong>Status:</strong> ' + (order.status === 'active' ? 'Aktif' : order.status === 'completed' ? 'Selesai' : 'Dibatal') + '</div>';
           html += '<div><strong>Total:</strong> Rp ' + (order.total || 0).toLocaleString('id-ID') + '</div>';
           html += '</div>';
           if (items.length > 0) {
             html += '<table class="detail-items-table"><thead><tr><th>Item</th><th>Qty</th><th>Harga</th><th>Total</th></tr></thead><tbody>';
             items.forEach(item => {
               html += '<tr><td>' + (item.menuName || 'Item') + '</td><td>' + item.quantity + '</td><td>Rp ' + (item.priceAtOrder || 0).toLocaleString('id-ID') + '</td><td>Rp ' + ((item.priceAtOrder || 0) * item.quantity).toLocaleString('id-ID') + '</td></tr>';
             });
             html += '</tbody></table>';
           }
           document.getElementById('order-detail-body').innerHTML = html;
           document.getElementById('order-detail-modal').classList.add('show');
         }

         function closeOrderDetail() { document.getElementById('order-detail-modal').classList.remove('show'); }

         function renderMovementPagination() {
           const rows = Array.from(document.querySelectorAll('#movements-body tr'));
           const visibleRows = rows.filter(r => r.style.display !== 'none');
           const totalPages = Math.ceil(visibleRows.length / movementItemsPerPage) || 1;
           if (movementCurrentPage > totalPages) movementCurrentPage = totalPages;
           rows.forEach(r => {
             const idx = visibleRows.indexOf(r);
             const page = Math.floor(idx / movementItemsPerPage) + 1;
             r.style.display = (r.style.display !== 'none' && page === movementCurrentPage) ? '' : 'none';
           });
           const pagDiv = document.getElementById('movements-pagination');
           if (!pagDiv || totalPages <= 1) { if (pagDiv) pagDiv.innerHTML = ''; return; }
           const start = (movementCurrentPage - 1) * movementItemsPerPage + 1;
           const end = Math.min(movementCurrentPage * movementItemsPerPage, visibleRows.length);
           let html = '<div class="pagination-info">Menampilkan ' + start + '-' + end + ' dari ' + visibleRows.length + '</div>';
           html += '<div class="pagination-buttons">';
           html += '<button class="pagination-btn" onclick="goToMovementPage(' + (movementCurrentPage - 1) + ')" ' + (movementCurrentPage <= 1 ? 'disabled' : '') + '>← Prev</button>';
           for (let p = 1; p <= totalPages; p++) html += '<button class="pagination-btn ' + (p === movementCurrentPage ? 'active' : '') + '" onclick="goToMovementPage(' + p + ')">' + p + '</button>';
           html += '<button class="pagination-btn" onclick="goToMovementPage(' + (movementCurrentPage + 1) + ')" ' + (movementCurrentPage >= totalPages ? 'disabled' : '') + '>Next →</button>';
           html += '</div>';
           pagDiv.innerHTML = html;
         }

          function goToMovementPage(page) { movementCurrentPage = page; renderMovementPagination(); }

          document.addEventListener('DOMContentLoaded', function() { renderMovementPagination(); });
       </script>
       ${getCommonScripts()}
    `);
  });
