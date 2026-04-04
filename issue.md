# Rencana Implementasi: Super Admin Dashboard & User Management

## Latar Belakang

RBAC sudah ter-implementasi dengan 5 role (`super_admin`, `admin_restoran`, `kasir`, `waitress`, `chef`). Namun belum ada:
1. Halaman dashboard khusus untuk Super Admin
2. Cara mengubah role user (saat ini user `zakybaraq@gmail.com` masih ber-role `kasir`, harusnya `super_admin`)
3. Halaman untuk mengelola daftar pengguna

## Tujuan

1. Ubah role `zakybaraq@gmail.com` menjadi `super_admin`
2. Buat halaman `/admin` — dashboard Super Admin dengan fitur user management (CRUD user + ganti role)
3. Buat API endpoints untuk user management

---

## Tahap 1: Ubah Role zakybaraq@gmail.com ke super_admin

Jalankan SQL berikut di database `pos_db`:

```sql
UPDATE users SET role = 'super_admin' WHERE email = 'zakybaraq@gmail.com';
```

Verifikasi:
```sql
SELECT email, name, role FROM users WHERE email = 'zakybaraq@gmail.com';
-- Expected: role = 'super_admin'
```

---

## Tahap 2: Buat API Endpoints untuk User Management

Buat file baru: `src/routes/users.ts`

### Route yang diperlukan

| Method | Path | Role | Fungsi |
|--------|------|------|--------|
| GET | `/api/users` | super_admin | Ambil semua user (tanpa password) |
| GET | `/api/users/:id` | super_admin | Ambil detail user (tanpa password) |
| POST | `/api/users` | super_admin | Buat user baru |
| PUT | `/api/users/:id` | super_admin | Update user (name, email, role, isActive) |
| PUT | `/api/users/:id/role` | super_admin | Ubah role user |
| PUT | `/api/users/:id/password` | super_admin | Reset password user |
| DELETE | `/api/users/:id` | super_admin | Hapus user (tidak bisa hapus super_admin lain) |

### Contoh implementasi

Gunakan pola yang sama seperti `src/routes/menus.ts`:

```typescript
import { Elysia, t } from 'elysia';
import * as userRepo from '../repositories/user';
import { requireSuperAdmin, getUserFromRequest } from '../middleware/authorization';

export const userRoutes = new Elysia({ prefix: '/api/users' })
  .get('/', async ({ cookie, headers }) => {
    const user = getUserFromRequest(cookie, headers);
    if (!user) return { error: 'Unauthorized' };
    
    const users = await userRepo.getAllUsers();
    // Hapus password dari response
    return users.map(({ password, ...rest }) => rest);
  })
  // ... endpoint lainnya
  
  .onBeforeHandle(requireSuperAdmin());
```

### Fungsi repository yang perlu ditambahkan di `src/repositories/user.ts`

```typescript
// Ambil semua user
export async function getAllUsers() {
  return db.select().from(users);
}

// Update user by ID
export async function updateUser(id: number, data: Partial<NewUser>) {
  await db.update(users).set(data).where(eq(users.id, id));
  return db.select().from(users).where(eq(users.id, id)).then(r => r[0]);
}

// Delete user by ID
export async function deleteUser(id: number) {
  await db.delete(users).where(eq(users.id, id));
}
```

### Register route di `src/routes/index.ts`

```typescript
import { userRoutes } from './users';

export const routes = new Elysia()
  .use(cookie())
  .use(menuRoutes)
  .use(tableRoutes)
  .use(orderRoutes)
  .use(authRoutes)
  .use(userRoutes);  // <-- tambahkan ini
```

---

## Tahap 3: Buat Halaman Super Admin Dashboard

Buat route baru di `src/index.ts`: `.get('/admin', ...)`

### Layout halaman

Halaman `/admin` hanya bisa diakses oleh `super_admin`. Tambahkan role check di awal handler:

```typescript
.get('/admin', async ({ cookie, headers }) => {
  const token = getTokenFromCookies(cookie, headers);
  if (!token) return redirectToLogin();
  
  let user = null;
  try {
    user = verifyToken(token);
  } catch {
    return redirectToLogin();
  }
  
  // Hanya super_admin yang bisa akses
  if (user.role !== 'super_admin') {
    return new Response('Akses ditolak: halaman ini hanya untuk Super Admin', { status: 403 });
  }
  
  // Render halaman...
})
```

### Konten halaman

Halaman harus menampilkan:

1. **Stats cards** di atas:
   - Total Users
   - Users Active
   - Users Inactive
   - Role distribution (berapa user per role)

2. **Tabel daftar user** dengan kolom:
   - Nama
   - Email
   - Role (badge berwarna)
   - Status (Active/Inactive badge)
   - Created At
   - Aksi: Edit, Toggle Active, Change Role, Reset Password, Delete

3. **Tombol "+ Tambah User"** di atas tabel

4. **Modal "Tambah User"** dengan form:
   - Nama (text input)
   - Email (email input)
   - Password (password input, min 6 karakter)
   - Role (select: super_admin, admin_restoran, kasir, waitress, chef)

5. **Modal "Edit User"** dengan form:
   - Nama (text input)
   - Email (email input)
   - Role (select)
   - Status Active (toggle/checkbox)

6. **Modal "Reset Password"** dengan form:
   - Password Baru (password input, min 6 karakter)
   - Konfirmasi Password

### Pattern HTML yang harus diikuti

Ikuti pola yang sudah ada di `src/index.ts`:
- Gunakan `htmlResponse()` untuk render HTML
- Gunakan `getSidebarHtml('admin', user)` untuk sidebar
- Gunakan `getNavbarHtml('Admin Panel', 'admin', user)` untuk navbar
- Gunakan `getFooterHtml()` untuk footer
- Gunakan `getCommonScripts()` untuk script umum
- Style inline atau `<style>` tag mengikuti pattern yang sudah ada

### Sidebar update

Di fungsi `getSidebarHtml()` di `src/index.ts`, tambahkan menu "Admin" yang hanya muncul untuk `super_admin`:

```typescript
const roleMenuMap: Record<string, string[]> = {
  super_admin: ['dashboard', 'admin', 'pos', 'menu', 'tables', 'orders'],
  // ... role lainnya tetap sama
};
```

Dan tambahkan HTML menu item di dalam `<ul class="sidebar-menu">`:

```typescript
${isMenuAllowed('admin') ? `
<li class="sidebar-menu-item">
  <a href="/admin" class="sidebar-menu-link ${activePage === 'admin' ? 'active' : ''}">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
    </svg>
    <span class="sidebar-menu-label">Admin</span>
  </a>
</li>` : ''}
```

---

## Tahap 4: Proteksi Tambahan

### Super Admin tidak bisa dihapus

Di endpoint `DELETE /api/users/:id`, tambahkan validasi:

```typescript
const targetUser = await userRepo.getUserById(Number(id));
if (targetUser?.role === 'super_admin') {
  return { error: 'Super Admin tidak dapat dihapus' };
}
```

### Super Admin tidak bisa diubah role-nya oleh user lain

Di endpoint `PUT /api/users/:id/role`, tambahkan validasi:

```typescript
const targetUser = await userRepo.getUserById(Number(id));
if (targetUser?.role === 'super_admin') {
  return { error: 'Role Super Admin tidak dapat diubah' };
}
```

---

## Tahap 5: Testing

1. Login sebagai `zakybaraq@gmail.com` (setelah role diubah ke super_admin)
2. Verifikasi menu "Admin" muncul di sidebar
3. Klik menu "Admin" → halaman dashboard terbuka
4. Verifikasi stats cards menampilkan data yang benar
5. Verifikasi tabel user menampilkan semua user tanpa password
6. Test tambah user baru → user muncul di tabel
7. Test edit user → data ter-update
8. Test change role → role berubah
9. Test delete user biasa → berhasil
10. Test delete super_admin → error "Super Admin tidak dapat dihapus"
11. Login sebagai kasir → coba akses `/admin` → harus dapat 403
12. Login sebagai kasir → menu "Admin" tidak muncul di sidebar

---

## Referensi File

| File | Keterangan |
|------|------------|
| `src/index.ts` | Tambah route `/admin`, update `getSidebarHtml()` |
| `src/routes/users.ts` | **BARU** — API endpoints user management |
| `src/repositories/user.ts` | Tambah `getAllUsers`, `updateUser`, `deleteUser` |
| `src/routes/index.ts` | Register `userRoutes` |
| `src/middleware/authorization.ts` | Sudah ada `requireSuperAdmin()` — tinggal pakai |
| `src/utils/auth.ts` | Sudah ada `getTokenFromCookies`, `verifyToken` — tinggal pakai |
| `RBAC.md` | Dokumentasi RBAC yang sudah ada |

## Catatan Penting

- **JANGAN hapus atau ubah** endpoint yang sudah ada
- **JANGAN ubah** schema database (sudah benar)
- **Ikuti pattern** yang sudah ada di codebase — jangan buat pattern baru
- **Password** TIDAK BOLEH muncul di response API manapun
- **Super Admin** TIDAK BOLEH bisa dihapus atau diubah role-nya
