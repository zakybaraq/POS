# Role-Based Access Control (RBAC) — Implementation Report

## Status: ✅ COMPLETED

Implementasi RBAC telah selesai. Dokumen ini mencatat apa yang di-build, deviasi dari rencana awal, dan sisa pekerjaan.

---

## Struktur Role (Aktual)

| Role | Dashboard | POS | Menu CRUD | Tables CRUD | Orders | Payment | Cancel | Register |
|------|-----------|-----|-----------|-------------|--------|---------|--------|----------|
| **super_admin** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **admin_restoran** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **kasir** | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ |
| **waitress** | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ |
| **chef** | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |

### Deviasi dari Rencana Awal

| Rencana | Aktual | Alasan |
|---------|--------|--------|
| Waitress bisa akses `/tables` | ❌ Waitress hanya bisa akses orders | Waitress tidak perlu kelola meja, hanya lihat pesanan |
| Chef bisa cancel orders | ❌ Chef hanya bisa view orders | Chef hanya memproses masakan, tidak membatalkan pesanan |
| `GET /api/menus` dilindungi admin | ✅ Read-access terbuka, write dilindungi | Menu perlu dibaca oleh POS untuk semua role |

---

## Arsitektur File

### File Baru
| File | Fungsi |
|------|--------|
| `src/utils/auth.ts` | Auth utilities: `getTokenFromCookies`, `verifyToken`, `redirectToLogin`, `TokenPayload`, `getCurrentUser` |
| `RBAC.md` | Dokumentasi: role matrix, cara tambah role baru, migrasi SQL |

### File yang Dimodifikasi
| File | Perubahan |
|------|-----------|
| `src/middleware/authorization.ts` | Fix circular dependency (import dari utils, bukan index), fix Elysia signature (hapus `next` callback), tambah `getUserFromRequest`, `hasRole`, convenience middleware |
| `src/routes/menus.ts` | Fix `beforeHandle` → `onBeforeHandle`, per-route auth checks |
| `src/routes/tables.ts` | Tambah `onBeforeHandle(requireAdmin())` |
| `src/routes/orders.ts` | Granular role checks: pay (kasir+), cancel (kasir+waitress+), create (operational roles) |
| `src/routes/auth.ts` | Register endpoint dilindungi — hanya super_admin bisa assign role |
| `src/index.ts` | Page-level role guards untuk `/pos`, `/menu`, `/tables`. Dashboard quick links role-aware. "Tambah Meja" button hidden untuk non-admin. |
| `src/db/schema.ts` | Sudah ada `roleEnum` — tidak perlu perubahan |

### Database Migration
```sql
-- Role enum: admin,cashier → super_admin,admin_restoran,kasir,waitress,chef
ALTER TABLE users MODIFY COLUMN role ENUM('super_admin','admin_restoran','kasir','waitress','chef') NOT NULL DEFAULT 'kasir';
```

---

## Tahapan — Status

| Tahap | Status | Catatan |
|-------|--------|---------|
| 1. Database | ✅ Done | Schema sudah ada roleEnum. Migrasi enum dari format lama selesai. |
| 2. Middleware | ✅ Done | Fix circular dependency, Elysia-compatible signature, convenience exports. |
| 3. Frontend Sidebar | ✅ Done | Role-based menu filtering, quick links, button visibility. |
| 4. API Protection | ✅ Done | Granular per-endpoint checks di menus, tables, orders, auth. |
| 5. Testing | ⚠️ Partial | Server starts clean, LSP clean. Manual testing per-role belum dilakukan. |
| 6. Dokumentasi | ✅ Done | `RBAC.md` dibuat dengan role matrix, how-to, migration guide. |

---

## TODO / Future Work

### Priority: High
- [ ] **Super Admin protection**: Super Admin tidak bisa dihapus/diubah oleh role lain (belum ada endpoint user management)
- [ ] **Manual testing**: Login sebagai setiap role, verifikasi semua akses dan pembatasan
- [ ] **Orders filtering per role**: Chef hanya lihat orders yang perlu diolah, kasir hanya lihat orders hari ini
- [ ] **Chef order processing**: Chef belum punya UI untuk update status pesanan (cooking → ready)

### Priority: Medium
- [ ] **Audit log**: Catat perubahan role, login attempts, akses yang ditolak
- [ ] **Session management**: Force logout saat role user diubah admin
- [ ] **User management UI**: Halaman untuk super_admin mengelola pengguna dan role

### Priority: Low
- [ ] **Granular permissions**: Sistem permission per-action (bukan hanya per-role)
- [ ] **Role hierarchy**: Role bisa inherit permissions dari role di bawahnya
- [ ] **Soft delete users**: Jangan hard delete, archive saja

---

## Referensi

- Dokumentasi lengkap: `RBAC.md`
- Auth utilities: `src/utils/auth.ts`
- Middleware: `src/middleware/authorization.ts`
- Schema: `src/db/schema.ts`
