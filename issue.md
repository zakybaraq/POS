# Issue: Simplifikasi Kategori - Hapus Emoji & Warna, Buat Dedicated Page

## Masalah

1. Field `emoji` dan `color` di kategori tidak diperlukan
2. Belum ada halaman Kategori yang khusus
3. Tombol di Menu page perlu diarahkan ke halaman baru

---

## Analisis struktur Data

### DB Saat Ini
```sql
categories table:
- id INT PRIMARY KEY
- name VARCHAR(100) NOT NULL UNIQUE
- emoji VARCHAR(10) DEFAULT ''
- color VARCHAR(20) DEFAULT ''
- sort_order INT DEFAULT 0
- created_at DATETIME
```

---

## Tahapan Implementasi

### Langkah 1: Modifikasi DB Schema

**File:** `src/db/schema.ts`

Hapus kolom `emoji` dan `color` dari categories table:

```typescript
// Sebelum
export const categories = mysqlTable('categories', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  emoji: varchar('emoji', { length: 10 }).default(''),
  color: varchar('color', { length: 20 }).default(''),
  sortOrder: int('sort_order').default(0),
  createdAt: datetime('created_at').notNull().default(new Date()),
});

// Sesudah
export const categories = mysqlTable('categories', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  sortOrder: int('sort_order').default(0),
  createdAt: datetime('created_at').notNull().default(new Date()),
});
```

###Langkah 2: Update Repository

**File:** `src/repositories/category.ts`

- Hapus field `emoji` dan `color` dari semua functions
- Update `createCategory`, `updateCategory`, `seedDefaultCategories`

### Langkah 3: Update Routes

**File:** `src/routes/categories.ts`

- Hapus validation untuk `emoji` dan `color`
- Update type definitions

###Langkah 4: Migration DB (Jika Ada Data)

Eksekusi SQL:

```sql
-- Hapus kolom emoji dan color (setelah schema di-update)
ALTER TABLE categories DROP COLUMN emoji;
ALTER TABLE categories DROP COLUMN color;
```

### Langkah 5: Buat Halaman Kategori Baru

**File:** `src/pages/categories.ts`

Buat halaman dedicated untuk Kelola Kategori:
- List semua kategori
- Form tambah/edit kategori (hanya nama)
- Tombol hapus
- Pagination jika banyak

**UI Mockup:**
```
┌─────────────────────────────────────────┐
│  Home / Pengaturan / Kelola Kategori    │
├─────────────────────────────────────────┤
│  🔍 Cari...          [+ Tambah Kategori]│
├─────────────────────────────────────────┤
│  #  Nama            Aksi                │
│  1  Makanan        [Edit] [Hapus]      │
│  2  Minuman         [Edit] [Hapus]      │
│  3  Camilan        [Edit] [Hapus]      │
└─────────────────────────────────────────┘
```

###Langkah 6: Update Tombol di Menu Page

**File:** `src/pages/menu.ts`

```typescript
// Sebelum
<button class="btn btn-secondary" onclick="showCategoryModal()">🏷️ Kelola Kategori</button>

// Sesudah - link ke halaman kategori
<a href="/categories" class="btn btn-secondary">🏷️ Kelola Kategori</a>
```

atau cukup:

```typescript
<button class="btn btn-secondary" onclick="window.location.href='/categories'">🏷️ Kelola Kategori</button>
```

###Langkah 7: Hapus Modal Category dari Menu Page

Setelah punya halaman khusus:
- Hapus modal "category-modal" dari menu.ts
- Hapus fungsi `showCategoryModal`, `closeCategoryModal`, `saveCategory`, `renderCategoriesList`, `deleteCategory`
- Hapus CSS `.category-item`
- Hapus button "Kelola Kategori" dari toolbar

---

## Files yang Diubah

| File | Perubahan |
|------|------------|
| `src/db/schema.ts` | Hapus emoji, color columns |
| `src/repositories/category.ts` | Update functions |
| `src/routes/categories.ts` | Update routes |
| `src/pages/categories.ts` | **BARU** - halaman kategori |
| `src/index.ts` | Register categories page |
| `src/pages/menu.ts` | Hapus modal, ubah tombol ke link |

---

## Estimasi Effort

- 1-2 jam untuk simplifikasi DB + repo
- 2-3 jam untuk halaman kategori baru
- 1 jam untuk cleanup menu page

**Total: ~4-6 jam**

---

## Catatan

- Data emoji/color yang sudah ada di DB akan di-drop saat migration
- Pastikan backup sebelum migration
- Default kategori (makanan, minuman) tetap ada tapi tanpa emoji/color

---

*Ditugaskan untuk: Junior Programmer / AI Model Murah*