export function getCommonScripts() {
  return `
<script>
function toggleSidebar() {
  const sidebar = document.getElementById('app-sidebar');
  if (!sidebar) return;
  const content = document.querySelector('.app-content');
  sidebar.classList.toggle('collapsed');
  void sidebar.offsetWidth;
  if (content) {
    content.classList.toggle('collapsed-adjusted');
  }
  localStorage.setItem('sidebar-collapsed', sidebar.classList.contains('collapsed'));
}

function toggleMobileSidebar() {
  const sidebar = document.getElementById('app-sidebar');
  if (!sidebar) return;
  sidebar.classList.toggle('show');
}

function toggleNotifications() {
  const dropdown = document.getElementById('notif-dropdown');
  if (!dropdown) return;
  dropdown.classList.toggle('show');
  const userDropdown = document.getElementById('user-dropdown');
  if (userDropdown) userDropdown.classList.remove('show');
}

function toggleUserMenu() {
  const dropdown = document.getElementById('user-dropdown');
  if (!dropdown) return;
  dropdown.classList.toggle('show');
  const notifDropdown = document.getElementById('notif-dropdown');
  if (notifDropdown) notifDropdown.classList.remove('show');
}

document.addEventListener('click', function(e) {
  const notifDropdown = document.getElementById('notif-dropdown');
  if (notifDropdown && !e.target.closest('.navbar-notification')) {
    notifDropdown.classList.remove('show');
  }
  const userDropdown = document.getElementById('user-dropdown');
  if (userDropdown && !e.target.closest('.user-dropdown')) {
    userDropdown.classList.remove('show');
  }
  if (window.innerWidth <= 1024) {
    const sidebar = document.getElementById('app-sidebar');
    if (sidebar && !e.target.closest('.sidebar') && !e.target.closest('.menu-toggle')) {
      sidebar.classList.remove('show');
    }
  }
});

const globalSearch = document.getElementById('global-search');
if (globalSearch) {
  globalSearch.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      const query = this.value.trim();
      if (query) {
        window.location.href = '/orders?search=' + encodeURIComponent(query);
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', function() {
  const isCollapsed = localStorage.getItem('sidebar-collapsed') === 'true';
  if (isCollapsed) {
    const sidebar = document.getElementById('app-sidebar');
    if (sidebar) sidebar.classList.add('collapsed');
  }
});

function logout() {
    fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    .then(() => window.location.href = '/login');
  }

  function showToast(message, type) {
    type = type || 'success';
    const toast = document.createElement('div');
    toast.style.cssText = 'position: fixed; top: 20px; right: 20px; padding: 12px 24px; border-radius: 8px; color: white; font-weight: 500; z-index: 9999; animation: slideInToast 0.3s ease; max-width: 400px; word-wrap: break-word;';
    
    if (type === 'error') {
      toast.style.background = '#ef4444';
    } else if (type === 'warning') {
      toast.style.background = '#f59e0b';
    } else {
      toast.style.background = '#22c55e';
    }
    
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(function() {
      toast.style.animation = 'slideOutToast 0.3s ease';
      setTimeout(function() { toast.remove(); }, 300);
    }, 3000);
  }

  const toastStyle = document.createElement('style');
  toastStyle.textContent = '@keyframes slideInToast { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } } @keyframes slideOutToast { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }';
  document.head.appendChild(toastStyle);

  function showHelpModal() {
  const modal = document.getElementById('help-modal');
  if (modal) modal.classList.add('show'); 
}
function closeHelpModal() { 
  const modal = document.getElementById('help-modal');
  if (modal) modal.classList.remove('show'); 
}
function showTermsModal() { 
  const modal = document.getElementById('terms-modal');
  if (modal) modal.classList.add('show'); 
}
function closeTermsModal() { 
  const modal = document.getElementById('terms-modal');
  if (modal) modal.classList.remove('show'); 
}
function showPrivacyModal() { 
  const modal = document.getElementById('privacy-modal');
  if (modal) modal.classList.add('show'); 
}
function closePrivacyModal() { 
  const modal = document.getElementById('privacy-modal');
  if (modal) modal.classList.remove('show'); 
}
</script>

<div class="modal" id="help-modal">
  <div class="modal-backdrop" onclick="closeHelpModal()"></div>
  <div class="modal-content" style="max-width: 600px;">
    <div class="modal-header">
      <h3>Bantuan</h3>
      <button class="modal-close" onclick="closeHelpModal()">&times;</button>
    </div>
    <div class="modal-body">
      <h4 style="margin-bottom: 12px;">Cara Menggunakan POS</h4>
      <ol style="padding-left: 20px; line-height: 1.8;">
        <li>Buka halaman <strong>POS</strong> dari sidebar</li>
        <li>Pilih meja yang tersedia</li>
        <li>Tambahkan menu ke pesanan dengan klik menu yang diinginkan</li>
        <li>Review pesanan dan jumlah item</li>
        <li>Proses pembayaran dengan klik tombol <strong>Bayar</strong></li>
        <li>Masukkan jumlah uang yang diterima, sistem akan menghitung kembalian</li>
      </ol>
      <h4 style="margin: 20px 0 12px;">FAQ</h4>
      <details style="margin-bottom: 8px; padding: 12px; background: var(--color-bg-alt); border-radius: var(--radius-md);">
        <summary style="cursor: pointer; font-weight: 500;">Bagaimana cara reset password?</summary>
        <p style="margin-top: 8px; color: var(--color-text-secondary);">Hubungi Super Admin untuk melakukan reset password akun Anda.</p>
      </details>
      <details style="margin-bottom: 8px; padding: 12px; background: var(--color-bg-alt); border-radius: var(--radius-md);">
        <summary style="cursor: pointer; font-weight: 500;">Bagaimana cara menambah meja?</summary>
        <p style="margin-top: 8px; color: var(--color-text-secondary);">Di halaman POS, klik tombol <strong>+</strong> di bagian header Meja. Hanya Admin dan Super Admin yang dapat menambah meja.</p>
      </details>
      <details style="margin-bottom: 8px; padding: 12px; background: var(--color-bg-alt); border-radius: var(--radius-md);">
        <summary style="cursor: pointer; font-weight: 500;">Bagaimana cara membatalkan pesanan?</summary>
        <p style="margin-top: 8px; color: var(--color-text-secondary);">Buka halaman Pesanan, pilih pesanan yang ingin dibatalkan, lalu klik tombol <strong>Batalkan</strong>. Hanya Kasir, Waitress, dan Admin yang dapat membatalkan pesanan.</p>
      </details>
      <h4 style="margin: 20px 0 12px;">Kontak Support</h4>
      <p style="color: var(--color-text-secondary); line-height: 1.6;">
        Email: <strong>support@posapp.com</strong><br>
        Telepon: <strong>(021) 1234-5678</strong>
      </p>
    </div>
    <div class="modal-footer">
      <button onclick="closeHelpModal()" class="btn btn-secondary">Tutup</button>
    </div>
  </div>
</div>

<div class="modal" id="terms-modal">
  <div class="modal-backdrop" onclick="closeTermsModal()"></div>
  <div class="modal-content" style="max-width: 600px;">
    <div class="modal-header">
      <h3>Ketentuan Penggunaan</h3>
      <button class="modal-close" onclick="closeTermsModal()">&times;</button>
    </div>
    <div class="modal-body">
      <h4 style="margin-bottom: 12px;">1. Syarat Penggunaan</h4>
      <p style="color: var(--color-text-secondary); line-height: 1.6; margin-bottom: 16px;">Aplikasi POS ini disediakan untuk penggunaan internal restoran. Pengguna wajib memiliki akun yang sah dan hanya mengakses fitur sesuai dengan role yang diberikan.</p>
      <h4 style="margin-bottom: 12px;">2. Kebijakan Akun dan Akses</h4>
      <ul style="padding-left: 20px; line-height: 1.8; color: var(--color-text-secondary);">
        <li>Setiap pengguna bertanggung jawab atas keamanan akun mereka</li>
        <li>Dilarang membagikan kredensial login kepada pihak lain</li>
        <li>Akses ke fitur dibatasi berdasarkan role (Super Admin, Admin Restoran, Kasir, Waitress, Chef)</li>
        <li>Pengelolaan akun hanya dapat dilakukan oleh Super Admin</li>
      </ul>
      <h4 style="margin: 20px 0 12px;">3. Batasan Tanggung Jawab</h4>
      <p style="color: var(--color-text-secondary); line-height: 1.6; margin-bottom: 16px;">Aplikasi ini disediakan "apa adanya". Pengembang tidak bertanggung jawab atas kerugian yang timbul dari penggunaan aplikasi, termasuk namun tidak terbatas pada kesalahan data, downtime, atau kesalahan transaksi.</p>
      <h4 style="margin: 20px 0 12px;">4. Perubahan Ketentuan</h4>
      <p style="color: var(--color-text-secondary); line-height: 1.6;">Ketentuan ini dapat diubah sewaktu-waktu. Perubahan akan diinformasikan kepada semua pengguna.</p>
    </div>
    <div class="modal-footer">
      <button onclick="closeTermsModal()" class="btn btn-secondary">Tutup</button>
    </div>
  </div>
</div>

<div class="modal" id="privacy-modal">
  <div class="modal-backdrop" onclick="closePrivacyModal()"></div>
  <div class="modal-content" style="max-width: 600px;">
    <div class="modal-header">
      <h3>Kebijakan Privasi</h3>
      <button class="modal-close" onclick="closePrivacyModal()">&times;</button>
    </div>
    <div class="modal-body">
      <h4 style="margin-bottom: 12px;">1. Data yang Dikumpulkan</h4>
      <ul style="padding-left: 20px; line-height: 1.8; color: var(--color-text-secondary); margin-bottom: 16px;">
        <li><strong>Data akun:</strong> nama, email, role</li>
        <li><strong>Data transaksi:</strong> riwayat pesanan, item yang dipesan, total pembayaran</li>
        <li><strong>Data operasional:</strong> waktu login, aktivitas pengguna</li>
      </ul>
      <h4 style="margin-bottom: 12px;">2. Penggunaan Data</h4>
      <p style="color: var(--color-text-secondary); line-height: 1.6; margin-bottom: 16px;">Data yang dikumpulkan digunakan semata-mata untuk keperluan operasional restoran, termasuk pengelolaan pesanan, pelaporan penjualan, dan audit internal. Data tidak akan dibagikan kepada pihak ketiga tanpa persetujuan.</p>
      <h4 style="margin-bottom: 12px;">3. Penyimpanan Data</h4>
      <p style="color: var(--color-text-secondary); line-height: 1.6; margin-bottom: 16px;">Data disimpan secara aman di server dengan enkripsi password menggunakan bcrypt. Akses database dibatasi hanya untuk administrator sistem.</p>
      <h4 style="margin-bottom: 12px;">4. Hak Pengguna</h4>
      <ul style="padding-left: 20px; line-height: 1.8; color: var(--color-text-secondary); margin-bottom: 16px;">
        <li>Mengakses data akun pribadi</li>
        <li>Meminta perubahan data akun melalui Super Admin</li>
        <li>Meminta penghapusan akun</li>
      </ul>
      <h4 style="margin-bottom: 12px;">5. Keamanan</h4>
      <p style="color: var(--color-text-secondary); line-height: 1.6;">Kami menerapkan langkah-langkah keamanan yang wajar untuk melindungi data pengguna, termasuk enkripsi password, session management, dan role-based access control.</p>
    </div>
    <div class="modal-footer">
      <button onclick="closePrivacyModal()" class="btn btn-secondary">Tutup</button>
    </div>
  </div>
</div>`;
}
