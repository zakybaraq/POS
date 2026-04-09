# Issue: Custom Kategori Menu

## Masalah

Saat ini, kategori Menu hanya固定 duo:
- `makanan` (Makanan)
- `minuman` (Minuman)

Tidak bisa tambah, edit, atau hapus kategori. Perlu改成 custom (bisa tambah sendiri).

---

## Analisis Struktur

### Database Schema
File: `src/db/schema.ts`
```typescript
export const categoryEnum = mysqlEnum('category', ['makanan', 'minuman']);
```
→ Ganti jadi `varchar(100)` biar bisa custom string.

### Menu Repository
File: `src/repositories/menu.ts`
```typescript
export async function getMenusByCategory(category: 'makanan' | 'minuman') {
```
→ Ganti parameter type jadi `string`.

### Menu Routes
File: `src/routes/menus.ts`
```typescript
if (category !== 'makanan' && category !== 'minuman') {
  return { error: 'Invalid category' };
}
```
→ Hapus validasi rigid, boleh任意 string.

### Menu Pages
Files:
- `src/pages/menu.ts` - Category dropdown di form
- `src/pages/pos.ts` - Category filter buttons
- `src/pages/kitchen.ts` - Category display

Badge styles di `src/public/styles/pos.css`:
```css
.badge-makanan { background: #fff3cd; color: #856404; }
.badge-minuman { background: #cce5ff; color: #004085; }
```

---

## Tahapan Implementasi

### Langkah 1: Update Database Schema

File: `src/db/schema.ts`

**Sebelum:**
```typescript
export const categoryEnum = mysqlEnum('category', ['makanan', 'minuman']);
category: categoryEnum.notNull(),
```

**Sesudah:**
```typescript
category: varchar('category', { length: 100 }).default('makanan'),
```

### Langkah 2: Create Categories Table (Optional - Lebih Good)

Buat table `categories` untuk manage kategori:
```sql
CREATE TABLE categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL UNIQUE,
  emoji VARCHAR(10) DEFAULT(''),
  color VARCHAR(20) DEFAULT(''),
  sort_order INT DEFAULT(0),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

NANTI bisa add API endpoints:
- `GET /categories` - list all
- `POST /categories` - create
- `PUT /categories/:id` - update
- `DELETE /categories/:id` - delete

### Langkah 3: Update Repository

File: `src/repositories/menu.ts`

```typescript
// Sebelum
export async function getMenusByCategory(category: 'makanan' | 'minuman')

// Sesudah
export async function getMenusByCategory(category: string)
```

### Langkah 4: Update Routes

File: `src/routes/menus.ts`

1. Hapus rigid validation:
```typescript
// Hapus ini:
if (category !== 'makanan' && category !== 'minuman') {
  return { error: 'Invalid category' };
}
```

2. Tambah endpoints untuk categories (kalo make table terpisah).

### Langkah 5: Update Pages

#### `src/pages/menu.ts`
- Ambil kategori dari API/database
- Render dynamic dropdown
- Tambah form untuk create/edit category

#### `src/pages/pos.ts`
- Ambil kategori dari API
- Render category buttons dynamically

#### `src/pages/kitchen.ts`
- Dynamic category display

### Langkah 6: Dynamic Badge Styles

Di `src/public/styles/pos.css`:
```css
/* Dynamic Badge Colors based on category name */
.badge { padding: 2px 8px; border-radius: var(--radius-sm); font-size: 10px; font-weight: 600; }
```

Bisa generate warna dari nama kategori ato fetch dari database.

### Langkah 7: Migration

Run SQL kalo ubah schema:
```bash
bun run db:push
```

Atau manual alter:
```sql
ALTER TABLE menus MODIFY COLUMN category VARCHAR(100) DEFAULT 'makanan';
```

---

## Files yang Diubah

| File | Perubahan |
|------|-----------|
| `src/db/schema.ts` | Category jadi varchar |
| `src/repositories/menu.ts` | Type parameter string |
| `src/routes/menus.ts` | Hapus validasi, tambah category endpoints |
| `src/pages/menu.ts` | Dynamic category dropdown |
| `src/pages/pos.ts` | Dynamic category filter |
| `src/pages/kitchen.ts` | Dynamic category display |
| `src/public/styles/pos.css` | Dynamic badge styles |
| `src/repositories/kitchen.ts` | Type parameter string |

---

## Catatan Penting

1. **Backward Compatibility**: Data lama (`makanan`, `minuman`) harus tetep bisa.
2. **Default Value**: Kalo kosong, default ke `makanan`.
3. **Case Sensitive**: Samakan format (lowercase recommended).
4. **API Response**: Tambah field `categories` di menu responses punya.

---

## Estimasi Effort

- Basic (varchar only): 1-2 jam
- With Categories Table: 3-4 jam

---

*Ditugaskan untuk: Junior Programmer / AI Model Murah*