# RBAC (Role-Based Access Control) Documentation

## Daftar Role dan Hak Akses

| Role | Dashboard | POS | Menu | Tables | Orders | Payment | Cancel | Register Users |
|------|-----------|-----|------|--------|--------|---------|--------|----------------|
| **super_admin** | ✅ | ✅ | ✅ (CRUD) | ✅ (CRUD) | ✅ (All) | ✅ | ✅ | ✅ |
| **admin_restoran** | ✅ | ✅ | ✅ (CRUD) | ✅ (CRUD) | ✅ (All) | ✅ | ✅ | ❌ |
| **kasir** | ✅ | ✅ | ❌ | ❌ | ✅ (View) | ✅ | ✅ | ❌ |
| **waitress** | ✅ | ❌ | ❌ | ❌ | ✅ (View/Update) | ❌ | ✅ | ❌ |
| **chef** | ✅ | ❌ | ❌ | ❌ | ✅ (View/Process) | ❌ | ❌ | ❌ |

## Cara Menambah Role Baru

1. **Update schema**: Buka `src/db/schema.ts`, tambahkan nilai baru ke `roleEnum`:
   ```typescript
   export const roleEnum = mysqlEnum('role', ['super_admin', 'admin_restoran', 'kasir', 'waitress', 'chef', 'role_baru']);
   ```

2. **Update TokenPayload**: Buka `src/utils/auth.ts`, tambahkan ke union type:
   ```typescript
   role: 'super_admin' | 'admin_restoran' | 'kasir' | 'waitress' | 'chef' | 'role_baru';
   ```

3. **Update middleware**: Buka `src/middleware/authorization.ts`, tambahkan convenience middleware jika perlu:
   ```typescript
   export const requireRoleBaru = () => requireRole(['role_baru', 'admin_restoran']);
   ```

4. **Update roleMenuMap**: Buka `src/index.ts` di fungsi `getSidebarHtml`, tambahkan menu akses:
   ```typescript
   role_baru: ['orders', 'pos']
   ```

5. **Update route protection**: Tambahkan role check di halaman dan API endpoint yang relevan.

6. **Push schema**: `bunx drizzle-kit push` atau jalankan SQL manual:
   ```sql
   ALTER TABLE users MODIFY COLUMN role ENUM('super_admin', 'admin_restoran', 'kasir', 'waitress', 'chef', 'role_baru') NOT NULL DEFAULT 'kasir';
   ```

## Proses Migrasi

### Dari versi tanpa RBAC:
```sql
-- 1. Tambahkan kolom role jika belum ada
ALTER TABLE users ADD COLUMN role ENUM('super_admin', 'admin_restoran', 'kasir', 'waitress', 'chef') NOT NULL DEFAULT 'kasir';

-- 2. Set role untuk user pertama sebagai super_admin
UPDATE users SET role = 'super_admin' WHERE id = 1;

-- 3. Update role lama ke format baru (jika ada)
UPDATE users SET role = 'kasir' WHERE role = 'cashier';
UPDATE users SET role = 'admin_restoran' WHERE role = 'admin';
```

### File yang Terpengaruh:
- `src/db/schema.ts` — Schema definition dengan role enum
- `src/utils/auth.ts` — Auth utilities (getTokenFromCookies, verifyToken, TokenPayload)
- `src/middleware/authorization.ts` — RBAC middleware (requireRole, requireAdmin, dll)
- `src/routes/menus.ts` — Menu API (dilindungi requireAdmin)
- `src/routes/tables.ts` — Table API (dilindungi requireAdmin)
- `src/routes/orders.ts` — Order API (granular role checks per endpoint)
- `src/routes/auth.ts` — Auth API (register dilindungi super_admin)
- `src/index.ts` — Page routes dengan role-based access dan sidebar filtering
