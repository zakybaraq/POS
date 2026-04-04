# Rencana Implementasi Sistem Role-Based Access Control (RBAC)

## Latar Belakang
Aplikasi POS saat ini menggunakan sistem otentikasi dasar tanpa peran atau otorisasi yang terstruktur. Untuk meningkatkan keamanan dan fungsionalitas, perlu diimplementasikan sistem Role-Based Access Control (RBAC) yang membatasi akses menu dan fitur berdasarkan peran pengguna.

## Tujuan
Mengimplementasikan sistem RBAC dengan peran yang terdefinisi untuk mengontrol akses ke berbagai modul aplikasi berdasarkan tanggung jawab pengguna.

## Struktur Role yang Diperlukan

### 1. Super Admin
- Akses penuh ke semua fitur dan data
- Dapat mengelola pengguna dan peran
- Akses ke sistem settings dan konfigurasi
- Tidak dapat dinonaktifkan atau dihapus

### 2. Admin Restoran
- Akses ke semua modul operasional
- Dapat mengelola menu, meja, dan pesanan
- Melihat laporan penjualan dan statistik
- Tidak dapat mengakses sistem settings atau mengelola Super Admin

### 3. Kasir
- Akses hanya ke modul POS (Point of Sale)
- Dapat membuat pesanan dan memproses pembayaran
- Melihat status meja yang ditangani
- Tidak dapat mengelola menu, meja, atau melihat laporan

### 4. Waitress/Waiter
- Akses ke modul pesanan dan meja
- Dapat melihat dan mengupdate status pesanan
- Tidak dapat memproses pembayaran atau mengelola menu

### 5. Chef
- Akses ke modul pesanan untuk memproses pesanan masakan
- Dapat melihat pesanan yang perlu diolah
- Tidak dapat mengakses POS, menu management, atau laporan keuangan

## Tahapan Implementasi

### Tahap 1: Persiapan Database
1. Tambahkan kolom `role` ke tabel `users` dengan nilai default 'kasir'
2. Definisikan enum atau constraint untuk nilai role yang valid:
   - super_admin
   - admin_restoran
   - kasir
   - waitress
   - chef
3. Buat migrasi database untuk perubahan skema ini

### Tahap 2: Backend - Middleware Otorisasi
1. Buat middleware otorisasi di `src/middleware/authorization.ts`
2. Implementasikan fungsi untuk memeriksa role pengguna:
   ```typescript
   function requireRole(allowedRoles: string[]) {
     return async ({ cookie, headers }: any, next: () => Promise<any>) => {
       const token = getTokenFromCookies(cookie, headers);
       if (!token) return redirectToLogin();
       
       let user = null;
       try {
         user = verifyToken(token);
       } catch {
         return redirectToLogin();
       }
       
       // Periksa role pengguna
       if (!allowedRoles.includes(user.role)) {
         return new Response('Akses ditolak', { status: 403 });
       }
       
       return next();
     };
   }
   ```
3. Terapkan middleware ke route yang perlu dilindungi:
   - `/menu` - super_admin, admin_restoran
   - `/tables` - super_admin, admin_restoran
   - `/orders` - semua role (tapi dengan pembatasan akses data)
   - `/pos` - kasir, waitress, admin_restoran, super_admin

### Tahap 3: Frontend - Penyembunyian Menu Sidebar
1. Modifikasi fungsi `getSidebarHtml()` untuk menyembunyikan menu berdasarkan role:
   ```typescript
   function getSidebarHtml(activePage: string, user: any) {
     // Definisikan menu yang boleh diakses per role
     const roleMenuMap = {
       super_admin: ['dashboard', 'pos', 'menu', 'tables', 'orders'],
       admin_restoran: ['pos', 'menu', 'tables', 'orders'],
       kasir: ['pos'],
       waitress: ['orders', 'tables'],
       chef: ['orders']
     };
     
     const allowedMenus = roleMenuMap[user.role] || [];
     
     // Bangun HTML sidebar hanya dengan menu yang diizinkan
     // ...
   }
   ```
2. Tambahkan pemeriksaan role di sisi klien untuk mencegah akses langsung via URL

### Tahap 4: Proteksi API Endpoint
1. Tambahkan pemeriksaan role di semua endpoint API:
   - `GET /api/menus` - super_admin, admin_restoran
   - `POST /api/menus` - super_admin, admin_restoran
   - `PUT /api/menus/:id` - super_admin, admin_restoran
   - `DELETE /api/menus/:id` - super_admin, admin_restoran
   - `GET /api/tables` - super_admin, admin_restoran
   - `POST /api/tables` - super_admin, admin_restoran
   - `DELETE /api/tables/:id` - super_admin, admin_restoran
   - `GET /api/orders` - semua role (with filtering)
   - `POST /api/orders` - kasir, waitress, admin_restoran, super_admin
   - `POST /api/orders/:id/pay` - kasir, admin_restoran, super_admin
   - `POST /api/orders/:id/cancel` - kasir, waitress, admin_restoran, super_admin

### Tahap 5: Pengujian dan Validasi
1. Uji akses untuk setiap role:
   - Login sebagai masing-masing role
   - Verifikasi menu sidebar hanya menampilkan akses yang diizinkan
   - Coba akses halaman yang tidak diizinkan secara langsung via URL
   - Verifikasi API endpoint memberikan respons 403 untuk akses yang tidak diizinkan
   - Pastikan Super Admin tidak dapat diubah/dihapus oleh role lain

### Tahap 6: Dokumentasi
1. Buat dokumentasi sederhana untuk:
   - Daftar role dan hak akses masing-masing
   - Cara menambah role baru di sistem
   - Proses migrasi jika diperlukan

## Estimasi Waktu dan Kompleksitas
- **Tahap 1 (Database)**: 2-4 jam
- **Tahap 2 (Middleware)**: 4-6 jam
- **Tahap 3 (Frontend)**: 3-5 jam
- **Tahap 4 (API Protection)**: 6-8 jam
- **Tahap 5 (Testing)**: 4-6 jam
- **Tahap 6 (Dokumentasi)**: 1-2 jam
- **Total Estimasi**: 20-31 jam

## Catatan untuk Implementor
1. Selalu lakukan pemeriksaan role di kedua sisi (backend dan frontend) untuk keamanan maksimal
2. Gunakan constants untuk nilai role agar konsisten di seluruh aplikasi
3. Pertimbangkan untuk menambahkan sistem permission yang lebih granular di masa depan jika diperlukan
4. Pastikan tidak ada kerusakan fungsionalitas saat menambahkan fitur baru ini
5. Uji secara menyeluruh sebelum deploying ke produksi

## Referensi Kode yang Ada
- Sistem otentikasi saat ada di `src/services/auth.ts` dan fungsi `getTokenFromCookies`, `verifyToken`
- Struktur route ada di `src/index.ts`
- Contoh middleware ada dalam format Elysia di struktur aplikasi saat ini