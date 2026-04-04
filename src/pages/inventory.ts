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

    const lowStockCount = ingredients.filter((i: any) => Number(i.currentStock) < Number(i.minStock)).length;

    return htmlResponse(`
      <div class="app-layout">
        ${getSidebarHtml('inventory', user)}
        <div class="app-content">
          ${getNavbarHtml('Inventory', 'inventory', user)}
          <main class="app-main">
            <div class="card">
              <div class="card-header">
                <div class="inv-tabs">
                  <button class="inv-tab active" onclick="showInvTab('ingredients', this)">📦 Bahan Baku${lowStockCount > 0 ? ' <span class="badge badge-error" style="font-size:10px;">' + lowStockCount + '</span>' : ''}</button>
                  <button class="inv-tab" onclick="showInvTab('recipes', this)">📋 Resep</button>
                  <button class="inv-tab" onclick="showInvTab('movements', this)">📊 Riwayat Stok</button>
                </div>
              </div>

              <div class="inv-tab-content" id="tab-ingredients">
                <div class="inv-toolbar">
                  <input type="text" id="inv-search" class="inv-search-input" placeholder="🔍 Cari bahan..." oninput="filterIngredients()">
                  <select id="inv-filter-stock" class="inv-filter-select" onchange="filterIngredients()">
                    <option value="all">Semua</option>
                    <option value="low">Stok Rendah</option>
                    <option value="out">Stok Habis</option>
                  </select>
                  <button class="btn btn-primary" onclick="showAddIngredientModal()">+ Tambah Bahan</button>
                </div>
                <div class="table-container">
                  <table class="table">
                    <thead><tr><th>Nama</th><th>Satuan</th><th>Stok</th><th>Min Stok</th><th>Harga/Satuan</th><th>Status</th><th>Aksi</th></tr></thead>
                    <tbody id="ingredients-body">
                      ${ingredients.map((i: any) => {
                        const stock = Number(i.currentStock);
                        const min = Number(i.minStock);
                        const statusClass = stock === 0 ? 'badge-error' : stock < min ? 'badge-warning' : 'badge-success';
                        const statusLabel = stock === 0 ? 'Habis' : stock < min ? 'Rendah' : 'OK';
                        return `<tr data-name="${i.name.toLowerCase()}" data-stock="${stock}" data-min="${min}">
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

              <div class="inv-tab-content" id="tab-recipes" style="display: none;">
                <div class="inv-toolbar">
                  <select id="recipe-menu-select" class="inv-filter-select" onchange="loadRecipe()">
                    <option value="">— Pilih Menu —</option>
                    ${menus.map((m: any) => `<option value="${m.id}">${m.name}</option>`).join('')}
                  </select>
                  <button class="btn btn-primary" onclick="showAddRecipeModal()" id="btn-add-recipe" style="display: none;">+ Tambah Bahan</button>
                </div>
                <div id="recipe-content">
                  <p class="text-muted text-center" style="padding: 40px;">Pilih menu untuk melihat resep</p>
                </div>
              </div>

              <div class="inv-tab-content" id="tab-movements" style="display: none;">
                <div class="inv-toolbar">
                  <input type="text" id="mov-search" class="inv-search-input" placeholder="🔍 Cari..." oninput="filterMovements()">
                  <select id="mov-filter-type" class="inv-filter-select" onchange="filterMovements()">
                    <option value="all">Semua Tipe</option>
                    <option value="in">📥 Masuk</option>
                    <option value="out">📤 Keluar</option>
                    <option value="adjustment">🔄 Adjustment</option>
                    <option value="waste">🗑️ Waste</option>
                  </select>
                </div>
                <div class="table-container">
                  <table class="table">
                    <thead><tr><th>Tanggal</th><th>Bahan</th><th>Tipe</th><th>Jumlah</th><th>Keterangan</th></tr></thead>
                    <tbody id="movements-body">
                      ${movements.map((m: any) => {
                        const typeIcons: Record<string, string> = { in: '📥', out: '📤', adjustment: '🔄', waste: '🗑️' };
                        const typeColors: Record<string, string> = { in: 'badge-success', out: 'badge-primary', adjustment: 'badge-warning', waste: 'badge-error' };
                        return `<tr data-type="${m.type}" data-reason="${(m.reason || '').toLowerCase()}">
                          <td>${m.createdAt ? new Date(m.createdAt).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                          <td>${m.ingredientName || '-'}</td>
                          <td><span class="badge ${typeColors[m.type] || ''}">${typeIcons[m.type] || ''} ${m.type}</span></td>
                          <td style="color: ${m.type === 'in' ? 'var(--color-success)' : 'var(--color-error)'};">${m.type === 'in' ? '+' : '-'}${Number(m.quantity).toFixed(2)} ${m.ingredientUnit || ''}</td>
                          <td style="color: var(--color-text-secondary); font-size: 13px;">${m.reason || '-'}</td>
                        </tr>`;
                      }).join('')}
                    </tbody>
                  </table>
                </div>
                ${movements.length === 0 ? '<p class="text-muted text-center" style="padding: 40px;">Belum ada riwayat stok</p>' : ''}
              </div>
            </div>
          </main>
          ${getFooterHtml()}
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
        .inv-tabs { display: flex; gap: 4px; }
        .inv-tab { padding: 8px 16px; border: 1px solid var(--color-border); border-radius: var(--radius-md) var(--radius-md) 0 0; background: var(--color-bg); cursor: pointer; font-size: 13px; font-weight: 500; transition: var(--transition); }
        .inv-tab:hover { background: var(--color-bg-hover); }
        .inv-tab.active { background: var(--color-primary); color: white; border-color: var(--color-primary); }
        .inv-toolbar { display: flex; gap: 8px; padding: 16px; border-bottom: 1px solid var(--color-border); align-items: center; flex-wrap: wrap; }
        .inv-search-input { padding: 6px 12px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: 13px; flex: 1; min-width: 180px; }
        .inv-filter-select { padding: 6px 12px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: 13px; background: var(--color-bg); }
        .btn-sm { padding: 4px 8px; font-size: 11px; }
        .btn-warning { background: var(--color-warning); color: white; border: none; border-radius: var(--radius-md); cursor: pointer; font-weight: 500; }
        .text-muted { color: var(--color-text-secondary); }
        .text-center { text-align: center; }
      </style>
      <script>
        function showInvTab(tab, btn) {
          document.querySelectorAll('.inv-tab-content').forEach(c => c.style.display = 'none');
          document.querySelectorAll('.inv-tab').forEach(t => t.classList.remove('active'));
          document.getElementById('tab-' + tab).style.display = 'block';
          btn.classList.add('active');
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
          const ingredientId = document.getElementById('adj-ing-id').value;
          const type = document.getElementById('adj-type').value;
          const quantity = parseFloat(document.getElementById('adj-quantity').value) || 0;
          const reason = document.getElementById('adj-reason').value.trim();
          if (quantity <= 0) { showToast('Jumlah harus lebih dari 0', 'warning'); return; }
          const res = await fetch('/api/inventory/stock-movements', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ingredientId, type, quantity, reason }) });
          const data = await res.json();
          if (data.error) { showToast(data.error, 'error'); return; }
          closeStockAdjustModal(); showToast('Stok berhasil diadjust'); location.reload();
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
      </script>
      ${getCommonScripts()}
    `);
  });
