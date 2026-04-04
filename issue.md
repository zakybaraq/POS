# Sub-Issue 1.1: Inventory/Stock Management

## Parent Issue
[#35 — Roadmap: Transform POS ke Production-Ready Business System](https://github.com/zakybaraq/POS/issues/35)

## Latar Belakang

Restoran nyata **harus** tahu stok bahan baku. Tanpa inventory management:
- Tidak tahu bahan apa yang hampir habis
- Tidak bisa track bahan baku yang terbuang
- Tidak ada alert saat stok menipis
- Tidak bisa hitung cost of goods sold (COGS)
- Tidak bisa mapping resep ke bahan baku

Modul ini adalah **modul paling penting** setelah modul POS yang sudah ada.

---

## Scope

### Yang HARUS ada (MVP)
1. **CRUD Bahan Baku** — Nama, satuan (kg, liter, pcs), stok saat ini, minimum stok, harga beli per satuan, supplier
2. **CRUD Resep** — Mapping menu ke bahan baku (1 Nasi Goreng = 200g beras, 1 telur, 50g ayam, dll)
3. **Auto-decrement Stok** — Saat pesanan dibuat di POS, stok bahan baku otomatis berkurang berdasarkan resep
4. **Stock Movement Log** — Riwayat semua perubahan stok (masuk, keluar, adjustment)
5. **Low Stock Alert** — Notifikasi di dashboard saat stok di bawah minimum
6. **Manual Stock Adjustment** — Input stok masuk/keluar manual (untuk penyesuaian, waste, dll)

### Yang NANTI bisa ditambahkan (Phase 2)
- Purchase Order otomatis saat stok di bawah minimum
- Multi-satuan (beli dalam kg, pakai dalam gram)
- Expiry date tracking
- Batch/lot tracking
- Barcode scanning

---

## Tahap 1: Database Schema

Buat 4 tabel baru di `src/db/schema.ts`:

### `ingredients` — Bahan Baku
```typescript
export const ingredients = mysqlTable('ingredients', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  unit: varchar('unit', { length: 20 }).notNull(), // kg, liter, pcs, gram, ml
  currentStock: decimal('current_stock', { precision: 10, scale: 2 }).notNull().default('0'),
  minStock: decimal('min_stock', { precision: 10, scale: 2 }).notNull().default('0'),
  costPerUnit: int('cost_per_unit').notNull().default(0), // harga beli per satuan
  supplierId: int('supplier_id'), // FK ke suppliers (nanti)
  createdAt: datetime('created_at').notNull().default(new Date()),
  updatedAt: datetime('updated_at'),
});
```

### `recipes` — Mapping Menu ke Bahan Baku
```typescript
export const recipes = mysqlTable('recipes', {
  id: serial('id').primaryKey(),
  menuId: int('menu_id').notNull(), // FK ke menus
  ingredientId: int('ingredient_id').notNull(), // FK ke ingredients
  quantity: decimal('quantity', { precision: 10, scale: 2 }).notNull(), // berapa satuan bahan per menu
});
```

### `stock_movements` — Riwayat Pergerakan Stok
```typescript
export const stockMovements = mysqlTable('stock_movements', {
  id: serial('id').primaryKey(),
  ingredientId: int('ingredient_id').notNull(),
  type: mysqlEnum('type', ['in', 'out', 'adjustment', 'waste']).notNull(),
  quantity: decimal('quantity', { precision: 10, scale: 2 }).notNull(),
  reason: varchar('reason', { length: 255 }), // "Pesanan #12", "Manual adjustment", "Waste"
  referenceId: int('reference_id'), // order_id jika dari pesanan
  userId: int('user_id'), // siapa yang melakukan
  createdAt: datetime('created_at').notNull().default(new Date()),
});
```

### SQL Migration
```sql
CREATE TABLE ingredients (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  unit VARCHAR(20) NOT NULL,
  current_stock DECIMAL(10,2) NOT NULL DEFAULT 0,
  min_stock DECIMAL(10,2) NOT NULL DEFAULT 0,
  cost_per_unit INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT NOW(),
  updated_at DATETIME
);

CREATE TABLE recipes (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  menu_id INT NOT NULL,
  ingredient_id INT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL
);

CREATE TABLE stock_movements (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ingredient_id INT NOT NULL,
  type ENUM('in', 'out', 'adjustment', 'waste') NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  reason VARCHAR(255),
  reference_id INT,
  user_id INT,
  created_at DATETIME NOT NULL DEFAULT NOW()
);
```

---

## Tahap 2: Repository Functions

Buat `src/repositories/inventory.ts`:

```typescript
// CRUD Ingredients
export async function getAllIngredients()
export async function getIngredientById(id: number)
export async function createIngredient(data: NewIngredient)
export async function updateIngredient(id: number, data: Partial<NewIngredient>)
export async function deleteIngredient(id: number)

// CRUD Recipes
export async function getRecipesByMenuId(menuId: number)
export async function createRecipe(data: NewRecipe)
export async function updateRecipe(id: number, data: Partial<NewRecipe>)
export async function deleteRecipe(id: number)
export async function deleteRecipesByMenuId(menuId: number)

// Stock Movements
export async function getStockMovements(ingredientId?: number, limit?: number)
export async function createStockMovement(data: NewStockMovement)

// Stock Operations
export async function adjustStock(ingredientId: number, quantity: number, type: string, reason: string, userId?: number, referenceId?: number)
export async function decrementStockForOrder(orderId: number) // Auto-decrement berdasarkan resep
export async function getLowStockIngredients() // Stok di bawah minimum
```

---

## Tahap 3: API Endpoints

Buat `src/routes/inventory.ts`:

| Method | Path | Auth | Fungsi |
|--------|------|------|--------|
| GET | `/api/ingredients` | super_admin, admin_restoran | List semua bahan baku |
| GET | `/api/ingredients/low-stock` | super_admin, admin_restoran | Bahan baku stok rendah |
| GET | `/api/ingredients/:id` | super_admin, admin_restoran | Detail bahan baku |
| POST | `/api/ingredients` | super_admin, admin_restoran | Tambah bahan baku |
| PUT | `/api/ingredients/:id` | super_admin, admin_restoran | Update bahan baku |
| DELETE | `/api/ingredients/:id` | super_admin | Hapus bahan baku |
| GET | `/api/recipes/menu/:menuId` | super_admin, admin_restoran | Resep untuk menu tertentu |
| POST | `/api/recipes` | super_admin, admin_restoran | Tambah resep item |
| PUT | `/api/recipes/:id` | super_admin, admin_restoran | Update resep item |
| DELETE | `/api/recipes/:id` | super_admin, admin_restoran | Hapus resep item |
| POST | `/api/stock-movements` | super_admin, admin_restoran | Manual stock adjustment |
| GET | `/api/stock-movements` | super_admin, admin_restoran | Riwayat pergerakan stok |

---

## Tahap 4: UI — Halaman Inventory

Buat `src/pages/inventory.ts` dengan 3 tab:

### Tab 1: Bahan Baku
```
┌─────────────────────────────────────────────────────────────────────────┐
│ [🔍 Cari bahan...]  [Semua Status ▼]  [Stok Rendah]  [+ Tambah Bahan]  │
├─────────────────────────────────────────────────────────────────────────┤
│ Nama        │ Satuan │ Stok   │ Min Stok │ Harga/Satuan │ Status │ Aksi │
│ Beras       │ kg     │ 25.00  │ 10.00    │ Rp 15.000    │ ✅ OK  │ Edit │
│ Telur       │ pcs    │ 8.00   │ 20.00    │ Rp 2.500     │ ⚠️ Low │ Edit │
│ Ayam Fillet │ kg     │ 0.00   │ 5.00     │ Rp 45.000    │ ❌ Hbs │ Edit │
└─────────────────────────────────────────────────────────────────────────┘
```

### Tab 2: Resep
```
┌─────────────────────────────────────────────────────────────────────────┐
│ Pilih Menu: [Nasi Goreng ▼]                          [+ Tambah Resep]  │
├─────────────────────────────────────────────────────────────────────────┤
│ Bahan Baku    │ Jumlah │ Satuan │ Stok Tersisa │ Aksi                  │
│ Beras         │ 0.20   │ kg     │ 25.00 kg     │ Edit  Hapus           │
│ Telur         │ 1.00   │ pcs    │ 8.00 pcs     │ Edit  Hapus           │
│ Ayam Fillet   │ 0.10   │ kg     │ 0.00 kg      │ Edit  Hapus           │
├─────────────────────────────────────────────────────────────────────────┤
│ Total Cost: Rp 8.500 per porsi                                        │
└─────────────────────────────────────────────────────────────────────────┘
```

### Tab 3: Riwayat Stok
```
┌─────────────────────────────────────────────────────────────────────────┐
│ [🔍 Cari...]  [Semua Tipe ▼]  [Export]                                  │
├─────────────────────────────────────────────────────────────────────────┤
│ Tanggal     │ Bahan    │ Tipe       │ Jumlah │ Keterangan              │
│ 04/04 10:30│ Beras    │ 📤 Out     │ -0.20  │ Pesanan #12             │
│ 04/04 09:00│ Telur    │ 📥 In      │ +50.00 │ Manual adjustment       │
│ 04/04 08:00│ Ayam     │ 🗑️ Waste   │ -0.50  │ Kadaluarsa              │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Tahap 5: Integrasi dengan POS

### Auto-decrement Stok Saat Pesanan Dibuat

Di `src/routes/orders.ts`, pada endpoint `POST /api/orders/with-items`:

```typescript
// Setelah order berhasil dibuat
await inventoryRepo.decrementStockForOrder(order.id);
```

### Fungsi `decrementStockForOrder`
```typescript
export async function decrementStockForOrder(orderId: number) {
  // 1. Ambil semua item di order
  const items = await orderItemRepo.getItemsWithMenuByOrderId(orderId);
  
  // 2. Untuk setiap item, ambil resepnya
  for (const item of items) {
    const recipes = await getRecipesByMenuId(item.menuId);
    
    // 3. Untuk setiap bahan di resep, kurangi stok
    for (const recipe of recipes) {
      const totalQuantity = recipe.quantity * item.quantity;
      await adjustStock(
        recipe.ingredientId,
        -totalQuantity,
        'out',
        `Pesanan #${orderId}`,
        item.userId,
        orderId
      );
    }
  }
}
```

---

## Tahap 6: Low Stock Alert di Dashboard

Tambahkan notifikasi di dashboard (`src/pages/dashboard.ts`):

```typescript
const lowStockItems = await inventoryRepo.getLowStockIngredients();
if (lowStockItems.length > 0) {
  // Tampilkan alert di dashboard
  // "⚠️ 3 bahan baku stok rendah: Telur, Ayam, Minyak"
}
```

---

## Tahap 7: Testing

### Skenario Test
1. **CRUD Bahan Baku** — Tambah, edit, hapus bahan baku → data tersimpan benar
2. **CRUD Resep** — Tambah resep untuk menu → mapping benar
3. **Auto-decrement** — Buat pesanan di POS → stok bahan baku berkurang otomatis
4. **Stock Movement Log** — Setiap perubahan stok tercatat di riwayat
5. **Low Stock Alert** — Stok di bawah minimum → alert muncul di dashboard
6. **Manual Adjustment** — Input stok masuk/keluar manual → stok terupdate + tercatat
7. **Total Cost** — Hitung cost per porsi dari resep → angka benar
8. **Edge case** — Menu tanpa resep → tidak error, stok tidak berkurang
9. **Edge case** — Stok tidak cukup → tetap bisa decrement (jadi minus), ada warning

---

## File yang Perlu Diubah/Dibuat

| File | Aksi |
|------|------|
| `src/db/schema.ts` | **Update** — tambah 3 tabel baru |
| `src/repositories/inventory.ts` | **BARU** — semua fungsi inventory |
| `src/routes/inventory.ts` | **BARU** — API endpoints |
| `src/routes/index.ts` | **Update** — register inventory routes |
| `src/routes/orders.ts` | **Update** — panggil decrementStockForOrder |
| `src/pages/inventory.ts` | **BARU** — halaman inventory (3 tab) |
| `src/pages/dashboard.ts` | **Update** — tambah low stock alert |

## Catatan Penting

- **Stok bisa minus** — Tidak boleh block pesanan jika stok tidak cukup (restoran nyata tetap bisa masak walau stok sistem belum update)
- **Decimal untuk stok** — Gunakan DECIMAL(10,2) karena bahan baku bisa pecahan (0.2 kg, 1.5 liter)
- **Setiap perubahan stok HARUS tercatat** di stock_movements
- **JANGAN hapus** fitur yang sudah ada
- **Estimasi total**: 8-12 jam kerja
