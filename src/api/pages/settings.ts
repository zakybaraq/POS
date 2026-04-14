import { Elysia } from 'elysia';
import { htmlResponse } from '../templates/html';
import { getSidebarHtml } from '../templates/sidebar';
import { getNavbarHtml } from '../templates/navbar';
import { getFooterHtml } from '../templates/footer';
import { getCommonScripts } from '../templates/common-scripts';
import { getTokenFromCookies, verifyToken, redirectToLogin } from '../utils/auth';

export const settingsPage = new Elysia()
  .get('/settings', async ({ cookie, headers }) => {
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

    return htmlResponse(`
      <div class="app-layout">
        ${getSidebarHtml('settings', user)}
        <div class="app-content">
          ${getNavbarHtml('Pengaturan', 'settings', user)}
          <main class="app-main">
            <div class="settings-container">
              <div class="tab-nav">
                <button class="tab-btn active" data-tab="business">Info Bisnis</button>
                <button class="tab-btn" data-tab="tax">Pajak</button>
                <button class="tab-btn" data-tab="payments">Metode Pembayaran</button>
                <button class="tab-btn" data-tab="receipt">Template Struk</button>
                <button class="tab-btn" data-tab="hours">Jam Operasional</button>
              </div>

              <div class="tab-content active" id="tab-business">
                <div class="card">
                  <div class="card-header"><h3 class="card-title">Informasi Bisnis</h3></div>
                  <div style="padding: 24px;">
                    <form id="business-form" class="form-grid">
                      <div class="form-group"><label class="form-label">Nama Restoran</label><input type="text" name="businessName" id="biz-name" class="input" placeholder="Nama restoran Anda"></div>
                      <div class="form-group"><label class="form-label">Tagline</label><input type="text" name="businessTagline" id="biz-tagline" class="input" placeholder="Tagline restoran"></div>
                      <div class="form-group" style="grid-column: span 2;"><label class="form-label">Alamat</label><textarea name="address" id="biz-address" class="input" rows="2" placeholder="Alamat lengkap"></textarea></div>
                      <div class="form-group"><label class="form-label">Telepon</label><input type="text" name="phone" id="biz-phone" class="input" placeholder="021-12345678"></div>
                      <div class="form-group"><label class="form-label">Email</label><input type="email" name="email" id="biz-email" class="input" placeholder="info@resto.com"></div>
                      <div class="form-group"><label class="form-label">Mata Uang</label><select name="currency" id="biz-currency" class="input"><option value="IDR" selected>IDR - Rupiah</option><option value="USD">USD - US Dollar</option></select></div>
                      <div class="form-group"><label class="form-label">Timezone</label><select name="timezone" id="biz-timezone" class="input"><option value="Asia/Jakarta" selected>Asia/Jakarta (WIB)</option><option value="Asia/Makassar">Asia/Makassar (WITA)</option><option value="Asia/Jayapura">Asia/Jayapura (WIT)</option></select></div>
                      <div class="form-group" style="grid-column: span 2;"><button type="submit" class="btn btn-primary">Simpan Perubahan</button></div>
                    </form>
                  </div>
                </div>
              </div>

              <div class="tab-content" id="tab-tax">
                <div class="card">
                  <div class="card-header"><h3 class="card-title">Pengaturan Pajak</h3></div>
                  <div style="padding: 24px;">
                    <form id="tax-form" class="form-grid">
                      <div class="form-group" style="grid-column: span 2;">
                        <label class="form-label" style="display: flex; align-items: center; gap: 8px;">
                          <input type="checkbox" name="isTaxEnabled" id="tax-enabled" style="width: 18px; height: 18px;"> Aktifkan Pajak
                        </label>
                      </div>
                      <div class="form-group"><label class="form-label">Nama Pajak</label><input type="text" name="taxName" id="tax-name" class="input" placeholder="PPN"></div>
                      <div class="form-group"><label class="form-label">Tipe Pajak</label><select name="taxType" id="tax-type" class="input"><option value="exclusive">Exclusive</option><option value="inclusive">Inclusive</option></select></div>
                      <div class="form-group"><label class="form-label">Persentase (%)</label><input type="number" name="taxPercentage" id="tax-percent" class="input" step="0.01" min="0" max="100" placeholder="10.00"></div>
                      <div class="form-group" style="grid-column: span 2;">
                        <div class="tax-preview" id="tax-preview">
                          <h4>Preview Perhitungan</h4>
                          <div>Subtotal: <strong>Rp 100.000</strong></div>
                          <div id="tax-preview-amount">PPN (10%): <strong>Rp 10.000</strong></div>
                          <div id="tax-preview-total">Total: <strong>Rp 110.000</strong></div>
                        </div>
                      </div>
                      <div class="form-group" style="grid-column: span 2;"><button type="submit" class="btn btn-primary">Simpan Perubahan</button></div>
                    </form>
                  </div>
                </div>
              </div>

              <div class="tab-content" id="tab-payments">
                <div class="card">
                  <div class="card-header"><h3 class="card-title">Metode Pembayaran</h3></div>
                  <div class="table-container">
                    <table class="table">
                      <thead><tr><th>Metode</th><th>Kode</th><th>Status</th><th>Aksi</th></tr></thead>
                      <tbody id="payments-table-body"><tr><td colspan="4" class="text-center text-secondary" style="padding: 40px;">Loading...</td></tr></tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div class="tab-content" id="tab-receipt">
                <div class="card">
                  <div class="card-header"><h3 class="card-title">Template Struk</h3></div>
                  <div style="padding: 24px;">
                    <form id="receipt-form" class="form-grid">
                      <div class="form-group"><label class="form-label">Ukuran Kertas</label><select name="paperSize" id="rcpt-size" class="input"><option value="80mm" selected>80mm</option><option value="58mm">58mm</option></select></div>
                      <div class="form-group"><label class="form-label">Prefix No. Struk</label><input type="text" name="receiptPrefix" id="rcpt-prefix" class="input" placeholder="INV"></div>
                      <div class="form-group"><label class="form-label">Suffix No. Struk</label><input type="text" name="receiptSuffix" id="rcpt-suffix" class="input" placeholder=""></div>
                      <div class="form-group"><label class="form-label">No. Struk Berikutnya</label><input type="number" name="nextReceiptNumber" id="rcpt-number" class="input" min="1"></div>
                      <div class="form-group" style="grid-column: span 2;"><label class="form-label">Header Custom</label><input type="text" name="headerText" id="rcpt-header" class="input" placeholder="Teks di atas struk"></div>
                      <div class="form-group" style="grid-column: span 2;"><label class="form-label">Footer Custom</label><input type="text" name="footerText" id="rcpt-footer" class="input" placeholder="Terima kasih atas kunjungan Anda!"></div>
                      <div class="form-group" style="grid-column: span 2;"><h4 style="margin: 16px 0 8px;">Tampilkan di Struk:</h4></div>
                      <div class="form-group"><label class="form-label" style="display: flex; align-items: center; gap: 8px;"><input type="checkbox" id="rcpt-show-name" style="width: 18px; height: 18px;"> Nama Bisnis</label></div>
                      <div class="form-group"><label class="form-label" style="display: flex; align-items: center; gap: 8px;"><input type="checkbox" id="rcpt-show-address" style="width: 18px; height: 18px;"> Alamat</label></div>
                      <div class="form-group"><label class="form-label" style="display: flex; align-items: center; gap: 8px;"><input type="checkbox" id="rcpt-show-phone" style="width: 18px; height: 18px;"> Telepon</label></div>
                      <div class="form-group"><label class="form-label" style="display: flex; align-items: center; gap: 8px;"><input type="checkbox" id="rcpt-show-cashier" style="width: 18px; height: 18px;"> Nama Kasir</label></div>
                      <div class="form-group"><label class="form-label" style="display: flex; align-items: center; gap: 8px;"><input type="checkbox" id="rcpt-show-table" style="width: 18px; height: 18px;"> Nomor Meja</label></div>
                      <div class="form-group"><label class="form-label" style="display: flex; align-items: center; gap: 8px;"><input type="checkbox" id="rcpt-show-time" style="width: 18px; height: 18px;"> Waktu Pesanan</label></div>
                      <div class="form-group"><label class="form-label" style="display: flex; align-items: center; gap: 8px;"><input type="checkbox" id="rcpt-show-tax" style="width: 18px; height: 18px;"> Detail Pajak</label></div>
                      <div class="form-group"><label class="form-label" style="display: flex; align-items: center; gap: 8px;"><input type="checkbox" id="rcpt-show-thanks" style="width: 18px; height: 18px;"> Pesan Terima Kasih</label></div>
                      <div class="form-group" style="grid-column: span 2;"><button type="submit" class="btn btn-primary">Simpan Perubahan</button></div>
                    </form>
                  </div>
                </div>
              </div>

              <div class="tab-content" id="tab-hours">
                <div class="card">
                  <div class="card-header"><h3 class="card-title">Jam Operasional</h3></div>
                  <div class="table-container">
                    <table class="table">
                      <thead><tr><th>Hari</th><th>Buka</th><th>Tutup</th><th>Status</th><th>Aksi</th></tr></thead>
                      <tbody id="hours-table-body"><tr><td colspan="5" class="text-center text-secondary" style="padding: 40px;">Loading...</td></tr></tbody>
                    </table>
                  </div>
                  <div id="current-status" style="padding: 16px; margin: 16px; background: var(--color-bg-alt); border-radius: var(--radius-md); text-align: center;"></div>
                </div>
              </div>
            </div>
          </main>
          ${getFooterHtml()}
        </div>
      </div>
      <style>
        .settings-container { max-width: 900px; }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .form-group { display: flex; flex-direction: column; gap: 4px; }
        .form-label { font-size: 14px; font-weight: 500; color: var(--color-text-secondary); }
        .tax-preview { background: var(--color-bg-alt); padding: 16px; border-radius: var(--radius-md); margin-top: 8px; }
        .tax-preview h4 { margin: 0 0 12px; font-size: 14px; color: var(--color-text-secondary); }
        .tax-preview > div { padding: 4px 0; font-size: 14px; }
      </style>
      ${getCommonScripts()}
      <script>
        document.querySelectorAll('.tab-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
          });
        });

        const dayNames = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

        async function loadAllSettings() {
          const res = await fetch('/api/settings/all');
          const data = await res.json();
          loadBusinessForm(data.business);
          loadTaxForm(data.tax);
          loadPaymentsTable(data.payments);
          loadReceiptForm(data.receipt);
          loadHoursTable(data.hours);
        }

        function loadBusinessForm(b) {
          if (!b) return;
          document.getElementById('biz-name').value = b.businessName || '';
          document.getElementById('biz-tagline').value = b.businessTagline || '';
          document.getElementById('biz-address').value = b.address || '';
          document.getElementById('biz-phone').value = b.phone || '';
          document.getElementById('biz-email').value = b.email || '';
          document.getElementById('biz-currency').value = b.currency || 'IDR';
          document.getElementById('biz-timezone').value = b.timezone || 'Asia/Jakarta';
        }

        function loadTaxForm(t) {
          if (!t) return;
          document.getElementById('tax-enabled').checked = t.isTaxEnabled;
          document.getElementById('tax-name').value = t.taxName || 'Pajak';
          document.getElementById('tax-type').value = t.taxType || 'exclusive';
          document.getElementById('tax-percent').value = t.taxPercentage || 10;
          updateTaxPreview();
        }

        function loadPaymentsTable(payments) {
          const tbody = document.getElementById('payments-table-body');
          if (!payments || !payments.length) { tbody.innerHTML = '<tr><td colspan="4" class="text-center text-secondary">Tidak ada data</td></tr>'; return; }
          tbody.innerHTML = payments.map(p => '<tr><td><strong>' + p.name + '</strong></td><td><code>' + p.code + '</code></td><td><span class="badge ' + (p.isActive ? 'badge-success' : 'badge-error') + '">' + (p.isActive ? 'Aktif' : 'Nonaktif') + '</span></td><td><button class="btn btn-secondary btn-sm" onclick="togglePayment(' + p.id + ')">' + (p.isActive ? 'Nonaktifkan' : 'Aktifkan') + '</button></td></tr>').join('');
        }

        async function togglePayment(id) {
          await fetch('/api/settings/payments/' + id + '/toggle', { method: 'PATCH' });
          loadAllSettings();
        }

        function loadReceiptForm(r) {
          if (!r) return;
          document.getElementById('rcpt-size').value = r.paperSize || '80mm';
          document.getElementById('rcpt-prefix').value = r.receiptPrefix || 'INV';
          document.getElementById('rcpt-suffix').value = r.receiptSuffix || '';
          document.getElementById('rcpt-number').value = r.nextReceiptNumber || 1;
          document.getElementById('rcpt-header').value = r.headerText || '';
          document.getElementById('rcpt-footer').value = r.footerText || 'Terima kasih atas kunjungan Anda!';
          document.getElementById('rcpt-show-name').checked = r.showBusinessName;
          document.getElementById('rcpt-show-address').checked = r.showAddress;
          document.getElementById('rcpt-show-phone').checked = r.showPhone;
          document.getElementById('rcpt-show-cashier').checked = r.showCashierName;
          document.getElementById('rcpt-show-table').checked = r.showTableNumber;
          document.getElementById('rcpt-show-time').checked = r.showOrderTime;
          document.getElementById('rcpt-show-tax').checked = r.showTaxBreakdown;
          document.getElementById('rcpt-show-thanks').checked = r.showThankYouMessage;
        }

        function loadHoursTable(hours) {
          const tbody = document.getElementById('hours-table-body');
          if (!hours || !hours.length) { tbody.innerHTML = '<tr><td colspan="5" class="text-center text-secondary">Tidak ada data</td></tr>'; return; }
          tbody.innerHTML = hours.map(h => '<tr><td><strong>' + dayNames[h.dayOfWeek] + '</strong></td><td><input type="time" value="' + h.openTime + '" class="input" style="width: 120px;" onchange="updateHour(' + h.dayOfWeek + ', this)"></td><td><input type="time" value="' + h.closeTime + '" class="input" style="width: 120px;" onchange="updateHour(' + h.dayOfWeek + ', this)"></td><td><span class="badge ' + (h.isOpen ? 'badge-success' : 'badge-error') + '">' + (h.isOpen ? 'Buka' : 'Tutup') + '</span></td><td><button class="btn btn-secondary btn-sm" onclick="toggleHour(' + h.dayOfWeek + ')">' + (h.isOpen ? 'Tutup' : 'Buka') + '</button></td></tr>').join('');
          updateCurrentStatus(hours);
        }

        function updateCurrentStatus(hours) {
          const now = new Date();
          const dayOfWeek = (now.getDay() + 6) % 7;
          const currentTime = now.toTimeString().slice(0, 5);
          const today = hours.find(h => h.dayOfWeek === dayOfWeek);
          const el = document.getElementById('current-status');
          if (!today || !today.isOpen) {
            el.innerHTML = 'Status Saat Ini: 🔴 <strong>TUTUP</strong>';
          } else if (currentTime >= today.openTime && currentTime <= today.closeTime) {
            el.innerHTML = 'Status Saat Ini: 🟢 <strong>BUKA</strong> (tutup pukul ' + today.closeTime + ')';
          } else {
            el.innerHTML = 'Status Saat Ini: 🔴 <strong>TUTUP</strong> (buka pukul ' + today.openTime + ')';
          }
        }

        async function updateHour(dayOfWeek, el) {
          const row = el.closest('tr');
          const inputs = row.querySelectorAll('input[type="time"]');
          await fetch('/api/settings/hours/' + dayOfWeek, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ openTime: inputs[0].value, closeTime: inputs[1].value }) });
          loadAllSettings();
        }

        async function toggleHour(dayOfWeek) {
          const hours = await (await fetch('/api/settings/hours')).json();
          const h = hours.find(x => x.dayOfWeek === dayOfWeek);
          await fetch('/api/settings/hours/' + dayOfWeek, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isOpen: !h.isOpen, openTime: h.openTime, closeTime: h.closeTime }) });
          loadAllSettings();
        }

        function updateTaxPreview() {
          const name = document.getElementById('tax-name').value || 'Pajak';
          const pct = parseFloat(document.getElementById('tax-percent').value) || 0;
          const enabled = document.getElementById('tax-enabled').checked;
          const subtotal = 100000;
          const tax = enabled ? Math.round(subtotal * pct / 100) : 0;
          document.getElementById('tax-preview-amount').innerHTML = name + ' (' + pct + '%): <strong>Rp ' + tax.toLocaleString('id-ID') + '</strong>';
          document.getElementById('tax-preview-total').innerHTML = 'Total: <strong>Rp ' + (subtotal + tax).toLocaleString('id-ID') + '</strong>';
        }

        document.getElementById('tax-percent').addEventListener('input', updateTaxPreview);
        document.getElementById('tax-name').addEventListener('input', updateTaxPreview);
        document.getElementById('tax-enabled').addEventListener('change', updateTaxPreview);

        document.getElementById('business-form').addEventListener('submit', async (e) => {
          e.preventDefault();
          const fd = new FormData(e.target);
          await fetch('/api/settings/business', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(fd)) });
          alert('Pengaturan bisnis berhasil disimpan!');
        });

        document.getElementById('tax-form').addEventListener('submit', async (e) => {
          e.preventDefault();
          const fd = new FormData(e.target);
          const data = Object.fromEntries(fd);
          data.isTaxEnabled = document.getElementById('tax-enabled').checked;
          data.taxPercentage = parseFloat(data.taxPercentage);
          await fetch('/api/settings/tax', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
          alert('Pengaturan pajak berhasil disimpan!');
        });

        document.getElementById('receipt-form').addEventListener('submit', async (e) => {
          e.preventDefault();
          const data = {
            paperSize: document.getElementById('rcpt-size').value,
            receiptPrefix: document.getElementById('rcpt-prefix').value,
            receiptSuffix: document.getElementById('rcpt-suffix').value,
            nextReceiptNumber: parseInt(document.getElementById('rcpt-number').value),
            headerText: document.getElementById('rcpt-header').value,
            footerText: document.getElementById('rcpt-footer').value,
            showBusinessName: document.getElementById('rcpt-show-name').checked,
            showAddress: document.getElementById('rcpt-show-address').checked,
            showPhone: document.getElementById('rcpt-show-phone').checked,
            showCashierName: document.getElementById('rcpt-show-cashier').checked,
            showTableNumber: document.getElementById('rcpt-show-table').checked,
            showOrderTime: document.getElementById('rcpt-show-time').checked,
            showTaxBreakdown: document.getElementById('rcpt-show-tax').checked,
            showThankYouMessage: document.getElementById('rcpt-show-thanks').checked,
          };
          await fetch('/api/settings/receipt', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
          alert('Template struk berhasil disimpan!');
        });

        loadAllSettings();
      </script>
    `);
  });
