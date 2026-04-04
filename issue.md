# Rencana Improve: Admin Panel `/admin`

## Latar Belakang

Admin panel saat ini (`src/pages/admin.ts`) sudah memiliki fitur dasar user management:
- Stats cards (total users, active, inactive, role distribution)
- Tabel daftar pengguna
- CRUD: tambah, edit, reset password, toggle status, hapus user
- Proteksi super_admin (tidak bisa dihapus/diubah)

Namun masih banyak fitur penting yang belum ada untuk menjadi admin panel yang proper.

---

## Tahap 1: Tambah Search & Filter Users

Tambahkan input search dan filter di atas tabel user agar admin bisa mencari user dengan cepat.

### Layout
```
┌─────────────────────────────────────────────────────────┐
│ Daftar Pengguna              [+ Tambah User]            │
├─────────────────────────────────────────────────────────┤
│ [🔍 Cari nama/email...]  [Filter: Semua Role ▼] [▼]   │
└─────────────────────────────────────────────────────────┘
```

### Implementasi (Client-side)
- Input search yang memfilter baris tabel berdasarkan nama atau email
- Dropdown filter berdasarkan role (Semua, Super Admin, Admin Restoran, Kasir, Waitress, Chef)
- Dropdown filter berdasarkan status (Semua, Active, Inactive)

---

## Tahap 2: Tambah Kolom "Last Login" di Tabel

Tambahkan kolom yang menampilkan kapan terakhir kali user login.

### Perubahan Database
```sql
ALTER TABLE users ADD COLUMN last_login DATETIME NULL AFTER updated_at;
```

### Perubahan Schema
Tambahkan di `src/db/schema.ts`:
```typescript
lastLogin: datetime('last_login'),
```

### Perubahan di Tabel
Tambahkan kolom:
| Nama | Email | Role | Status | Last Login | Created At | Aksi |

### Update Login Endpoint
Di `src/routes/auth.ts`, saat login berhasil, update `last_login`:
```typescript
await userRepo.updateLastLogin(user.userId);
```

---

## Tahap 3: Tambah Fitur Audit Log / Activity Log

Buat halaman atau section yang mencatat aktivitas penting di sistem.

### Data yang perlu dicatat
| Event | Detail |
|-------|--------|
| User login | email, waktu, IP |
| User dibuat | oleh siapa, role apa |
| Role diubah | dari apa ke apa, oleh siapa |
| Password direset | oleh siapa, untuk siapa |
| User dihapus | oleh siapa, nama user yang dihapus |
| Menu ditambah/dihapus | nama menu, oleh siapa |
| Pesanan dibatalkan | order ID, oleh siapa |

### Schema Baru
```typescript
export const auditLogs = mysqlTable('audit_logs', {
  id: serial('id').primaryKey(),
  userId: int('user_id').notNull(),
  action: varchar('action', { length: 100 }).notNull(),
  details: varchar('details', { length: 500 }),
  createdAt: datetime('created_at').notNull().default(new Date()),
});
```

### Tampilan di Admin Panel
Tambahkan tab atau section baru di bawah tabel user:
```
┌─────────────────────────────────────────────────────────┐
│ [👥 Users]  [📋 Activity Log]                           │
├─────────────────────────────────────────────────────────┤
│ Waktu         | User          | Aksi          | Detail  │
│ 10:30 04/04   | Muhammad Zaki | Login         |         │
│ 10:25 04/04   | Muhammad Zaki | Reset PW      | kasir_1 │
│ 10:15 04/04   | Muhammad Zaki | Tambah User   | kasir_2 │
└─────────────────────────────────────────────────────────┘
```

---

## Tahap 4: Tambah Fitur Export User Data

Tambahkan tombol "Export" untuk mendownload daftar user dalam format CSV.

### Implementasi
```javascript
function exportUsers() {
  const rows = [['Nama', 'Email', 'Role', 'Status', 'Created At']];
  document.querySelectorAll('#users-table-body tr').forEach(tr => {
    const cells = tr.querySelectorAll('td');
    rows.push([
      cells[0].textContent,
      cells[1].textContent,
      cells[2].textContent,
      cells[3].textContent,
      cells[4].textContent
    ]);
  });
  const csv = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'users-' + new Date().toISOString().slice(0,10) + '.csv';
  a.click();
}
```

---

## Tahap 5: Improve UX Tabel User

### 5a. Pagination
Jika user banyak, tabel harus di-paginate (10 user per halaman).

### 5b. Sortable Columns
Klik header kolom untuk sort (nama A-Z, terbaru, dll).

### 5c. Inline Status Toggle
Ganti button "Nonaktif/Aktif" dengan toggle switch yang lebih modern.

### 5d. Confirmation Dialog yang Lebih Baik
Ganti `confirm()` browser native dengan custom modal untuk delete dan reset password.

---

## Tahap 6: Tambah Statistik User Activity

Tambahkan section baru di bawah stats cards yang menampilkan:

### User Baru Minggu Ini
```
┌─────────────────────────────────────┐
│ User Baru (7 Hari Terakhir)         │
├─────────────────────────────────────┤
│ Sen  Tue  Wed  Thu  Fri  Sat  Sun   │
│  0    1    0    2    0    0    0    │
│  █    █         █                   │
└─────────────────────────────────────┘
```

### User Paling Aktif
```
┌─────────────────────────────────────┐
│ User Paling Aktif Hari Ini          │
├─────────────────────────────────────┤
│ 1. Muhammad Zaki  — 12 transaksi    │
│ 2. Kasir 1        — 8 transaksi     │
│ 3. Kasir 2        — 5 transaksi     │
└─────────────────────────────────────┘
```

---

## Tahap 7: Testing

### Skenario Test
1. Search user berdasarkan nama → tabel ter-filter
2. Filter berdasarkan role → hanya user dengan role tersebut yang tampil
3. Login user → kolom last_login ter-update
4. Tambah user → activity log mencatat "User created"
5. Reset password user → activity log mencatat "Password reset"
6. Export CSV → file ter-download dengan data yang benar
7. Pagination → navigasi halaman berfungsi
8. Toggle status → switch berubah visual, status ter-update di database

---

## File yang Perlu Diubah/Dibuat

| File | Perubahan |
|------|-----------|
| `src/db/schema.ts` | Tambah `lastLogin` di users, buat `auditLogs` table |
| `src/pages/admin.ts` | Tambah search, filter, export, audit log tab, pagination |
| `src/repositories/user.ts` | Tambah `updateLastLogin()`, `getUsersByDateRange()` |
| `src/repositories/audit-log.ts` | **BARU** — CRUD untuk audit logs |
| `src/routes/auth.ts` | Update `last_login` saat login berhasil |
| `src/routes/audit-log.ts` | **BARU** — API endpoint untuk audit logs |

## Catatan Penting

- **JANGAN hapus** fitur CRUD user yang sudah ada
- **Backward compatible** — kolom `last_login` boleh NULL untuk user lama
- **Audit log** hanya mencatat, tidak boleh mengubah logika bisnis yang sudah ada
- **Estimasi total**: 3-4 jam kerja
